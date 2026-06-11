import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type PublicAuthConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};
type BrowserSupabaseClient = SupabaseClient & {
  auth: any;
};

declare global {
  interface Window {
    __FTC_PUBLIC_AUTH_CONFIG__?: Partial<PublicAuthConfig>;
  }
}

const buildSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const buildSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let _client: BrowserSupabaseClient | null = null;
let _clientConfigKey = "";

function normalizePublicAuthConfig(input: Partial<PublicAuthConfig> | null | undefined): PublicAuthConfig | null {
  const supabaseUrl = String(input?.supabaseUrl || "").trim().replace(/\/+$/, "");
  const supabaseAnonKey = String(input?.supabaseAnonKey || "").trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function getPublicSupabaseConfig(): PublicAuthConfig | null {
  const buildConfig = normalizePublicAuthConfig({
    supabaseUrl: buildSupabaseUrl,
    supabaseAnonKey: buildSupabaseAnonKey
  });
  if (buildConfig) {
    return buildConfig;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return normalizePublicAuthConfig(window.__FTC_PUBLIC_AUTH_CONFIG__);
}

export function hasPublicSupabaseConfig(): boolean {
  return Boolean(getPublicSupabaseConfig());
}

export async function loadRuntimeSupabaseConfig(): Promise<boolean> {
  if (getPublicSupabaseConfig()) {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const response = await fetch("/api/public-auth-config", {
      cache: "no-store",
      headers: { accept: "application/json" }
    });
    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as {
      config?: Partial<PublicAuthConfig>;
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };
    const config = normalizePublicAuthConfig(
      payload.config || {
        supabaseUrl: payload.supabaseUrl,
        supabaseAnonKey: payload.supabaseAnonKey
      }
    );
    if (!config) {
      return false;
    }

    window.__FTC_PUBLIC_AUTH_CONFIG__ = config;
    return true;
  } catch {
    return false;
  }
}

export function getSupabase(): BrowserSupabaseClient {
  if (!_client) {
    if (typeof window === 'undefined') {
      throw new Error('getSupabase() called on server; use createServerClient instead');
    }
    const config = getPublicSupabaseConfig();
    if (!config?.supabaseUrl) {
      throw new Error("Public Supabase URL is required. Set NEXT_PUBLIC_SUPABASE_URL.");
    }
    if (!config.supabaseAnonKey) {
      throw new Error("Public Supabase anon key is required. Set NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
    _clientConfigKey = `${config.supabaseUrl}:${config.supabaseAnonKey}`;
    _client = createClient(config.supabaseUrl, config.supabaseAnonKey) as BrowserSupabaseClient;
  } else {
    const config = getPublicSupabaseConfig();
    const nextConfigKey = config ? `${config.supabaseUrl}:${config.supabaseAnonKey}` : _clientConfigKey;
    if (config && nextConfigKey !== _clientConfigKey) {
      _clientConfigKey = nextConfigKey;
      _client = createClient(config.supabaseUrl, config.supabaseAnonKey) as BrowserSupabaseClient;
    }
  }
  return _client;
}

export default getSupabase;
