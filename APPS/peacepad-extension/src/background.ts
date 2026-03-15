import { createPeacepadClient, PeacepadApiError } from "@ftc/peacepad-sdk";
import type { AnalyzeMessageRequest, PreflightResponse } from "@ftc/peacepad-sdk";
import { detectSupportedSite } from "./adapters";
import { BUILD_INFO } from "./buildInfo";
import {
  appendTraceEvent,
  createTraceEvent,
  truncatePreview,
  type TraceEvent,
  type TraceEventName,
  type TraceResultStatus,
  type TraceSource,
} from "./debugTrace";
import { evaluateLocalPreflight } from "./localRules";
import {
  isLegacyPreviewResponse,
  mapLegacyPreviewToPreflight,
  shouldFallbackToLegacyPreview,
} from "./preflightCompat";
import { getSettings, saveSettings } from "./storage";

const LOG_PREFIX = "[PeacePad]";
let traceBuffer: TraceEvent[] = [];

const LEGACY_PREVIEW_ENDPOINT = "/api/messages/preview";
const ACTIONS_PREVIEW_TONE_ENDPOINT = "/api/actions/preview-tone";

type PreflightRequestMessage = {
  type: "PEACEPAD_PREFLIGHT";
  payload: AnalyzeMessageRequest;
};

type SaveConfigMessage = {
  type: "PEACEPAD_SAVE_CONFIG";
  payload: {
    apiBaseUrl?: string;
  };
};

type EnsureInjectedMessage = {
  type: "PEACEPAD_ENSURE_INJECTED";
};

type TraceEventMessage = {
  type: "PEACEPAD_TRACE_EVENT";
  payload: Omit<TraceEvent, "timestamp" | "buildId" | "pathLabel" | "tabId">;
};

type GetTraceMessage = {
  type: "PEACEPAD_GET_TRACE";
};

type ClearTraceMessage = {
  type: "PEACEPAD_CLEAR_TRACE";
};

type ExtensionMessage =
  | PreflightRequestMessage
  | SaveConfigMessage
  | EnsureInjectedMessage
  | TraceEventMessage
  | GetTraceMessage
  | ClearTraceMessage;

function recordTrace(
  source: TraceSource,
  event: TraceEventName,
  partial: Omit<TraceEvent, "timestamp" | "buildId" | "pathLabel" | "source" | "event"> & {
    status?: TraceResultStatus;
  },
): void {
  const entry = createTraceEvent({
    source,
    event,
    ...partial,
  });
  traceBuffer = appendTraceEvent(traceBuffer, entry);
  console.debug(LOG_PREFIX, event, {
    source,
    site: entry.site,
    status: entry.status,
    preflightPath: entry.preflightPath,
    riskLevel: entry.riskLevel,
    conflictScore: entry.conflictScore,
    recommendation: entry.recommendation,
    sendSource: entry.sendSource,
    error: entry.error,
  });
}

function normalizeBaseUrl(baseUrl?: string): string {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

function resolveUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildHeaders(apiKey?: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { "x-api-key": apiKey } : {}),
  };
}

function extractConversationId(metadata?: Record<string, unknown>): string | undefined {
  if (!metadata) return undefined;
  const keys = ["conversationId", "conversation_id", "threadId", "thread_id"];
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorMessageFromBody(body: unknown, response: Response, fallback: string): string {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const candidate = (body as Record<string, unknown>).message;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }
  return response.statusText || fallback;
}

async function fetchLegacyPreview(payload: AnalyzeMessageRequest, settings: Awaited<ReturnType<typeof getSettings>>): Promise<PreflightResponse> {
  const response = await fetch(resolveUrl(settings.apiBaseUrl, LEGACY_PREVIEW_ENDPOINT), {
    method: "POST",
    credentials: settings.apiKey ? "omit" : "include",
    headers: buildHeaders(settings.apiKey),
    body: JSON.stringify({
      content: payload.text,
      ...(extractConversationId(payload.metadata) ? { conversationId: extractConversationId(payload.metadata) } : {}),
    }),
  });

  const body = await parseJson(response);
  if (!response.ok) {
    throw new PeacepadApiError(
      errorMessageFromBody(body, response, "Legacy preview request failed"),
      response.status,
      body,
    );
  }

  if (!isLegacyPreviewResponse(body)) {
    throw new Error("Invalid legacy preview response");
  }

  return mapLegacyPreviewToPreflight(body);
}

