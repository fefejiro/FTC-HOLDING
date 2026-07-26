import { describe, expect, it } from "vitest";
import {
  CONSENT_STORAGE_KEYS,
  persistStoredConsent,
  readStoredConsent,
} from "../../client/src/lib/consentState";

function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("stored consent preferences", () => {
  it("defaults every consent choice to false", () => {
    expect(readStoredConsent(createMemoryStorage())).toEqual({
      requiredAccepted: false,
      aiMessageConsent: false,
      aiCallConsent: false,
    });
  });

  it("does not treat the legacy auto-granted flag as current consent", () => {
    const storage = createMemoryStorage();
    storage.setItem(CONSENT_STORAGE_KEYS.legacyRequired, "true");

    expect(readStoredConsent(storage).requiredAccepted).toBe(false);
  });

  it("persists required consent separately from optional AI choices", () => {
    const storage = createMemoryStorage();

    persistStoredConsent(
      {
        requiredAccepted: true,
        aiMessageConsent: false,
        aiCallConsent: false,
      },
      storage,
    );

    expect(readStoredConsent(storage)).toEqual({
      requiredAccepted: true,
      aiMessageConsent: false,
      aiCallConsent: false,
    });
    expect(storage.getItem(CONSENT_STORAGE_KEYS.legacyRequired)).toBe("true");
  });
});
