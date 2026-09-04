import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { AppState, Linking } from "react-native";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { PeacePadSupabaseConfig } from "../config/environment";
import { AuthCapabilitiesProvider } from "../auth/AuthCapabilities";
import { useOptionalLocalization, type MessageKey } from "../localization/LocalizationProvider";
import type { PeacePadRealtimeClient, PeacePadRealtimeChannel } from "../calls/PrivateCallSignalSubscription";

const STORAGE_PREFIX = "peacepad.v2.supabase.";
const STORAGE_CHUNK_SIZE = 1_800;
const storedKey = (key: string) => `${STORAGE_PREFIX}${key}`;
const manifestKey = (key: string) => `${storedKey(key)}.manifest`;
const chunkKey = (key: string, index: number) => `${storedKey(key)}.chunk.${index}`;

function parseManifest(raw: string | null): { version: 1; chunks: number; length: number } | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { version?: unknown; chunks?: unknown; length?: unknown };
    if (value.version !== 1 || !Number.isInteger(value.chunks) || !Number.isInteger(value.length)) return null;
    const chunks = value.chunks as number;
    const length = value.length as number;
    return chunks >= 1 && chunks <= 64 && length >= 0 ? { version: 1, chunks, length } : null;
  } catch {
    return null;
  }
}

export const secureSupabaseStorage = {
  getItem: async (key: string) => {
    const rawManifest = await SecureStore.getItemAsync(manifestKey(key));
    const manifest = parseManifest(rawManifest);
    if (!manifest) return null;
    const count = manifest.chunks;
    const chunks = await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))));
    if (chunks.some((chunk) => chunk === null)) return null;
    const value = chunks.join("");
    return value.length === manifest.length ? value : null;
  },
  setItem: async (key: string, value: string) => {
    const oldCount = parseManifest(await SecureStore.getItemAsync(manifestKey(key)))?.chunks ?? 0;
    const chunks = value.match(new RegExp(`.{1,${STORAGE_CHUNK_SIZE}}`, "gs")) ?? [""];
    const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk, options)));
    await SecureStore.setItemAsync(manifestKey(key), JSON.stringify({ version: 1, chunks: chunks.length, length: value.length }), options);
    await Promise.all(Array.from({ length: Math.max(0, oldCount - chunks.length) }, (_, offset) => SecureStore.deleteItemAsync(chunkKey(key, chunks.length + offset))));
  },
  removeItem: async (key: string) => {
    const count = parseManifest(await SecureStore.getItemAsync(manifestKey(key)))?.chunks ?? 0;
    await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index))));
    await SecureStore.deleteItemAsync(manifestKey(key));
  }
};

export type SupabaseAuthClient = Pick<SupabaseClient, "auth">;
export type SupabaseRuntimeClient = SupabaseAuthClient & Partial<Pick<SupabaseClient, "channel" | "removeChannel" | "realtime">>;
export type SupabaseSessionStatus = "loading" | "signed-out" | "ready" | "error";
export type SupabaseAuthIntent = "default" | "password-recovery";
export type LinkedAuthProvider = "email" | "apple" | "google";

