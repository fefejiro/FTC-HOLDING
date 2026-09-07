import * as SecureStore from "expo-secure-store";
import type { ConsentPreferences, GuestSessionResponse } from "../api/contracts";

const SESSION_STORAGE_KEY = "peacepad.native.guest-session.v1";

export type StoredGuestSession = {
  sessionId: string;
  guestId: string;
  expiresAt: string;
  consent: ConsentPreferences;
};

export interface GuestSessionStore {
  read(): Promise<StoredGuestSession | null>;
  save(session: StoredGuestSession): Promise<void>;
  clear(): Promise<void>;
}

function isValidStoredSession(value: unknown): value is StoredGuestSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<StoredGuestSession>;
  const expiresAtMs =
    typeof session.expiresAt === "string"
      ? Date.parse(session.expiresAt)
      : Number.NaN;
  return (
    typeof session.sessionId === "string" &&
    session.sessionId.length > 0 &&
    typeof session.guestId === "string" &&
    session.guestId.length > 0 &&
    typeof session.expiresAt === "string" &&
    Number.isFinite(expiresAtMs) &&
    Boolean(session.consent) &&
    session.consent?.termsAccepted === true &&
    session.consent?.privacyAcknowledged === true &&
    typeof session.consent?.aiMessageConsent === "boolean"
  );
}

export class ExpoSecureGuestSessionStore implements GuestSessionStore {
  async read(): Promise<StoredGuestSession | null> {
    const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isValidStoredSession(parsed)) {
        await this.clear();
        return null;
      }
      if (Date.parse(parsed.expiresAt) <= Date.now()) {
        await this.clear();
        return null;
      }
      return parsed;
    } catch {
      await this.clear();
      return null;
    }
  }

  async save(session: StoredGuestSession): Promise<void> {
    if (!isValidStoredSession(session)) {
      throw new Error("Refusing to store an invalid PeacePad guest session.");
    }
    await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    });
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
  }
}

export function createStoredGuestSession(
  response: GuestSessionResponse,
  consent: ConsentPreferences
): StoredGuestSession {
  return {
    sessionId: response.sessionId,
    guestId: response.guestId,
    expiresAt: response.expiresAt,
    consent
  };
}

export const secureGuestSessionStore = new ExpoSecureGuestSessionStore();
