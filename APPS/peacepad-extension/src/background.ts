import { createPeacepadClient, PeacepadApiError } from "@ftc/peacepad-sdk";
import type { AnalyzeMessageRequest } from "@ftc/peacepad-sdk";
import { getSettings, saveSettings } from "./storage";

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
        sendResponse({ ok: true, data: response });
      } catch (error) {
        if (error instanceof PeacepadApiError) {
          sendResponse({
            ok: false,
            error: {
              message: error.message,
              status: error.status,
            },
          });
          return;
        }

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
