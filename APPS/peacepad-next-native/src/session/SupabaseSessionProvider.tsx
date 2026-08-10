import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { PeacePadSupabaseConfig } from "../config/environment";
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

type SupabaseSessionValue = Readonly<{
  status: SupabaseSessionStatus;
  session?: Session;
  error?: string;
  realtimeClient?: PeacePadRealtimeClient;
  getAccessToken: () => Promise<string | undefined>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
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

export function SupabaseSessionProvider({
  children,
  client
}: {
  children: ReactNode;
  client: SupabaseRuntimeClient;
}) {
  const { t } = useOptionalLocalization();
  const [status, setStatus] = useState<SupabaseSessionStatus>("loading");
  const [session, setSession] = useState<Session>();
  const [error, setError] = useState<string>();
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
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted.current) return;
      authGeneration.current += 1;
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
    realtimeClient,
    getAccessToken,
    signInWithPassword: async (email, password) => {
      setError(undefined);
      const result = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) {
        setSession(undefined);
        setStatus("signed-out");
        setError(safeAuthMessage(result.error, t));
        throw result.error;
      }
    },
    signOut: async () => {
      authGeneration.current += 1;
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
  }), [client, error, getAccessToken, realtimeClient, session, status, t]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSupabaseSession(): SupabaseSessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSupabaseSession must be used within SupabaseSessionProvider.");
  return value;
}

export function useOptionalSupabaseSession(): SupabaseSessionValue | undefined {
  return useContext(SessionContext);
}
