import type { StagingActor } from "./InvitationService";

export type StagingServerConfig = Readonly<{
  port: number;
  serviceOrigin: string;
  appOrigin: string;
  databaseUrl: string;
  invitationPepper: string;
  rateLimitPepper: string;
  idempotencyPepper: string;
  sessionPepper: string;
  sessionTokenHash: string;
  actor: StagingActor;
  families: Readonly<Record<string, string>>;
}>;

type Environment = Readonly<Record<string, string | undefined>>;

const required = (environment: Environment, name: string) => {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required for the isolated staging server.`);
  return value;
};

const object = (value: string, name: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("not an object");
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`${name} must be a JSON object.`);
  }
};

const stringMap = (value: string, name: string) => Object.fromEntries(
  Object.entries(object(value, name)).map(([key, item]) => {
    if (!key.trim() || typeof item !== "string" || !item.trim()) throw new Error(`${name} must contain non-empty strings.`);
    return [key, item.trim()];
  })
);

const permissionMap = (value: string, name: string) => Object.fromEntries(
  Object.entries(object(value, name)).map(([key, item]) => {
    if (!key.trim() || !Array.isArray(item) || item.some((permission) => typeof permission !== "string" || !permission.trim())) {
      throw new Error(`${name} must map family IDs to string permission arrays.`);
    }
    return [key, [...new Set(item.map((permission) => (permission as string).trim()))]];
  })
);

const stagingDatabase = (value: string) => {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("PEACEPAD_STAGING_DATABASE_URL must be a valid PostgreSQL URL."); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.pathname.toLowerCase().includes("staging")) {
    throw new Error("The staging database URL must use PostgreSQL and name an isolated staging database.");
  }
  return value;
};

const stagingWebOrigin = (value: string, name: string) => {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${name} must be a valid staging HTTPS origin.`); }
  if (url.protocol !== "https:" || !url.hostname.toLowerCase().endsWith(".staging.peacepad.ca") || url.origin !== value.replace(/\/$/, "")) {
    throw new Error(`${name} must be an isolated staging HTTPS origin without a path.`);
  }
  return url.origin;
};

export function readStagingServerConfig(environment: Environment): StagingServerConfig {
  if (required(environment, "PEACEPAD_RUNTIME_ENV") !== "staging") {
    throw new Error("The PeacePad native server is staging-only.");
  }
  const families = stringMap(required(environment, "PEACEPAD_STAGING_FAMILIES_JSON"), "PEACEPAD_STAGING_FAMILIES_JSON");
  const familyPermissions = permissionMap(
    required(environment, "PEACEPAD_STAGING_FAMILY_PERMISSIONS_JSON"),
    "PEACEPAD_STAGING_FAMILY_PERMISSIONS_JSON"
  );
  if (Object.keys(familyPermissions).some((familyId) => !(familyId in families))) {
    throw new Error("Every staging family permission entry must reference a configured synthetic family.");
  }
  const sessionTokenHash = required(environment, "PEACEPAD_STAGING_SESSION_TOKEN_HASH").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(sessionTokenHash)) throw new Error("PEACEPAD_STAGING_SESSION_TOKEN_HASH must be a SHA-256 hex digest.");
  const port = Number(environment.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port.");

  return {
    port,
    serviceOrigin: stagingWebOrigin(required(environment, "PEACEPAD_SERVICE_ORIGIN"), "PEACEPAD_SERVICE_ORIGIN"),
    appOrigin: stagingWebOrigin(required(environment, "PEACEPAD_STAGING_APP_ORIGIN"), "PEACEPAD_STAGING_APP_ORIGIN"),
    databaseUrl: stagingDatabase(required(environment, "PEACEPAD_STAGING_RUNTIME_DATABASE_URL")),
    invitationPepper: required(environment, "PEACEPAD_INVITATION_PEPPER"),
    rateLimitPepper: required(environment, "PEACEPAD_RATE_LIMIT_PEPPER"),
    idempotencyPepper: required(environment, "PEACEPAD_IDEMPOTENCY_PEPPER"),
    sessionPepper: required(environment, "PEACEPAD_STAGING_SESSION_PEPPER"),
    sessionTokenHash,
    actor: {
      identityId: required(environment, "PEACEPAD_STAGING_ACTOR_ID"),
      displayName: required(environment, "PEACEPAD_STAGING_ACTOR_DISPLAY_NAME"),
      sessionId: required(environment, "PEACEPAD_STAGING_SESSION_ID"),
      familyPermissions
    },
    families
  };
}
