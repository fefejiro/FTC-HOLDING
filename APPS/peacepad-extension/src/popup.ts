import { BUILD_INFO } from "./buildInfo";
import { detectSupportedSite, type SupportedSite } from "./adapters";
import { formatTraceExport } from "./debugTrace";
import { canEnableAuto, getSettings, setAutoForSite, updateSettings } from "./storage";

const LOG_PREFIX = "[PeacePad]";

async function getCurrentSite(): Promise<SupportedSite | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url;
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return detectSupportedSite(parsed.hostname);
  } catch {
    return null;
  }
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function emitPopupTrace(event: "trace_exported" | "tab_injection_ensured", data?: Record<string, unknown>): void {
  try {
    chrome.runtime.sendMessage({
      type: "PEACEPAD_TRACE_EVENT",
      payload: {
        source: "popup",
        event,
        status: "ok",
        details: data || {},
      },
    });
  } catch {
    // no-op
  }
}

async function bootstrap(): Promise<void> {
  const settings = await getSettings();
  const site = await getCurrentSite();

  const apiBaseInput = document.getElementById("api-base") as HTMLInputElement | null;
  const apiKeyInput = document.getElementById("api-key") as HTMLInputElement | null;
  const saveButton = document.getElementById("save-config") as HTMLButtonElement | null;
  const autoToggle = document.getElementById("auto-toggle") as HTMLInputElement | null;
  const copyTraceButton = document.getElementById("copy-trace") as HTMLButtonElement | null;
  const clearTraceButton = document.getElementById("clear-trace") as HTMLButtonElement | null;

  setText("build-stamp", `${BUILD_INFO.pathLabel} | v${BUILD_INFO.version} | built ${BUILD_INFO.builtAt}`);

  if (apiBaseInput) {
    apiBaseInput.value = settings.apiBaseUrl;
  }
  if (apiKeyInput) {
    apiKeyInput.value = settings.apiKey || "";
  }

  if (!site) {
    setText("site-name", "Unsupported page");
    setText("site-status", "Open WhatsApp Web, Gmail, or Slack to use this extension.");
    if (autoToggle) {
      autoToggle.disabled = true;
      autoToggle.checked = false;
    }
  } else {
    setText("site-name", site);
    const autoAvailable = canEnableAuto(settings, site);
    const ensureResult = await chrome.runtime.sendMessage({ type: "PEACEPAD_ENSURE_INJECTED" }).catch(() => null);
    emitPopupTrace("tab_injection_ensured", { site, ok: ensureResult?.ok ?? false });

    if (autoToggle) {
      autoToggle.checked = Boolean(settings.autoBySite[site]);
      autoToggle.disabled = !autoAvailable;
      autoToggle.addEventListener("change", async () => {
        await setAutoForSite(site, autoToggle.checked);
        setText("site-status", autoToggle.checked ? "Monitoring is ON for this site." : "Monitoring is OFF for this site.");
      });
    }

    setText(
      "site-status",
      autoAvailable
        ? Boolean(settings.autoBySite[site])
          ? ensureResult?.ok
            ? "Monitoring is ON. This tab is ready. WhatsApp uses Apply Suggested for safe draft review before sending."
            : "Monitoring is ON, but this tab may need a refresh if logs do not appear."
          : "Monitoring is OFF. Turn it on below for WhatsApp testing."
        : "Auto-check unavailable on this page.",
    );
  }

  saveButton?.addEventListener("click", async () => {
    const nextUrl = (apiBaseInput?.value || "").trim();
    const nextApiKey = (apiKeyInput?.value || "").trim();
    await updateSettings((current) => ({
      ...current,
      apiBaseUrl: nextUrl || current.apiBaseUrl,
      apiKey: nextApiKey,
    }));
    setText("save-status", "Saved");
    window.setTimeout(() => setText("save-status", ""), 2000);
  });

  copyTraceButton?.addEventListener("click", async () => {
    const traceResponse = await chrome.runtime.sendMessage({ type: "PEACEPAD_GET_TRACE" }).catch(() => null);
    const latestSettings = await getSettings();
    const latestSite = await getCurrentSite();
    const exportText = formatTraceExport({
      site: latestSite,
      apiBaseUrl: latestSettings.apiBaseUrl,
      autoMonitoring: Boolean(latestSite && latestSettings.autoBySite[latestSite]),
      events: traceResponse?.data?.events || [],
    });

    await navigator.clipboard.writeText(exportText);
    setText("trace-status", "Debug trace copied");
    console.debug(LOG_PREFIX, "trace_exported", { events: traceResponse?.data?.events?.length || 0 });
    emitPopupTrace("trace_exported", { site: latestSite, events: traceResponse?.data?.events?.length || 0 });
    window.setTimeout(() => setText("trace-status", ""), 2500);
  });

  clearTraceButton?.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "PEACEPAD_CLEAR_TRACE" }).catch(() => null);
    setText("trace-status", "Debug trace cleared");
    window.setTimeout(() => setText("trace-status", ""), 2500);
  });
}

void bootstrap();
