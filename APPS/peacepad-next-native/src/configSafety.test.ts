import appConfig from "../app.json";

describe("lab-only configuration", () => {
  it("keeps production write capability disabled and the lab bundle isolated", () => {
    expect(appConfig.expo.extra.productionApiWritesEnabled).toBe(false);
    expect(appConfig.expo.ios.bundleIdentifier).toBe("ca.peacepad.nextnative.lab");
    expect(appConfig.expo.ios.bundleIdentifier).not.toBe(appConfig.expo.extra.submittedBundleId);
  });
});
