import posthog from "posthog-js";

type Platform = "web" | "ios" | "android";

type AppOpenedProps = {
  platform?: Platform;
  referrer?: string | null;
};

type ListenStartedProps = {
  source: "home_cta" | "results_page" | "other";
};

type RecognitionSucceededProps = {
  trackId: string;
  hasLyrics: boolean;
  hasGist: boolean;
  latencyMs?: number | null;
};

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY?.trim();
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
const DEVICE_ID_STORAGE_KEY = "saywetin.analytics.device_id";
const APP_OPENED_SESSION_KEY = "saywetin.analytics.app_opened";

let analyticsInitialized = false;
let listenStartedAt: number | null = null;

function analyticsEnabled(): boolean {
  return Boolean(POSTHOG_KEY) && typeof window !== "undefined";
}

function getPlatform(): Platform {
  if (typeof window === "undefined") {
    return "web";
  }

  try {
    const capacitor = (window as any)?.Capacitor;
    const nativePlatform = capacitor?.getPlatform?.();
    if (nativePlatform === "ios" || nativePlatform === "android") {
      return nativePlatform;
    }
  } catch {
    // Ignore platform detection failures.
  }

  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "web";
}

function getStableDeviceId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `sw-${Math.random().toString(36).slice(2)}-${Date.now()}`;

  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, nextId);
  return nextId;
}

function safeCapture(eventName: string, properties: Record<string, unknown>): void {
  if (!analyticsEnabled() || !analyticsInitialized) {
    return;
  }

  try {
    posthog.capture(eventName, properties);
  } catch (error) {
    console.warn("[analytics] capture failed:", error);
  }
}

export function initAnalytics(): void {
  if (!analyticsEnabled() || analyticsInitialized) {
    return;
  }

  try {
    const distinctId = getStableDeviceId();
    posthog.init(POSTHOG_KEY!, {
      api_host: POSTHOG_HOST,
      autocapture: false,
      disable_session_recording: true,
      capture_pageview: false,
      capture_pageleave: false,
      persistence: "localStorage",
      bootstrap: {
        distinctID: distinctId,
        isIdentifiedID: false,
      },
      loaded: (client) => {
        try {
          client.register({
            stableDeviceId: distinctId,
            platform: getPlatform(),
          });
        } catch (error) {
          console.warn("[analytics] register failed:", error);
        }
      },
    });
    analyticsInitialized = true;
  } catch (error) {
    console.warn("[analytics] init failed:", error);
  }
}

export function trackAppOpened(props: AppOpenedProps = {}): void {
  if (!analyticsEnabled()) {
    return;
  }

  try {
    if (window.sessionStorage.getItem(APP_OPENED_SESSION_KEY) === "1") {
      return;
    }

    window.sessionStorage.setItem(APP_OPENED_SESSION_KEY, "1");
    safeCapture("app_opened", {
      platform: props.platform || getPlatform(),
      referrer: props.referrer ?? document.referrer ?? null,
    });
  } catch (error) {
    console.warn("[analytics] app_opened failed:", error);
  }
}

export function trackListenStarted(props: ListenStartedProps): void {
  if (!analyticsEnabled()) {
    return;
  }

  try {
    listenStartedAt = Date.now();
    safeCapture("listen_started", props);
  } catch (error) {
    console.warn("[analytics] listen_started failed:", error);
  }
}

export function trackRecognitionSucceeded(props: RecognitionSucceededProps): void {
  if (!analyticsEnabled()) {
    return;
  }

  try {
    const latencyMs = props.latencyMs ?? (listenStartedAt ? Date.now() - listenStartedAt : null);
    safeCapture("recognition_succeeded", {
      trackId: props.trackId,
      hasLyrics: props.hasLyrics,
      hasGist: props.hasGist,
      latencyMs,
    });
    listenStartedAt = null;
  } catch (error) {
    console.warn("[analytics] recognition_succeeded failed:", error);
  }
}
