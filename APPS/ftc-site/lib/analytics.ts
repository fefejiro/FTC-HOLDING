type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: "config" | "event" | "js",
      target: string | Date,
      params?: EventParams
    ) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export function analyticsEnabled(): boolean {
  return GA_MEASUREMENT_ID.length > 0;
}

export function trackEvent(eventName: string, params: EventParams = {}): void {
  if (typeof window === "undefined" || !analyticsEnabled()) return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

