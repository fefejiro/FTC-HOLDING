import { applyStagingMigration, readStagingMigrationConfig, runtimeGrantSql } from "./StagingMigration";

const valid = {
  PEACEPAD_RUNTIME_ENV: "staging",
  PEACEPAD_STAGING_MIGRATION_DATABASE_URL: "postgresql://migrator@db.example/peacepad_native_staging",
  PEACEPAD_STAGING_RUNTIME_DATABASE_URL: "postgresql://runtime@db.example/peacepad_native_staging",
  PEACEPAD_STAGING_RUNTIME_ROLE: "peacepad_native_staging_runtime"
};

describe("staging migration boundary", () => {
  it("requires an isolated migration database and dedicated runtime role", () => {
    expect(readStagingMigrationConfig(valid)).toEqual({
      databaseUrl: valid.PEACEPAD_STAGING_MIGRATION_DATABASE_URL,
      runtimeRole: valid.PEACEPAD_STAGING_RUNTIME_ROLE
    });
    expect(() => readStagingMigrationConfig({ ...valid, PEACEPAD_RUNTIME_ENV: "production" })).toThrow(/staging-only/i);
    expect(() => readStagingMigrationConfig({ ...valid, PEACEPAD_STAGING_MIGRATION_DATABASE_URL: "postgresql://migrator@db.example/peacepad" })).toThrow(/isolated staging/i);
    expect(() => readStagingMigrationConfig({ ...valid, PEACEPAD_STAGING_RUNTIME_DATABASE_URL: valid.PEACEPAD_STAGING_MIGRATION_DATABASE_URL })).toThrow(/distinct/i);
    expect(() => readStagingMigrationConfig({ ...valid, PEACEPAD_STAGING_RUNTIME_ROLE: "postgres" })).toThrow(/dedicated/i);
  });

  it("grants only schema data access to the reviewed runtime role", () => {
    const sql = runtimeGrantSql(valid.PEACEPAD_STAGING_RUNTIME_ROLE);
    expect(sql).toContain("REVOKE ALL ON SCHEMA peacepad_native_staging FROM PUBLIC");
    expect(sql).toContain(`GRANT USAGE ON SCHEMA peacepad_native_staging TO ${valid.PEACEPAD_STAGING_RUNTIME_ROLE}`);
    expect(sql).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES");
    expect(sql).toContain(`REVOKE UPDATE, DELETE ON peacepad_native_staging.message_events FROM ${valid.PEACEPAD_STAGING_RUNTIME_ROLE}`);
    expect(sql).not.toMatch(/GRANT\s+(ALL|CREATE)/i);
  });

  it("serializes migration and always releases the advisory lock", async () => {
    const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
    const connection = {
      query: jest.fn(async (text: string, values?: readonly unknown[]) => {
        calls.push({ text, values });
        return { rows: [], rowCount: 0 };
      })
    };
    await applyStagingMigration(connection, "CREATE SCHEMA IF NOT EXISTS peacepad_native_staging;", valid.PEACEPAD_STAGING_RUNTIME_ROLE);
    expect(calls[0].text).toMatch(/pg_advisory_lock/);
    expect(calls.at(-1)?.text).toMatch(/pg_advisory_unlock/);
  });

  it("rejects a migration outside the isolated schema", async () => {
    const connection = { query: jest.fn() };
    await expect(applyStagingMigration(connection, "SELECT 1;", valid.PEACEPAD_STAGING_RUNTIME_ROLE)).rejects.toThrow(/isolated/i);
    expect(connection.query).not.toHaveBeenCalled();
  });
});
