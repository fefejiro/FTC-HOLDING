type EventProperties = Record<string, unknown>;

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: EventProperties) => void;
      identify?: (distinctId: string, properties?: EventProperties) => void;
      reset?: () => void;
    };
  }
}

const POSTHOG_KEY = String(import.meta.env.VITE_POSTHOG_KEY || "").trim();
const POSTHOG_HOST = String(import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "");
const DISTINCT_ID_KEY = "peacepad_posthog_distinct_id";
const LAST_SESSION_KEY = "peacepad_last_session_at";

function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in analytics.
  }
}

export function getAnalyticsDistinctId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = safeStorageGet(DISTINCT_ID_KEY);
  if (existing) {
    return existing;
  }

  const generated = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `anon-${Date.now()}`;
  safeStorageSet(DISTINCT_ID_KEY, generated);
  return generated;
}

export function identifyAnalyticsUser(user: { id: string; displayName?: string | null; isGuest?: boolean } | null | undefined): void {
  if (!user || typeof window === "undefined") {
    return;
  }

  safeStorageSet(DISTINCT_ID_KEY, user.id);
  window.posthog?.identify?.(user.id, {
    display_name: user.displayName || undefined,
    is_guest: Boolean(user.isGuest),
  });
}

export function resetAnalytics(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.posthog?.reset?.();
}

export function trackEvent(event: string, properties: EventProperties = {}, distinctId?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const resolvedDistinctId = distinctId || getAnalyticsDistinctId();
  const payload = {
    ...properties,
    distinct_id: resolvedDistinctId,
    $current_url: window.location.href,
    $pathname: window.location.pathname,
  };

  if (window.posthog?.capture) {
    window.posthog.capture(event, payload);
    return;
  }

  if (!POSTHOG_KEY) {
    return;
  }

  void fetch(`${POSTHOG_HOST}/capture/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event,
      properties: {
        token: POSTHOG_KEY,
        ...payload,
      },
    }),
    keepalive: true,
    credentials: "omit",
  }).catch(() => {
    // Analytics should never interrupt product behavior.
  });
}

export function trackSessionStarted(properties: EventProperties = {}): void {
  if (typeof window === "undefined") {
    return;
  }

  const lastSessionAtRaw = safeStorageGet(LAST_SESSION_KEY);
  const lastSessionAt = lastSessionAtRaw ? new Date(lastSessionAtRaw) : null;
  const now = new Date();
  const daysSinceLastSession = lastSessionAt
    ? Math.max(0, Math.floor((now.getTime() - lastSessionAt.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  trackEvent("session_started", {
    ...properties,
    days_since_last_session: daysSinceLastSession,
  });

  safeStorageSet(LAST_SESSION_KEY, now.toISOString());
}

export function daysSince(dateValue?: string | Date | null): number | null {
  if (!dateValue) {
    return null;
  }

  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  const time = date.getTime();
  if (!Number.isFinite(time)) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24)));
}

export function openExternal(url: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
