const TESTFLIGHT_MODE = "testflight-internal";
const DUAL_SIMULATOR_MODE = "staging-simulator-dual";
const TESTFLIGHT_VERSION = "2.0.0";
const TESTFLIGHT_BUILD_NUMBER = "2";
const PRODUCTION_BUNDLE_ID = "ca.peacepad.family";
const APP_STORE_ID = "6793350735";

module.exports = ({ config }) => {
  const releaseMode = process.env.PEACEPAD_IOS_RELEASE_MODE?.trim();
  if (!releaseMode) return config;
  if (releaseMode === DUAL_SIMULATOR_MODE) {
    if (process.env.EXPO_PUBLIC_PEACEPAD_ENV !== "staging") {
      throw new Error("The dual-region Simulator must use the guarded staging runtime.");
    }
    return {
      ...config,
      extra: {
        ...config.extra,
        productionApiWritesEnabled: false,
        releaseChannel: DUAL_SIMULATOR_MODE
      }
    };
  }
  if (releaseMode !== TESTFLIGHT_MODE) {
    throw new Error(`Unsupported PeacePad iOS release mode: ${releaseMode}`);
  }
  if (process.env.EXPO_PUBLIC_PEACEPAD_ENV !== "staging") {
    throw new Error("The internal TestFlight candidate must use the guarded staging runtime.");
  }
  return {
    ...config,
    version: TESTFLIGHT_VERSION,
    ios: {
      ...config.ios,
      buildNumber: TESTFLIGHT_BUILD_NUMBER,
      bundleIdentifier: PRODUCTION_BUNDLE_ID
    },
    extra: {
      ...config.extra,
      appStoreId: APP_STORE_ID,
      releaseChannel: TESTFLIGHT_MODE,
      productionApiWritesEnabled: false,
      submittedBundleId: PRODUCTION_BUNDLE_ID
    }
  };
};

module.exports.releaseContract = {
  appStoreId: APP_STORE_ID,
  buildNumber: TESTFLIGHT_BUILD_NUMBER,
  bundleIdentifier: PRODUCTION_BUNDLE_ID,
  mode: TESTFLIGHT_MODE,
  version: TESTFLIGHT_VERSION
};

module.exports.dualSimulatorContract = {
  bundleIdentifier: "ca.peacepad.nextnative.lab",
  mode: DUAL_SIMULATOR_MODE
};
