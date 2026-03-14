import { createPeacepadClient, PeacepadApiError } from "@ftc/peacepad-sdk";
import type { AnalyzeMessageRequest } from "@ftc/peacepad-sdk";
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

type ExtensionMessage = PreflightRequestMessage | SaveConfigMessage;

async function handlePreflight(payload: AnalyzeMessageRequest) {
  const settings = await getSettings();
  console.debug(LOG_PREFIX, "background preflight request", {
    baseUrl: settings.apiBaseUrl,
    channel: payload.channel || "unknown",
    mode: payload.mode || "unknown",
    authMode: settings.apiKey ? "api_key" : "session_cookie",
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

  return client.analyzeMessage(payload);
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

  if (message.type === "PEACEPAD_PREFLIGHT") {
    void (async () => {
      try {
        const response = await handlePreflight(message.payload);
        console.debug(LOG_PREFIX, "background preflight success", {
          risk: response.risk_level,
          score: response.conflict_score,
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