async function fetchActionsPreviewTone(payload: AnalyzeMessageRequest, settings: Awaited<ReturnType<typeof getSettings>>): Promise<PreflightResponse> {
  if (!settings.apiKey) {
    throw new Error("API key required for actions preview tone fallback");
  }

  const response = await fetch(resolveUrl(settings.apiBaseUrl, ACTIONS_PREVIEW_TONE_ENDPOINT), {
    method: "POST",
    credentials: "omit",
    headers: buildHeaders(settings.apiKey),
    body: JSON.stringify({
      content: payload.text,
    }),
  });

  const body = await parseJson(response);
  if (!response.ok) {
    throw new PeacepadApiError(
      errorMessageFromBody(body, response, "Actions preview tone request failed"),
      response.status,
      body,
    );
  }

  if (!isLegacyPreviewResponse(body)) {
    const tone = body && typeof body === "object" && !Array.isArray(body) && typeof (body as Record<string, unknown>).tone === "string"
      ? String((body as Record<string, unknown>).tone)
      : "neutral";
    const summary = body && typeof body === "object" && !Array.isArray(body) && typeof (body as Record<string, unknown>).summary === "string"
      ? String((body as Record<string, unknown>).summary)
      : "Tone preview fallback";
    const rewordingSuggestion = body && typeof body === "object" && !Array.isArray(body) && typeof (body as Record<string, unknown>).rewordingSuggestion === "string"
      ? String((body as Record<string, unknown>).rewordingSuggestion)
      : null;

    return mapLegacyPreviewToPreflight({
      tone,
      summary,
      emoji: "",
      originalMessage: payload.text,
      rewordingSuggestion,
      ces: null,
    });
  }

  return mapLegacyPreviewToPreflight(body);
}

function resolveLocalFallback(
  payload: AnalyzeMessageRequest,
  site: string,
  draftPreview: string | undefined,
  reason: string,
  details?: Record<string, unknown>,
): PreflightResponse | null {
  recordTrace("background", "preflight_requested", {
    site,
    status: "ok",
    preflightPath: "local",
    draftPreview,
    details: {
      reason,
      ...details,
    },
  });

  const localDecision = evaluateLocalPreflight(payload);
  if (localDecision.kind === "resolved") {
    recordTrace("background", "preflight_result_local", {
      site,
      status: "ok",
      preflightPath: "local",
      draftPreview,
      riskLevel: localDecision.response.risk_level,
      conflictScore: localDecision.response.conflict_score,
      recommendation: localDecision.response.recommendation,
      details: {
        reason,
        classification: localDecision.classification,
        summary: localDecision.response.source.summary,
      },
    });
    return localDecision.response;
  }

  recordTrace("background", "preflight_result_local", {
    site,
    status: "failed",
    preflightPath: "local",
    draftPreview,
    error: localDecision.reason,
    details: {
      reason,
      score: localDecision.score,
      signalCount: localDecision.signals.length,
    },
  });
  return null;
}

