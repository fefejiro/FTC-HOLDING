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
  PEACEPAD_STAGING_SESSION_TOKEN_HASH: "a".repeat(64),
  PEACEPAD_STAGING_ACTOR_ID: "synthetic-owner",
  PEACEPAD_STAGING_ACTOR_DISPLAY_NAME: "Alex Example",
  PEACEPAD_STAGING_SESSION_ID: "synthetic-session",
  PEACEPAD_STAGING_FAMILIES_JSON: JSON.stringify({ "family-staging": "Example family" }),
  PEACEPAD_STAGING_FAMILY_PERMISSIONS_JSON: JSON.stringify({ "family-staging": ["invite"] }),
  PORT: "8787"
};

describe("readStagingServerConfig", () => {
  it("loads only an explicitly isolated synthetic staging configuration", () => {
    expect(readStagingServerConfig(valid)).toMatchObject({
      port: 8787,
      actor: { identityId: "synthetic-owner", familyPermissions: { "family-staging": ["invite"] } },
      families: { "family-staging": "Example family" }
    });
  });

  it.each([
    [{ PEACEPAD_RUNTIME_ENV: "production" }, /staging-only/i],
    [{ PEACEPAD_STAGING_RUNTIME_DATABASE_URL: "postgresql://synthetic@db.example/peacepad" }, /isolated staging database/i],
    [{ PEACEPAD_STAGING_RUNTIME_DATABASE_URL: "https://db.example/peacepad_native_staging" }, /PostgreSQL/i],
    [{ PEACEPAD_STAGING_APP_ORIGIN: "https://peacepad.ca" }, /isolated staging HTTPS origin/i],
    [{ PEACEPAD_STAGING_SESSION_TOKEN_HASH: "plaintext-token" }, /SHA-256/i],
    [{ PEACEPAD_STAGING_FAMILY_PERMISSIONS_JSON: JSON.stringify({ unknown: ["invite"] }) }, /configured synthetic family/i],
    [{ PORT: "70000" }, /TCP port/i]
  ])("rejects unsafe configuration %j", (override, expected) => {
    expect(() => readStagingServerConfig({ ...valid, ...override })).toThrow(expected);
  });
});
