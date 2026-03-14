import { detectSupportedSite, type SupportedSite } from "./adapters";
import { canEnableAuto, getSettings, setAutoForSite, updateSettings } from "./storage";

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

async function bootstrap(): Promise<void> {
  const settings = await getSettings();
  const site = await getCurrentSite();

  const apiBaseInput = document.getElementById("api-base") as HTMLInputElement | null;
  const apiKeyInput = document.getElementById("api-key") as HTMLInputElement | null;
  const saveButton = document.getElementById("save-config") as HTMLButtonElement | null;
  const autoToggle = document.getElementById("auto-toggle") as HTMLInputElement | null;

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

    if (autoToggle) {
      autoToggle.checked = Boolean(settings.autoBySite[site]);
      autoToggle.disabled = !autoAvailable;
      autoToggle.addEventListener("change", async () => {
        await setAutoForSite(site, autoToggle.checked);
        setText("site-status", autoToggle.checked ? "Auto-check enabled for this site." : "Auto-check disabled.");
      });
    }

    setText(
      "site-status",
      autoAvailable
        ? Boolean(settings.autoBySite[site])
          ? ensureResult?.ok
            ? "Monitoring is ON. This tab is ready. Type 18+ characters and pause briefly, or press Enter to trigger the send gate."
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
    setTimeout(() => setText("save-status", ""), 2000);
  });
}

void bootstrap();
