import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { applyStagingMigration, readStagingMigrationConfig } from "../src/staging/StagingMigration";

const config = readStagingMigrationConfig(process.env);
const migrationSql = await fs.readFile(
  path.resolve(process.cwd(), "staging/migrations/0001_invitation_slice.sql"),
  "utf8"
);
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 1,
  connectionTimeoutMillis: 5_000,
  application_name: "peacepad-native-staging-migrator"
});

const client = await pool.connect();
try {
  await applyStagingMigration(client, migrationSql, config.runtimeRole);
  console.info(JSON.stringify({ event: "migration.completed", environment: "staging", migration: "0001_invitation_slice" }));
} finally {
  client.release();
  await pool.end();
}
