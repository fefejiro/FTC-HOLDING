const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
const expected = {
  appStoreId: "6793350735",
  bundleIdentifier: "ca.peacepad.family",
  easOwner: "official_fejiro",
  easProjectId: "a4ecee72-ebae-483d-8553-035847ebb3d3",
  mode: "testflight-internal",
  version: "2.0.0",
  buildNumber: "2"
};
const requiredRegionalNames = [
  "EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_URL",
  "EXPO_PUBLIC_PEACEPAD_CA_API_BASE_URL",
  "EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_PEACEPAD_US_SUPABASE_URL",
  "EXPO_PUBLIC_PEACEPAD_US_API_BASE_URL",
  "EXPO_PUBLIC_PEACEPAD_US_SUPABASE_PUBLISHABLE_KEY"
];
const regionalProjectRefs = {
  ca: "rohvkyuxbnqzglaromms",
  us: "spmpndalcvwmygznihec"
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resolveReleaseConfig() {
  const appJson = readJson("app.json").expo;
  const configModule = require(path.join(root, "app.config.js"));
  const previousMode = process.env.PEACEPAD_IOS_RELEASE_MODE;
  const previousEnvironment = process.env.EXPO_PUBLIC_PEACEPAD_ENV;
  try {
    process.env.PEACEPAD_IOS_RELEASE_MODE = expected.mode;
    process.env.EXPO_PUBLIC_PEACEPAD_ENV = "staging";
    return configModule({ config: structuredClone(appJson) });
  } finally {
    if (previousMode === undefined) delete process.env.PEACEPAD_IOS_RELEASE_MODE;
    else process.env.PEACEPAD_IOS_RELEASE_MODE = previousMode;
    if (previousEnvironment === undefined) delete process.env.EXPO_PUBLIC_PEACEPAD_ENV;
    else process.env.EXPO_PUBLIC_PEACEPAD_ENV = previousEnvironment;
  }
}

function verifyStaticContract() {
  const appJson = readJson("app.json").expo;
  const easJson = readJson("eas.json");
  const profile = easJson.build?.[expected.mode];
  const submit = easJson.submit?.[expected.mode]?.ios;
  const resolved = resolveReleaseConfig();

  assert(appJson.ios?.bundleIdentifier === "ca.peacepad.nextnative.lab", "The default app must remain on the isolated lab bundle.");
  assert(appJson.extra?.productionApiWritesEnabled === false, "The default app must keep production API writes disabled.");
  assert(profile?.distribution === "store" && profile?.environment === "production", "The internal TestFlight profile must use store distribution and the EAS production environment.");
  assert(profile?.env?.PEACEPAD_IOS_RELEASE_MODE === expected.mode, "The TestFlight profile must opt into the reviewed dynamic app variant.");
  assert(profile?.env?.EXPO_PUBLIC_PEACEPAD_ENV === "staging", "The internal TestFlight profile must remain on fictional staging.");
  assert(profile?.env?.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS === "false", "Diagnostics must be disabled in the internal TestFlight profile.");
  assert(profile?.ios?.simulator === false, "The internal TestFlight profile must be a signed device/store build.");
  assert(submit?.ascAppId === expected.appStoreId, "EAS Submit must target the existing PeacePad App Store record.");
  assert(resolved.owner === expected.easOwner, "The release candidate must remain under the approved EAS owner.");
  assert(resolved.extra?.eas?.projectId === expected.easProjectId, "The release candidate must remain linked to the reviewed EAS project.");
  assert(resolved.ios?.bundleIdentifier === expected.bundleIdentifier, "The release candidate must update the existing production bundle.");
  assert(resolved.version === expected.version && resolved.ios?.buildNumber === expected.buildNumber, "The release candidate version/build contract changed unexpectedly.");
  assert(resolved.extra?.appStoreId === expected.appStoreId, "The dynamic app config must bind to the existing Apple ID.");
  assert(resolved.extra?.productionApiWritesEnabled === false, "Internal TestFlight must not enable production writes.");

  const launcher = fs.readFileSync(path.join(root, "scripts", "start-ios-testflight-build.cjs"), "utf8");
  assert(launcher.includes("D:\\\\PeacePadRelease"), "The Windows release launcher must move temporary build work to D:.");
  assert(launcher.includes('"archive"') && launcher.includes("EAS_SKIP_AUTO_FINGERPRINT"), "The release launcher must build from an exact D:-backed app-only Git archive.");
  assert(launcher.includes("eas-cli@21.8.0") && launcher.includes('"--yes"'), "The release launcher must use the current non-interactive EAS CLI.");
  assert(launcher.includes("release:ios:preflight:online"), "The release launcher must run the online gate before EAS Build.");
  assert(launcher.includes('"testflight-internal"') && launcher.includes('"--no-wait"'), "The release launcher must start only the reviewed asynchronous TestFlight profile.");
  assert(!launcher.includes("--auto-submit"), "The first internal candidate must be inspected before any App Store Connect submission.");
}

function verifyInjectedRegionalContract() {
  for (const [region, projectRef] of Object.entries(regionalProjectRefs)) {
    const prefix = `EXPO_PUBLIC_PEACEPAD_${region.toUpperCase()}_`;
    const supabaseUrl = process.env[`${prefix}SUPABASE_URL`]?.trim();
    const apiBaseUrl = process.env[`${prefix}API_BASE_URL`]?.trim();
    const publishableKey = process.env[`${prefix}SUPABASE_PUBLISHABLE_KEY`]?.trim();
    assert(supabaseUrl === `https://${projectRef}.supabase.co`, `EAS production ${region.toUpperCase()} Supabase URL does not match the reviewed project.`);
    assert(apiBaseUrl === `https://${projectRef}.supabase.co/functions/v1/peacepad-v2-api`, `EAS production ${region.toUpperCase()} API URL does not match the reviewed adapter.`);
    assert(Boolean(publishableKey) && publishableKey.length >= 20, `EAS production ${region.toUpperCase()} publishable key is absent or malformed.`);
  }
}

function runEas(args, { allowFailure = false } = {}) {
  const windows = process.platform === "win32";
  const executable = windows ? (process.env.ComSpec || "cmd.exe") : "npx";
  const commandArgs = windows
    ? ["/d", "/s", "/c", ["npx", "--yes", "eas-cli@21.8.0", ...args].join(" ")]
    : ["--yes", "eas-cli@21.8.0", ...args];
  const result = spawnSync(executable, commandArgs, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    windowsHide: true
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0 && !allowFailure) throw new Error(`EAS ${args[0]} check failed without starting a build.`);
  return output;
}

async function verifyOnlineContract() {
  const blockers = [];
  const check = (condition, message) => {
    if (!condition) blockers.push(message);
  };

  // Apple team linkage is required for every signed store build. Check it
  // first so a missing link fails before slower, non-remediating remote checks.
  const devices = runEas(["device:list"], { allowFailure: true });
  check(!/couldn['’]t find any teams/i.test(devices), "No Apple Developer team is linked to the EAS account.");
  if (blockers.length > 0) {
    throw new Error(blockers.join(" "));
  }

  const response = await fetch(`https://itunes.apple.com/lookup?id=${expected.appStoreId}&country=ca`);
  assert(response.ok, "Apple's public lookup endpoint was unavailable.");
  const lookup = await response.json();
  const record = Array.isArray(lookup.results) ? lookup.results[0] : undefined;
  assert(lookup.resultCount === 1 && record, "The existing PeacePad App Store record was not found.");
  assert(String(record.trackId) === expected.appStoreId, "Apple returned a different app record.");
  assert(record.bundleId === expected.bundleIdentifier && record.trackName === "PeacePad", "Apple's public PeacePad identity no longer matches the release contract.");

  const identity = runEas(["whoami"]);
  check(identity.split(/\r?\n/).some((line) => line.trim() === expected.easOwner), "EAS CLI is not authenticated as the approved owner.");
  const productionEnvironment = runEas(["env:list", "production", "--format", "long"]);
  const configuredNames = new Set(productionEnvironment.match(/EXPO_PUBLIC_PEACEPAD_[A-Z0-9_]+/g) ?? []);
  const missing = requiredRegionalNames.filter((name) => !configuredNames.has(name));
  check(missing.length === 0, `EAS production is missing ${missing.length} required dual-region public variable name(s): ${missing.join(", ")}`);
  assert(blockers.length === 0, blockers.join(" "));
}

async function main() {
  verifyStaticContract();
  console.log("PEACEPAD_IOS_TESTFLIGHT_STATIC_PREFLIGHT_READY");
  if (process.argv.includes("--injected")) {
    verifyInjectedRegionalContract();
    console.log("PEACEPAD_IOS_TESTFLIGHT_INJECTED_RUNTIME_READY");
    console.log("No build or submission was started.");
    return;
  }
  if (!process.argv.includes("--online")) {
    console.log("Online Apple/EAS checks were not requested; no build or submission was started.");
    return;
  }
  await verifyOnlineContract();
  console.log("PEACEPAD_IOS_TESTFLIGHT_ONLINE_PREFLIGHT_READY");
  console.log("No build or submission was started.");
}

main().catch((error) => {
  console.error(`PEACEPAD_IOS_TESTFLIGHT_PREFLIGHT_BLOCKED: ${error instanceof Error ? error.message : "Unknown preflight error."}`);
  process.exitCode = 1;
});
