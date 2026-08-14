import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const SUPPORT_DIAGNOSTIC_KEY = "peacepad.support.diagnostic-id.v1";
const SUPPORT_DIAGNOSTIC_PATTERN = /^PP-[A-F0-9]{12}$/;

export interface SupportDiagnosticStore {
  read(): Promise<string | null>;
  save(value: string): Promise<void>;
}

export const secureSupportDiagnosticStore: SupportDiagnosticStore = {
  read: () => SecureStore.getItemAsync(SUPPORT_DIAGNOSTIC_KEY),
  save: (value) => SecureStore.setItemAsync(SUPPORT_DIAGNOSTIC_KEY, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  })
};

export function createSupportDiagnosticId(uuid = Crypto.randomUUID()): string {
  const compact = uuid.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (compact.length < 12) throw new Error("Unable to create a PeacePad support identifier.");
  return `PP-${compact.slice(0, 12)}`;
}

export async function getOrCreateSupportDiagnosticId(
  store: SupportDiagnosticStore = secureSupportDiagnosticStore
): Promise<string> {
  const existing = await store.read();
  if (existing && SUPPORT_DIAGNOSTIC_PATTERN.test(existing)) return existing;
  const created = createSupportDiagnosticId();
  await store.save(created);
  return created;
}

export function createSupportEmailUrl(diagnosticId: string): string {
  if (!SUPPORT_DIAGNOSTIC_PATTERN.test(diagnosticId)) {
    throw new Error("A valid PeacePad support identifier is required.");
  }
  const subject = encodeURIComponent("PeacePad support request");
  const body = encodeURIComponent(`Diagnostic ID: ${diagnosticId}\n\nHow can we help?\n`);
  return `mailto:support@peacepad.ca?subject=${subject}&body=${body}`;
}
