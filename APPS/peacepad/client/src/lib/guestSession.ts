import type { User } from "@shared/schema";
import { getApiUrl, queryClient } from "./queryClient";
import { readStoredConsent } from "./consentState";

type GuestAuthResponse = {
  success?: boolean;
  code?: string;
  message?: string;
  user?: User;
  guestSessionId?: string;
  sessionId?: string;
  guestId?: string;
  expiresAt?: string;
};

let inFlightGuestBootstrap: Promise<User | null> | null = null;

function cacheGuestSession(data: GuestAuthResponse): void {
  if (typeof window === "undefined") {
    return;
  }

  if (typeof data.sessionId === "string" && data.sessionId.length > 0) {
    localStorage.setItem("peacepad_session_id", data.sessionId);
  }

  if (data.user) {
    queryClient.setQueryData(["/api/auth/user"], data.user);
  }

  if (typeof data.expiresAt === "string") {
    const expiresAtMs = new Date(data.expiresAt).getTime();
    const daysRemaining = Number.isFinite(expiresAtMs)
      ? Math.max(0, Math.ceil((expiresAtMs - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    queryClient.setQueryData(["/api/auth/guest-session-info"], {
      expiresAt: data.expiresAt,
      daysRemaining,
    });
    queryClient.setQueryData(["/api/session"], {
      sessionType: "guest",
      mode: "guest",
      user: data.user ?? null,
      guest: {
        guestId: data.guestId ?? null,
        guestSessionId: data.guestSessionId ?? data.sessionId ?? null,
        sessionId: data.sessionId ?? null,
        expiresAt: data.expiresAt,
      },
      trial: {
        expiresAt: data.expiresAt,
        daysRemaining,
        isExpired: false,
      },
    });
  }
}

export async function ensureGuestSession(): Promise<User | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const existingUser = queryClient.getQueryData<User | null>(["/api/auth/user"]);
  if (existingUser) {
    return existingUser;
  }

  if (inFlightGuestBootstrap) {
    return inFlightGuestBootstrap;
  }

  inFlightGuestBootstrap = (async () => {
    const sessionId = localStorage.getItem("peacepad_session_id");
    const consent = readStoredConsent();
    const response = await fetch(getApiUrl("/api/auth/guest"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sessionId: sessionId || undefined,
        hasAcceptedConsent: consent.requiredAccepted,
        aiMessageConsent: consent.aiMessageConsent,
        aiCallConsent: consent.aiCallConsent,
      }),
    });

    const data = (await response.json().catch(() => null)) as GuestAuthResponse | null;

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("peacepad_session_id");
      }

      const message =
        data?.message ||
        (data?.code === "TRIAL_EXPIRED"
          ? "Your guest session expired. Sign in to restore it."
          : "PeacePad could not create a guest session.");
      throw new Error(message);
    }

    if (!data) {
      throw new Error("PeacePad returned an empty guest session response.");
    }

    cacheGuestSession(data);
    return data.user ?? null;
  })().finally(() => {
    inFlightGuestBootstrap = null;
  });

  return inFlightGuestBootstrap;
}
