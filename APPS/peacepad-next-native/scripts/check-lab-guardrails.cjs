const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const appJson = JSON.parse(read("app.json"));
const easJson = JSON.parse(read("eas.json"));
const packageJson = JSON.parse(read("package.json"));
const environmentSource = read("src/config/environment.ts");
const dynamicAppConfigSource = read("app.config.js");

const iosBundle = appJson.expo?.ios?.bundleIdentifier;
const androidPackage = appJson.expo?.android?.package;
const extra = appJson.expo?.extra || {};
const easProject = extra.eas || {};
const iosInfoPlist = appJson.expo?.ios?.infoPlist || {};
const plugins = appJson.expo?.plugins || [];
const doctorExclusions = packageJson.expo?.doctor?.reactNativeDirectoryCheck?.exclude || [];

const failures = [];

for (const key of [
  "EXPO_PUBLIC_PEACEPAD_ENV",
  "EXPO_PUBLIC_PEACEPAD_REGION",
  "EXPO_PUBLIC_PEACEPAD_SUPABASE_URL",
  "EXPO_PUBLIC_PEACEPAD_API_BASE_URL",
  "EXPO_PUBLIC_PEACEPAD_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_URL",
  "EXPO_PUBLIC_PEACEPAD_CA_API_BASE_URL",
  "EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS"
]) {
  if (!environmentSource.includes(`process.env.${key}`)) {
    failures.push(`${key} must use Expo-compatible direct process.env dot notation.`);
  }
}
if (/values:\s*EnvironmentValues\s*=\s*process\.env/.test(environmentSource)) {
  failures.push("Runtime configuration must not default from the dynamic process.env object.");
}

if (iosBundle === "ca.peacepad.family") {
  failures.push("iOS bundleIdentifier must not equal submitted production bundle ca.peacepad.family.");
}

if (androidPackage === "ca.peacepad.family") {
  failures.push("Android package must not equal submitted production bundle ca.peacepad.family.");
}

if (extra.productionApiWritesEnabled !== false) {
  failures.push("productionApiWritesEnabled must remain false in the lab app.");
}

if (iosInfoPlist.ITSAppUsesNonExemptEncryption !== false) {
  failures.push("The lab app must explicitly declare that it does not use non-exempt encryption.");
}

if (appJson.expo?.owner !== "official_fejiro") {
  failures.push("The lab EAS project must remain owned by the approved official_fejiro account.");
}

if (appJson.expo?.slug !== "peacepad-next-native-lab") {
  failures.push("The EAS slug must remain isolated to peacepad-next-native-lab.");
}

if (easProject.projectId !== "a4ecee72-ebae-483d-8553-035847ebb3d3") {
  failures.push("The lab app must remain linked to its reviewed EAS project ID.");
}

if (!packageJson.private) {
  failures.push("package.json must remain private.");
}

if (packageJson.dependencies?.["react-native-webrtc"] !== "124.0.6") {
  failures.push("react-native-webrtc must remain pinned to the Expo 54-compatible 124.0.6 release.");
}

if (!plugins.includes("./plugins/withPeacePadAudioWebRTC")) {
  failures.push("The microphone-only PeacePad WebRTC config plugin must remain enabled.");
}

if (!plugins.includes("expo-dev-client")) {
  failures.push("expo-dev-client is required because native WebRTC is unavailable in Expo Go.");
}

if (!iosInfoPlist.NSMicrophoneUsageDescription) {
  failures.push("iOS microphone usage disclosure is required for foreground audio calls.");
}

if (iosInfoPlist.NSCameraUsageDescription !== "PeacePad uses the camera only when you choose a private video call or take a photo for a message or record.") {
  failures.push("iOS camera purpose string is required because the WebRTC binary references camera APIs.");
}

if (packageJson.dependencies?.["@config-plugins/react-native-webrtc"]) {
  failures.push("The stock WebRTC config plugin is prohibited because it requests camera permission.");
}

if (!doctorExclusions.includes("react-native-webrtc")) {
  failures.push("The pinned WebRTC New Architecture exception must remain explicit until native device proof exists.");
}

