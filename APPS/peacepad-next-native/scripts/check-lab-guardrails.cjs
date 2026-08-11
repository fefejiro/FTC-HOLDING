const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const appJson = JSON.parse(read("app.json"));
const easJson = JSON.parse(read("eas.json"));
const packageJson = JSON.parse(read("package.json"));

const iosBundle = appJson.expo?.ios?.bundleIdentifier;
const androidPackage = appJson.expo?.android?.package;
const extra = appJson.expo?.extra || {};
const easProject = extra.eas || {};
const iosInfoPlist = appJson.expo?.ios?.infoPlist || {};
const plugins = appJson.expo?.plugins || [];
const doctorExclusions = packageJson.expo?.doctor?.reactNativeDirectoryCheck?.exclude || [];

const failures = [];

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

if (iosInfoPlist.NSCameraUsageDescription) {
  failures.push("Camera permission is prohibited while PeacePad calls remain audio-only.");
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
if (Object.keys(easBuildProfiles).some((profile) => !allowedEasProfiles.includes(profile))) {
  failures.push("EAS must remain limited to approved lab and regional staging profiles before Gate 6.");
}
if (easJson.submit || easBuildProfiles.production) {
  failures.push("EAS submit and production build profiles are prohibited before Gate 6 approval.");
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
if (easBuildProfiles["lab-simulator"]?.ios?.simulator !== true) {
  failures.push("EAS lab-simulator must remain an iOS Simulator build.");
}
if (easBuildProfiles["lab-device"]?.ios?.simulator === true) {
  failures.push("EAS lab-device must remain a physical-device internal build.");
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
  const text = fs.readFileSync(file, "utf8");
  const isTestFixture = /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(rel);
  if (!isTestFixture && /api\.peacepad\.ca/.test(text)) {
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
