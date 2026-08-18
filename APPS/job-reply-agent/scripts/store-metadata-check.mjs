import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const apple = path.join(root, "store", "metadata", "apple");
const google = path.join(root, "store", "metadata", "google", "en-US");

function read(relativePath) {
  const value = fs.readFileSync(path.join(root, relativePath), "utf8").trim();
  if (!value) throw new Error(`${relativePath} is empty`);
  return value;
}

function chars(label, value, maximum) {
  const count = [...value].length;
  if (count > maximum) throw new Error(`${label} is ${count} characters; maximum is ${maximum}`);
  console.log(`${label}: ${count}/${maximum} characters`);
}

function bytes(label, value, maximum) {
  const count = Buffer.byteLength(value, "utf8");
  if (count > maximum) throw new Error(`${label} is ${count} bytes; maximum is ${maximum}`);
  console.log(`${label}: ${count}/${maximum} bytes`);
}

function pngHeader(relativePath) {
  const binary = fs.readFileSync(path.join(root, relativePath));
  if (binary.length < 29 || binary.toString("hex", 0, 8) !== "89504e470d0a1a0a") {
    throw new Error(`${relativePath} is not a valid PNG`);
  }
  return {
    width: binary.readUInt32BE(16),
    height: binary.readUInt32BE(20),
    bitDepth: binary[24],
    colorType: binary[25]
  };
}

function requirePng(relativePath, expected) {
  const actual = pngHeader(relativePath);
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) {
      throw new Error(`${relativePath} ${key} is ${actual[key]}; expected ${value}`);
    }
  }
  console.log(`${relativePath}: ${actual.width}x${actual.height}, PNG color type ${actual.colorType}`);
}

const appleName = read("store/metadata/apple/en-US/name.txt");
const appleSubtitle = read("store/metadata/apple/en-US/subtitle.txt");
const applePromo = read("store/metadata/apple/en-US/promotional_text.txt");
const appleKeywords = read("store/metadata/apple/en-US/keywords.txt");
const appleDescription = read("store/metadata/apple/en-US/description.txt");
const appleNotes = read("store/metadata/apple/en-US/release_notes.txt");
const googleTitle = read("store/metadata/google/en-US/title.txt");
const googleShort = read("store/metadata/google/en-US/short_description.txt");
const googleDescription = read("store/metadata/google/en-US/full_description.txt");
const googleNotes = read("store/metadata/google/en-US/changelogs/2.txt");

chars("Apple name", appleName, 30);
chars("Apple subtitle", appleSubtitle, 30);
chars("Apple promotional text", applePromo, 170);
bytes("Apple keywords", appleKeywords, 100);
chars("Apple description", appleDescription, 4000);
chars("Apple release notes", appleNotes, 4000);
chars("Google title", googleTitle, 30);
chars("Google short description", googleShort, 80);
chars("Google full description", googleDescription, 4000);
chars("Google release notes", googleNotes, 500);

const urls = JSON.parse(fs.readFileSync(path.join(apple, "urls.json"), "utf8"));
for (const [key, value] of Object.entries(urls)) {
  const url = new URL(String(value));
  if (url.protocol !== "https:" || url.hostname !== "jobagent.unalabs.cloud") {
    throw new Error(`Apple ${key} must use the exact HTTPS JobAgent domain`);
  }
}

const combined = [appleName, appleSubtitle, applePromo, appleKeywords, appleDescription, googleTitle, googleShort, googleDescription].join("\n");
const prohibited = [
  /(?<!not )guarantee(?:d|s)? (?:a |an )?(?:job|interview|offer|employment)/i,
  /\b#\s*1\b/i,
  /\bbest (?:job|career|resume)/i,
  /\bunlimited auto[- ]?appl/i,
  /\bAIApply\b|\bTeal\b|\bLoopCV\b/i,
];
for (const pattern of prohibited) {
  if (pattern.test(combined)) throw new Error(`Store metadata contains prohibited claim: ${pattern}`);
}

if (!appleDescription.includes("does not guarantee") || !googleDescription.includes("does not guarantee")) {
  throw new Error("Both descriptions must retain the truthful no-guarantee boundary");
}
if (!appleDescription.includes("Purchases and external payment links are not offered inside the app") ||
    !googleDescription.includes("Purchases and external payment links are not offered inside the app")) {
  throw new Error("Both descriptions must retain the native commerce boundary");
}

const capacitor = read("capacitor.config.ts");
const androidGradle = read("android/app/build.gradle");
const iosProject = read("ios/App/App.xcodeproj/project.pbxproj");
for (const [label, source] of [["Capacitor", capacitor], ["Android", androidGradle], ["iOS", iosProject]]) {
  if (!source.includes("cloud.unalabs.jobagent")) throw new Error(`${label} application identity drifted`);
}
if (!androidGradle.includes("versionCode 2") || !androidGradle.includes('versionName "1.0.1"')) {
  throw new Error("Android release version must remain 1.0.1 (2) for this submission set");
}
if (!iosProject.includes("CURRENT_PROJECT_VERSION = 2;") || !iosProject.includes("MARKETING_VERSION = 1.0.1;")) {
  throw new Error("iOS release version must remain 1.0.1 (2) for this submission set");
}
if (!iosProject.includes("TARGETED_DEVICE_FAMILY = 1;")) {
  throw new Error("The first iOS release must remain iPhone-only until iPad is separately validated");
}

const privacyManifest = read("ios/App/App/PrivacyInfo.xcprivacy");
if (!privacyManifest.includes("NSPrivacyTracking") || !privacyManifest.includes("<false/>")) {
  throw new Error("The app-owned Apple privacy manifest must explicitly declare tracking disabled");
}
const infoPlist = read("ios/App/App/Info.plist");
if (!infoPlist.includes("ITSAppUsesNonExemptEncryption")) {
  throw new Error("The iOS export-compliance declaration is missing");
}

requirePng("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", {
  width: 1024, height: 1024, bitDepth: 8, colorType: 2
});
requirePng("store/assets/apple/icon-1024.png", {
  width: 1024, height: 1024, bitDepth: 8, colorType: 2
});
requirePng("store/assets/google/icon-512.png", {
  width: 512, height: 512, bitDepth: 8, colorType: 6
});

const mobileScript = read("public/app.js");
if (!mobileScript.includes('$("#available-plans-band").hidden = true;')
    || !mobileScript.includes('renderBilling(await api("/api/v1/billing/entitlement"))')) {
  throw new Error("Native commerce separation must hide prices and load entitlement only");
}
const androidManifest = read("android/app/src/main/AndroidManifest.xml");
if (!androidManifest.includes('android:pathPrefix="/app"')) {
  throw new Error("Android App Links must exclude the server-owned OAuth callback");
}

if (!fs.existsSync(apple) || !fs.existsSync(google)) throw new Error("Store metadata roots are missing");
console.log("UnaScout store metadata checks passed.");
