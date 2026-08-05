export type PeacePadEnvironment = "lab" | "staging";

export type PeacePadEnvironmentConfig = {
  environment: PeacePadEnvironment;
  apiBaseUrl: string;
  requestTimeoutMs: number;
  productionApiWritesEnabled: false;
};

type EnvironmentValues = Record<string, string | undefined>;

declare const process: {
  env?: EnvironmentValues;
};

const DEFAULT_LAB_API_URL = "http://127.0.0.1:8787";
const PRODUCTION_API_HOST = /^https:\/\/api\.peacepad\.ca(?:\/|$)/i;

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

  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    throw new Error("PeacePad API base URL must use HTTP or HTTPS.");
  }

  if (PRODUCTION_API_HOST.test(apiBaseUrl)) {
    throw new Error("The native Gate 1 client must not target the production PeacePad API.");
  }

  return {
    environment,
    apiBaseUrl,
    requestTimeoutMs: 12_000,
    productionApiWritesEnabled: false
  };
}

export const environmentConfig = resolveEnvironmentConfig();
