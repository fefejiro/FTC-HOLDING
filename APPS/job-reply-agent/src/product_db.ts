import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export interface ProductDbConfig {
  connectionString: string;
  ssl: boolean;
}

export function productDbConfig(): ProductDbConfig {
  const connectionString = String(process.env.DATABASE_URL || "").trim();
  if (!connectionString) throw new Error("DATABASE_URL is required for the product server.");
  const production = process.env.NODE_ENV === "production";
  const ssl = String(process.env.DATABASE_SSL ?? (production ? "true" : "false")) === "true";
  return { connectionString, ssl };
}

let pool: pg.Pool | null = null;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function normalizeMigrationSql(sql: string): string {
  return sql.replace(/\r\n?/g, "\n");
}

export function migrationChecksum(sql: string): string {
  return sha256(normalizeMigrationSql(sql));
}

export function acceptedMigrationChecksums(sql: string): Set<string> {
  const normalized = normalizeMigrationSql(sql);
  return new Set([
    migrationChecksum(sql),
    sha256(sql),
    sha256(normalized.replace(/\n/g, "\r\n"))
  ]);
}

export function createProductPool(connectionString?: string): pg.Pool {
  const cfg = connectionString
    ? {
        connectionString,
        ssl: String(
          process.env.DATABASE_SSL
          ?? (process.env.NODE_ENV === "production" ? "true" : "false")
        ) === "true"
      }
    : productDbConfig();
  return new Pool({
    connectionString: cfg.connectionString,
    ssl: cfg.ssl ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : false,
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
  });
}

export function getProductPool(): pg.Pool {
  if (pool) return pool;
  pool = createProductPool();
  return pool;
}

export async function closeProductPool(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = null;
}

export async function migrateProductDb(db = getProductPool()): Promise<void> {
  const migrationRoot = path.join(ROOT, "migrations");
  const migrations = fs.readdirSync(migrationRoot)
    .filter((name) => /^\d+_.+\.sql$/i.test(name))
    .sort();
  const client = await db.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('una-jobagent-product-migrations'))");
    await client.query(
      `CREATE TABLE IF NOT EXISTS product_schema_migrations (
         name text PRIMARY KEY,
         sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
         applied_at timestamptz NOT NULL DEFAULT now()
       )`
    );
    for (const name of migrations) {
      const sql = fs.readFileSync(path.join(migrationRoot, name), "utf8");
      const checksum = migrationChecksum(sql);
      const existing = await client.query<{ sha256: string }>(
        "SELECT sha256 FROM product_schema_migrations WHERE name=$1",
        [name]
      );
      if (existing.rows[0]) {
        if (!acceptedMigrationChecksums(sql).has(existing.rows[0].sha256)) {
          throw new Error(`Applied migration ${name} does not match its release checksum.`);
        }
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO product_schema_migrations (name, sha256) VALUES ($1,$2)",
          [name, checksum]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('una-jobagent-product-migrations'))")
      .catch(() => undefined);
    client.release();
  }
}

export async function assertProductDatabaseRole(db = getProductPool()): Promise<void> {
  const result = await db.query<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>(
    `SELECT rolname, rolsuper, rolbypassrls
       FROM pg_roles
      WHERE rolname=current_user`
  );
  const role = result.rows[0];
  if (!role || role.rolsuper || role.rolbypassrls) {
    throw new Error(
      "The product server must use a non-superuser PostgreSQL role without BYPASSRLS."
    );
  }
}

export async function withTenant<T>(
  userId: string,
  action: (client: pg.PoolClient) => Promise<T>,
  db = getProductPool()
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
