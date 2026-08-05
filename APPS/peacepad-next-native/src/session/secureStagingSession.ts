import * as SecureStore from "expo-secure-store";
import type { ConsentPreferences } from "../api/contracts";

const STAGING_SESSION_STORAGE_KEY = "peacepad.native.staging-session.v1";

export type StoredStagingSession = Readonly<{
  accessToken: string;
  actorIdentityId: string;
  actorDisplayName: string;
  consent: ConsentPreferences;
  savedAt: string;
}>;

export interface StagingSessionStore {
  read(): Promise<StoredStagingSession | null>;
  save(session: StoredStagingSession): Promise<void>;
  clear(): Promise<void>;
}

export function validStagingAccessToken(value: string) {
  return value.length >= 32 && value.length <= 512 && !/\s/.test(value);
}

function validSession(value: unknown): value is StoredStagingSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<StoredStagingSession>;
  return typeof session.accessToken === "string"
    && validStagingAccessToken(session.accessToken)
    && typeof session.actorIdentityId === "string"
    && session.actorIdentityId.trim().length > 0
    && typeof session.actorDisplayName === "string"
    && session.actorDisplayName.trim().length > 0
    && typeof session.savedAt === "string"
    && Number.isFinite(Date.parse(session.savedAt))
    && session.consent?.termsAccepted === true
    && session.consent?.privacyAcknowledged === true
    && typeof session.consent?.aiMessageConsent === "boolean";
}

export const secureStagingSessionStore: StagingSessionStore = {
  async read() {
    const raw = await SecureStore.getItemAsync(STAGING_SESSION_STORAGE_KEY);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as unknown;
      if (validSession(value)) return value;
    } catch {
      // Invalid secure data is cleared below.
    }
    await SecureStore.deleteItemAsync(STAGING_SESSION_STORAGE_KEY);
    return null;
  },
  async save(session) {
    if (!validSession(session)) throw new Error("Refusing to store an invalid PeacePad staging session.");
    await SecureStore.setItemAsync(STAGING_SESSION_STORAGE_KEY, JSON.stringify(session), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    });
  },
  async clear() {
    await SecureStore.deleteItemAsync(STAGING_SESSION_STORAGE_KEY);
  }
};
