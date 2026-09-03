import { HttpPeacePadCoordinationApi } from "../api/CoordinationApi";
import type { PeacePadEnvironmentConfig } from "../config/environment";
import type { AccessTokenProvider } from "../api/CoordinationApi";

const APPROVED_SUPABASE_API_HOSTS = new Set([
  "rohvkyuxbnqzglaromms.supabase.co"
]);

/** Creates the existing v2 coordination client with a fictional staging token. */
export const createStagingCoordinationClient = (
  config: PeacePadEnvironmentConfig,
  tokenProvider: AccessTokenProvider,
  fetcher: typeof fetch = fetch,
) => {
  const staging = config.environment === "staging" && config.productionApiWritesEnabled === false;
  const production = config.environment === "production" && config.productionApiWritesEnabled === true;
  if (!staging && !production) {
    throw new Error("Coordination client requires an exact staging or explicitly authorized production environment.");
  }
  const host = new URL(config.apiBaseUrl).hostname;
  if (production && host !== "rohvkyuxbnqzglaromms.supabase.co") {
    throw new Error("Production coordination requires the approved Canada API host.");
  }
  if (host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".staging.peacepad.ca") && !APPROVED_SUPABASE_API_HOSTS.has(host)) {
    throw new Error("Coordination client rejected an unapproved API host.");
  }
  return new HttpPeacePadCoordinationApi(config, fetcher, tokenProvider);
};
