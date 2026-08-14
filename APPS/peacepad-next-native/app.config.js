const TESTFLIGHT_MODE = "testflight-internal";
const APPSTORE_PRODUCTION_MODE = "appstore-production";
const DUAL_SIMULATOR_MODE = "staging-simulator-dual";
const PLAYSTORE_INTERNAL_MODE = "playstore-internal";
const TESTFLIGHT_VERSION = "2.0.0";
const TESTFLIGHT_BUILD_NUMBER = "3";
const APPSTORE_PRODUCTION_BUILD_NUMBER = "5";
const PLAYSTORE_VERSION_CODE = 42;
const PRODUCTION_BUNDLE_ID = "ca.peacepad.family";
const APP_STORE_ID = "6793350735";
const ANDROID_RELEASE_BLOCKED_PERMISSIONS = [
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.WRITE_EXTERNAL_STORAGE"
];

module.exports = ({ config }) => {
  const iosReleaseMode = process.env.PEACEPAD_IOS_RELEASE_MODE?.trim();
  const androidReleaseMode = process.env.PEACEPAD_ANDROID_RELEASE_MODE?.trim();
  if (iosReleaseMode && androidReleaseMode) {
    throw new Error("Only one PeacePad mobile release mode may be selected per build.");
  }
  if (!iosReleaseMode && !androidReleaseMode) return config;
  if (androidReleaseMode) {
    if (androidReleaseMode !== PLAYSTORE_INTERNAL_MODE) {
      throw new Error(`Unsupported PeacePad Android release mode: ${androidReleaseMode}`);
    }
    if (process.env.EXPO_PUBLIC_PEACEPAD_ENV !== "staging") {
      throw new Error("The Android internal Play candidate must use the guarded staging runtime.");
    }
    return {
      ...config,
      version: TESTFLIGHT_VERSION,
      android: {
        ...config.android,
        blockedPermissions: [
          ...new Set([
            ...(config.android?.blockedPermissions || []),
            ...ANDROID_RELEASE_BLOCKED_PERMISSIONS
          ])
        ],
        package: PRODUCTION_BUNDLE_ID,
        versionCode: PLAYSTORE_VERSION_CODE
      },
      extra: {
        ...config.extra,
        releaseChannel: PLAYSTORE_INTERNAL_MODE,
        productionApiWritesEnabled: false,
        submittedBundleId: PRODUCTION_BUNDLE_ID
      }
    };
  }
  if (iosReleaseMode === DUAL_SIMULATOR_MODE) {
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
  if (iosReleaseMode === APPSTORE_PRODUCTION_MODE) {
    if (process.env.EXPO_PUBLIC_PEACEPAD_ENV !== "production") {
      throw new Error("The App Store production candidate must use the production runtime.");
    }
    if (process.env.EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED !== "true") {
      throw new Error("The App Store production candidate requires explicit production-write authorization.");
    }
    return {
      ...config,
      scheme: "peacepad",
      version: TESTFLIGHT_VERSION,
      plugins: [
        ...(config.plugins || []),
        "expo-apple-authentication"
      ],
      ios: {
        ...config.ios,
        buildNumber: APPSTORE_PRODUCTION_BUILD_NUMBER,
        bundleIdentifier: PRODUCTION_BUNDLE_ID,
        usesAppleSignIn: true
      },
      extra: {
        ...config.extra,
        appStoreId: APP_STORE_ID,
        environment: "production",
        releaseChannel: APPSTORE_PRODUCTION_MODE,
        productionApiWritesEnabled: true,
        submittedBundleId: PRODUCTION_BUNDLE_ID
      }
    };
  }
  if (iosReleaseMode !== TESTFLIGHT_MODE) {
    throw new Error(`Unsupported PeacePad iOS release mode: ${iosReleaseMode}`);
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

module.exports.appStoreProductionContract = {
  appStoreId: APP_STORE_ID,
  buildNumber: APPSTORE_PRODUCTION_BUILD_NUMBER,
  bundleIdentifier: PRODUCTION_BUNDLE_ID,
  mode: APPSTORE_PRODUCTION_MODE,
  version: TESTFLIGHT_VERSION
};

module.exports.dualSimulatorContract = {
  bundleIdentifier: "ca.peacepad.nextnative.lab",
  mode: DUAL_SIMULATOR_MODE
};

module.exports.androidPlayStoreContract = {
  blockedPermissions: ANDROID_RELEASE_BLOCKED_PERMISSIONS,
  bundleIdentifier: PRODUCTION_BUNDLE_ID,
  mode: PLAYSTORE_INTERNAL_MODE,
  version: TESTFLIGHT_VERSION,
  versionCode: PLAYSTORE_VERSION_CODE
};