type SupabaseSessionValue = Readonly<{
  status: SupabaseSessionStatus;
  session?: Session;
  error?: string;
  authIntent: SupabaseAuthIntent;
  realtimeClient?: PeacePadRealtimeClient;
  getAccessToken: () => Promise<string | undefined>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<{ confirmationRequired: boolean }>;
  signInWithApple: (identityToken: string, nonce: string, fullName?: string) => Promise<void>;
  signInWithGoogle: (identityToken: string, nonce?: string) => Promise<void>;
  getLinkedProviders: () => Promise<LinkedAuthProvider[]>;
  linkProvider: (provider: "apple" | "google", credential: { token: string; accessToken?: string; nonce?: string }) => Promise<void>;
  unlinkProvider: (provider: "apple" | "google", verifiedProviderSubject: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}>;

const SessionContext = createContext<SupabaseSessionValue | undefined>(undefined);

export function createPeacePadSupabaseClient(config: PeacePadSupabaseConfig): SupabaseClient {
  return createClient(config.projectUrl, config.publishableKey, {
    auth: {
      storage: secureSupabaseStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });
}

function safeAuthMessage(error: unknown, t: (key: MessageKey) => string): string {
  return error instanceof Error && /invalid login credentials/i.test(error.message)
    ? t("runtime.invalidCredentials")
    : t("runtime.signInUnavailable");
}

export function sessionTokensFromAuthUrl(url?: string | null): { accessToken: string; refreshToken: string; intent: SupabaseAuthIntent } | undefined {
  if (!url || url.trim() !== url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "peacepad:" || parsed.hostname !== "auth" || !/^\/(confirm|reset-password)\/?$/.test(parsed.pathname)) return undefined;
    const values = new URLSearchParams(parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash);
    const accessToken = values.get("access_token") ?? "";
    const refreshToken = values.get("refresh_token") ?? "";
    if (!accessToken || !refreshToken || accessToken.length > 8_192 || refreshToken.length > 8_192) return undefined;
    return { accessToken, refreshToken, intent: parsed.pathname.startsWith("/reset-password") ? "password-recovery" : "default" };
  } catch {
    return undefined;
  }
}

export function SupabaseSessionProvider({
  children,
  client,
  config
}: {
  children: ReactNode;
  client: SupabaseRuntimeClient;
  config?: PeacePadSupabaseConfig;
}) {
  const { t } = useOptionalLocalization();
  const [status, setStatus] = useState<SupabaseSessionStatus>("loading");
  const [session, setSession] = useState<Session>();
  const [error, setError] = useState<string>();
  const [authIntent, setAuthIntent] = useState<SupabaseAuthIntent>("default");
  const mounted = useRef(true);
  const authGeneration = useRef(0);
  const realtimeClient = useMemo<PeacePadRealtimeClient | undefined>(() => {
    if (
      typeof client.channel !== "function"
      || typeof client.removeChannel !== "function"
      || typeof client.realtime?.setAuth !== "function"
    ) return undefined;
    return {
      setAuth: (accessToken) => client.realtime!.setAuth(accessToken),
      channel: (topic, options) => client.channel!(topic, options) as unknown as PeacePadRealtimeChannel,
      removeChannel: (channel) => client.removeChannel!(channel as never),
    };
  }, [client]);

  useEffect(() => {
    mounted.current = true;
    const restoreGeneration = authGeneration.current;
    void client.auth.getSession().then(({ data, error: restoreError }) => {
      if (!mounted.current || restoreGeneration !== authGeneration.current) return;
      if (restoreError) {
        setSession(undefined);
        setStatus("error");
        setError(t("runtime.restoreError"));
        return;
      }
      setSession(data.session ?? undefined);
      setStatus(data.session ? "ready" : "signed-out");
      setError(undefined);
    });
    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted.current) return;
      authGeneration.current += 1;
      if (event === "PASSWORD_RECOVERY") setAuthIntent("password-recovery");
      else if (!nextSession) setAuthIntent("default");
      setSession(nextSession ?? undefined);
      setStatus(nextSession ? "ready" : "signed-out");
      setError(undefined);
    });
    return () => {
      mounted.current = false;
      data.subscription.unsubscribe();
    };
  }, [client, t]);

  useEffect(() => {
    let active = true;
    let liveUrlReceived = false;
    const receive = async (url?: string | null) => {
      const tokens = sessionTokensFromAuthUrl(url);
      if (!active || !tokens) return;
      setAuthIntent(tokens.intent);
      const result = await client.auth.setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken });
      if (!active) return;
      if (result.error) {
        setAuthIntent("default");
        setSession(undefined);
        setStatus("signed-out");
        setError(t("runtime.signInUnavailable"));
      }
    };
    const subscription = Linking.addEventListener("url", ({ url }) => {
      liveUrlReceived = true;
      void receive(url);
    });
    void Linking.getInitialURL().then((url) => {
      if (!liveUrlReceived) void receive(url);
    }).catch(() => undefined);
    return () => {
      active = false;
      subscription.remove();
    };
  }, [client, t]);

  useEffect(() => {
    const updateRefresh = (state: string) => {
      if (state === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    updateRefresh(AppState.currentState);
    const subscription = AppState.addEventListener("change", updateRefresh);
    return () => {
      subscription.remove();
      client.auth.stopAutoRefresh();
    };
  }, [client]);

  const getAccessToken = useCallback(async () => {
    const current = await client.auth.getSession();
    if (current.error || !current.data.session) return undefined;
    const expiresAtMs = (current.data.session.expires_at ?? 0) * 1000;
    if (expiresAtMs > 0 && expiresAtMs <= Date.now() + 30_000) {
      const refreshed = await client.auth.refreshSession();
      if (refreshed.error || !refreshed.data.session) {
        authGeneration.current += 1;
        setSession(undefined);
        setStatus("signed-out");
        setError(t("runtime.sessionExpired"));
        await client.auth.signOut({ scope: "local" }).catch(() => undefined);
        return undefined;
      }
      return refreshed.data.session.access_token;
    }
    return current.data.session.access_token;
  }, [client, t]);

  const value = useMemo<SupabaseSessionValue>(() => ({
    status,
    session,
    error,
    authIntent,
    realtimeClient,
    getAccessToken,
    signInWithPassword: async (email, password) => {
      setError(undefined);
      setAuthIntent("default");
      const result = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) {
        setSession(undefined);
        setStatus("signed-out");
        setError(safeAuthMessage(result.error, t));
        throw result.error;
      }
    },
    signUpWithPassword: async (email, password) => {
      setError(undefined);
      setAuthIntent("default");
      const result = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: "peacepad://auth/confirm" }
      });
      if (result.error) {
        setSession(undefined);
        setStatus("signed-out");
        setError(safeAuthMessage(result.error, t));
        throw result.error;
      }
      return { confirmationRequired: !result.data.session };
    },
    signInWithApple: async (identityToken, nonce, fullName) => {
      setError(undefined);
      setAuthIntent("default");
      const result = await client.auth.signInWithIdToken({ provider: "apple", token: identityToken, nonce });
      if (result.error) {
        setSession(undefined);
        setStatus("signed-out");
        setError(t("runtime.signInUnavailable"));
        throw result.error;
      }
      if (fullName) {
        const updated = await client.auth.updateUser({ data: { full_name: fullName } });
        if (updated.error) throw updated.error;
      }
    },
    signInWithGoogle: async (identityToken, nonce) => {
      setError(undefined);
      setAuthIntent("default");
      const result = await client.auth.signInWithIdToken({
        provider: "google",
        token: identityToken,
        ...(nonce ? { nonce } : {})
      });
      if (result.error) {
        setSession(undefined);
        setStatus("signed-out");
        setError(t("runtime.signInUnavailable"));
        throw result.error;
      }
    },
    getLinkedProviders: async () => {
      const result = await client.auth.getUserIdentities();
      if (result.error) {
        setError(t("runtime.signInUnavailable"));
        throw result.error;
      }
      const providers = result.data.identities
        .map(({ provider }) => provider)
        .filter((provider): provider is LinkedAuthProvider => provider === "email" || provider === "apple" || provider === "google");
      return [...new Set(providers)].sort();
    },
    linkProvider: async (provider, credential) => {
      setError(undefined);
      if (!session?.user.id || !credential.token || credential.token.length > 8_192 || (credential.accessToken?.length ?? 0) > 8_192) {
        const cause = new Error("A fresh provider challenge is required.");
        setError(t("runtime.signInUnavailable"));
        throw cause;
      }
      const before = await client.auth.getUserIdentities();
      if (before.error) throw before.error;
      if (before.data.identities.some((identity) => identity.provider === provider)) {
        throw new Error("This sign-in method is already linked.");
      }
      const linked = await client.auth.linkIdentity({
        provider,
        token: credential.token,
        ...(credential.accessToken ? { access_token: credential.accessToken } : {}),
        ...(credential.nonce ? { nonce: credential.nonce } : {})
      });
      if (linked.error || linked.data.user?.id !== session.user.id) {
        setError(t("runtime.signInUnavailable"));
        throw linked.error ?? new Error("The linked identity did not match this PeacePad account.");
      }
      const after = await client.auth.getUserIdentities();
      if (after.error || !after.data.identities.some((identity) => identity.provider === provider && identity.user_id === session.user.id)) {
        setError(t("runtime.signInUnavailable"));
        throw after.error ?? new Error("PeacePad could not verify the linked sign-in method.");
      }
    },
    unlinkProvider: async (provider, verifiedProviderSubject) => {
      setError(undefined);
      if (!session?.user.id || !verifiedProviderSubject || verifiedProviderSubject.length > 512) {
        const cause = new Error("A fresh provider challenge is required.");
        setError(t("runtime.signInUnavailable"));
        throw cause;
      }
      const current = await client.auth.getUserIdentities();
      if (current.error) throw current.error;
      if (current.data.identities.length < 2) throw new Error("Keep at least one sign-in method linked.");
      const identity = current.data.identities.find((candidate) => candidate.provider === provider && candidate.user_id === session.user.id);
      const providerSubject = typeof identity?.identity_data?.sub === "string" ? identity.identity_data.sub : identity?.identity_id;
      if (!identity || providerSubject !== verifiedProviderSubject) {
        throw new Error("The fresh provider challenge did not match this linked sign-in method.");
      }
      const unlinked = await client.auth.unlinkIdentity(identity);
      if (unlinked.error) {
        setError(t("runtime.signInUnavailable"));
        throw unlinked.error;
      }
      const after = await client.auth.getUserIdentities();
      if (after.error || after.data.identities.some((candidate) => candidate.id === identity.id)) {
        setError(t("runtime.signInUnavailable"));
        throw after.error ?? new Error("PeacePad could not verify the unlinked sign-in method.");
      }
    },
    sendPasswordReset: async (email) => {
      setError(undefined);
      const result = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: "peacepad://auth/reset-password" });
      if (result.error) {
        setError(t("runtime.signInUnavailable"));
        throw result.error;
      }
    },
    updatePassword: async (password) => {
      setError(undefined);
      const result = await client.auth.updateUser({ password });
      if (result.error) {
        setError(t("runtime.signInUnavailable"));
        throw result.error;
      }
      setAuthIntent("default");
    },
    signOut: async () => {
      authGeneration.current += 1;
      setAuthIntent("default");
      setSession(undefined);
      setStatus("signed-out");
      try {
        const result = await client.auth.signOut({ scope: "local" });
        if (result.error) throw result.error;
        const remaining = await client.auth.getSession();
        if (remaining.error || remaining.data.session) throw new Error("Local Supabase session remained after sign-out.");
        setError(undefined);
      } catch {
        setError(t("runtime.signOutRemoteFailed"));
      } finally {
        // Local authorization was already removed before the network operation.
      }
    }
  }), [authIntent, client, error, getAccessToken, realtimeClient, session, status, t]);

  const content = <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
  return config ? <AuthCapabilitiesProvider config={config}>{content}</AuthCapabilitiesProvider> : content;
}

export function useSupabaseSession(): SupabaseSessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSupabaseSession must be used within SupabaseSessionProvider.");
  return value;
}

export function useOptionalSupabaseSession(): SupabaseSessionValue | undefined {
  return useContext(SessionContext);
}