const easBuildProfiles = easJson.build || {};
const labEasProfiles = ["lab-simulator", "lab-device"];
const stagingEasProfiles = {
  "staging-simulator-ca": { environment: "preview", simulator: true },
  "staging-simulator-us": { environment: "development", simulator: true },
  "staging-device-ca": { environment: "preview", simulator: false },
  "staging-device-us": { environment: "development", simulator: false },
};
const allowedEasProfiles = [...labEasProfiles, ...Object.keys(stagingEasProfiles)];
const dualSimulatorProfileName = "staging-simulator-dual";
allowedEasProfiles.push(dualSimulatorProfileName);
const testFlightProfileName = "testflight-internal";
allowedEasProfiles.push(testFlightProfileName);
const appStoreProductionProfileName = "appstore-production";
allowedEasProfiles.push(appStoreProductionProfileName);
const playStoreInternalProfileName = "playstore-internal";
allowedEasProfiles.push(playStoreInternalProfileName);
const playStoreProductionProfileName = "playstore-production";
allowedEasProfiles.push(playStoreProductionProfileName);
if (Object.keys(easBuildProfiles).some((profile) => !allowedEasProfiles.includes(profile))) {
  failures.push("EAS must remain limited to approved lab, regional staging, and internal TestFlight profiles before Gate 6.");
}
for (const profile of labEasProfiles) {
  const config = easBuildProfiles[profile];
  if (!config || config.distribution !== "internal") {
    failures.push(`EAS ${profile} must use internal distribution.`);
    continue;
  }
  if (
    config.env?.EXPO_PUBLIC_PEACEPAD_ENV !== "lab"
    || config.env?.EXPO_PUBLIC_PEACEPAD_API_BASE_URL !== "http://127.0.0.1:8787"
    || config.env?.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS !== "false"
  ) {
    failures.push(`EAS ${profile} must remain pinned to the non-diagnostic local lab boundary.`);
  }
}
for (const [profile, expected] of Object.entries(stagingEasProfiles)) {
  const config = easBuildProfiles[profile];
  if (!config || config.distribution !== "internal") {
    failures.push(`EAS ${profile} must use internal distribution.`);
    continue;
  }
  if (config.environment !== expected.environment) {
    failures.push(`EAS ${profile} must use its isolated regional EAS environment.`);
  }
  if (config.env && Object.keys(config.env).length > 0) {
    failures.push(`EAS ${profile} must obtain public staging configuration from EAS, not committed profile values.`);
  }
  if ((config.ios?.simulator === true) !== expected.simulator) {
    failures.push(`EAS ${profile} has the wrong Simulator/device boundary.`);
  }
}
const dualSimulatorProfile = easBuildProfiles[dualSimulatorProfileName];
if (
  dualSimulatorProfile?.distribution !== "internal"
  || dualSimulatorProfile?.environment !== "production"
  || dualSimulatorProfile?.env?.PEACEPAD_IOS_RELEASE_MODE !== dualSimulatorProfileName
  || dualSimulatorProfile?.env?.EXPO_PUBLIC_PEACEPAD_ENV !== "staging"
  || dualSimulatorProfile?.env?.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS !== "false"
  || dualSimulatorProfile?.ios?.simulator !== true
) {
  failures.push("The dual-region Simulator profile must remain an internal, non-diagnostic fictional-staging build.");
}
if (easBuildProfiles["lab-simulator"]?.ios?.simulator !== true) {
  failures.push("EAS lab-simulator must remain an iOS Simulator build.");
}
if (easBuildProfiles["lab-device"]?.ios?.simulator === true) {
  failures.push("EAS lab-device must remain a physical-device internal build.");
}

