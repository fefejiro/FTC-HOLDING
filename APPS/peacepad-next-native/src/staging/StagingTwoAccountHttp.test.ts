import { createHash } from "node:crypto";

import { StagingHttpServer } from "./StagingHttpServer";
import { asSessionAuthenticator, StagingSessionRegistry } from "./StagingSessionRegistry";
import type { StagingServerConfig } from "./StagingServerConfig";

test("two fictional sessions resolve through the HTTP rail", async () => {
  const pepper = "fictional-staging-pepper-1234";
  const hash = (token: string) => createHash("sha256").update(`${pepper}:${token}`).digest("hex");
  const actor = (id: string) => ({ identityId: id, displayName: id, sessionId: id, familyPermissions: { family: ["read"] } });
  const config = { port: 0, serviceOrigin: "http://127.0.0.1:0", appOrigin: "http://127.0.0.1:3000", region: "ca" } as unknown as StagingServerConfig;
  const registry = new StagingSessionRegistry(pepper, [{ tokenHash: hash("a"), actor: actor("fictional-a") }, { tokenHash: hash("b"), actor: actor("fictional-b") }]);
  const server = new StagingHttpServer(config, asSessionAuthenticator(registry));
  await server.listen();
  const port = (server as any).server.address().port as number;
  const response = await fetch(`http://127.0.0.1:${port}/api/v2/session`, { headers: { origin: config.appOrigin, authorization: "Bearer b" } });
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ actor: { identityId: "fictional-b" } });
  await server.close();
});
