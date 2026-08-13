import appConfig from "../app.json";
import easConfig from "../eas.json";

describe("lab-only configuration", () => {
  it("keeps production write capability disabled and the lab bundle isolated", () => {
    expect(appConfig.expo.extra.productionApiWritesEnabled).toBe(false);
    expect(appConfig.expo.ios.bundleIdentifier).toBe("ca.peacepad.nextnative.lab");
    expect(appConfig.expo.ios.bundleIdentifier).not.toBe(appConfig.expo.extra.submittedBundleId);
    expect(appConfig.expo.ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
    expect(appConfig.expo.owner).toBe("official_fejiro");
    expect(appConfig.expo.slug).toBe("peacepad-next-native-lab");
    expect(appConfig.expo.extra.eas.projectId).toBe("a4ecee72-ebae-483d-8553-035847ebb3d3");
  });

  it("keeps EAS limited to lab, isolated staging, and guarded store candidates", () => {
    expect(Object.keys(easConfig.build).sort()).toEqual([
      "appstore-production",
      "lab-device",
      "lab-simulator",
      "playstore-internal",
      "staging-device-ca",
      "staging-device-us",
      "staging-simulator-ca",
      "staging-simulator-dual",
      "staging-simulator-us",
      "testflight-internal"
    ]);
    expect((easConfig.build as Record<string, unknown>).production).toBeUndefined();
    expect(easConfig.build["lab-simulator"].ios.simulator).toBe(true);
    for (const profile of [easConfig.build["lab-simulator"], easConfig.build["lab-device"]]) {
      expect(profile.distribution).toBe("internal");
      expect(profile.env.EXPO_PUBLIC_PEACEPAD_ENV).toBe("lab");
      expect(profile.env.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS).toBe("false");
    }

    const stagingProfiles = {
      "staging-simulator-ca": { environment: "preview", simulator: true },
      "staging-simulator-us": { environment: "development", simulator: true },
      "staging-device-ca": { environment: "preview", simulator: false },
      "staging-device-us": { environment: "development", simulator: false }
    } as const;
    for (const [name, expected] of Object.entries(stagingProfiles)) {
      const profile = easConfig.build[name as keyof typeof easConfig.build] as {
        distribution: string;
        environment: string;
        env?: Record<string, string>;
        ios?: { simulator?: boolean };
      };
      expect(profile.distribution).toBe("internal");
      expect(profile.environment).toBe(expected.environment);
      expect(profile.env).toBeUndefined();
      expect(profile.ios?.simulator === true).toBe(expected.simulator);
    }

    expect(easConfig.build["staging-simulator-dual"]).toMatchObject({
      distribution: "internal",
      environment: "production",
      env: {
        EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS: "false",
        EXPO_PUBLIC_PEACEPAD_ENV: "staging",
        PEACEPAD_IOS_RELEASE_MODE: "staging-simulator-dual"
      },
      ios: { simulator: true }
    });

    const testFlight = easConfig.build["testflight-internal"];
    expect(testFlight).toMatchObject({
      distribution: "store",
      environment: "production",
      env: {
        EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS: "false",
        EXPO_PUBLIC_PEACEPAD_ENV: "staging",
        PEACEPAD_IOS_RELEASE_MODE: "testflight-internal"
      },
      ios: { simulator: false }
    });
    expect(easConfig.submit).toEqual({
      "testflight-internal": { ios: { ascAppId: "6793350735" } },
      "appstore-production": { ios: { ascAppId: "6793350735" } }
    });

    expect(easConfig.build["appstore-production"]).toMatchObject({
      distribution: "store",
      environment: "production",
      env: {
        EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS: "false",
        EXPO_PUBLIC_PEACEPAD_ENV: "production",
        EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED: "true",
        PEACEPAD_IOS_RELEASE_MODE: "appstore-production"
      },
      ios: { simulator: false }
    });

    expect(easConfig.build["playstore-internal"]).toMatchObject({
      distribution: "store",
      environment: "production",
      env: {
        EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS: "false",
        EXPO_PUBLIC_PEACEPAD_ENV: "staging",
        PEACEPAD_ANDROID_RELEASE_MODE: "playstore-internal"
      },
      android: { buildType: "app-bundle", credentialsSource: "local" }
    });
  });
});
