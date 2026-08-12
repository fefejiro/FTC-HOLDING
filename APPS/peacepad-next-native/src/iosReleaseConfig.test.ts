import appJson from "../app.json";

type DynamicConfig = (input: { config: typeof appJson.expo }) => typeof appJson.expo & {
  ios: typeof appJson.expo.ios & { buildNumber?: string };
  android: typeof appJson.expo.android & { versionCode?: number };
  extra: typeof appJson.expo.extra & { appStoreId?: string; releaseChannel?: string };
};

const resolveConfig = require("../app.config.js") as DynamicConfig;
const easJson = require("../eas.json") as { build: Record<string, unknown> };

describe("PeacePad iOS release variant", () => {
  const originalMode = process.env.PEACEPAD_IOS_RELEASE_MODE;
  const originalAndroidMode = process.env.PEACEPAD_ANDROID_RELEASE_MODE;
  const originalEnvironment = process.env.EXPO_PUBLIC_PEACEPAD_ENV;

  afterEach(() => {
    if (originalMode === undefined) delete process.env.PEACEPAD_IOS_RELEASE_MODE;
    else process.env.PEACEPAD_IOS_RELEASE_MODE = originalMode;
    if (originalAndroidMode === undefined) delete process.env.PEACEPAD_ANDROID_RELEASE_MODE;
    else process.env.PEACEPAD_ANDROID_RELEASE_MODE = originalAndroidMode;
    if (originalEnvironment === undefined) delete process.env.EXPO_PUBLIC_PEACEPAD_ENV;
    else process.env.EXPO_PUBLIC_PEACEPAD_ENV = originalEnvironment;
  });

  it("leaves the default lab identity unchanged", () => {
    delete process.env.PEACEPAD_IOS_RELEASE_MODE;
    expect(resolveConfig({ config: structuredClone(appJson.expo) })).toMatchObject({
      version: "0.0.1",
      ios: { bundleIdentifier: "ca.peacepad.nextnative.lab" },
      extra: { productionApiWritesEnabled: false }
    });
  });

  it("targets the existing App Store record for the internal Version 2 candidate", () => {
    process.env.PEACEPAD_IOS_RELEASE_MODE = "testflight-internal";
    process.env.EXPO_PUBLIC_PEACEPAD_ENV = "staging";
    expect(resolveConfig({ config: structuredClone(appJson.expo) })).toMatchObject({
      version: "2.0.0",
      ios: { buildNumber: "2", bundleIdentifier: "ca.peacepad.family" },
      extra: {
        appStoreId: "6793350735",
        productionApiWritesEnabled: false,
        releaseChannel: "testflight-internal",
        submittedBundleId: "ca.peacepad.family"
      }
    });
  });

  it("keeps one dual-region Simulator on the isolated lab identity", () => {
    process.env.PEACEPAD_IOS_RELEASE_MODE = "staging-simulator-dual";
    process.env.EXPO_PUBLIC_PEACEPAD_ENV = "staging";
    expect(resolveConfig({ config: structuredClone(appJson.expo) })).toMatchObject({
      version: "0.0.1",
      ios: { bundleIdentifier: "ca.peacepad.nextnative.lab" },
      extra: {
        productionApiWritesEnabled: false,
        releaseChannel: "staging-simulator-dual"
      }
    });
    expect(easJson.build["staging-simulator-dual"]).toMatchObject({
      distribution: "internal",
      environment: "production",
      env: {
        EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS: "false",
        EXPO_PUBLIC_PEACEPAD_ENV: "staging",
        PEACEPAD_IOS_RELEASE_MODE: "staging-simulator-dual"
      },
      ios: { simulator: true }
    });
  });

  it("targets the existing Android package with a strictly newer V2 version code", () => {
    process.env.PEACEPAD_ANDROID_RELEASE_MODE = "playstore-internal";
    process.env.EXPO_PUBLIC_PEACEPAD_ENV = "staging";
    expect(resolveConfig({ config: structuredClone(appJson.expo) })).toMatchObject({
      version: "2.0.0",
      android: { package: "ca.peacepad.family", versionCode: 42 },
      extra: {
        productionApiWritesEnabled: false,
        releaseChannel: "playstore-internal",
        submittedBundleId: "ca.peacepad.family"
      }
    });
  });

  it("rejects unknown release variants and production runtime use", () => {
    process.env.PEACEPAD_IOS_RELEASE_MODE = "production";
    process.env.EXPO_PUBLIC_PEACEPAD_ENV = "staging";
    expect(() => resolveConfig({ config: structuredClone(appJson.expo) })).toThrow("Unsupported PeacePad iOS release mode");
    process.env.PEACEPAD_IOS_RELEASE_MODE = "testflight-internal";
    process.env.EXPO_PUBLIC_PEACEPAD_ENV = "production";
    expect(() => resolveConfig({ config: structuredClone(appJson.expo) })).toThrow("must use the guarded staging runtime");
    delete process.env.PEACEPAD_IOS_RELEASE_MODE;
    process.env.PEACEPAD_ANDROID_RELEASE_MODE = "production";
    process.env.EXPO_PUBLIC_PEACEPAD_ENV = "staging";
    expect(() => resolveConfig({ config: structuredClone(appJson.expo) })).toThrow("Unsupported PeacePad Android release mode");
  });
});
