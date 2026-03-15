import type { SupportedSite } from "./adapters";
import { BUILD_INFO } from "./buildInfo";

export type TraceSource = "content" | "background" | "popup";
export type TraceResultStatus = "ok" | "skipped" | "failed";
export type SendSource = "enter_key" | "send_button_click" | "manual_after_apply";
export type TraceEventName =
  | "content_loaded"
  | "tab_injection_ensured"
  | "draft_detected"
  | "background_check_scheduled"
  | "send_gate_intercepted"
  | "send_blocked_modal_open"
  | "preflight_requested"
  | "preflight_result_local"
  | "preflight_result_api"
  | "intervention_decision"
  | "modal_opened"
  | "apply_suggested_clicked"
  | "approved_text_selected"
  | "approved_send_attempted"
  | "approved_send_result"
  | "approved_send_fallback"
  | "approved_handoff_armed"
  | "approved_handoff_banner_shown"
  | "approved_handoff_blocked_selected"
  | "approved_handoff_paste_detected"
  | "approved_handoff_approved_detected"
  | "approved_handoff_paste_prepared"
  | "approved_handoff_ready"
  | "approved_handoff_send_blocked"
  | "approved_handoff_reopened"
  | "approved_handoff_send_allowed"
  | "approved_handoff_cleared"
  | "composer_replace_started"
  | "composer_replace_retry"
  | "composer_replace_verified"
  | "composer_replace_failed"
  | "send_original_clicked"
  | "cancel_clicked"
  | "manual_send_after_apply_detected"
  | "trace_exported";

export type TracePreflightPath = "api" | "legacy_preview" | "actions_preview_tone" | "local";

export interface TraceEvent {
  timestamp: string;
  source: TraceSource;
  event: TraceEventName;
  site?: SupportedSite | string;
  tabId?: number;
  buildId: string;
  pathLabel: string;
  draftFingerprint?: string;
  draftPreview?: string;
  expectedSuggestionPreview?: string;
  actualComposerPreview?: string;
  sendSource?: SendSource;
  riskLevel?: string;
  conflictScore?: number;
  recommendation?: string;
  preflightPath?: TracePreflightPath;
  status?: TraceResultStatus;
  error?: string;
  details?: Record<string, unknown>;
}

export interface TraceExportContext {
  site?: SupportedSite | null;
  apiBaseUrl: string;
  autoMonitoring: boolean;
  events: TraceEvent[];
}

export const TRACE_BUFFER_LIMIT = 250;

export function truncatePreview(value?: string | null, max = 96): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 3)}...`;
}

export function createTraceEvent(partial: Omit<TraceEvent, "timestamp" | "buildId" | "pathLabel">): TraceEvent {
  return {
    ...partial,
    timestamp: new Date().toISOString(),
    buildId: BUILD_INFO.buildId,
    pathLabel: BUILD_INFO.pathLabel,
  };
}

export function appendTraceEvent(events: TraceEvent[], event: TraceEvent, limit = TRACE_BUFFER_LIMIT): TraceEvent[] {
  const next = [...events, event];
  return next.length <= limit ? next : next.slice(next.length - limit);
}

export function formatTraceExport(context: TraceExportContext): string {
  const lines = [
    "PeacePad Debug Trace",
    `Path: ${BUILD_INFO.pathLabel}`,
    `Version: ${BUILD_INFO.version}`,
    `Built At: ${BUILD_INFO.builtAt}`,
    `Build ID: ${BUILD_INFO.buildId}`,
    `Site: ${context.site || "unknown"}`,
    `API Base URL: ${context.apiBaseUrl}`,
    `Auto Monitoring: ${context.autoMonitoring ? "on" : "off"}`,
    `Trace Events: ${context.events.length}`,
    "",
  ];

  for (const event of context.events) {
    lines.push(`${event.timestamp} | ${event.source} | ${event.event} | status=${event.status || "ok"} | site=${event.site || "unknown"}`);
    if (event.sendSource) lines.push(`  sendSource: ${event.sendSource}`);
    if (event.riskLevel || typeof event.conflictScore === "number" || event.recommendation) {
      lines.push(`  risk=${event.riskLevel || "n/a"} score=${typeof event.conflictScore === "number" ? event.conflictScore : "n/a"} recommendation=${event.recommendation || "n/a"}`);
    }
    if (event.draftFingerprint) lines.push(`  fingerprint: ${event.draftFingerprint}`);
    if (event.draftPreview) lines.push(`  draft: ${event.draftPreview}`);
    if (event.expectedSuggestionPreview) lines.push(`  expected: ${event.expectedSuggestionPreview}`);
    if (event.actualComposerPreview) lines.push(`  actual: ${event.actualComposerPreview}`);
    if (event.preflightPath) lines.push(`  path: ${event.preflightPath}`);
    if (event.error) lines.push(`  error: ${event.error}`);
    if (event.details && Object.keys(event.details).length > 0) lines.push(`  details: ${JSON.stringify(event.details)}`);
  }

  return `${lines.join("\n")}\n\n---- JSON ----\n${JSON.stringify({ build: BUILD_INFO, site: context.site || null, apiBaseUrl: context.apiBaseUrl, autoMonitoring: context.autoMonitoring, events: context.events }, null, 2)}`;
}