const testFlightProfile = easBuildProfiles[testFlightProfileName];
if (
  testFlightProfile?.distribution !== "store"
  || testFlightProfile?.environment !== "production"
  || testFlightProfile?.env?.PEACEPAD_IOS_RELEASE_MODE !== testFlightProfileName
  || testFlightProfile?.env?.EXPO_PUBLIC_PEACEPAD_ENV !== "staging"
  || testFlightProfile?.env?.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS !== "false"
  || testFlightProfile?.ios?.simulator !== false
) {
  failures.push("The internal TestFlight profile must remain a signed, non-diagnostic fictional-staging candidate.");
}
const appStoreProductionProfile = easBuildProfiles[appStoreProductionProfileName];
if (
  appStoreProductionProfile?.distribution !== "store"
  || appStoreProductionProfile?.environment !== "production"
  || appStoreProductionProfile?.env?.PEACEPAD_IOS_RELEASE_MODE !== appStoreProductionProfileName
  || appStoreProductionProfile?.env?.EXPO_PUBLIC_PEACEPAD_ENV !== "production"
  || appStoreProductionProfile?.env?.EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED !== "true"
  || appStoreProductionProfile?.env?.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS !== "false"
  || appStoreProductionProfile?.ios?.simulator !== false
) {
  failures.push("The App Store production profile must remain an exact, signed, non-diagnostic Canada production build contract.");
}
const playStoreInternalProfile = easBuildProfiles[playStoreInternalProfileName];
if (
  playStoreInternalProfile?.distribution !== "store"
  || playStoreInternalProfile?.environment !== "production"
  || playStoreInternalProfile?.env?.PEACEPAD_ANDROID_RELEASE_MODE !== playStoreInternalProfileName
  || playStoreInternalProfile?.env?.EXPO_PUBLIC_PEACEPAD_ENV !== "staging"
  || playStoreInternalProfile?.env?.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS !== "false"
  || playStoreInternalProfile?.android?.buildType !== "app-bundle"
  || playStoreInternalProfile?.android?.credentialsSource !== "local"
) {
  failures.push("The Android internal Play profile must remain a signed AAB backed by fictional staging.");
}
const playStoreProductionProfile = easBuildProfiles[playStoreProductionProfileName];
if (
  playStoreProductionProfile?.distribution !== "store"
  || playStoreProductionProfile?.environment !== "production"
  || playStoreProductionProfile?.env?.PEACEPAD_ANDROID_RELEASE_MODE !== playStoreProductionProfileName
  || playStoreProductionProfile?.env?.EXPO_PUBLIC_PEACEPAD_ENV !== "production"
  || playStoreProductionProfile?.env?.EXPO_PUBLIC_PEACEPAD_PRODUCTION_WRITES_ENABLED !== "true"
  || playStoreProductionProfile?.env?.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS !== "false"
  || playStoreProductionProfile?.android?.buildType !== "app-bundle"
  || playStoreProductionProfile?.android?.credentialsSource !== "local"
) {
  failures.push("The Android Play production profile must remain an exact, signed AAB backed by the authorized Canada production runtime.");
}
const submitProfiles = Object.keys(easJson.submit || {});
if (
  submitProfiles.length !== 2
  || !submitProfiles.includes(testFlightProfileName)
  || !submitProfiles.includes(appStoreProductionProfileName)
  || easJson.submit?.[testFlightProfileName]?.ios?.ascAppId !== "6793350735"
  || easJson.submit?.[appStoreProductionProfileName]?.ios?.ascAppId !== "6793350735"
) {
  failures.push("EAS Submit must target only the reviewed internal and production profiles for App Store record 6793350735.");
}
for (const expectedReleaseValue of ["ca.peacepad.family", "6793350735", "2.0.1", "43", "45", "testflight-internal", "appstore-production", "staging-simulator-dual", "playstore-internal", "playstore-production"]) {
  if (!dynamicAppConfigSource.includes(expectedReleaseValue)) {
    failures.push(`Dynamic app config is missing the reviewed TestFlight value ${expectedReleaseValue}.`);
  }
}
for (const blockedAndroidPermission of [
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.WRITE_EXTERNAL_STORAGE"
]) {
  if (!dynamicAppConfigSource.includes(blockedAndroidPermission)) {
    failures.push(`Android store config must block unnecessary permission ${blockedAndroidPermission}.`);
  }
}

const sourceFiles = [];
const ignoredDirectories = new Set([
  "node_modules",
  ".expo",
  ".sim",
  "coverage",
  "dist",
  "build",
  "ios",
  "android",
]);
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name) || entry.name.startsWith(".node_modules-")) continue;
      walk(full);
    } else if (/\.(ts|tsx|js|json|md)$/.test(entry.name)) {
      sourceFiles.push(full);
    }
  }
};
walk(root);

for (const file of sourceFiles) {
  const rel = path.relative(root, file);
  const normalizedRel = rel.split(path.sep).join("/");
  const text = fs.readFileSync(file, "utf8");
  const isTestFixture = /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(rel);
  // Status ledgers may accurately describe the separately-operated legacy
  // public service. They are evidence, not mobile runtime configuration.
  const isEvidenceLedger = new Set(["docs/STATUS.md", "docs/STAGING_PROGRESS.md"]).has(normalizedRel);
  if (!isTestFixture && !isEvidenceLedger && /api\.peacepad\.ca/.test(text)) {
    failures.push(`${rel} references production API api.peacepad.ca.`);
  }
  const affirmativeText = text
    .split(/\r?\n/)
    .filter((line) => !/^\s*[-*]?\s*do not\b/i.test(line))
    .join("\n");

  const unsafeLegalClaim =
    /we\s+(guarantee|determine|predict)\s+court/i.test(affirmativeText) ||
    /guaranteed\s+admissibility/i.test(affirmativeText) ||
    /legal advice provider/i.test(affirmativeText);

  if (unsafeLegalClaim) {
    failures.push(`${rel} contains unsafe positive legal positioning.`);
  }
}

if (failures.length) {
  console.error("PeacePad Next Native guardrail check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PeacePad Next Native guardrails OK.");
