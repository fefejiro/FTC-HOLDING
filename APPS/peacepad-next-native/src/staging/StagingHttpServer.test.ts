import { createHash } from "node:crypto";
import { request } from "node:http";

import { HashedStagingSessionAuthenticator } from "./HashedStagingSessionAuthenticator";
import { StagingHttpServer } from "./StagingHttpServer";
import type { StagingServerConfig } from "./StagingServerConfig";

const actor = { identityId: "identity-fictional-a", displayName: "Alex Example", sessionId: "session-fictional-a", familyPermissions: { "family-fictional-a": ["read:family"] } } as const;
const config = { port: 0, serviceOrigin: "http://127.0.0.1:0", appOrigin: "http://127.0.0.1:3000", databaseUrl: "postgresql://staging", sessionPepper: "fictional-staging-pepper-1234", sessionTokenHash: "0".repeat(64), actor, families: { "family-fictional-a": "Example Family" }, region: "ca" } as unknown as StagingServerConfig;

const get = (port: number, path: string, token?: string, origin = config.appOrigin) => new Promise<{ status: number; body: any }>((resolve, reject) => {
  const req = request({ port, path, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), origin } }, (res) => { let body = ""; res.on("data", (chunk) => body += chunk); res.on("end", () => resolve({ status: res.statusCode ?? 0, body: JSON.parse(body) })); });
  req.on("error", reject); req.end();
});

test("serves health and fail-closed session routes", async () => {
  const token = "fictional-token";
  const hash = createHash("sha256").update(`${config.sessionPepper}:${token}`).digest("hex");
  const server = new StagingHttpServer({ ...config, sessionTokenHash: hash, port: 0 }, new HashedStagingSessionAuthenticator(config.sessionPepper, hash, actor));
  await server.listen();
  const address = (server as any).server.address() as { port: number };
  expect((await get(address.port, "/health")).status).toBe(200);
  expect((await get(address.port, "/api/v2/session")).status).toBe(401);
  expect((await get(address.port, "/api/v2/session", token)).body.actor.identityId).toBe(actor.identityId);
  expect((await get(address.port, "/api/v2/session", token, "https://production.peacepad.ca")).status).toBe(403);
  await server.close();
});
