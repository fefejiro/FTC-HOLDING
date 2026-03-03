import fs from "fs";
import path from "path";

type EnvMode = "development" | "test" | "production";

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeOrigin(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new Error("Origin value cannot be empty");
  }
  if (trimmed === "*") {
    return trimmed;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "capacitor:") {
      return "capacitor://localhost";
    }
    return parsed.origin;
  }

  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed)) {
    return `http://${trimmed.toLowerCase()}`;
  }

  return `https://${trimmed.toLowerCase()}`;
}

function parseOriginList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  const parsed = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
  return unique(parsed);
}

function toHostname(originOrHost: string): string | undefined {
  if (!originOrHost || originOrHost === "*") {
    return undefined;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(originOrHost)) {
    try {
      return new URL(originOrHost).hostname.toLowerCase();
    } catch {
      return undefined;
    }
  }

  return originOrHost.split(":")[0].toLowerCase();
}

function buildDatabaseUrl(): string | undefined {
  const directUrl = readEnv("DATABASE_URL");
  if (directUrl) {
    return directUrl;
  }

  const host = readEnv("PGHOST");
  const port = readEnv("PGPORT") ?? "5432";
  const user = readEnv("PGUSER");
  const password = readEnv("PGPASSWORD");
  const database = readEnv("PGDATABASE");

  if (host && user && password && database) {
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }

  return undefined;
}

function loadFirebaseServiceAccountJson(): string | undefined {
  const inlineJson = readEnv("FIREBASE_SERVICE_ACCOUNT_JSON") ?? readEnv("FIREBASE_SERVICE_ACCOUNT");
  if (inlineJson) {
    return inlineJson;
  }

  const filePath = readEnv("FIREBASE_SERVICE_ACCOUNT_JSON_PATH");
  if (!filePath) {
    return undefined;
  }

  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`[Config] FIREBASE_SERVICE_ACCOUNT_JSON_PATH does not exist: ${resolved}`);
  }

  return fs.readFileSync(resolved, "utf8").trim();
}

const nodeEnv = (process.env.NODE_ENV ?? "development") as EnvMode;
const isProduction = nodeEnv === "production";
const isDevelopment = nodeEnv === "development";

const publicBaseUrl = readEnv("PUBLIC_BASE_URL");
const normalizedPublicBaseUrl = publicBaseUrl ? normalizeOrigin(publicBaseUrl) : undefined;
const legacyReplitDomains = parseOriginList(readEnv("REPLIT_DOMAINS"));

const appOrigins = unique(
  [
    ...(normalizedPublicBaseUrl ? [normalizedPublicBaseUrl] : []),
    ...parseOriginList(readEnv("APP_ORIGINS")),
    ...legacyReplitDomains,
    ...(isDevelopment
      ? [
          "http://localhost",
          "http://127.0.0.1",
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:5173",
          "http://127.0.0.1:5173",
          "http://localhost:5174",
          "http://127.0.0.1:5174",
          "capacitor://localhost",
        ]
      : []),
  ].filter(Boolean),
);

const corsAllowedOrigins = unique(
  [
    "https://peacepad.ca",
    "https://www.peacepad.ca",
    "capacitor://localhost",
    "http://localhost",
    ...appOrigins,
    ...legacyReplitDomains,
    ...parseOriginList(readEnv("CORS_ALLOWED_ORIGINS")),
  ].filter(Boolean),
);

const corsAllowCredentials = parseBoolean(readEnv("CORS_ALLOW_CREDENTIALS"), true);
if (corsAllowCredentials && corsAllowedOrigins.includes("*")) {
  throw new Error(
    "[Config] CORS_ALLOW_CREDENTIALS=true is incompatible with wildcard origin '*'. Set explicit CORS_ALLOWED_ORIGINS.",
  );
}

const databaseUrl = buildDatabaseUrl();
const openAiApiKey = readEnv("OPENAI_API_KEY") ?? readEnv("AI_INTEGRATIONS_OPENAI_API_KEY");
const openAiBaseUrl =
  readEnv("OPENAI_BASE_URL") ??
  readEnv("AI_INTEGRATIONS_OPENAI_BASE_URL") ??
  (isDevelopment ? "https://api.openai.com/v1" : undefined);
