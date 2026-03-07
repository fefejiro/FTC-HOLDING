import { z } from "zod";

const WEB_UPDATE_EVENT_NAMES = [
  "update_prompt_shown",
  "update_later_clicked",
  "update_now_clicked",
  "update_forced_24h",
  "update_apply_started",
  "update_apply_completed",
] as const;

const SESSION_TYPES = ["authenticated", "guest", "public", "unknown"] as const;
const PLATFORMS = ["web", "android", "ios", "unknown"] as const;

const webUpdateTelemetrySchema = z
  .object({
    eventName: z.enum(WEB_UPDATE_EVENT_NAMES),
    webBuildId: z.string().trim().min(1).max(128),
    knownBuildId: z.string().trim().max(128).optional(),
    sessionType: z.enum(SESSION_TYPES),
    platform: z.enum(PLATFORMS),
    timestamp: z.string().datetime({ offset: true }),
  })
  .strict();

export type WebUpdateTelemetryEventName = (typeof WEB_UPDATE_EVENT_NAMES)[number];
export type WebUpdateTelemetrySessionType = (typeof SESSION_TYPES)[number];
export type WebUpdateTelemetryPlatform = (typeof PLATFORMS)[number];
export type WebUpdateTelemetryPayload = z.infer<typeof webUpdateTelemetrySchema>;

interface StoredWebUpdateTelemetryEvent extends WebUpdateTelemetryPayload {
  receivedAtMs: number;
}

const MAX_STORED_EVENTS = 5000;
const MAX_RECENT_EVENTS = 20;
const telemetryEvents: StoredWebUpdateTelemetryEvent[] = [];

function normalizeKnownBuildId(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseWebUpdateTelemetryPayload(input: unknown):
  | { ok: true; payload: WebUpdateTelemetryPayload }
  | { ok: false; errors: string[] } {
  const parsed = webUpdateTelemetrySchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "payload";
      return `${path}: ${issue.message}`;
    });
    return { ok: false, errors };
  }

  return {
    ok: true,
    payload: {
      ...parsed.data,
      knownBuildId: normalizeKnownBuildId(parsed.data.knownBuildId),
    },
  };
}

export function recordWebUpdateTelemetry(
  payload: WebUpdateTelemetryPayload,
  nowMs: number = Date.now(),
): void {
  telemetryEvents.push({
    ...payload,
    knownBuildId: normalizeKnownBuildId(payload.knownBuildId),
    receivedAtMs: nowMs,
  });

  const overflow = telemetryEvents.length - MAX_STORED_EVENTS;
  if (overflow > 0) {
    telemetryEvents.splice(0, overflow);
  }
}

function toWindowHours(input: unknown, defaultHours = 24): number {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) {
    return defaultHours;
  }

  return Math.min(168, Math.max(1, Math.floor(parsed)));
}

export function getWebUpdateMetrics(
  windowInput: unknown = 24,
  nowMs: number = Date.now(),
) {
  const windowHours = toWindowHours(windowInput, 24);
  const windowStartMs = nowMs - windowHours * 60 * 60 * 1000;
  const eventsInWindow = telemetryEvents.filter((event) => event.receivedAtMs >= windowStartMs);

  const counts: Record<WebUpdateTelemetryEventName, number> = {
    update_prompt_shown: 0,
    update_later_clicked: 0,
    update_now_clicked: 0,
    update_forced_24h: 0,
    update_apply_started: 0,
    update_apply_completed: 0,
  };

  const platformBreakdown: Record<WebUpdateTelemetryPlatform, number> = {
    web: 0,
    android: 0,
    ios: 0,
    unknown: 0,
  };

  const sessionBreakdown: Record<WebUpdateTelemetrySessionType, number> = {
    authenticated: 0,
    guest: 0,
    public: 0,
    unknown: 0,
  };

  for (const event of eventsInWindow) {
    counts[event.eventName] += 1;
    platformBreakdown[event.platform] += 1;
    sessionBreakdown[event.sessionType] += 1;
  }

  const promptShown = counts.update_prompt_shown;
  const applyCompleted = counts.update_apply_completed;
  const updateNow = counts.update_now_clicked;

  const promptToApplyRate = promptShown > 0 ? applyCompleted / promptShown : 0;
  const promptToUpdateNowRate = promptShown > 0 ? updateNow / promptShown : 0;

  const distinctBuilds = Array.from(
    new Set(eventsInWindow.map((event) => event.webBuildId)),
  ).slice(0, 25);

  const recentEvents = eventsInWindow
    .slice(-MAX_RECENT_EVENTS)
    .map((event) => ({
      eventName: event.eventName,
      webBuildId: event.webBuildId,
      knownBuildId: event.knownBuildId,
      sessionType: event.sessionType,
      platform: event.platform,
      timestamp: event.timestamp,
    }));

  return {
    windowHours,
    since: new Date(windowStartMs).toISOString(),
    until: new Date(nowMs).toISOString(),
    totalEvents: eventsInWindow.length,
    counts,
    conversion: {
      promptToApplyRate,
      promptToUpdateNowRate,
    },
    platformBreakdown,
    sessionBreakdown,
    distinctBuilds,
    recentEvents,
  };
}

export function resetWebUpdateTelemetryForTests(): void {
  telemetryEvents.length = 0;
}
