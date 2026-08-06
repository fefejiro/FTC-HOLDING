import { createHash } from "node:crypto";
import type { StagingDatabaseClient } from "./StagingDatabase";

export const STAGING_MIGRATIONS = [
  {
    id: "001_staging_sessions",
    sql: `CREATE TABLE IF NOT EXISTS staging_sessions (
      session_id TEXT PRIMARY KEY,
      identity_id TEXT NOT NULL,
      region TEXT NOT NULL CHECK (region IN ('ca', 'us')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )`,
  },
  {
    id: "002_staging_families",
    sql: `CREATE TABLE IF NOT EXISTS staging_families (
      family_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      region TEXT NOT NULL CHECK (region IN ('ca', 'us')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  },
] as const;

export type AppliedMigration = Readonly<{ id: string }>;

type MigrationRow = Readonly<{ checksum?: unknown }>;
type QueryRows = Readonly<{ rows?: readonly MigrationRow[] }>;

const checksumFor = (sql: string): string =>
  createHash("sha256").update(sql.trim().replace(/\r\n/g, "\n"), "utf8").digest("hex");

const rowsFrom = (result: unknown): readonly MigrationRow[] => {
  if (!result || typeof result !== "object" || !("rows" in result)) return [];
  const rows = (result as QueryRows).rows;
  return Array.isArray(rows) ? rows : [];
};

/** Runs checksum-verified staging DDL under a transaction-scoped advisory lock. */
export async function runStagingMigrations(client: StagingDatabaseClient): Promise<AppliedMigration[]> {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1)", [20773002]);
    await client.query(`CREATE TABLE IF NOT EXISTS staging_schema_migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    const applied: AppliedMigration[] = [];
    for (const migration of STAGING_MIGRATIONS) {
      const checksum = checksumFor(migration.sql);
      const result = await client.query(
        "SELECT checksum FROM staging_schema_migrations WHERE id = $1",
        [migration.id],
      );
      const existingChecksum = rowsFrom(result)[0]?.checksum;
      if (existingChecksum !== undefined && existingChecksum !== checksum) {
        throw new Error(`Migration checksum mismatch for ${migration.id}.`);
      }
      if (existingChecksum === undefined) {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO staging_schema_migrations (id, checksum) VALUES ($1, $2)",
          [migration.id, checksum],
        );
      }
      applied.push({ id: migration.id });
    }
    await client.query("COMMIT");
    return applied;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the migration failure as the primary error.
    }
    throw error;
  }
}
