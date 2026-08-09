import { validateVerifiedSessionContext } from "./PeacePadStagingRuntime";

const IDENTITY = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";
const FAMILY = "33333333-3333-4333-8333-333333333333";
const GRANT = "44444444-4444-4444-8444-444444444444";

const valid = {
  actor: { identityId: IDENTITY, sessionId: SESSION, displayName: "Fictional Parent" },
  memberships: [{
    familyCircleId: FAMILY,
    participantGrantId: GRANT,
    familyName: "Fictional Family",
    role: "parent",
    permissions: ["messages", "calendar"],
    version: 1
  }],
  region: "ca",
  schemaVersion: "2.0"
};

describe("validateVerifiedSessionContext", () => {
  it("accepts a server-verified regional actor and active membership", () => {
    expect(validateVerifiedSessionContext(valid, IDENTITY, "ca")).toEqual(valid);
  });

  it.each([
    ["identity mismatch", { ...valid, actor: { ...valid.actor, identityId: "55555555-5555-4555-8555-555555555555" } }, "ca"],
    ["invalid session", { ...valid, actor: { ...valid.actor, sessionId: "device-session" } }, "ca"],
    ["region mismatch", { ...valid, region: "us" }, "ca"],
    ["invalid membership", { ...valid, memberships: [{ ...valid.memberships[0], familyCircleId: "family-current" }] }, "ca"],
    ["schema mismatch", { ...valid, schemaVersion: "1.0" }, "ca"]
  ])("fails closed for %s", (_label, value, region) => {
    expect(() => validateVerifiedSessionContext(value, IDENTITY, region as "ca" | "us")).toThrow();
  });

  it("allows a verified account with no membership so the UI can show a safe empty state", () => {
    expect(validateVerifiedSessionContext({ ...valid, memberships: [] }, IDENTITY, "ca").memberships).toEqual([]);
  });
});
