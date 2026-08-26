import { Pool } from "pg";
import {
  createPostgresStagingClientFactory,
  validatePostgresStagingUrl,
} from "./PostgresStagingClient";
import { verifyStagingDatabase } from "./StagingVerification";

test("PostgreSQL staging URLs fail closed", () => {
  expect(() => validatePostgresStagingUrl("https://localhost/peacepad_staging")).toThrow("PostgreSQL URL");
  expect(() => validatePostgresStagingUrl("postgresql://localhost/peacepad_prod")).toThrow("isolated staging");
  expect(() => validatePostgresStagingUrl("postgresql://db.example/peacepad_staging")).toThrow("Remote PostgreSQL");
  expect(validatePostgresStagingUrl("postgresql://localhost/peacepad_staging").hostname).toBe("localhost");
});

test("client factory creates a new pool for restart verification", async () => {
  const pools = [
    { query: jest.fn().mockResolvedValue({ rows: [] }), end: jest.fn().mockResolvedValue(undefined) },
    { query: jest.fn().mockResolvedValue({ rows: [] }), end: jest.fn().mockResolvedValue(undefined) },
  ];
  const factory = createPostgresStagingClientFactory({
    databaseUrl: "postgresql://localhost/peacepad_staging",
    poolFactory: () => pools.shift()!,
  });
  const first = await factory();
  const second = await factory();
  expect(first).not.toBe(second);
  await first.end?.();
  await second.end?.();
});

const integrationUrl = process.env.PEACEPAD_POSTGRES_INTEGRATION_URL;
const integrationTest = integrationUrl ? test : test.skip;

integrationTest("real PostgreSQL survives client restart with intact migration checksums", async () => {
  const admin = new Pool({ connectionString: integrationUrl });
  const reset = async () => {
    await admin.query("DROP TABLE IF EXISTS staging_sessions");
    await admin.query("DROP TABLE IF EXISTS staging_families");
    await admin.query("DROP TABLE IF EXISTS staging_schema_migrations");
  };

  try {
    await reset();
    const result = await verifyStagingDatabase(createPostgresStagingClientFactory({ databaseUrl: integrationUrl! }));
    expect(result).toEqual({ initialReady: true, migrationsRun: 2, restartReady: true });
    const persisted = await admin.query<{ id: string; checksum: string }>(
      "SELECT id, checksum FROM staging_schema_migrations ORDER BY id",
    );
    expect(persisted.rows).toHaveLength(2);
    expect(persisted.rows.every(({ checksum }) => /^[a-f0-9]{64}$/.test(checksum))).toBe(true);
  } finally {
    await reset();
    await admin.end();
  }
});
