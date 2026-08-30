const TESTFLIGHT_MODE = "testflight-internal";
const APPSTORE_PRODUCTION_MODE = "appstore-production";
const DUAL_SIMULATOR_MODE = "staging-simulator-dual";
const PLAYSTORE_INTERNAL_MODE = "playstore-internal";
const PLAYSTORE_PRODUCTION_MODE = "playstore-production";
const TESTFLIGHT_VERSION = "2.0.1";
const TESTFLIGHT_BUILD_NUMBER = "3";
const APPSTORE_PRODUCTION_BUILD_NUMBER = "8";
const PLAYSTORE_VERSION_CODE = 43;
// Play Store version codes 44 and 45 are already present on the existing
// listing. The private-entry UX fix is a replacement production artifact, so
// keep the public candidate monotonic at 48; the guarded internal profile
// remains on its historical code 43.
const PLAYSTORE_PRODUCTION_VERSION_CODE = 48;
const PRODUCTION_BUNDLE_ID = "ca.peacepad.family";
const APP_STORE_ID = "6793350735";
const GOOGLE_SIGN_IN_PLUGIN = "@react-native-google-signin/google-signin";
const GOOGLE_CLIENT_ID_PATTERN = /^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i;
const ANDROID_RELEASE_BLOCKED_PERMISSIONS = [
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.WRITE_EXTERNAL_STORAGE"
];

function googleSignInPlugin() {
  const webClientId = process.env.EXPO_PUBLIC_PEACEPAD_GOOGLE_WEB_CLIENT_ID?.trim() || "";
  const iosClientId = process.env.EXPO_PUBLIC_PEACEPAD_GOOGLE_IOS_CLIENT_ID?.trim() || "";
  const iosUrlScheme = process.env.PEACEPAD_GOOGLE_IOS_URL_SCHEME?.trim() || "";
  if (
    !GOOGLE_CLIENT_ID_PATTERN.test(webClientId)
    || !GOOGLE_CLIENT_ID_PATTERN.test(iosClientId)
    || iosUrlScheme !== `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/i, "")}`
  ) {
    return null;
  }
  return [GOOGLE_SIGN_IN_PLUGIN, { iosUrlScheme }];
}

function storePlugins(config, includeApple = false) {
  const googlePlugin = googleSignInPlugin();
  return [
    ...(config.plugins || []),
    ...(includeApple ? ["expo-apple-authentication"] : []),
    ...(googlePlugin ? [googlePlugin] : [])
  ];
}

function googleSignInEnabled() {
  return Boolean(googleSignInPlugin());
}

module.exports = ({ config }) => {
  const iosReleaseMode = process.env.PEACEPAD_IOS_RELEASE_MODE?.trim();
  const androidReleaseMode = process.env.PEACEPAD_ANDROID_RELEASE_MODE?.trim();
  if (iosReleaseMode && androidReleaseMode) {
    throw new Error("Only one PeacePad mobile release mode may be selected per build.");
  }
  if (!iosReleaseMode && !androidReleaseMode) return config;
  if (androidReleaseMode) {
    if (![PLAYSTORE_INTERNAL_MODE, PLAYSTORE_PRODUCTION_MODE].includes(androidReleaseMode)) {
      throw new Error(`Unsupported PeacePad Android release mode: ${androidReleaseMode}`);
    }
    const isProduction = androidReleaseMode === PLAYSTORE_PRODUCTION_MODE;
    if (process.env.EXPO_PUBLIC_PEACEPAD_ENV !== (isProduction ? "production" : "staging")) {
      throw new Error(`The ${isProduction ? "Android Play production" : "Android internal Play"} candidate must use the ${isProduction ? "production" : "guarded staging"} runtime.`);
    }
    if (isProduction && process.env.EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED !== "true") {
      throw new Error("The Android Play production candidate requires explicit production-write authorization.");
    }
    return {
      ...config,
      version: TESTFLIGHT_VERSION,
      plugins: storePlugins(config),
      android: {
        ...config.android,
        blockedPermissions: [
          ...new Set([
            ...(config.android?.blockedPermissions || []),
            ...ANDROID_RELEASE_BLOCKED_PERMISSIONS
          ])
        ],
        package: PRODUCTION_BUNDLE_ID,
        versionCode: isProduction ? PLAYSTORE_PRODUCTION_VERSION_CODE : PLAYSTORE_VERSION_CODE
      },
      extra: {
        ...config.extra,
        environment: isProduction ? "production" : "staging",
        releaseChannel: androidReleaseMode,
        productionApiWritesEnabled: isProduction,
        googleSignInEnabled: googleSignInEnabled(),
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
      icon: "./assets/icon-production.png",
      scheme: "peacepad",
      version: TESTFLIGHT_VERSION,
      plugins: [
        ...storePlugins(config, true)
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
        googleSignInEnabled: googleSignInEnabled(),
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
    plugins: storePlugins(config, true),
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
      googleSignInEnabled: googleSignInEnabled(),
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

module.exports.androidPlayStoreProductionContract = {
  blockedPermissions: ANDROID_RELEASE_BLOCKED_PERMISSIONS,
  bundleIdentifier: PRODUCTION_BUNDLE_ID,
  mode: PLAYSTORE_PRODUCTION_MODE,
  version: TESTFLIGHT_VERSION,
  versionCode: PLAYSTORE_PRODUCTION_VERSION_CODE
};
