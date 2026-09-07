import { createHash } from "node:crypto";

import { HashedStagingSessionAuthenticator } from "./HashedStagingSessionAuthenticator";
import { createStagingRuntime } from "./StagingRuntime";
import type { StagingServerConfig } from "./StagingServerConfig";

const config = {
  port: 0,
  serviceOrigin: "http://127.0.0.1:0",
  appOrigin: "http://127.0.0.1:3000",
  databaseUrl: "postgresql://staging",
  sessionPepper: "fictional-staging-pepper-1234",
  sessionTokenHash: "0".repeat(64),
  actor: { identityId: "fictional-id", displayName: "Fictional User", sessionId: "fictional-session", familyPermissions: { family: ["read"] } },
  families: { family: "Fictional Family" },
  region: "ca",
} as unknown as StagingServerConfig;

test("runtime migrates before listening and can stop cleanly", async () => {
  const queries: string[] = [];
  const client = { query: jest.fn(async (sql: string) => { queries.push(sql); }) , end: jest.fn(async () => undefined) };
  const token = "fictional-token";
  const hash = createHash("sha256").update(`${config.sessionPepper}:${token}`).digest("hex");
  const runtime = createStagingRuntime({ ...config, sessionTokenHash: hash }, client, new HashedStagingSessionAuthenticator(config.sessionPepper, hash, config.actor));
  await runtime.start();
  expect(queries.some((sql) => sql.includes("staging_schema_migrations"))).toBe(true);
  await runtime.stop();
  expect(client.end).toHaveBeenCalledTimes(1);
});

test("runtime refuses to listen when the database is unavailable", async () => {
  const client = { query: jest.fn().mockRejectedValue(new Error("offline")) };
  const runtime = createStagingRuntime(config, client, new HashedStagingSessionAuthenticator(config.sessionPepper, "0".repeat(64), config.actor));
  await expect(runtime.start()).rejects.toThrow("not ready");
});
