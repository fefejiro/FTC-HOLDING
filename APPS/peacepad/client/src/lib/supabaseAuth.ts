import { Capacitor } from "@capacitor/core";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { getApiUrl } from "./queryClient";

const AUTH_REDIRECT_STORAGE_KEY = "peacepad_auth_redirect";
const PROD_WEB_CALLBACK_URL = "https://peacepad.ca/auth/callback";
const DEV_WEB_CALLBACK_URL = "http://127.0.0.1:5173/auth/callback";
const MOBILE_CALLBACK_URL = "https://peacepad.ca/auth/mobile-callback";

let supabaseClient: SupabaseClient | null = null;

type AuthErrorContext = "magic-link" | "oauth" | "callback" | "exchange";

function extractAuthErrorMetadata(error: unknown): {
  message: string;
  status?: number;
  code?: string;
} {
  if (error instanceof Error) {
    const record = error as Error & { status?: number; code?: string };
    return {
      message: record.message || "Authentication failed.",
      status: typeof record.status === "number" ? record.status : undefined,
      code: typeof record.code === "string" ? record.code : undefined,
    };
  }

  if (typeof error === "object" && error !== null) {
    const record = error as { message?: unknown; status?: unknown; code?: unknown };
    return {
      message:
        typeof record.message === "string" && record.message.trim()
          ? record.message
          : "Authentication failed.",
      status: typeof record.status === "number" ? record.status : undefined,
      code: typeof record.code === "string" ? record.code : undefined,
    };
  }

  if (typeof error === "string" && error.trim()) {
    return { message: error };
  }

  return { message: "Authentication failed." };
}

function toUserFacingAuthError(error: unknown, context: AuthErrorContext): Error {
  const { message, status, code } = extractAuthErrorMetadata(error);
  const normalizedMessage = message.toLowerCase();

  const fallbackMessage =
    context === "magic-link"
      ? "Sign-in could not be started right now. Keep using PeacePad as a guest and try again later."
      : context === "oauth"
        ? "Google sign-in could not be started right now. Keep using PeacePad as a guest and try again later."
        : context === "callback"
          ? "Sign-in could not be completed. You can keep using PeacePad as a guest and try again later."
          : "PeacePad could not finish the account sign-in step. You can keep using PeacePad as a guest and try again later.";

  let userMessage = fallbackMessage;

  if (context === "magic-link") {
    if (status === 429 || normalizedMessage.includes("rate limit")) {
      userMessage = "Too many sign-in attempts. Wait a minute, then request a new link.";
    } else if (status === 402) {
      userMessage =
        "Email sign-in is temporarily unavailable. PeacePad can still be used as a guest while we repair account login.";
    } else if (
      normalizedMessage.includes("redirect") ||
      normalizedMessage.includes("callback") ||
      normalizedMessage.includes("site url")
    ) {
      userMessage =
        "Sign-in is misconfigured for this environment. The callback or redirect URL needs to be repaired.";
    } else if (status === 400 || status === 422 || normalizedMessage.includes("invalid")) {
      userMessage = "That sign-in request was rejected. Double-check the email address and try again.";
    }
  }

  if (context === "oauth") {
    if (
      normalizedMessage.includes("provider") ||
      normalizedMessage.includes("google") ||
      normalizedMessage.includes("redirect")
    ) {
      userMessage =
        "Google sign-in is not configured correctly right now. You can continue in guest mode and try again later.";
    }
  }

  if (context === "callback" || context === "exchange") {
    if (status === 400 || status === 401 || normalizedMessage.includes("expired")) {
      userMessage = "This sign-in link is invalid or expired. Request a fresh link and try again.";
    } else if (status === 402) {
      userMessage =
        "Sign-in could not be completed because the Supabase auth exchange is failing right now. You can continue as a guest.";
    } else if (
      normalizedMessage.includes("redirect") ||
      normalizedMessage.includes("callback") ||
      normalizedMessage.includes("site url")
    ) {
      userMessage =
        "Sign-in could not be completed because the callback URL is not accepted by the auth provider.";
    }
  }

  const enhanced = new Error(userMessage);
  (enhanced as Error & { status?: number; code?: string; rawMessage?: string }).status = status;
  (enhanced as Error & { status?: number; code?: string; rawMessage?: string }).code = code;
  (enhanced as Error & { status?: number; code?: string; rawMessage?: string }).rawMessage = message;
  return enhanced;
}

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
  try {
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
  } catch (error) {
    throw toUserFacingAuthError(error, "oauth");
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
  try {
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
  } catch (error) {
    throw toUserFacingAuthError(error, "callback");
  }
}

export async function exchangeSupabaseTokenForApiSession(accessToken: string): Promise<void> {
  try {
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

    const error = new Error(errorMessage) as Error & { status?: number };
    error.status = response.status;
    throw error;
  } catch (error) {
    throw toUserFacingAuthError(error, "exchange");
  }
}

export async function sendMagicLink(email: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const redirectTo = getGoogleRedirectUrl();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    throw toUserFacingAuthError(error, "magic-link");
  }
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
