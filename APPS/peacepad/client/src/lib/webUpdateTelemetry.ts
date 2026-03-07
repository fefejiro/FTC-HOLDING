export const WEB_UPDATE_TELEMETRY_ENDPOINT = "/api/telemetry/web-update";

export const WEB_UPDATE_EVENT_NAMES = [
  "update_prompt_shown",
  "update_later_clicked",
  "update_now_clicked",
  "update_forced_24h",
  "update_apply_started",
  "update_apply_completed",
] as const;

export type WebUpdateTelemetryEventName = (typeof WEB_UPDATE_EVENT_NAMES)[number];
export type WebUpdateTelemetrySessionType = "authenticated" | "guest" | "public" | "unknown";
export type WebUpdateTelemetryPlatform = "web" | "android" | "ios" | "unknown";

export interface WebUpdateTelemetryPayload {
  eventName: WebUpdateTelemetryEventName;
  webBuildId: string;
  knownBuildId?: string;
  sessionType: WebUpdateTelemetrySessionType;
  platform: WebUpdateTelemetryPlatform;
  timestamp: string;
}

interface TelemetryContext {
  webBuildId: string;
  knownBuildId?: string | null;
  sessionType: WebUpdateTelemetrySessionType;
}

interface DispatchOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  sendBeacon?: (url: string, data: BodyInit) => boolean;
}

function normalizeKnownBuildId(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function detectPlatform(userAgent: string): WebUpdateTelemetryPlatform {
  const normalized = userAgent.toLowerCase();
  if (normalized.includes("android")) {
    return "android";
  }
  if (normalized.includes("iphone") || normalized.includes("ipad") || normalized.includes("ios")) {
    return "ios";
  }
  if (normalized.length > 0) {
    return "web";
  }
  return "unknown";
}

export function createWebUpdateTelemetryPayload(
  eventName: WebUpdateTelemetryEventName,
  context: TelemetryContext,
  now: Date = new Date(),
  userAgent: string = typeof navigator !== "undefined" ? navigator.userAgent || "" : "",
): WebUpdateTelemetryPayload {
  return {
    eventName,
    webBuildId: context.webBuildId,
    knownBuildId: normalizeKnownBuildId(context.knownBuildId),
    sessionType: context.sessionType,
    platform: detectPlatform(userAgent),
    timestamp: now.toISOString(),
  };
}

export function sendWebUpdateTelemetryPayload(
  payload: WebUpdateTelemetryPayload,
  options: DispatchOptions = {},
): void {
  const endpoint = options.endpoint || WEB_UPDATE_TELEMETRY_ENDPOINT;
  const body = JSON.stringify(payload);
  const sendBeacon = options.sendBeacon || (typeof navigator !== "undefined" ? navigator.sendBeacon?.bind(navigator) : undefined);

  try {
    if (sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const accepted = sendBeacon(endpoint, blob);
      if (accepted) {
        return;
      }
    }

    const fetchImpl = options.fetchImpl || (typeof fetch !== "undefined" ? fetch : undefined);
    if (fetchImpl) {
      void fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
        // Non-blocking telemetry path.
      });
    }
  } catch {
    // Non-blocking telemetry path.
  }
}

export function sendWebUpdateTelemetryEvent(
  eventName: WebUpdateTelemetryEventName,
  context: TelemetryContext,
): void {
  if (!context.webBuildId) {
    return;
  }

  const payload = createWebUpdateTelemetryPayload(eventName, context);
  sendWebUpdateTelemetryPayload(payload);
}