async function handlePreflight(payload: AnalyzeMessageRequest): Promise<PreflightResponse> {
  const settings = await getSettings();
  const site = (payload.channel as string) || "unknown";
  const draftPreview = truncatePreview(payload.text);

  recordTrace("background", "preflight_requested", {
    site,
    status: "ok",
    preflightPath: "api",
    draftPreview,
    details: {
      mode: payload.mode || "unknown",
      path: payload.metadata?.path,
      send_source: payload.metadata?.send_source,
      baseUrl: settings.apiBaseUrl,
    },
  });

  const client = createPeacepadClient({
    baseUrl: settings.apiBaseUrl,
    credentials: settings.apiKey ? "omit" : "include",
    headers: settings.apiKey
      ? {
          "x-api-key": settings.apiKey,
        }
      : undefined,
    fetchImpl: (input, init) => fetch(input, init),
  });

  try {
    const response = await client.analyzeMessage(payload);
    recordTrace("background", "preflight_result_api", {
      site,
      status: "ok",
      preflightPath: "api",
      draftPreview,
      riskLevel: response.risk_level,
      conflictScore: response.conflict_score,
      recommendation: response.recommendation,
      details: {
        ruleset: response.model_or_ruleset_version.escalation_ruleset,
        summary: response.source.summary,
      },
    });
    return response;
  } catch (error) {
    if (error instanceof PeacepadApiError && shouldFallbackToLegacyPreview(error.message, error.status)) {
      recordTrace("background", "preflight_result_api", {
        site,
        status: "failed",
        preflightPath: "api",
        draftPreview,
        error: error.message,
        details: {
          status: error.status,
          fallback: "legacy_preview",
        },
      });

      recordTrace("background", "preflight_requested", {
        site,
        status: "ok",
        preflightPath: "legacy_preview",
        draftPreview,
        details: {
          mode: payload.mode || "unknown",
          path: payload.metadata?.path,
          send_source: payload.metadata?.send_source,
          baseUrl: settings.apiBaseUrl,
          endpoint: LEGACY_PREVIEW_ENDPOINT,
        },
      });

      try {
        const fallbackResponse = await fetchLegacyPreview(payload, settings);
        recordTrace("background", "preflight_result_api", {
          site,
          status: "ok",
          preflightPath: "legacy_preview",
          draftPreview,
          riskLevel: fallbackResponse.risk_level,
          conflictScore: fallbackResponse.conflict_score,
          recommendation: fallbackResponse.recommendation,
          details: {
            ruleset: fallbackResponse.model_or_ruleset_version.escalation_ruleset,
            summary: fallbackResponse.source.summary,
          },
        });
        return fallbackResponse;
      } catch (legacyError) {
        if (legacyError instanceof PeacepadApiError) {
          recordTrace("background", "preflight_result_api", {
            site,
            status: "failed",
            preflightPath: "legacy_preview",
            draftPreview,
            error: legacyError.message,
            details: {
              status: legacyError.status,
              fallback: settings.apiKey ? "actions_preview_tone_or_local" : "local",
            },
          });
        }

        const localFallback = resolveLocalFallback(payload, site, draftPreview, "legacy_preview_unavailable", {
          status: legacyError instanceof PeacepadApiError ? legacyError.status : undefined,
        });
        if (localFallback) {
          return localFallback;
        }

        if (settings.apiKey) {
          recordTrace("background", "preflight_requested", {
            site,
            status: "ok",
            preflightPath: "actions_preview_tone",
            draftPreview,
            details: {
              mode: payload.mode || "unknown",
              path: payload.metadata?.path,
              send_source: payload.metadata?.send_source,
              baseUrl: settings.apiBaseUrl,
              endpoint: ACTIONS_PREVIEW_TONE_ENDPOINT,
            },
          });

          try {
            const actionsResponse = await fetchActionsPreviewTone(payload, settings);
            recordTrace("background", "preflight_result_api", {
              site,
              status: "ok",
              preflightPath: "actions_preview_tone",
              draftPreview,
              riskLevel: actionsResponse.risk_level,
              conflictScore: actionsResponse.conflict_score,
              recommendation: actionsResponse.recommendation,
              details: {
                ruleset: actionsResponse.model_or_ruleset_version.escalation_ruleset,
                summary: actionsResponse.source.summary,
              },
            });
            return actionsResponse;
          } catch (actionsError) {
            if (actionsError instanceof PeacepadApiError) {
              recordTrace("background", "preflight_result_api", {
                site,
                status: "failed",
                preflightPath: "actions_preview_tone",
                draftPreview,
                error: actionsError.message,
                details: { status: actionsError.status },
              });
            }

            const secondLocalFallback = resolveLocalFallback(payload, site, draftPreview, "actions_preview_tone_unavailable", {
              status: actionsError instanceof PeacepadApiError ? actionsError.status : undefined,
            });
            if (secondLocalFallback) {
              return secondLocalFallback;
            }

            throw actionsError;
          }
        }

        throw legacyError;
      }
    }

    const localFallback = resolveLocalFallback(payload, site, draftPreview, "api_unavailable", {
      error: error instanceof Error ? error.message : "unknown",
    });
    if (localFallback) {
      return localFallback;
    }

    throw error;
  }
}

