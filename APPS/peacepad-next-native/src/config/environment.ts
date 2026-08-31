export type PeacePadEnvironment = "lab" | "staging" | "production";

export type PeacePadEnvironmentConfig = {
  environment: PeacePadEnvironment;
  apiBaseUrl: string;
  requestTimeoutMs: number;
  productionApiWritesEnabled: boolean;
  diagnosticsEnabled: boolean;
};

export type PeacePadStagingRegion = "ca";

export type PeacePadSupabaseConfig = Readonly<{
  environment: "staging" | "production";
  region: PeacePadStagingRegion;
  projectRef: string;
  projectUrl: string;
  publishableKey: string;
  apiBaseUrl: string;
}>;

type EnvironmentValues = Record<string, string | undefined>;

declare const process: {
  env: EnvironmentValues;
};

const DEFAULT_LAB_API_URL = "http://127.0.0.1:8787";
const PRODUCTION_API_HOST = /^https:\/\/api\.peacepad\.ca(?:\/|$)/i;
const STAGING_PROJECT = "rohvkyuxbnqzglaromms";
const STAGING_FUNCTION_REGION = "ca-central-1";
// The proven Canada project is promoted in place for production. Runtime mode
// and explicit write authorization, rather than a second Supabase project,
// preserve the staging/production safety boundary.
const PRODUCTION_PROJECT = STAGING_PROJECT;
const PRODUCTION_FUNCTION_REGION = "ca-central-1";

function readBundledEnvironmentValues(): EnvironmentValues {
  // Expo replaces only direct process.env.EXPO_PUBLIC_* references in the
  // JavaScript bundle. Do not replace this with a dynamic process.env object.
  return {
    EXPO_PUBLIC_PEACEPAD_ENV: process.env.EXPO_PUBLIC_PEACEPAD_ENV,
    EXPO_PUBLIC_PEACEPAD_REGION: process.env.EXPO_PUBLIC_PEACEPAD_REGION,
    EXPO_PUBLIC_PEACEPAD_SUPABASE_URL: process.env.EXPO_PUBLIC_PEACEPAD_SUPABASE_URL,
    EXPO_PUBLIC_PEACEPAD_API_BASE_URL: process.env.EXPO_PUBLIC_PEACEPAD_API_BASE_URL,
    EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_URL: process.env.EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_URL,
    EXPO_PUBLIC_PEACEPAD_CA_API_BASE_URL: process.env.EXPO_PUBLIC_PEACEPAD_CA_API_BASE_URL,
    EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_PEACEPAD_PRODUCTION_SUPABASE_URL: process.env.EXPO_PUBLIC_PEACEPAD_PRODUCTION_SUPABASE_URL,
    EXPO_PUBLIC_PEACEPAD_PRODUCTION_API_BASE_URL: process.env.EXPO_PUBLIC_PEACEPAD_PRODUCTION_API_BASE_URL,
    EXPO_PUBLIC_PEACEPAD_PRODUCTION_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_PEACEPAD_PRODUCTION_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED: process.env.EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED,
    EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS: process.env.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS
  };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function resolveEnvironmentConfig(
  values: EnvironmentValues = readBundledEnvironmentValues()
): PeacePadEnvironmentConfig {
  const environment: PeacePadEnvironment = values.EXPO_PUBLIC_PEACEPAD_ENV === "production"
    ? "production"
    : values.EXPO_PUBLIC_PEACEPAD_ENV === "staging" ? "staging" : "lab";
  const configuredUrl = (environment === "production" ? values.EXPO_PUBLIC_PEACEPAD_PRODUCTION_API_BASE_URL?.trim() : undefined)
    || values.EXPO_PUBLIC_PEACEPAD_API_BASE_URL?.trim()
    || values.EXPO_PUBLIC_PEACEPAD_CA_API_BASE_URL?.trim();

  if (environment === "staging" && !configuredUrl) {
    throw new Error("Staging requires EXPO_PUBLIC_PEACEPAD_API_BASE_URL.");
  }
  if (environment === "production" && !configuredUrl) {
    throw new Error("Production requires EXPO_PUBLIC_PEACEPAD_PRODUCTION_API_BASE_URL.");
  }

  const apiBaseUrl = trimTrailingSlash(configuredUrl || DEFAULT_LAB_API_URL);
  const diagnosticsEnabled = values.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS === "true";

  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    throw new Error("PeacePad API base URL must use HTTP or HTTPS.");
  }

  if (PRODUCTION_API_HOST.test(apiBaseUrl)) {
    throw new Error("The native Gate 1 client must not target the production PeacePad API.");
  }

  const productionApiWritesEnabled = values.EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED === "true";
  if (environment === "production") {
    const expectedApiBaseUrl = `https://${PRODUCTION_PROJECT}.supabase.co/functions/v1/peacepad-v2-api`;
    if (apiBaseUrl !== expectedApiBaseUrl) {
      throw new Error("Production must use the exact approved Canada Supabase API.");
    }
    if (!productionApiWritesEnabled) {
      throw new Error("Production requires explicit production-write authorization.");
    }
  } else if (productionApiWritesEnabled) {
    throw new Error("Production writes cannot be enabled outside the production runtime.");
  }

  if (diagnosticsEnabled && environment !== "lab") {
    throw new Error("PeacePad diagnostics are allowed only in the local lab environment.");
  }

  return {
    environment,
    apiBaseUrl,
    requestTimeoutMs: 12_000,
    productionApiWritesEnabled,
    diagnosticsEnabled
  };
}

