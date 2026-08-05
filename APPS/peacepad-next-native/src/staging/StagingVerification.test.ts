import { verifyStagingDatabase } from "./StagingVerification";

test("verification proves readiness, twice-run migrations, and simulated restart", async () => {
  const queries: string[] = [];
  const result = await verifyStagingDatabase({ query: async (sql) => { queries.push(sql); }, end: async () => undefined });
  expect(result).toEqual({ initialReady: true, migrationsRun: 2, restartReady: true });
  expect(queries.filter((sql) => sql === "SELECT 1")).toHaveLength(2);
});

test("verification reports an unavailable database without migrations", async () => {
  const query = jest.fn().mockRejectedValue(new Error("offline"));
  await expect(verifyStagingDatabase({ query })).resolves.toEqual({ initialReady: false, migrationsRun: 0, restartReady: false });
  expect(query).toHaveBeenCalledTimes(1);
});
