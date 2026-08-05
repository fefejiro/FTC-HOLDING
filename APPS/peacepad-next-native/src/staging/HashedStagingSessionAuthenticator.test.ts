import { HashedStagingSessionAuthenticator } from "./HashedStagingSessionAuthenticator";

const actor = {
  identityId: "synthetic-owner",
  displayName: "Alex Example",
  sessionId: "synthetic-session",
  familyPermissions: { "family-staging": ["invite"] }
};
const secondActor = {
  identityId: "synthetic-recipient",
  displayName: "Jordan Example",
  sessionId: "synthetic-recipient-session",
  familyPermissions: { "family-staging": ["messages:read"] }
};

describe("HashedStagingSessionAuthenticator", () => {
  it("returns the synthetic actor only for a matching peppered hash", async () => {
    const digest = { digest: jest.fn(async (input: string) => input.endsWith(":valid-token") ? "a".repeat(64) : "c".repeat(64)) };
    const authenticator = new HashedStagingSessionAuthenticator(digest, "session-staging-pepper", [
      { tokenHash: "a".repeat(64), actor },
      { tokenHash: "b".repeat(64), actor: secondActor }
    ]);

    await expect(authenticator.authenticate("valid-token")).resolves.toEqual(actor);
    await expect(authenticator.authenticate("invalid-token")).resolves.toBeUndefined();
    expect(digest.digest).toHaveBeenCalledWith("session-staging-pepper:valid-token");
  });

  it("maps independent token hashes to independent synthetic actors", async () => {
    const digest = { digest: jest.fn(async (input: string) => input.endsWith(":recipient-token") ? "b".repeat(64) : "a".repeat(64)) };
    const authenticator = new HashedStagingSessionAuthenticator(digest, "session-staging-pepper", [
      { tokenHash: "a".repeat(64), actor },
      { tokenHash: "b".repeat(64), actor: secondActor }
    ]);

    await expect(authenticator.authenticate("owner-token")).resolves.toEqual(actor);
    await expect(authenticator.authenticate("recipient-token")).resolves.toEqual(secondActor);
  });

  it("rejects plaintext hashes and weak peppers", () => {
    const digest = { digest: async () => "a".repeat(64) };
    expect(() => new HashedStagingSessionAuthenticator(digest, "short", [{ tokenHash: "a".repeat(64), actor }])).toThrow(/pepper/i);
    expect(() => new HashedStagingSessionAuthenticator(digest, "session-staging-pepper", [{ tokenHash: "plaintext", actor }])).toThrow(/SHA-256/i);
    expect(() => new HashedStagingSessionAuthenticator(digest, "session-staging-pepper", [])).toThrow(/at least one/i);
    expect(() => new HashedStagingSessionAuthenticator(digest, "session-staging-pepper", [
      { tokenHash: "a".repeat(64), actor },
      { tokenHash: "a".repeat(64), actor: secondActor }
    ])).toThrow(/unique/i);
  });
});
