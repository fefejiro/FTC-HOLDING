import { Capacitor } from "@capacitor/core";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { getApiUrl } from "./queryClient";

const AUTH_REDIRECT_STORAGE_KEY = "peacepad_auth_redirect";
const PROD_WEB_CALLBACK_URL = "https://peacepad.ca/auth/callback";
const DEV_WEB_CALLBACK_URL = "http://127.0.0.1:5173/auth/callback";
const MOBILE_CALLBACK_URL = "https://peacepad.ca/auth/mobile-callback";

let supabaseClient: SupabaseClient | null = null;

function getConfiguredSupabaseUrl(): string {
  return (import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
}

function getConfiguredSupabaseAnonKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
}

export function hasSupabaseAuthConfig(): boolean {
  return !!(getConfiguredSupabaseUrl() && getConfiguredSupabaseAnonKey());
}

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = getConfiguredSupabaseUrl();
  const supabaseAnonKey = getConfiguredSupabaseAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase auth is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}

export function getGoogleRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return MOBILE_CALLBACK_URL;
  }

  return import.meta.env.DEV ? DEV_WEB_CALLBACK_URL : PROD_WEB_CALLBACK_URL;
}

export function rememberAuthRedirectState(pathname: string): void {
  const returnPath = pathname && pathname.startsWith("/") ? pathname : "/";
  localStorage.setItem(
    AUTH_REDIRECT_STORAGE_KEY,
    JSON.stringify({
      timestamp: Date.now(),
      isNative: Capacitor.isNativePlatform(),
      returnPath,
    }),
  );
}

export function consumeAuthRedirectPath(defaultPath = "/"): string {
  const raw = localStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
  localStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);

  if (!raw) {
    return defaultPath;
  }

  try {
    const state = JSON.parse(raw);
    const returnPath = typeof state?.returnPath === "string" ? state.returnPath : defaultPath;
    if (!returnPath.startsWith("/")) {
      return defaultPath;
    }
    if (
      returnPath.startsWith("/auth/callback") ||
      returnPath.startsWith("/auth/mobile-callback")
    ) {
      return defaultPath;
    }
    return returnPath;
  } catch {
    return defaultPath;
  }
}

export async function startGoogleOAuthSignIn(): Promise<void> {
  const supabase = getSupabaseClient();
  const redirectTo = getGoogleRedirectUrl();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw error;
  }
}

function getCallbackTokens(url: URL): { accessToken: string | null; refreshToken: string | null } {
  const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const accessToken =
    url.searchParams.get("access_token") || hashParams.get("access_token");
  const refreshToken =
    url.searchParams.get("refresh_token") || hashParams.get("refresh_token");

  return { accessToken, refreshToken };
}

export async function finalizeSupabaseCallback(currentUrl: string = window.location.href): Promise<Session> {
  const supabase = getSupabaseClient();
  const url = new URL(currentUrl);
  const code = url.searchParams.get("code");

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    if (data.session) {
      return data.session;
    }
  }

  const { accessToken, refreshToken } = getCallbackTokens(url);
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      throw error;
    }
    if (data.session) {
      return data.session;
    }
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  if (!data.session) {
    throw new Error("No Supabase session available after callback.");
  }

  return data.session;
}

export async function exchangeSupabaseTokenForApiSession(accessToken: string): Promise<void> {
  const response = await fetch(getApiUrl("/api/auth/supabase/exchange"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ accessToken }),
  });

  if (response.ok) {
    return;
  }

  let errorMessage = "Failed to complete server sign-in.";
  try {
    const body = await response.json();
    if (typeof body?.message === "string" && body.message.trim()) {
      errorMessage = body.message;
    }
  } catch {
    // Ignore JSON parse errors and use default message.
  }

  throw new Error(errorMessage);
}

export async function clearSupabaseSession(): Promise<void> {
  if (!hasSupabaseAuthConfig()) {
    return;
  }

  try {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Keep logout resilient even if Supabase local sign-out fails.
  }
}
