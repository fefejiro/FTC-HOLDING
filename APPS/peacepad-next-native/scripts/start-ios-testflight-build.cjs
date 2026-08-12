const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const startRequested = process.argv.includes("--start");
const preferredWindowsRoot = "D:\\PeacePadRelease";
const workRoot = process.env.PEACEPAD_RELEASE_WORK_ROOT?.trim()
  || (process.platform === "win32" && fs.existsSync("D:\\") ? preferredWindowsRoot : path.join(os.tmpdir(), "PeacePadRelease"));

const releaseEnvironment = {
  ...process.env,
  TEMP: path.join(workRoot, "temp"),
  TMP: path.join(workRoot, "temp"),
  npm_config_cache: path.join(workRoot, "npm-cache")
};
fs.mkdirSync(releaseEnvironment.TEMP, { recursive: true });
fs.mkdirSync(releaseEnvironment.npm_config_cache, { recursive: true });

function run(command, args) {
  const windows = process.platform === "win32";
  const executable = windows ? (process.env.ComSpec || "cmd.exe") : command;
  const commandArgs = windows ? ["/d", "/s", "/c", [command, ...args].join(" ")] : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: root,
    encoding: "utf8",
    env: releaseEnvironment,
    stdio: "inherit",
    windowsHide: true
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`PeacePad release scratch: ${workRoot}`);
run("npm", ["run", "release:ios:preflight:online"]);

if (!startRequested) {
  console.log("PEACEPAD_IOS_TESTFLIGHT_BUILD_CHECK_READY");
  console.log("No build or submission was started. Pass --start only after the gate is green.");
  process.exit(0);
}

const gitStatus = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8", windowsHide: true });
if (gitStatus.status !== 0 || gitStatus.stdout.trim()) {
  console.error("PEACEPAD_IOS_TESTFLIGHT_BUILD_BLOCKED: the release checkout must be clean and committed.");
  process.exit(1);
}

run("npx", [
  "eas-cli@16.19.1",
  "build",
  "--platform", "ios",
  "--profile", "testflight-internal",
  "--non-interactive",
  "--no-wait"
]);
