const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const startRequested = process.argv.includes("--start");
const prepareOnly = process.argv.includes("--prepare-only");
const productionRequested = process.argv.includes("--production");
const buildProfile = productionRequested ? "appstore-production" : "testflight-internal";
const preferredWindowsRoot = "D:\\PeacePadRelease";
const workRoot = process.env.PEACEPAD_RELEASE_WORK_ROOT?.trim()
  || (process.platform === "win32" && fs.existsSync("D:\\")
    ? path.join(preferredWindowsRoot, "testflight-internal")
    : path.join(os.tmpdir(), "PeacePadRelease", "testflight-internal"));
const releaseCacheRoot = process.env.PEACEPAD_EAS_CACHE_ROOT?.trim()
  || (process.platform === "win32" && fs.existsSync("D:\\")
    ? path.join(preferredWindowsRoot, "npm-cache-eas21")
    : path.join(workRoot, "npm-cache"));

const releaseEnvironment = {
  ...process.env,
  TEMP: path.join(workRoot, "temp"),
  TMP: path.join(workRoot, "temp"),
  npm_config_cache: releaseCacheRoot
};
const cachedEasCli = process.platform === "win32"
  ? path.join(releaseEnvironment.npm_config_cache, "_npx", "03e34f479f818b15", "node_modules", "eas-cli", "bin", "run")
  : undefined;
if (cachedEasCli && fs.existsSync(cachedEasCli)) {
  releaseEnvironment.PEACEPAD_EAS_CLI_PATH = cachedEasCli;
}
fs.mkdirSync(releaseEnvironment.TEMP, { recursive: true });
fs.mkdirSync(releaseEnvironment.npm_config_cache, { recursive: true });

function run(command, args, env = releaseEnvironment, cwd = root) {
  const windows = process.platform === "win32";
  const needsWindowsShell = windows && (command === "npx" || command === "npm");
  const executable = needsWindowsShell ? (process.env.ComSpec || "cmd.exe") : command;
  const quote = (value) => /[\s"&|<>^]/.test(String(value)) ? JSON.stringify(String(value)) : String(value);
  const commandArgs = needsWindowsShell ? ["/d", "/s", "/c", [command, ...args.map(quote)].join(" ")] : args;
  const result = spawnSync(executable, commandArgs, {
    cwd,
    encoding: "utf8",
    env,
    stdio: "inherit",
    windowsHide: true
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function capture(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: releaseEnvironment,
    windowsHide: true
  });
  if (result.status !== 0) process.exit(result.status || 1);
  return result.stdout.trim();
}

console.log(`PeacePad release scratch: ${workRoot}`);
console.log(`PeacePad iOS build profile: ${buildProfile}`);
run(process.execPath, ["scripts/check-ios-testflight-readiness.cjs", "--online"]);

if (!startRequested && !prepareOnly) {
  console.log("PEACEPAD_IOS_TESTFLIGHT_BUILD_CHECK_READY");
  console.log("No build or submission was started. Pass --start only after the gate is green.");
  process.exit(0);
}

const gitStatus = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8", windowsHide: true });
if (gitStatus.status !== 0 || (startRequested && gitStatus.stdout.trim())) {
  console.error("PEACEPAD_IOS_TESTFLIGHT_BUILD_BLOCKED: the release checkout must be clean and committed.");
  process.exit(1);
}

const isolatedRoot = path.resolve(workRoot, "source");
const safeParent = `${path.resolve(workRoot)}${path.sep}`;
if (!isolatedRoot.startsWith(safeParent)) {
  console.error("PEACEPAD_IOS_TESTFLIGHT_BUILD_BLOCKED: isolated source path escaped the approved D:-backed work root.");
  process.exit(1);
}
const archivePath = path.resolve(workRoot, "peacepad-next-native-source.tar");
const repositoryRoot = capture("git", ["rev-parse", "--show-toplevel"]);
const sourceCommit = capture("git", ["rev-parse", "HEAD"], repositoryRoot);
const sourceTreeObject = capture("git", ["rev-parse", "HEAD:APPS/peacepad-next-native"], repositoryRoot);
fs.rmSync(isolatedRoot, { recursive: true, force: true });
fs.mkdirSync(isolatedRoot, { recursive: true });
try {
  run("git", ["-c", "core.autocrlf=false", "archive", "--format=tar", `--output=${archivePath}`, sourceTreeObject], releaseEnvironment, repositoryRoot);
  run("tar", ["-xf", archivePath, "-C", isolatedRoot]);
} finally {
  fs.rmSync(archivePath, { force: true });
}
run("git", ["init", "-q"], releaseEnvironment, isolatedRoot);
run("git", ["config", "core.autocrlf", "false"], releaseEnvironment, isolatedRoot);
run("git", ["add", "--all"], releaseEnvironment, isolatedRoot);
run("git", [
  "-c", "user.name=PeacePad Release Control",
  "-c", "user.email=release-control@users.noreply.github.com",
  "commit", "-qm", `Package PeacePad Native V2 source ${sourceCommit}`
], releaseEnvironment, isolatedRoot);
const copiedTreeObject = capture("git", ["rev-parse", "HEAD^{tree}"], isolatedRoot);
if (sourceTreeObject !== copiedTreeObject) {
  console.error("PEACEPAD_IOS_TESTFLIGHT_BUILD_BLOCKED: isolated app source does not match the exact reviewed Git tree.");
  process.exit(1);
}
console.log(`PeacePad isolated app tree verified: ${sourceTreeObject}`);

const installedDependencies = path.join(root, "node_modules");
const isolatedDependencies = path.join(isolatedRoot, "node_modules");
if (fs.existsSync(installedDependencies)) {
  fs.symlinkSync(installedDependencies, isolatedDependencies, process.platform === "win32" ? "junction" : "dir");
} else {
  run("npm", ["ci", "--workspaces=false", "--prefer-offline"], releaseEnvironment, isolatedRoot);
}

if (prepareOnly) {
  console.log("PEACEPAD_IOS_TESTFLIGHT_ISOLATED_SOURCE_READY");
  console.log("No EAS build or submission was started.");
  process.exit(0);
}

const easBuildArgs = [
  "build",
  "--platform", "ios",
  "--profile", buildProfile,
  "--non-interactive",
  "--no-wait"
];
const easBuildEnvironment = {
  ...releaseEnvironment,
  // Windows junctions let the exact D:-backed app archive reuse the reviewed
  // dependency installation. The Git tree comparison above remains the source
  // authority, so only EAS' junction-incompatible optional fingerprint scan is skipped.
  EAS_SKIP_AUTO_FINGERPRINT: "1"
};
if (cachedEasCli && fs.existsSync(cachedEasCli)) {
  run(process.execPath, [cachedEasCli, ...easBuildArgs], easBuildEnvironment, isolatedRoot);
} else {
  run("npx", ["--yes", "eas-cli@21.8.0", ...easBuildArgs], easBuildEnvironment, isolatedRoot);
}
