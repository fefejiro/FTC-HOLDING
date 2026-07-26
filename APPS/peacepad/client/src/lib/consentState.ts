export const CONSENT_STORAGE_KEYS = {
  required: "peacepad_required_consent_v2",
  legacyRequired: "hasAcceptedConsent",
  aiMessages: "aiMessageConsent",
  aiCalls: "aiCallConsent",
} as const;

export type StoredConsentPreferences = {
  requiredAccepted: boolean;
  aiMessageConsent: boolean;
  aiCallConsent: boolean;
};

type ConsentStorage = Pick<Storage, "getItem" | "setItem">;

function getBrowserStorage(): ConsentStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function readStoredConsent(
  storage: Pick<ConsentStorage, "getItem"> | null = getBrowserStorage(),
): StoredConsentPreferences {
  return {
    requiredAccepted: storage?.getItem(CONSENT_STORAGE_KEYS.required) === "true",
    aiMessageConsent: storage?.getItem(CONSENT_STORAGE_KEYS.aiMessages) === "true",
    aiCallConsent: storage?.getItem(CONSENT_STORAGE_KEYS.aiCalls) === "true",
  };
}

export function persistStoredConsent(
  preferences: StoredConsentPreferences,
  storage: Pick<ConsentStorage, "setItem"> | null = getBrowserStorage(),
): void {
  if (!storage) {
    return;
  }

  storage.setItem(CONSENT_STORAGE_KEYS.required, String(preferences.requiredAccepted));
  storage.setItem(CONSENT_STORAGE_KEYS.legacyRequired, String(preferences.requiredAccepted));
  storage.setItem(CONSENT_STORAGE_KEYS.aiMessages, String(preferences.aiMessageConsent));
  storage.setItem(CONSENT_STORAGE_KEYS.aiCalls, String(preferences.aiCallConsent));
}
