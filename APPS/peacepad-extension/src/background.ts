import { createPeacepadClient, PeacepadApiError } from "@ftc/peacepad-sdk";
import type { AnalyzeMessageRequest } from "@ftc/peacepad-sdk";
import { detectSupportedSite } from "./adapters";
import { evaluateLocalPreflight } from "./localRules";
import { getSettings, saveSettings } from "./storage";

const LOG_PREFIX = "[PeacePad]";

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

type ExtensionMessage = PreflightRequestMessage | SaveConfigMessage | EnsureInjectedMessage;

async function ensureInjectedIntoActiveTab(): Promise<{ ok: boolean; injected: boolean; reason?: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    return { ok: false, injected: false, reason: "no_active_tab" };
  }

  let site = null;
  try {
    site = detectSupportedSite(new URL(tab.url).hostname);
  } catch {
    site = null;
  }

  if (!site) {
    return { ok: false, injected: false, reason: "unsupported_site" };
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["dist/content.js"],
  });

  console.debug(LOG_PREFIX, "content script ensured for active tab", {
    tabId: tab.id,
    site,
    url: tab.url,
  });

  return { ok: true, injected: true };
}

async function handlePreflight(payload: AnalyzeMessageRequest) {
  const settings = await getSettings();
  const localDecision = evaluateLocalPreflight(payload);
  if (localDecision.kind === "resolved") {
    console.debug(LOG_PREFIX, `local rule matched: ${localDecision.classification}`, {
      channel: payload.channel || "unknown",
      mode: payload.mode || "unknown",
      risk: localDecision.response.risk_level,
      score: localDecision.response.conflict_score,
      signals: localDecision.response.signals.map((signal) => signal.code),
    });
    return localDecision.response;
  }

  console.debug(LOG_PREFIX, localDecision.reason, {
    channel: payload.channel || "unknown",
    mode: payload.mode || "unknown",
    score: localDecision.score,
    signals: localDecision.signals.map((signal) => signal.code),
    baseUrl: settings.apiBaseUrl,
    authMode: settings.apiKey ? "api_key" : "session_cookie",
  });

  console.debug(LOG_PREFIX, "api fallback attempted", {
    channel: payload.channel || "unknown",
    mode: payload.mode || "unknown",
    baseUrl: settings.apiBaseUrl,
  });
  const client = createPeacepadClient({
    baseUrl: settings.apiBaseUrl,
    credentials: settings.apiKey ? "omit" : "include",
    headers: settings.apiKey
      ? {
          "x-api-key": settings.apiKey,
        }
      : undefined,
  });

  const response = await client.analyzeMessage(payload);
  console.debug(LOG_PREFIX, "api fallback success", {
    risk: response.risk_level,
    score: response.conflict_score,
  });
  return response;
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return;
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
        console.debug(LOG_PREFIX, "content script ensure failed", {
          message: error instanceof Error ? error.message : "unknown_error",
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
        console.debug(LOG_PREFIX, "background preflight success", {
          risk: response.risk_level,
          score: response.conflict_score,
          ruleset: response.model_or_ruleset_version.escalation_ruleset,
        });
        sendResponse({ ok: true, data: response });
      } catch (error) {
        if (error instanceof PeacepadApiError) {
          console.debug(LOG_PREFIX, "background preflight api error", {
            status: error.status,
            message: error.message,
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

        console.debug(LOG_PREFIX, "background preflight error", {
          message: error instanceof Error ? error.message : "Preflight request failed",
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
