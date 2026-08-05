import * as SecureStore from "expo-secure-store";
import { secureStagingSessionStore, validStagingAccessToken, type StoredStagingSession } from "./secureStagingSession";

const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const session: StoredStagingSession = {
  accessToken: "a".repeat(48),
  actorDisplayName: "Alex Example",
  consent: { termsAccepted: true, privacyAcknowledged: true, aiMessageConsent: false },
  savedAt: "2026-08-04T20:00:00.000Z"
};

describe("secure staging session", () => {
  beforeEach(() => jest.clearAllMocks());

  it("accepts bounded opaque keys and rejects whitespace or short values", () => {
    expect(validStagingAccessToken("a".repeat(32))).toBe(true);
    expect(validStagingAccessToken("short")).toBe(false);
    expect(validStagingAccessToken(`${"a".repeat(32)} space`)).toBe(false);
  });

  it("stores a consented session in device-only SecureStore", async () => {
    await secureStagingSessionStore.save(session);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      "peacepad.native.staging-session.v1",
      JSON.stringify(session),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    );
  });

  it("restores valid state and clears malformed state", async () => {
    secureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify(session));
    await expect(secureStagingSessionStore.read()).resolves.toEqual(session);
    secureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify({ ...session, accessToken: "bad" }));
    await expect(secureStagingSessionStore.read()).resolves.toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("peacepad.native.staging-session.v1");
  });
});
