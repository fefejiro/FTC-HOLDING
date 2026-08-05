import { readStagingServerConfig } from "./StagingServerConfig";

const valid = {
  PEACEPAD_RUNTIME_ENV: "staging",
  PEACEPAD_SERVICE_ORIGIN: "https://api.staging.peacepad.ca",
  PEACEPAD_STAGING_APP_ORIGIN: "https://app.staging.peacepad.ca",
  PEACEPAD_STAGING_RUNTIME_DATABASE_URL: "postgresql://synthetic@db.example/peacepad_native_staging",
  PEACEPAD_INVITATION_PEPPER: "invitation-staging-pepper",
  PEACEPAD_RATE_LIMIT_PEPPER: "rate-limit-staging-pepper",
  PEACEPAD_IDEMPOTENCY_PEPPER: "idempotency-staging-pepper",
  PEACEPAD_STAGING_SESSION_PEPPER: "session-staging-pepper",
  PEACEPAD_STAGING_FAMILIES_JSON: JSON.stringify({ "family-staging": "Example family" }),
  PEACEPAD_STAGING_ACTORS_JSON: JSON.stringify([
    {
      tokenHash: "a".repeat(64), identityId: "synthetic-owner", displayName: "Alex Example", sessionId: "synthetic-owner-session",
      familyPermissions: { "family-staging": ["invite", "messages:read", "messages:write"] }
    },
    {
      tokenHash: "b".repeat(64), identityId: "synthetic-recipient", displayName: "Jordan Example", sessionId: "synthetic-recipient-session",
      familyPermissions: { "family-staging": ["messages:read", "messages:write"] }
    }
  ]),
  PORT: "8787"
};

describe("readStagingServerConfig", () => {
  it("loads only an explicitly isolated synthetic staging configuration", () => {
    expect(readStagingServerConfig(valid)).toMatchObject({
      port: 8787,
      sessions: [
        { actor: { identityId: "synthetic-owner", familyPermissions: { "family-staging": ["invite", "messages:read", "messages:write"] } } },
        { actor: { identityId: "synthetic-recipient", familyPermissions: { "family-staging": ["messages:read", "messages:write"] } } }
      ],
      families: { "family-staging": "Example family" }
    });
  });

  it.each([
    [{ PEACEPAD_RUNTIME_ENV: "production" }, /staging-only/i],
    [{ PEACEPAD_STAGING_RUNTIME_DATABASE_URL: "postgresql://synthetic@db.example/peacepad" }, /isolated staging database/i],
    [{ PEACEPAD_STAGING_RUNTIME_DATABASE_URL: "https://db.example/peacepad_native_staging" }, /PostgreSQL/i],
    [{ PEACEPAD_STAGING_APP_ORIGIN: "https://peacepad.ca" }, /isolated staging HTTPS origin/i],
    [{ PEACEPAD_STAGING_ACTORS_JSON: JSON.stringify([]) }, /at least one synthetic actor/i],
    [{ PEACEPAD_STAGING_ACTORS_JSON: JSON.stringify([{ tokenHash: "plaintext-token" }]) }, /SHA-256/i],
    [{ PEACEPAD_STAGING_ACTORS_JSON: JSON.stringify([{ tokenHash: "a".repeat(64), identityId: "owner", displayName: "Alex", sessionId: "session", familyPermissions: { unknown: ["invite"] } }]) }, /configured synthetic family/i],
    [{ PEACEPAD_STAGING_ACTORS_JSON: JSON.stringify([
      { tokenHash: "a".repeat(64), identityId: "owner", displayName: "Alex", sessionId: "session-a", familyPermissions: {} },
      { tokenHash: "a".repeat(64), identityId: "recipient", displayName: "Jordan", sessionId: "session-b", familyPermissions: {} }
    ]) }, /token hash.*unique/i],
    [{ PORT: "70000" }, /TCP port/i]
  ])("rejects unsafe configuration %j", (override, expected) => {
    expect(() => readStagingServerConfig({ ...valid, ...override })).toThrow(expected);
  });
});
