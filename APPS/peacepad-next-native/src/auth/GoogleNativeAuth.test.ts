import { Platform } from "react-native";
import {
  GoogleIdentityError,
  requestGoogleIdentityToken,
  resolveGoogleClientConfiguration,
  type GoogleIdentityAdapter
} from "./GoogleNativeAuth";

const configuration = {
  EXPO_PUBLIC_PEACEPAD_GOOGLE_WEB_CLIENT_ID: "123456789-web.apps.googleusercontent.com",
  EXPO_PUBLIC_PEACEPAD_GOOGLE_IOS_CLIENT_ID: "123456789-ios.apps.googleusercontent.com"
};

function adapter(result: { type: "cancelled" } | { type: "success"; idToken: string | null }): GoogleIdentityAdapter {
  return {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => result)
  };
}

describe("native Google identity", () => {
  it("requires exact OAuth client identifiers instead of service-account material", () => {
    expect(resolveGoogleClientConfiguration(configuration)).toEqual({
      webClientId: configuration.EXPO_PUBLIC_PEACEPAD_GOOGLE_WEB_CLIENT_ID,
      iosClientId: configuration.EXPO_PUBLIC_PEACEPAD_GOOGLE_IOS_CLIENT_ID
    });
    expect(() => resolveGoogleClientConfiguration({
      EXPO_PUBLIC_PEACEPAD_GOOGLE_WEB_CLIENT_ID: "service-account.json",
      EXPO_PUBLIC_PEACEPAD_GOOGLE_IOS_CLIENT_ID: ""
    })).toThrow(new GoogleIdentityError("configuration"));
  });

  it("returns only the native ID token and requests no offline Google access", async () => {
    const native = adapter({ type: "success", idToken: "google-id-token" });
    await expect(requestGoogleIdentityToken(native, configuration)).resolves.toBe("google-id-token");
    expect(native.configure).toHaveBeenCalledWith({
      webClientId: configuration.EXPO_PUBLIC_PEACEPAD_GOOGLE_WEB_CLIENT_ID,
      iosClientId: configuration.EXPO_PUBLIC_PEACEPAD_GOOGLE_IOS_CLIENT_ID,
      offlineAccess: false
    });
  });

  it("treats account-sheet cancellation as a quiet opt-out", async () => {
    await expect(requestGoogleIdentityToken(adapter({ type: "cancelled" }), configuration)).resolves.toBeUndefined();
  });

  it("rejects a successful provider response without an ID token", async () => {
    await expect(requestGoogleIdentityToken(adapter({ type: "success", idToken: null }), configuration))
      .rejects.toMatchObject({ code: "missing-token" });
  });

  it("checks Play Services on Android before opening identity", async () => {
    const previous = Platform.OS;
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    const native = adapter({ type: "success", idToken: "google-id-token" });
    (native.hasPlayServices as jest.Mock).mockResolvedValue(false);
    await expect(requestGoogleIdentityToken(native, configuration)).rejects.toMatchObject({ code: "provider-unavailable" });
    expect(native.signIn).not.toHaveBeenCalled();
    Object.defineProperty(Platform, "OS", { configurable: true, value: previous });
  });
});
