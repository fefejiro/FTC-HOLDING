import * as SecureStore from "expo-secure-store";
import {
  createStoredGuestSession,
  ExpoSecureGuestSessionStore,
  type StoredGuestSession
} from "./secureGuestSession";

const secureStoreMock = SecureStore as jest.Mocked<typeof SecureStore>;

const validStoredSession: StoredGuestSession = {
  sessionId: "session-1",
  guestId: "guest-1",
  expiresAt: "2099-01-01T00:00:00.000Z",
  consent: {
    termsAccepted: true,
    privacyAcknowledged: true,
    aiMessageConsent: false
  }
};

describe("ExpoSecureGuestSessionStore", () => {
  beforeEach(() => {
    secureStoreMock.getItemAsync.mockReset();
    secureStoreMock.setItemAsync.mockReset();
    secureStoreMock.deleteItemAsync.mockReset();
    secureStoreMock.getItemAsync.mockResolvedValue(null);
    secureStoreMock.setItemAsync.mockResolvedValue(undefined);
    secureStoreMock.deleteItemAsync.mockResolvedValue(undefined);
  });

  it("saves and restores a valid consented session", async () => {
    const store = new ExpoSecureGuestSessionStore();
    await store.save(validStoredSession);

    expect(secureStoreMock.setItemAsync).toHaveBeenCalledWith(
      "peacepad.native.guest-session.v1",
      JSON.stringify(validStoredSession),
      {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
      }
    );

    secureStoreMock.getItemAsync.mockResolvedValue(
      JSON.stringify(validStoredSession)
    );
    await expect(store.read()).resolves.toEqual(validStoredSession);
  });

  it.each([
    ["expired", { ...validStoredSession, expiresAt: "2020-01-01T00:00:00.000Z" }],
    ["invalid expiry", { ...validStoredSession, expiresAt: "not-a-date" }],
    [
      "missing required consent",
      {
        ...validStoredSession,
        consent: {
          ...validStoredSession.consent,
          privacyAcknowledged: false
        }
      }
    ]
  ])("clears an %s stored session", async (_label, stored) => {
    secureStoreMock.getItemAsync.mockResolvedValue(JSON.stringify(stored));
    const store = new ExpoSecureGuestSessionStore();

    await expect(store.read()).resolves.toBeNull();
    expect(secureStoreMock.deleteItemAsync).toHaveBeenCalledWith(
      "peacepad.native.guest-session.v1"
    );
  });

  it("clears unreadable session data", async () => {
    secureStoreMock.getItemAsync.mockResolvedValue("{not-json");
    const store = new ExpoSecureGuestSessionStore();

    await expect(store.read()).resolves.toBeNull();
    expect(secureStoreMock.deleteItemAsync).toHaveBeenCalledTimes(1);
  });

  it("refuses to persist an invalid session", async () => {
    const store = new ExpoSecureGuestSessionStore();

    await expect(
      store.save({
        ...validStoredSession,
        consent: {
          ...validStoredSession.consent,
          termsAccepted: false
        }
      })
    ).rejects.toThrow("Refusing to store an invalid PeacePad guest session.");
    expect(secureStoreMock.setItemAsync).not.toHaveBeenCalled();
  });

  it("resets only the PeacePad device-session key", async () => {
    const store = new ExpoSecureGuestSessionStore();
    await store.clear();

    expect(secureStoreMock.deleteItemAsync).toHaveBeenCalledWith(
      "peacepad.native.guest-session.v1"
    );
  });

  it("creates the persisted shape from the API response and consent", () => {
    expect(
      createStoredGuestSession(
        {
          guestSessionId: "guest-session-1",
          sessionId: "session-1",
          guestId: "guest-1",
          expiresAt: "2099-01-01T00:00:00.000Z"
        },
        validStoredSession.consent
      )
    ).toEqual(validStoredSession);
  });
});
