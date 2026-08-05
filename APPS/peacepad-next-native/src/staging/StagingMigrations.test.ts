import { runStagingMigrations, STAGING_MIGRATIONS } from "./StagingMigrations";

test("staging migrations are idempotent and scoped to synthetic tables", async () => {
  const queries: Array<{ sql: string; parameter?: string }> = [];
  const client = { query: jest.fn(async (sql: string, parameter?: string) => { queries.push({ sql, parameter }); }) };
  await expect(runStagingMigrations(client)).resolves.toEqual(STAGING_MIGRATIONS.map(({ id }) => ({ id })));
  await expect(runStagingMigrations(client)).resolves.toEqual(STAGING_MIGRATIONS.map(({ id }) => ({ id })));
  expect(queries.filter(({ sql }) => sql.includes("CREATE TABLE")).every(({ sql }) => sql.includes("staging_"))).toBe(true);
  expect(queries.filter(({ sql }) => sql.includes("INSERT INTO"))[0]).toMatchObject({ parameter: "001_staging_sessions" });
  expect(queries.some(({ sql }) => sql.includes("ON CONFLICT (id) DO NOTHING"))).toBe(true);
});

test("migration errors are surfaced and do not fail open", async () => {
  const client = { query: jest.fn().mockRejectedValue(new Error("database unavailable")) };
  await expect(runStagingMigrations(client)).rejects.toThrow("database unavailable");
});
