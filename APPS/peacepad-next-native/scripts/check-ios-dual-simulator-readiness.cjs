const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const profileName = "staging-simulator-dual";
const expectedOwner = "official_fejiro";
const expectedProjectId = "a4ecee72-ebae-483d-8553-035847ebb3d3";
const requiredRegionalNames = [
  "EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_URL",
  "EXPO_PUBLIC_PEACEPAD_CA_API_BASE_URL",
  "EXPO_PUBLIC_PEACEPAD_CA_SUPABASE_PUBLISHABLE_KEY"
];
const projectRefs = { ca: "rohvkyuxbnqzglaromms" };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
}

function verifyStaticContract() {
  const app = readJson("app.json").expo;
  const profile = readJson("eas.json").build?.[profileName];
  const configModule = require(path.join(root, "app.config.js"));
  const previousMode = process.env.PEACEPAD_IOS_RELEASE_MODE;
  const previousEnvironment = process.env.EXPO_PUBLIC_PEACEPAD_ENV;
  try {
    process.env.PEACEPAD_IOS_RELEASE_MODE = profileName;
    process.env.EXPO_PUBLIC_PEACEPAD_ENV = "staging";
    const resolved = configModule({ config: structuredClone(app) });
    assert(profile?.distribution === "internal", "The dual-region Simulator must use internal distribution.");
    assert(profile?.environment === "production", "The dual-region Simulator must use the reviewed EAS production variable set.");
    assert(profile?.ios?.simulator === true, "The dual-region profile must produce only an iOS Simulator archive.");
    assert(profile?.env?.PEACEPAD_IOS_RELEASE_MODE === profileName, "The dual-region profile must explicitly select its safe app variant.");
    assert(profile?.env?.EXPO_PUBLIC_PEACEPAD_ENV === "staging", "The dual-region Simulator must remain on fictional staging.");
    assert(profile?.env?.EXPO_PUBLIC_PEACEPAD_DIAGNOSTICS === "false", "Diagnostics must remain disabled.");
    assert(resolved.owner === expectedOwner, "The dual-region build must remain under the approved EAS owner.");
    assert(resolved.extra?.eas?.projectId === expectedProjectId, "The dual-region build must remain linked to the reviewed EAS project.");
    assert(resolved.ios?.bundleIdentifier === "ca.peacepad.nextnative.lab", "The Simulator must retain the isolated lab bundle.");
    assert(resolved.extra?.productionApiWritesEnabled === false, "The Simulator must not enable production writes.");
    assert(resolved.extra?.releaseChannel === profileName, "The resolved Simulator release channel changed unexpectedly.");
    const launcher = fs.readFileSync(path.join(root, "scripts", "start-ios-dual-simulator-build.cjs"), "utf8");
    assert(launcher.includes("D:\\\\PeacePadRelease\\\\dual-simulator"), "The Windows Simulator launcher must keep scratch work on D:.");
    assert(launcher.includes('"archive"') && launcher.includes("core.autocrlf=false"), "The launcher must create an exact app-only Git archive.");
    assert(launcher.includes("HEAD:APPS/peacepad-next-native"), "The launcher must bind the isolated app tree to the reviewed monorepo commit.");
    assert(launcher.includes("fs.symlinkSync") && launcher.includes('"junction"'), "The Windows launcher must reuse installed dependencies without copying them into D:.");
    assert(launcher.includes('EAS_SKIP_AUTO_FINGERPRINT: "1"'), "The isolated Windows build must bypass only EAS' junction-incompatible local fingerprint scan.");
    assert(launcher.includes('"staging-simulator-dual"') && launcher.includes('"--no-wait"'), "The launcher must enqueue only the reviewed asynchronous dual-region Simulator profile.");
    assert(!launcher.includes("--auto-submit"), "The dual-region Simulator launcher must never submit to Apple.");
  } finally {
    if (previousMode === undefined) delete process.env.PEACEPAD_IOS_RELEASE_MODE;
    else process.env.PEACEPAD_IOS_RELEASE_MODE = previousMode;
    if (previousEnvironment === undefined) delete process.env.EXPO_PUBLIC_PEACEPAD_ENV;
    else process.env.EXPO_PUBLIC_PEACEPAD_ENV = previousEnvironment;
  }
}

function verifyInjectedContract() {
  for (const [region, projectRef] of Object.entries(projectRefs)) {
    const prefix = `EXPO_PUBLIC_PEACEPAD_${region.toUpperCase()}_`;
    assert(process.env[`${prefix}SUPABASE_URL`]?.trim() === `https://${projectRef}.supabase.co`, `${region.toUpperCase()} Supabase URL does not match the reviewed project.`);
    assert(process.env[`${prefix}API_BASE_URL`]?.trim() === `https://${projectRef}.supabase.co/functions/v1/peacepad-v2-api`, `${region.toUpperCase()} API URL does not match the reviewed adapter.`);
    assert((process.env[`${prefix}SUPABASE_PUBLISHABLE_KEY`]?.trim().length ?? 0) >= 20, `${region.toUpperCase()} publishable key is absent or malformed.`);
  }
}

function executeEas(args) {
  const executable = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "eas";
  const quote = (value) => /[\s"&|<>^]/.test(String(value)) ? JSON.stringify(String(value)) : String(value);
  const commandArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", ["eas", ...args.map(quote)].join(" ")]
    : args;
  return spawnSync(executable, commandArgs, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    windowsHide: true
  });
}

function verifyEasVersion() {
  const version = executeEas(["--version"]);
  const major = Number(`${version.stdout ?? ""}${version.stderr ?? ""}`.match(/eas-cli\/(\d+)/)?.[1]);
  assert(version.status === 0 && Number.isInteger(major) && major >= 16, "A compatible authenticated EAS CLI (16 or newer) is required on PATH.");
}

function runEas(args) {
  verifyEasVersion();
  const result = executeEas(args);
  if (result.status !== 0) throw new Error(`EAS ${args[0]} check failed before build.`);
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function verifyOnlineContract() {
  const identity = runEas(["whoami"]);
  assert(identity.split(/\r?\n/).some((line) => line.trim() === expectedOwner), "EAS CLI is not authenticated as the approved owner.");
  const environment = runEas(["env:list", "production", "--format", "long"]);
  const configuredNames = new Set(environment.match(/EXPO_PUBLIC_PEACEPAD_[A-Z0-9_]+/g) ?? []);
  const missing = requiredRegionalNames.filter((name) => !configuredNames.has(name));
  assert(missing.length === 0, `EAS production is missing ${missing.length} required Canadian staging variable name(s): ${missing.join(", ")}`);
}

try {
  verifyStaticContract();
  console.log("PEACEPAD_IOS_DUAL_SIMULATOR_STATIC_READY");
  if (process.argv.includes("--injected")) {
    verifyInjectedContract();
    console.log("PEACEPAD_IOS_DUAL_SIMULATOR_RUNTIME_READY");
  } else if (process.argv.includes("--online")) {
    verifyOnlineContract();
    console.log("PEACEPAD_IOS_DUAL_SIMULATOR_ONLINE_READY");
  }
  console.log("No EAS build or submission was started.");
} catch (error) {
  console.error(`PEACEPAD_IOS_DUAL_SIMULATOR_BLOCKED: ${error instanceof Error ? error.message : "Unknown preflight error."}`);
  process.exitCode = 1;
}
