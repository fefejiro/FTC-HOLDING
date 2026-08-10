import appConfig from "../app.json";
import easConfig from "../eas.json";

describe("lab-only configuration", () => {
  it("keeps production write capability disabled and the lab bundle isolated", () => {
    expect(appConfig.expo.extra.productionApiWritesEnabled).toBe(false);
    expect(appConfig.expo.ios.bundleIdentifier).toBe("ca.peacepad.nextnative.lab");
    expect(appConfig.expo.ios.bundleIdentifier).not.toBe(appConfig.expo.extra.submittedBundleId);
  });

  it("keeps EAS limited to lab-only internal builds until Gate 6", () => {
    expect(Object.keys(easConfig.build).sort()).toEqual(["lab-device", "lab-simulator"]);
    expect((easConfig as { submit?: unknown }).submit).toBeUndefined();
    expect((easConfig.build as Record<string, unknown>).production).toBeUndefined();
    expect(easConfig.build["lab-simulator"].ios.simulator).toBe(true);
    for (const profile of Object.values(easConfig.build)) {
      expect(profile.distribution).toBe("internal");
      expect(profile.env.EXPO_PUBLIC_PEACEPAD_ENV).toBe("lab");
      expect(profile.env.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS).toBe("false");
    }
  });
});
