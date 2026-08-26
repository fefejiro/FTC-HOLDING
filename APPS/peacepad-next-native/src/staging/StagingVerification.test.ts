import { verifyStagingDatabase } from "./StagingVerification";

test("verification proves readiness, twice-run migrations, and simulated restart", async () => {
  const queries: string[] = [];
  const clients = [
    { query: async (sql: string) => { queries.push(sql); }, end: jest.fn().mockResolvedValue(undefined) },
    { query: async (sql: string) => { queries.push(sql); }, end: jest.fn().mockResolvedValue(undefined) },
  ];
  const result = await verifyStagingDatabase(() => clients.shift()!);
  expect(result).toEqual({ initialReady: true, migrationsRun: 2, restartReady: true });
  expect(queries.filter((sql) => sql === "SELECT 1")).toHaveLength(2);
});

test("verification reports an unavailable database without migrations", async () => {
  const query = jest.fn().mockRejectedValue(new Error("offline"));
  await expect(verifyStagingDatabase(() => ({ query }))).resolves.toEqual({ initialReady: false, migrationsRun: 0, restartReady: false });
  expect(query).toHaveBeenCalledTimes(1);
});

test("verification rejects a reused client that cannot prove a restart", async () => {
  const client = { query: jest.fn().mockResolvedValue({ rows: [] }), end: jest.fn().mockResolvedValue(undefined) };
  await expect(verifyStagingDatabase(() => client)).rejects.toThrow("new PostgreSQL client");
});