export const environmentConfig = resolveEnvironmentConfig();

export function resolveFunctionInvocationRegion(apiBaseUrl: string): string | undefined {
  const normalizedUrl = trimTrailingSlash(apiBaseUrl);
  const expectedStagingApiBaseUrl = `https://${STAGING_PROJECT}.supabase.co/functions/v1/peacepad-v2-api`;
  if (normalizedUrl === expectedStagingApiBaseUrl) return STAGING_FUNCTION_REGION;
  if (normalizedUrl === `https://${PRODUCTION_PROJECT}.supabase.co/functions/v1/peacepad-v2-api`) {
    return PRODUCTION_FUNCTION_REGION;
  }
  return undefined;
}

export function resolveSupabaseStagingConfig(
  values: EnvironmentValues = readBundledEnvironmentValues()
): PeacePadSupabaseConfig {
  if (values.EXPO_PUBLIC_PEACEPAD_ENV !== "staging") {
    throw new Error("Supabase coordination is available only in staging.");
  }
  const region = values.EXPO_PUBLIC_PEACEPAD_REGION;
  if (region !== "ca") {
    throw new Error("Staging requires EXPO_PUBLIC_PEACEPAD_REGION=ca.");
  }
  const projectRef = STAGING_PROJECT;
  const projectUrl = trimTrailingSlash(values.EXPO_PUBLIC_PEACEPAD_SUPABASE_URL?.trim() ?? "");
  const publishableKey = values.EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  const apiBaseUrl = trimTrailingSlash(values.EXPO_PUBLIC_PEACEPAD_API_BASE_URL?.trim() ?? "");
  const expectedProjectUrl = `https://${projectRef}.supabase.co`;
  const expectedApiBaseUrl = `${expectedProjectUrl}/functions/v1/peacepad-v2-api`;

  if (projectUrl !== expectedProjectUrl || apiBaseUrl !== expectedApiBaseUrl) {
    throw new Error(`Staging ${region.toUpperCase()} must use its exact approved Supabase project.`);
  }
  if (!publishableKey.startsWith("sb_publishable_") || publishableKey.startsWith("sb_secret_") || publishableKey.split(".").length === 3) {
    throw new Error("Staging requires an sb_publishable_ Supabase key; secret and legacy JWT keys are prohibited.");
  }
  return { environment: "staging", region, projectRef, projectUrl, publishableKey, apiBaseUrl };
}

export function resolveSupabaseProductionConfig(
  values: EnvironmentValues = readBundledEnvironmentValues()
): PeacePadSupabaseConfig {
  if (values.EXPO_PUBLIC_PEACEPAD_ENV !== "production") {
    throw new Error("Production coordination requires the production runtime.");
  }
  const projectUrl = trimTrailingSlash(values.EXPO_PUBLIC_PEACEPAD_PRODUCTION_SUPABASE_URL?.trim() ?? "");
  const apiBaseUrl = trimTrailingSlash(values.EXPO_PUBLIC_PEACEPAD_PRODUCTION_API_BASE_URL?.trim() ?? "");
  const publishableKey = values.EXPO_PUBLIC_PEACEPAD_PRODUCTION_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  const expectedProjectUrl = `https://${PRODUCTION_PROJECT}.supabase.co`;
  const expectedApiBaseUrl = `${expectedProjectUrl}/functions/v1/peacepad-v2-api`;
  if (projectUrl !== expectedProjectUrl || apiBaseUrl !== expectedApiBaseUrl) {
    throw new Error("Production must use the exact approved Canada Supabase project.");
  }
  if (!publishableKey.startsWith("sb_publishable_") || publishableKey.startsWith("sb_secret_") || publishableKey.split(".").length === 3) {
    throw new Error("Production requires an sb_publishable_ Supabase key; secret and legacy JWT keys are prohibited.");
  }
  if (values.EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED !== "true") {
    throw new Error("Production coordination requires explicit production-write authorization.");
  }
  return {
    environment: "production",
    region: "ca",
    projectRef: PRODUCTION_PROJECT,
    projectUrl,
    publishableKey,
    apiBaseUrl
  };
}

export function resolveSupabaseStagingDirectory(
  values: EnvironmentValues = readBundledEnvironmentValues()
): readonly PeacePadSupabaseConfig[] {
  if (values.EXPO_PUBLIC_PEACEPAD_ENV !== "staging") {
    throw new Error("Supabase coordination is available only in staging.");
  }
  const directValues: EnvironmentValues = values.EXPO_PUBLIC_PEACEPAD_SUPABASE_URL?.trim()
    ? values
    : {
      EXPO_PUBLIC_PEACEPAD_ENV: "staging",
      EXPO_PUBLIC_PEACEPAD_REGION: "ca",
      EXPO_PUBLIC_PEACEPAD_SUPABASE_URL: values.EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_URL,
      EXPO_PUBLIC_PEACEPAD_API_BASE_URL: values.EXPO_PUBLIC_PEACEPAD_CA_API_BASE_URL,
      EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY: values.EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_PUBLISHABLE_KEY
    };
  return [resolveSupabaseStagingConfig(directValues)];
}

export function resolveSupabaseRuntimeDirectory(
  values: EnvironmentValues = readBundledEnvironmentValues()
): readonly PeacePadSupabaseConfig[] {
  return values.EXPO_PUBLIC_PEACEPAD_ENV === "production"
    ? [resolveSupabaseProductionConfig(values)]
    : resolveSupabaseStagingDirectory(values);
}
