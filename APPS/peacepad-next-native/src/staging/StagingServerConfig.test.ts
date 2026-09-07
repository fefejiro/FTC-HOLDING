import { readStagingServerConfig } from "./StagingServerConfig";

const environment = () => ({
  PEACEPAD_RUNTIME_ENV: "staging",
  PEACEPAD_SERVICE_ORIGIN: "https://api.staging.peacepad.ca",
  PEACEPAD_STAGING_APP_ORIGIN: "https://app.staging.peacepad.ca",
  PEACEPAD_STAGING_DATABASE_URL: "postgresql://user:pass@localhost/peacepad_staging",
  PEACEPAD_STAGING_SESSION_PEPPER: "a-secure-fictional-staging-only-pepper",
  PEACEPAD_STAGING_SESSION_TOKEN_HASH: "a".repeat(64),
  PEACEPAD_STAGING_ACTOR_ID: "fictional-parent-a",
  PEACEPAD_STAGING_ACTOR_DISPLAY_NAME: "Alex Example",
  PEACEPAD_STAGING_SESSION_ID: "fictional-session-a",
  PEACEPAD_STAGING_FAMILIES_JSON: '{"fictional-family":"Example family"}',
  PEACEPAD_STAGING_FAMILY_PERMISSIONS_JSON: '{"fictional-family":["invite:create"]}',
  PEACEPAD_STAGING_REGION: "ca"
});

describe("readStagingServerConfig", () => {
  it("accepts an isolated fictional staging configuration", () => {
    expect(readStagingServerConfig(environment())).toMatchObject({ port: 8787, region: "ca", families: { "fictional-family": "Example family" } });
  });

  it.each([
    ["PEACEPAD_RUNTIME_ENV", "production", "staging-only"],
    ["PEACEPAD_SERVICE_ORIGIN", "https://peacepad.ca", "isolated staging"],
    ["PEACEPAD_STAGING_DATABASE_URL", "postgresql://x/y", "isolated staging database"],
    ["PEACEPAD_STAGING_SESSION_TOKEN_HASH", "not-a-hash", "SHA-256"],
    ["PORT", "70000", "valid TCP port"],
    ["PEACEPAD_STAGING_REGION", "eu", "ca or us"]
  ])("rejects %s", (key, value, message) => {
    expect(() => readStagingServerConfig({ ...environment(), [key]: value })).toThrow(message);
  });
});
