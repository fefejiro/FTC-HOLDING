import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";
import type { PeacePadSupabaseConfig } from "../config/environment";
import { resolveGoogleClientConfiguration } from "./GoogleNativeAuth";

const CACHE_TTL_MS = 30_000;

export type AuthBackendStatus = "enabled" | "disabled" | "unknown";

export type AuthProviderCapability = Readonly<{
  nativeAvailable: boolean;
  appConfigured: boolean;
  backend: AuthBackendStatus;
  available: boolean;
}>;

export type AuthCapabilities = Readonly<{
  status: "loading" | "ready" | "error";
  email: AuthProviderCapability;
  google: AuthProviderCapability;
  apple: AuthProviderCapability;
  refresh: () => Promise<void>;
}>;

type AuthProviderSettings = Readonly<{
  email: boolean;
  google: boolean;
  apple: boolean;
}>;

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type CachedSettings = Readonly<{
  fetchedAt: number;
  settings: AuthProviderSettings;
}>;

const settingsCache = new Map<string, CachedSettings>();

const emptyCapability = (backend: AuthBackendStatus = "unknown"): AuthProviderCapability => ({
  nativeAvailable: false,
  appConfigured: false,
  backend,
  available: false
});

const emailFallbackCapability = (): AuthProviderCapability => ({
  nativeAvailable: true,
  appConfigured: true,
  backend: "unknown",
  available: true
});

function backendStatus(value: unknown): AuthBackendStatus {
  return value === true ? "enabled" : value === false ? "disabled" : "unknown";
}

function providerCapability(nativeAvailable: boolean, appConfigured: boolean, backend: AuthBackendStatus): AuthProviderCapability {
  return { nativeAvailable, appConfigured, backend, available: nativeAvailable && appConfigured && backend === "enabled" };
}

export async function fetchAuthProviderSettings(
  projectUrl: string,
  publishableKey: string,
  fetcher: Fetcher = fetch
): Promise<AuthProviderSettings> {
  const response = await fetcher(`${projectUrl.replace(/\/$/, "")}/auth/v1/settings`, {
    headers: { apikey: publishableKey, accept: "application/json" }
  });
  if (!response.ok) throw new Error(`Auth provider settings returned HTTP ${response.status}.`);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("external" in body)) throw new Error("Auth provider settings were malformed.");
  const external = (body as { external?: unknown }).external;
  if (!external || typeof external !== "object") throw new Error("Auth provider settings were malformed.");
  const values = external as Record<string, unknown>;
  if (typeof values.email !== "boolean" || typeof values.google !== "boolean" || typeof values.apple !== "boolean") {
    throw new Error("Auth provider settings were incomplete.");
  }
  return { email: values.email, google: values.google, apple: values.apple };
}

async function readNativeCapabilities(): Promise<{
  googleNativeAvailable: boolean;
  googleConfigured: boolean;
  appleNativeAvailable: boolean;
  appleConfigured: boolean;
}> {
  const googleNativeAvailable = Platform.OS === "android" || Platform.OS === "ios";
  const googleConfigured = (() => {
    if (!googleNativeAvailable) return false;
    if (Constants.expoConfig?.extra?.googleSignInEnabled !== true) return false;
    try {
      resolveGoogleClientConfiguration();
      return true;
    } catch {
      return false;
    }
  })();
  const appleNativeAvailable = Platform.OS === "ios" ? await AppleAuthentication.isAvailableAsync().catch(() => false) : false;
  const appleConfigured = Platform.OS === "ios" && (
    Constants.expoConfig?.ios?.usesAppleSignIn === true
    || (Constants.expoConfig?.plugins ?? []).some((plugin) => plugin === "expo-apple-authentication" || (Array.isArray(plugin) && plugin[0] === "expo-apple-authentication"))
  );
  return { googleNativeAvailable, googleConfigured, appleNativeAvailable, appleConfigured };
}

export async function resolveAuthCapabilities(
  config: PeacePadSupabaseConfig,
  fetcher: Fetcher = fetch,
  force = false
): Promise<Pick<AuthCapabilities, "email" | "google" | "apple">> {
  const native = await readNativeCapabilities();
  const cached = settingsCache.get(config.projectUrl);
  let settings = cached && !force && Date.now() - cached.fetchedAt < CACHE_TTL_MS ? cached.settings : undefined;
  if (!settings) {
    settings = await fetchAuthProviderSettings(config.projectUrl, config.publishableKey, fetcher);
    settingsCache.set(config.projectUrl, { fetchedAt: Date.now(), settings });
  }
  const emailBackend = backendStatus(settings.email);
  return {
    email: providerCapability(true, true, emailBackend),
    google: providerCapability(native.googleNativeAvailable, native.googleConfigured, backendStatus(settings.google)),
    apple: providerCapability(native.appleNativeAvailable, native.appleConfigured, backendStatus(settings.apple))
  };
}

const defaultCapabilities: AuthCapabilities = {
  status: "loading",
  email: emailFallbackCapability(),
  google: emptyCapability(),
  apple: emptyCapability(),
  refresh: async () => undefined
};

const AuthCapabilitiesContext = createContext<AuthCapabilities>(defaultCapabilities);

export function AuthCapabilitiesProvider({ config, children }: { config: PeacePadSupabaseConfig; children: ReactNode }) {
  const [status, setStatus] = useState<AuthCapabilities["status"]>("loading");
  const [providers, setProviders] = useState<Pick<AuthCapabilities, "email" | "google" | "apple">>({
    email: emailFallbackCapability(), google: emptyCapability(), apple: emptyCapability()
  });
  const load = useCallback(async (force: boolean) => {
    setStatus("loading");
    try {
      setProviders(await resolveAuthCapabilities(config, fetch, force));
      setStatus("ready");
    } catch {
      // Social providers remain fail-closed when their backend state cannot be
      // verified. Email stays available as the resilient first-party fallback:
      // the actual Supabase password request still provides the authoritative
      // success or failure response.
      setProviders({
        email: emailFallbackCapability(),
        google: emptyCapability("unknown"),
        apple: emptyCapability("unknown")
      });
      setStatus("error");
    }
  }, [config]);
  const refresh = useCallback(() => load(true), [load]);
  useEffect(() => { void load(false); }, [load]);
  const value = useMemo<AuthCapabilities>(() => ({ status, ...providers, refresh }), [providers, refresh, status]);
  return <AuthCapabilitiesContext.Provider value={value}>{children}</AuthCapabilitiesContext.Provider>;
}

export function useAuthCapabilities(): AuthCapabilities {
  return useContext(AuthCapabilitiesContext);
}

export function clearAuthCapabilitiesCache(): void {
  settingsCache.clear();
}
