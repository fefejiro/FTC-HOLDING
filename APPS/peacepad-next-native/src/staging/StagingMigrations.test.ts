import { runStagingMigrations, STAGING_MIGRATIONS } from "./StagingMigrations";

test("staging migrations are idempotent and scoped to synthetic tables", async () => {
  const queries: Array<{ sql: string; parameters?: readonly unknown[] }> = [];
  const applied = new Map<string, string>();
  const client = { query: jest.fn(async (sql: string, parameters?: readonly unknown[]) => {
    queries.push({ sql, parameters });
    if (sql.startsWith("SELECT checksum")) {
      const checksum = applied.get(String(parameters?.[0]));
      return { rows: checksum ? [{ checksum }] : [] };
    }
    if (sql.startsWith("INSERT INTO staging_schema_migrations")) {
      applied.set(String(parameters?.[0]), String(parameters?.[1]));
    }
    return { rows: [] };
  }) };
  await expect(runStagingMigrations(client)).resolves.toEqual(STAGING_MIGRATIONS.map(({ id }) => ({ id })));
  await expect(runStagingMigrations(client)).resolves.toEqual(STAGING_MIGRATIONS.map(({ id }) => ({ id })));
  expect(queries.filter(({ sql }) => sql.includes("CREATE TABLE")).every(({ sql }) => sql.includes("staging_"))).toBe(true);
  expect(queries.filter(({ sql }) => sql.includes("INSERT INTO"))[0]?.parameters?.[0]).toBe("001_staging_sessions");
  expect(queries.filter(({ sql }) => sql === "BEGIN")).toHaveLength(2);
  expect(queries.filter(({ sql }) => sql === "COMMIT")).toHaveLength(2);
  expect(queries.filter(({ sql }) => sql.includes("pg_advisory_xact_lock"))).toHaveLength(2);
  expect(queries.filter(({ sql }) => sql.includes("CREATE TABLE IF NOT EXISTS staging_sessions"))).toHaveLength(1);
});

test("migration errors are surfaced and do not fail open", async () => {
  const client = { query: jest.fn()
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error("database unavailable"))
    .mockResolvedValueOnce(undefined) };
  await expect(runStagingMigrations(client)).rejects.toThrow("database unavailable");
  expect(client.query).toHaveBeenLastCalledWith("ROLLBACK");
});

test("migration checksum drift aborts and rolls back", async () => {
  const client = { query: jest.fn(async (sql: string) => {
    if (sql.startsWith("SELECT checksum")) return { rows: [{ checksum: "0".repeat(64) }] };
    return { rows: [] };
  }) };
  await expect(runStagingMigrations(client)).rejects.toThrow("checksum mismatch");
  expect(client.query).toHaveBeenLastCalledWith("ROLLBACK");
});
