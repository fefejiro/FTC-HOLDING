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

/** Runs only idempotent staging DDL. It never accepts application records. */
export async function runStagingMigrations(client: StagingDatabaseClient): Promise<AppliedMigration[]> {
  await client.query(`CREATE TABLE IF NOT EXISTS staging_schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const applied: AppliedMigration[] = [];
  for (const migration of STAGING_MIGRATIONS) {
    await client.query(migration.sql);
    await client.query(
      "INSERT INTO staging_schema_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING",
      migration.id,
    );
    applied.push({ id: migration.id });
  }
  return applied;
}
