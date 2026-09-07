import { createHash } from "node:crypto";

import { asSessionAuthenticator, StagingSessionRegistry } from "./StagingSessionRegistry";

const pepper = "fictional-staging-pepper-1234";
const actorA = { identityId: "fictional-a", displayName: "Parent A", sessionId: "session-a", familyPermissions: { family: ["read"] } } as const;
const actorB = { identityId: "fictional-b", displayName: "Parent B", sessionId: "session-b", familyPermissions: { family: ["read"] } } as const;
const digest = (token: string) => createHash("sha256").update(`${pepper}:${token}`).digest("hex");

test("authenticates two fictional accounts independently", () => {
  const registry = new StagingSessionRegistry(pepper, [{ tokenHash: digest("token-a"), actor: actorA }, { tokenHash: digest("token-b"), actor: actorB }]);
  expect(registry.authenticate("token-a")?.identityId).toBe("fictional-a");
  expect(registry.authenticate("token-b")?.identityId).toBe("fictional-b");
});

test("rate limits repeated invalid tokens", () => {
  const registry = new StagingSessionRegistry(pepper, [{ tokenHash: digest("token-a"), actor: actorA }], 2);
  expect(registry.authenticate("bad")).toBeUndefined();
  expect(registry.authenticate("bad")).toBeUndefined();
  expect(registry.authenticate("bad")).toBeUndefined();
  expect(registry.authenticate("token-a")).toBeDefined();
});

test("adapts to the HTTP session authenticator contract", async () => {
  const registry = new StagingSessionRegistry(pepper, [{ tokenHash: digest("token-a"), actor: actorA }]);
  await expect(asSessionAuthenticator(registry).authenticate("token-a")).resolves.toMatchObject({ identityId: "fictional-a" });
});
