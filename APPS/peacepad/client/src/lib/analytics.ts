type EventProperties = Record<string, unknown>;

const CONSENT_STORAGE_KEY = "peacepad_product_analytics_consent_v1";
const DISTINCT_ID_STORAGE_KEY = "peacepad_product_analytics_id_v1";
const POSTHOG_KEY = (import.meta.env.VITE_POSTHOG_KEY || "").trim();
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com")
  .trim()
  .replace(/\/+$/, "");
const CONFIG_ENABLED = import.meta.env.VITE_ENABLE_PRODUCT_ANALYTICS === "true";
const NATIVE_ENABLED = import.meta.env.VITE_ENABLE_NATIVE_PRODUCT_ANALYTICS === "true";

const BLOCKED_PROPERTY_PATTERN =
  /(?:content|message|text|draft|email|name|phone|address|location|latitude|longitude|token|code|url|transcript)/i;

type AnalyticsClient = {
  capture: (event: string, properties?: EventProperties) => void;
  opt_in_capturing: () => void;
  opt_out_capturing: () => void;
  reset: () => void;
};

let client: AnalyticsClient | null = null;
let initialization: Promise<AnalyticsClient | null> | null = null;

function isNativeRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  return capacitor?.isNativePlatform?.() === true;
}

export const ANALYTICS_COLLECTION_ENABLED =
  CONFIG_ENABLED && Boolean(POSTHOG_KEY) && (!isNativeRuntime() || NATIVE_ENABLED);

export function hasAnalyticsConsent(): boolean {
  if (!ANALYTICS_COLLECTION_ENABLED || typeof window === "undefined") return false;
  return window.localStorage.getItem(CONSENT_STORAGE_KEY) === "granted";
}

export function sanitizeAnalyticsProperties(properties: EventProperties): EventProperties {
  const sanitized: EventProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (BLOCKED_PROPERTY_PATTERN.test(key)) continue;
    if (typeof value === "boolean" || typeof value === "number") sanitized[key] = value;
    if (typeof value === "string" && value.length <= 80) sanitized[key] = value;
  }
  return sanitized;
}

async function getClient(): Promise<AnalyticsClient | null> {
  if (!hasAnalyticsConsent()) return null;
  if (client) return client;
  if (initialization) return initialization;

  initialization = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        person_profiles: "never",
        persistence: "localStorage",
        bootstrap: { distinctID: getAnalyticsDistinctId() },
      });
      client = posthog;
      client.opt_in_capturing();
      return client;
    })
    .catch(() => null);
  return initialization;
}

export function getAnalyticsDistinctId(): string {
  if (typeof window === "undefined" || !ANALYTICS_COLLECTION_ENABLED) {
    return "analytics-disabled";
  }
  const existing = window.localStorage.getItem(DISTINCT_ID_STORAGE_KEY);
  if (existing) return existing;
  const next = window.crypto.randomUUID();
  window.localStorage.setItem(DISTINCT_ID_STORAGE_KEY, next);
  return next;
}

export function setAnalyticsConsent(enabled: boolean): void {
  if (typeof window === "undefined" || !ANALYTICS_COLLECTION_ENABLED) return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, enabled ? "granted" : "denied");
  if (enabled) {
    void getClient().then((posthog) => posthog?.capture("analytics_opted_in"));
    return;
  }
  client?.opt_out_capturing();
  client?.reset();
  client = null;
  initialization = null;
  window.localStorage.removeItem(DISTINCT_ID_STORAGE_KEY);
}

export function identifyAnalyticsUser(
  _user?: { id?: string; [key: string]: unknown } | null,
): void {
  // Deliberately anonymous: never attach account, partner, or contact identifiers.
}

export function resetAnalytics(): void {
  client?.reset();
  client = null;
  initialization = null;
}

export function trackEvent(event: string, properties: EventProperties = {}): void {
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(event)) return;
  void getClient().then((posthog) => posthog?.capture(event, sanitizeAnalyticsProperties(properties)));
}

export function trackSessionStarted(properties: EventProperties = {}): void {
  trackEvent("session_started", properties);
}

export function daysSince(dateValue?: string | Date | null): number | null {
  if (!dateValue) return null;
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  const time = date.getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24)));
}

export function openExternal(url: string): void {
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}
