import { Platform } from "react-native";
import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";

type EnvironmentValues = Record<string, string | undefined>;

declare const process: {
  env: EnvironmentValues;
};

export type GoogleIdentityResult = Readonly<
  | { type: "cancelled" }
  | { type: "success"; idToken: string | null; providerSubject?: string }
>;

export type GoogleIdentityAdapter = Readonly<{
  configure: (configuration: { webClientId: string; iosClientId: string; offlineAccess: false }) => void;
  hasPlayServices: () => Promise<boolean>;
  signIn: () => Promise<GoogleIdentityResult>;
  getTokens: () => Promise<{ idToken: string; accessToken: string }>;
}>;

export type GoogleIdentityCredential = Readonly<{
  idToken: string;
  accessToken: string;
  providerSubject: string;
}>;

export type GoogleClientConfiguration = Readonly<{
  webClientId: string;
  iosClientId: string;
}>;

export class GoogleIdentityError extends Error {
  constructor(public readonly code: "configuration" | "provider-unavailable" | "missing-token") {
    super(`PeacePad Google identity failed: ${code}.`);
    this.name = "GoogleIdentityError";
  }
}

/**
 * Google Play Services reports a package/certificate registration failure as
 * a provider error rather than a missing configuration value. Treat that
 * specific failure as configuration so the UI can fail closed and release
 * diagnostics can point at the OAuth client registration instead of retrying
 * a broken identity flow.
 */
function isGoogleDeveloperConfigurationError(cause: unknown): boolean {
  const candidate = cause as { code?: unknown; message?: unknown } | undefined;
  const code = candidate?.code;
  const message = typeof candidate?.message === "string" ? candidate.message : "";
  return code === 10
    || code === "10"
    || code === "DEVELOPER_ERROR"
    || code === "12500"
    || /not registered to use OAuth2\.0|DEVELOPER_ERROR|12500/i.test(message);
}

function readBundledGoogleValues(): EnvironmentValues {
  // Expo replaces only direct EXPO_PUBLIC references in the application bundle.
  return {
    EXPO_PUBLIC_PEACEPAD_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_PEACEPAD_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_PEACEPAD_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_PEACEPAD_GOOGLE_IOS_CLIENT_ID
  };
}

const googleClientIdPattern = /^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i;

export function resolveGoogleClientConfiguration(
  values: EnvironmentValues = readBundledGoogleValues()
): GoogleClientConfiguration {
  const webClientId = values.EXPO_PUBLIC_PEACEPAD_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";
  const iosClientId = values.EXPO_PUBLIC_PEACEPAD_GOOGLE_IOS_CLIENT_ID?.trim() ?? "";
  if (!googleClientIdPattern.test(webClientId) || !googleClientIdPattern.test(iosClientId)) {
    throw new GoogleIdentityError("configuration");
  }
  return { webClientId, iosClientId };
}

export const nativeGoogleIdentityAdapter: GoogleIdentityAdapter = {
  configure: (configuration) => GoogleSignin.configure(configuration),
  hasPlayServices: () => GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }),
  signIn: async () => {
    const response = await GoogleSignin.signIn();
    return isSuccessResponse(response)
      ? { type: "success", idToken: response.data.idToken, providerSubject: response.data.user.id }
      : { type: "cancelled" };
  },
  getTokens: () => GoogleSignin.getTokens()
};

export async function requestGoogleIdentityCredential(
  adapter: GoogleIdentityAdapter = nativeGoogleIdentityAdapter,
  values: EnvironmentValues = readBundledGoogleValues()
): Promise<GoogleIdentityCredential | undefined> {
  const configuration = resolveGoogleClientConfiguration(values);
  adapter.configure({ ...configuration, offlineAccess: false });
  if (Platform.OS === "android" && !(await adapter.hasPlayServices())) {
    throw new GoogleIdentityError("provider-unavailable");
  }
  let result: GoogleIdentityResult;
  try {
    result = await adapter.signIn();
  } catch (cause) {
    if (isGoogleDeveloperConfigurationError(cause)) {
      throw new GoogleIdentityError("configuration");
    }
    throw cause;
  }
  if (result.type === "cancelled") return undefined;
  const tokens = await adapter.getTokens();
  const idToken = tokens.idToken || result.idToken;
  if (!idToken || idToken.length > 8_192 || !tokens.accessToken || tokens.accessToken.length > 8_192
    || !result.providerSubject || result.providerSubject.length > 512) {
    throw new GoogleIdentityError("missing-token");
  }
  return { idToken, accessToken: tokens.accessToken, providerSubject: result.providerSubject };
}

export async function requestGoogleIdentityToken(
  adapter: GoogleIdentityAdapter = nativeGoogleIdentityAdapter,
  values: EnvironmentValues = readBundledGoogleValues()
): Promise<string | undefined> {
  return (await requestGoogleIdentityCredential(adapter, values))?.idToken;
}
