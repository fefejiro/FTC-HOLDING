import { HttpPeacePadCoordinationApi } from "../api/CoordinationApi";
import type { PeacePadEnvironmentConfig } from "../config/environment";
import type { AccessTokenProvider } from "../api/CoordinationApi";

const APPROVED_SUPABASE_API_HOSTS = new Set([
  "rohvkyuxbnqzglaromms.supabase.co",
  "spmpndalcvwmygznihec.supabase.co"
]);

/** Creates the existing v2 coordination client with a fictional staging token. */
export const createStagingCoordinationClient = (
  config: PeacePadEnvironmentConfig,
  tokenProvider: AccessTokenProvider,
  fetcher: typeof fetch = fetch,
) => {
  if (config.environment !== "staging" || config.productionApiWritesEnabled !== false) {
    throw new Error("Coordination client requires the non-production staging environment.");
  }
  const host = new URL(config.apiBaseUrl).hostname;
  if (host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".staging.peacepad.ca") && !APPROVED_SUPABASE_API_HOSTS.has(host)) {
    throw new Error("Coordination client rejected a non-staging API host.");
  }
  return new HttpPeacePadCoordinationApi(config, fetcher, tokenProvider);
};
