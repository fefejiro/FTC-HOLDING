const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const appJson = JSON.parse(read("app.json"));
const packageJson = JSON.parse(read("package.json"));

const iosBundle = appJson.expo?.ios?.bundleIdentifier;
const androidPackage = appJson.expo?.android?.package;
const extra = appJson.expo?.extra || {};
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
