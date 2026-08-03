import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");

const metadata = JSON.parse(read("ios-prep/app-store-v1.0.1-metadata.json"));
const project = read("ios/App/App.xcodeproj/project.pbxproj");
const infoPlist = read("ios/App/App/Info.plist");
const capacitorConfig = read("capacitor.config.ts");

const uniqueMatches = (pattern) =>
  [...new Set([...project.matchAll(pattern)].map((match) => match[1]))];

const marketingVersions = uniqueMatches(/MARKETING_VERSION = ([^;]+);/g);
const buildNumbers = uniqueMatches(/CURRENT_PROJECT_VERSION = ([^;]+);/g);
const bundleIds = uniqueMatches(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g);

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

requireCondition(
  /^\d+\.\d+\.\d+$/.test(metadata.targetVersion),
  "metadata targetVersion must be a three-part numeric version",
);
requireCondition(
  /^\d+$/.test(metadata.targetBuild) && Number(metadata.targetBuild) > 0,
  "metadata targetBuild must be a positive integer string",
);
requireCondition(
  metadata.bundleId === "ca.peacepad.family",
  "metadata bundleId must remain ca.peacepad.family",
);
requireCondition(
  metadata.packageStatus === "prepared-not-submitted",
  "metadata package must remain prepared-not-submitted until release QA passes",
);
requireCondition(
  metadata.productionMutationAllowed === false,
  "metadata must prohibit production mutation during candidate preparation",
);
requireCondition(
  marketingVersions.length === 1 && marketingVersions[0] === metadata.targetVersion,
  `all Xcode configurations must use marketing version ${metadata.targetVersion}; found ${marketingVersions.join(", ") || "none"}`,
);
requireCondition(
  buildNumbers.length === 1 && buildNumbers[0] === metadata.targetBuild,
  `all Xcode configurations must use build number ${metadata.targetBuild}; found ${buildNumbers.join(", ") || "none"}`,
);
requireCondition(
  bundleIds.length === 1 && bundleIds[0] === metadata.bundleId,
  `all Xcode configurations must use ${metadata.bundleId}; found ${bundleIds.join(", ") || "none"}`,
);
requireCondition(
  capacitorConfig.includes(`appId: '${metadata.bundleId}'`),
  "Capacitor appId must match the App Store bundle identifier",
);
requireCondition(
  infoPlist.includes("<string>$(MARKETING_VERSION)</string>") &&
    infoPlist.includes("<string>$(CURRENT_PROJECT_VERSION)</string>"),
  "Info.plist must derive its release identity from Xcode build settings",
);
requireCondition(
  infoPlist.includes("<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>"),
  "Info.plist must derive its bundle identifier from Xcode build settings",
);

const capacitorPrivacyManifest = path.join(
  root,
  "node_modules/@capacitor/ios/Capacitor/Capacitor/PrivacyInfo.xcprivacy",
);
requireCondition(
  existsSync(capacitorPrivacyManifest),
  "installed Capacitor iOS SDK must include its PrivacyInfo.xcprivacy manifest",
);

if (failures.length > 0) {
  console.error("iOS release candidate verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("iOS release candidate identity verification passed.");
console.log(`version=${metadata.targetVersion} build=${buildNumbers[0]} bundle=${metadata.bundleId}`);
console.log("status=prepared-not-submitted productionMutationAllowed=false");
console.log("Capacitor SDK privacy manifest=present");
