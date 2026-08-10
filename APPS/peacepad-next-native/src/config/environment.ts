export type PeacePadEnvironment = "lab" | "staging";

export type PeacePadEnvironmentConfig = {
  environment: PeacePadEnvironment;
  apiBaseUrl: string;
  requestTimeoutMs: number;
  productionApiWritesEnabled: false;
  diagnosticsEnabled: boolean;
};

export type PeacePadStagingRegion = "ca" | "us";

export type PeacePadSupabaseConfig = Readonly<{
  region: PeacePadStagingRegion;
  projectRef: string;
  projectUrl: string;
  publishableKey: string;
  apiBaseUrl: string;
}>;

type EnvironmentValues = Record<string, string | undefined>;

declare const process: {
  env?: EnvironmentValues;
};

const DEFAULT_LAB_API_URL = "http://127.0.0.1:8787";
const PRODUCTION_API_HOST = /^https:\/\/api\.peacepad\.ca(?:\/|$)/i;
const STAGING_PROJECTS: Record<PeacePadStagingRegion, string> = {
  ca: "rohvkyuxbnqzglaromms",
  us: "spmpndalcvwmygznihec"
};
const STAGING_FUNCTION_REGIONS: Record<PeacePadStagingRegion, string> = {
  ca: "ca-central-1",
  us: "us-east-1"
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function resolveEnvironmentConfig(
  values: EnvironmentValues = process.env ?? {}
): PeacePadEnvironmentConfig {
  const environment = values.EXPO_PUBLIC_PEACEPAD_ENV === "staging" ? "staging" : "lab";
  const configuredUrl = values.EXPO_PUBLIC_PEACEPAD_API_BASE_URL?.trim();

  if (environment === "staging" && !configuredUrl) {
    throw new Error("Staging requires EXPO_PUBLIC_PEACEPAD_API_BASE_URL.");
  }

  const apiBaseUrl = trimTrailingSlash(configuredUrl || DEFAULT_LAB_API_URL);
  const diagnosticsEnabled = values.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS === "true";

  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    throw new Error("PeacePad API base URL must use HTTP or HTTPS.");
  }

  if (PRODUCTION_API_HOST.test(apiBaseUrl)) {
    throw new Error("The native Gate 1 client must not target the production PeacePad API.");
  }

  if (diagnosticsEnabled && environment !== "lab") {
    throw new Error("PeacePad diagnostics are allowed only in the local lab environment.");
  }

  return {
    environment,
    apiBaseUrl,
    requestTimeoutMs: 12_000,
    productionApiWritesEnabled: false,
    diagnosticsEnabled
  };
}

export const environmentConfig = resolveEnvironmentConfig();

export function resolveFunctionInvocationRegion(apiBaseUrl: string): string | undefined {
  const normalizedUrl = trimTrailingSlash(apiBaseUrl);
  for (const region of Object.keys(STAGING_PROJECTS) as PeacePadStagingRegion[]) {
    const expectedApiBaseUrl = `https://${STAGING_PROJECTS[region]}.supabase.co/functions/v1/peacepad-v2-api`;
    if (normalizedUrl === expectedApiBaseUrl) return STAGING_FUNCTION_REGIONS[region];
  }
  return undefined;
}

export function resolveSupabaseStagingConfig(
  values: EnvironmentValues = process.env ?? {}
): PeacePadSupabaseConfig {
  if (values.EXPO_PUBLIC_PEACEPAD_ENV !== "staging") {
    throw new Error("Supabase coordination is available only in staging.");
  }
  const region = values.EXPO_PUBLIC_PEACEPAD_REGION;
  if (region !== "ca" && region !== "us") {
    throw new Error("Staging requires EXPO_PUBLIC_PEACEPAD_REGION=ca or us.");
  }
  const projectRef = STAGING_PROJECTS[region];
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
  return { region, projectRef, projectUrl, publishableKey, apiBaseUrl };
}
