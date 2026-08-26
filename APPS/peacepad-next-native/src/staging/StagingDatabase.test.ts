import { createStagingDatabase } from "./StagingDatabase";

test("database readiness uses a harmless probe and closes cleanly", async () => {
  const query = jest.fn().mockResolvedValue({ rows: [{ ok: 1 }] });
  const end = jest.fn().mockResolvedValue(undefined);
  const database = createStagingDatabase({ query, end });
  await expect(database.ready()).resolves.toBe(true);
  expect(query).toHaveBeenCalledWith("SELECT 1");
  await database.close();
  expect(end).toHaveBeenCalledTimes(1);
});

test("database readiness fails closed", async () => {
  const database = createStagingDatabase({ query: jest.fn().mockRejectedValue(new Error("offline")) });
  await expect(database.ready()).resolves.toBe(false);
});
