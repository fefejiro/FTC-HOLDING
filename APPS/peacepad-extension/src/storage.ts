import type { SupportedSite } from "./adapters";

export interface ExtensionSettings {
  apiBaseUrl: string;
  apiKey: string;
  autoBySite: Partial<Record<SupportedSite, boolean>>;
}

const STORAGE_KEY = "peacepad_extension_settings_v1";

const DEFAULT_SETTINGS: ExtensionSettings = {
  apiBaseUrl: "https://api.peacepad.ca",
  apiKey: "",
  autoBySite: {
    whatsapp: true,
    gmail: true,
    slack: true,
  },
};

let memoryFallback: ExtensionSettings = { ...DEFAULT_SETTINGS };

function hasChromeStorage(): boolean {
  return Boolean(globalThis.chrome?.storage?.sync);
}

function mergeSettings(partial?: Partial<ExtensionSettings> | null): ExtensionSettings {
  return {
    apiBaseUrl: partial?.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl,
    apiKey: typeof partial?.apiKey === "string" ? partial.apiKey.trim() : DEFAULT_SETTINGS.apiKey,
    autoBySite: {
      ...DEFAULT_SETTINGS.autoBySite,
      ...(partial?.autoBySite || {}),
    },
  };
}

export async function getSettings(): Promise<ExtensionSettings> {
  if (!hasChromeStorage()) {
    return mergeSettings(memoryFallback);
  }

  const data = await chrome.storage.sync.get(STORAGE_KEY);
  return mergeSettings((data?.[STORAGE_KEY] as Partial<ExtensionSettings> | undefined) || null);
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  const normalized = mergeSettings(settings);

  if (!hasChromeStorage()) {
    memoryFallback = normalized;
    return;
  }

  await chrome.storage.sync.set({
    [STORAGE_KEY]: normalized,
  });
}

export async function updateSettings(
  updater: (settings: ExtensionSettings) => ExtensionSettings,
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated = mergeSettings(updater(current));
  await saveSettings(updated);
  return updated;
}

export async function setAutoForSite(site: SupportedSite, enabled: boolean): Promise<ExtensionSettings> {
  return updateSettings((settings) => ({
    ...settings,
    autoBySite: {
      ...settings.autoBySite,
      [site]: enabled,
    },
  }));
}

export function canUseAuto(settings: ExtensionSettings, site: SupportedSite): boolean {
  return Boolean(settings.autoBySite[site]);
}

export function canEnableAuto(settings: ExtensionSettings, site: SupportedSite): boolean {
  void settings;
  void site;
  return true;
}
