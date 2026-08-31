const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const expoCli = path.join(root, "node_modules", "expo", "bin", "cli");

const raw = execFileSync(process.execPath, [expoCli, "config", "--type", "introspect", "--json"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
const config = JSON.parse(raw.replace(/^\uFEFF/, ""));
const infoPlist = config._internal?.modResults?.ios?.infoPlist || {};
const permissions = (config._internal?.modResults?.android?.manifest?.manifest?.["uses-permission"] || [])
  .map((entry) => entry?.$?.["android:name"])
  .filter(Boolean);
const failures = [];

if (infoPlist.NSMicrophoneUsageDescription !== "PeacePad uses the microphone only when you choose a private audio or video call, voice note, or Coach voice conversation.") {
  failures.push("The generated iOS microphone disclosure is missing or changed.");
}
if (infoPlist.NSCameraUsageDescription !== "PeacePad uses the camera only when you choose a private video call or take a photo for a message or record.") {
  failures.push("Generated iOS camera purpose string is missing or changed.");
}
if (!permissions.includes("android.permission.CAMERA")) {
  failures.push("Generated Android configuration is missing CAMERA for explicit video calls.");
}
if (!Array.isArray(infoPlist.UIBackgroundModes) || !infoPlist.UIBackgroundModes.includes("audio") || !infoPlist.UIBackgroundModes.includes("remote-notification")) {
  failures.push("Generated iOS configuration is missing audio and remote-notification background modes.");
}
if (config.ios?.bitcode !== false) {
  failures.push("Generated iOS configuration must disable bitcode for WebRTC device builds.");
}
if (!permissions.includes("android.permission.RECORD_AUDIO")) {
  failures.push("Generated Android configuration is missing RECORD_AUDIO.");
}

if (failures.length > 0) {
  console.error("PeacePad native audio configuration verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PeacePad native audio/video configuration verified.");
