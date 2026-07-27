import fs from "node:fs";
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

export function createProductPool(connectionString?: string): pg.Pool {
  const cfg = productDbConfig();
  return new Pool({
    connectionString: connectionString || cfg.connectionString,
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
  for (const name of migrations) {
    await db.query(fs.readFileSync(path.join(migrationRoot, name), "utf8"));
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
