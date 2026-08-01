import { HashedStagingSessionAuthenticator } from "./HashedStagingSessionAuthenticator";

const actor = {
  identityId: "synthetic-owner",
  displayName: "Alex Example",
  sessionId: "synthetic-session",
  familyPermissions: { "family-staging": ["invite"] }
};

describe("HashedStagingSessionAuthenticator", () => {
  it("returns the synthetic actor only for a matching peppered hash", async () => {
    const digest = { digest: jest.fn(async (input: string) => input.endsWith(":valid-token") ? "a".repeat(64) : "b".repeat(64)) };
    const authenticator = new HashedStagingSessionAuthenticator(digest, "session-staging-pepper", "a".repeat(64), actor);

    await expect(authenticator.authenticate("valid-token")).resolves.toEqual(actor);
    await expect(authenticator.authenticate("invalid-token")).resolves.toBeUndefined();
    expect(digest.digest).toHaveBeenCalledWith("session-staging-pepper:valid-token");
  });

  it("rejects plaintext hashes and weak peppers", () => {
    const digest = { digest: async () => "a".repeat(64) };
    expect(() => new HashedStagingSessionAuthenticator(digest, "short", "a".repeat(64), actor)).toThrow(/pepper/i);
    expect(() => new HashedStagingSessionAuthenticator(digest, "session-staging-pepper", "plaintext", actor)).toThrow(/SHA-256/i);
  });
});
