import type { PeacePadEnvironmentConfig } from "../config/environment";
import { PeacePadApiError } from "./PeacePadApiClient";
import { validStagingAccessToken } from "../session/secureStagingSession";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type StagingSessionProfile = Readonly<{
  identityId: string;
  displayName: string;
  familyIds: readonly string[];
}>;

const profile = (value: unknown): StagingSessionProfile => {
  const candidate = value as Partial<StagingSessionProfile> | null;
  if (!candidate || typeof candidate.identityId !== "string" || !candidate.identityId
    || typeof candidate.displayName !== "string" || !candidate.displayName
    || !Array.isArray(candidate.familyIds) || candidate.familyIds.some((id) => typeof id !== "string")) {
    throw new PeacePadApiError("PeacePad returned an invalid staging session.", "invalid-response");
  }
  return candidate as StagingSessionProfile;
};

export async function verifyStagingSession(
  config: PeacePadEnvironmentConfig,
  accessToken: string,
  fetcher: FetchLike = fetch
) {
  if (config.environment !== "staging") throw new PeacePadApiError("Secure account verification is staging-only.", "auth-required");
  if (!validStagingAccessToken(accessToken)) throw new PeacePadApiError("Enter a valid secure access key.", "auth-required");
  try {
    const response = await fetcher(`${config.apiBaseUrl}/api/v2/session`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` }
    });
    const payload = await response.json().catch(() => null) as unknown;
    if (response.status === 401) throw new PeacePadApiError("That secure access key was not accepted.", "auth-required", 401);
    if (!response.ok) throw new PeacePadApiError("PeacePad could not verify this account.", "http", response.status);
    return profile(payload);
  } catch (error) {
    if (error instanceof PeacePadApiError) throw error;
    throw new PeacePadApiError("PeacePad cannot reach the staging service right now.", "network");
  }
}
