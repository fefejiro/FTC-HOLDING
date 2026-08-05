import type { SqlConnection } from "./PostgresInvitationStore";

type Environment = Readonly<Record<string, string | undefined>>;

export type StagingMigrationConfig = Readonly<{
  databaseUrl: string;
  runtimeRole: string;
}>;

const required = (environment: Environment, name: string) => {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required for staging migration.`);
  return value;
};

const stagingDatabase = (value: string) => {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("PEACEPAD_STAGING_MIGRATION_DATABASE_URL must be a valid PostgreSQL URL."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.pathname.toLowerCase().includes("staging")) {
    throw new Error("The migration database URL must use PostgreSQL and name an isolated staging database.");
  }
  return value;
};

const runtimeRole = (value: string) => {
  if (!/^peacepad_native_staging_[a-z0-9_]+$/.test(value) || ["peacepad_native_staging_postgres", "peacepad_native_staging_public"].includes(value)) {
    throw new Error("PEACEPAD_STAGING_RUNTIME_ROLE must be a dedicated PeacePad staging role.");
  }
  return value;
};

export function readStagingMigrationConfig(environment: Environment): StagingMigrationConfig {
  if (required(environment, "PEACEPAD_RUNTIME_ENV") !== "staging") {
    throw new Error("PeacePad migrations are staging-only.");
  }
  const databaseUrl = stagingDatabase(required(environment, "PEACEPAD_STAGING_MIGRATION_DATABASE_URL"));
  const runtimeDatabaseUrl = stagingDatabase(required(environment, "PEACEPAD_STAGING_RUNTIME_DATABASE_URL"));
  if (databaseUrl === runtimeDatabaseUrl || new URL(databaseUrl).username === new URL(runtimeDatabaseUrl).username) {
    throw new Error("Staging migration-owner and runtime database credentials must be distinct.");
  }
  return {
    databaseUrl,
    runtimeRole: runtimeRole(required(environment, "PEACEPAD_STAGING_RUNTIME_ROLE"))
  };
}

export function runtimeGrantSql(role: string) {
  const safeRole = runtimeRole(role);
  return `
REVOKE ALL ON SCHEMA peacepad_native_staging FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA peacepad_native_staging FROM PUBLIC;
GRANT USAGE ON SCHEMA peacepad_native_staging TO ${safeRole};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA peacepad_native_staging TO ${safeRole};
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA peacepad_native_staging TO ${safeRole};
ALTER DEFAULT PRIVILEGES IN SCHEMA peacepad_native_staging
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${safeRole};
ALTER DEFAULT PRIVILEGES IN SCHEMA peacepad_native_staging
  GRANT USAGE, SELECT ON SEQUENCES TO ${safeRole};
`.trim();
}

export async function applyStagingMigration(
  connection: SqlConnection,
  migrationSql: string,
  role: string
) {
  if (!/CREATE SCHEMA IF NOT EXISTS peacepad_native_staging/i.test(migrationSql)) {
    throw new Error("The migration must target the isolated PeacePad staging schema.");
  }
  await connection.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", ["peacepad-native-staging:migration"]);
  try {
    await connection.query(migrationSql);
    await connection.query(runtimeGrantSql(role));
  } finally {
    await connection.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", ["peacepad-native-staging:migration"]);
  }
}