async function ensureInjectedIntoActiveTab(): Promise<{ ok: boolean; injected: boolean; reason?: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    recordTrace("background", "tab_injection_ensured", {
      site: "unknown",
      tabId: tab?.id,
      status: "failed",
      error: "no_active_tab",
    });
    return { ok: false, injected: false, reason: "no_active_tab" };
  }

  let site = null;
  try {
    site = detectSupportedSite(new URL(tab.url).hostname);
  } catch {
    site = null;
  }

  if (!site) {
    recordTrace("background", "tab_injection_ensured", {
      site: "unknown",
      tabId: tab.id,
      status: "failed",
      error: "unsupported_site",
      details: { url: tab.url },
    });
    return { ok: false, injected: false, reason: "unsupported_site" };
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["dist/content.js"],
  });

  recordTrace("background", "tab_injection_ensured", {
    site,
    tabId: tab.id,
    status: "ok",
    details: { url: tab.url },
  });

  return { ok: true, injected: true };
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "PEACEPAD_TRACE_EVENT") {
    const event = createTraceEvent({
      ...message.payload,
      tabId: sender.tab?.id,
    });
    traceBuffer = appendTraceEvent(traceBuffer, event);
    console.debug(LOG_PREFIX, event.event, {
      source: event.source,
      site: event.site,
      status: event.status,
      preflightPath: event.preflightPath,
      sendSource: event.sendSource,
      riskLevel: event.riskLevel,
      conflictScore: event.conflictScore,
      recommendation: event.recommendation,
      error: event.error,
    });
    sendResponse?.({ ok: true });
    return true;
  }

  if (message.type === "PEACEPAD_GET_TRACE") {
    sendResponse({ ok: true, data: { buildInfo: BUILD_INFO, events: traceBuffer } });
    return true;
  }

  if (message.type === "PEACEPAD_CLEAR_TRACE") {
    traceBuffer = [];
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "PEACEPAD_SAVE_CONFIG") {
    void (async () => {
      const current = await getSettings();
      await saveSettings({
        ...current,
        apiBaseUrl: (message.payload.apiBaseUrl || current.apiBaseUrl).trim() || current.apiBaseUrl,
      });
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === "PEACEPAD_ENSURE_INJECTED") {
    void (async () => {
      try {
        const result = await ensureInjectedIntoActiveTab();
        sendResponse(result);
      } catch (error) {
        recordTrace("background", "tab_injection_ensured", {
          site: "unknown",
          tabId: sender.tab?.id,
          status: "failed",
          error: error instanceof Error ? error.message : "ensure_injected_failed",
        });
        sendResponse({
          ok: false,
          injected: false,
          reason: error instanceof Error ? error.message : "ensure_injected_failed",
        });
      }
    })();
    return true;
  }

  if (message.type === "PEACEPAD_PREFLIGHT") {
    void (async () => {
      try {
        const response = await handlePreflight(message.payload);
        sendResponse({ ok: true, data: response });
      } catch (error) {
        if (error instanceof PeacepadApiError) {
          recordTrace("background", "preflight_result_api", {
            site: (message.payload.channel as string) || "unknown",
            tabId: sender.tab?.id,
            status: "failed",
            preflightPath: "api",
            draftPreview: truncatePreview(message.payload.text),
            error: error.message,
            details: { status: error.status },
          });
          sendResponse({
            ok: false,
            error: {
              message: error.message,
              status: error.status,
            },
          });
          return;
        }

        recordTrace("background", "preflight_result_api", {
          site: (message.payload.channel as string) || "unknown",
          tabId: sender.tab?.id,
          status: "failed",
          preflightPath: "api",
          draftPreview: truncatePreview(message.payload.text),
          error: error instanceof Error ? error.message : "Preflight request failed",
        });
        sendResponse({
          ok: false,
          error: {
            message: error instanceof Error ? error.message : "Preflight request failed",
          },
        });
      }
    })();

    return true;
  }
});