const mailjetApiKey = readEnv("MAILJET_API_KEY");
const mailjetSecretKey = readEnv("MAILJET_SECRET_KEY");
const vapidPublicKey = readEnv("VAPID_PUBLIC_KEY");
const vapidPrivateKey = readEnv("VAPID_PRIVATE_KEY");
const vapidEmail = readEnv("VAPID_EMAIL") ?? (isDevelopment ? "mailto:dev@peacepad.local" : undefined);
const vitsBaseUrl = readEnv("VITS_BASE_URL") ?? (isDevelopment ? "http://localhost:5050" : undefined);
const firebaseServiceAccountJson = loadFirebaseServiceAccountJson();

const sessionSecret = readEnv("SESSION_SECRET") ?? (isDevelopment ? "dev-session-secret-change-me" : undefined);

const oidcClientId = readEnv("OIDC_CLIENT_ID") ?? readEnv("REPL_ID");
const oidcIssuerUrl = readEnv("OIDC_ISSUER_URL") ?? readEnv("ISSUER_URL") ?? "https://replit.com/oidc";

const authAllowedHostnames = unique(
  [
    ...appOrigins.map(toHostname),
    ...corsAllowedOrigins.map(toHostname),
    ...(normalizedPublicBaseUrl ? [toHostname(normalizedPublicBaseUrl)] : []),
  ].filter((value): value is string => Boolean(value)),
);

const missing: string[] = [];
if (!sessionSecret) {
  missing.push("SESSION_SECRET");
}
if (!databaseUrl) {
  missing.push("DATABASE_URL (or PGHOST, PGUSER, PGPASSWORD, PGDATABASE)");
}
if (isProduction) {
  if (!openAiApiKey) missing.push("OPENAI_API_KEY (or AI_INTEGRATIONS_OPENAI_API_KEY)");
  if (!openAiBaseUrl) missing.push("OPENAI_BASE_URL (or AI_INTEGRATIONS_OPENAI_BASE_URL)");
  if (!vapidPublicKey) missing.push("VAPID_PUBLIC_KEY");
  if (!vapidPrivateKey) missing.push("VAPID_PRIVATE_KEY");
  if (!vapidEmail) missing.push("VAPID_EMAIL");
  if (!vitsBaseUrl) missing.push("VITS_BASE_URL");
  if (!mailjetApiKey) missing.push("MAILJET_API_KEY");
  if (!mailjetSecretKey) missing.push("MAILJET_SECRET_KEY");
  if (!firebaseServiceAccountJson) {
    missing.push("FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_SERVICE_ACCOUNT_JSON_PATH)");
  }
}

if (missing.length > 0) {
  throw new Error(`[Config] Missing required environment variables: ${missing.join(", ")}`);
}

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}
if (openAiApiKey) {
  process.env.OPENAI_API_KEY = openAiApiKey;
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY = openAiApiKey;
}
if (openAiBaseUrl) {
  process.env.OPENAI_BASE_URL = openAiBaseUrl;
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL = openAiBaseUrl;
}
if (firebaseServiceAccountJson) {
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = firebaseServiceAccountJson;
  process.env.FIREBASE_SERVICE_ACCOUNT = firebaseServiceAccountJson;
}
if (sessionSecret) {
  process.env.SESSION_SECRET = sessionSecret;
}

export const config = {
  nodeEnv,
  isProduction,
  isDevelopment,
  server: {
    host: "0.0.0.0",
    port: parsePort(readEnv("PORT"), 5000),
    publicBaseUrl: normalizedPublicBaseUrl,
  },
  cors: {
    allowedOrigins: corsAllowedOrigins,
    allowCredentials: corsAllowCredentials,
  },
  database: {
    url: databaseUrl as string,
    directUrl: readEnv("DIRECT_URL"),
  },
  auth: {
    sessionSecret: sessionSecret as string,
    oidcIssuerUrl,
    oidcClientId,
    oidcEnabled: Boolean(oidcClientId),
    allowedHostnames: authAllowedHostnames,
  },
  app: {
    origins: appOrigins,
  },
  integrations: {
    openAiApiKey,
    openAiBaseUrl,
    vitsBaseUrl,
    mailjetApiKey,
    mailjetSecretKey,
    vapidPublicKey,
    vapidPrivateKey,
    vapidEmail,
    firebaseServiceAccountJson,
  },
} as const;

export type AppConfig = typeof config;
