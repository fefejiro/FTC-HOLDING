const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const startRequested = process.argv.includes("--start");
const workRoot = process.env.PEACEPAD_RELEASE_WORK_ROOT?.trim()
  || (process.platform === "win32" && fs.existsSync("D:\\")
    ? "D:\\PeacePadRelease\\dual-simulator"
    : path.join(require("os").tmpdir(), "PeacePadRelease", "dual-simulator"));
const buildEnvironment = {
  ...process.env,
  TEMP: path.join(workRoot, "temp"),
  TMP: path.join(workRoot, "temp"),
  npm_config_cache: path.join(path.dirname(workRoot), "npm-cache")
};
fs.mkdirSync(buildEnvironment.TEMP, { recursive: true });
fs.mkdirSync(buildEnvironment.npm_config_cache, { recursive: true });

function run(command, args, env = buildEnvironment) {
  const isWindowsEas = process.platform === "win32" && command === "eas";
  const executable = isWindowsEas ? (process.env.ComSpec || "cmd.exe") : command;
  const quote = (value) => /[\s"&|<>^]/.test(String(value)) ? JSON.stringify(String(value)) : String(value);
  const commandArgs = isWindowsEas
    ? ["/d", "/s", "/c", ["eas", ...args.map(quote)].join(" ")]
    : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: root,
    encoding: "utf8",
    env,
    stdio: "inherit",
    windowsHide: true
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function readDotEnv(file) {
  const values = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = JSON.parse(value);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

console.log(`PeacePad dual-region Simulator scratch: ${workRoot}`);
run("node", ["scripts/check-ios-dual-simulator-readiness.cjs", "--online"]);
const pulledEnvironmentPath = path.join(buildEnvironment.TEMP, "peacepad-eas-production.env");
try {
  run("eas", ["env:pull", "production", "--path", pulledEnvironmentPath, "--non-interactive"]);
  run("node", ["scripts/check-ios-dual-simulator-readiness.cjs", "--injected"], {
    ...buildEnvironment,
    ...readDotEnv(pulledEnvironmentPath)
  });
} finally {
  fs.rmSync(pulledEnvironmentPath, { force: true });
}

if (!startRequested) {
  console.log("PEACEPAD_IOS_DUAL_SIMULATOR_BUILD_CHECK_READY");
  console.log("No build or submission was started. Pass --start only from a clean committed checkout.");
  process.exit(0);
}

const gitStatus = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8", windowsHide: true });
if (gitStatus.status !== 0 || gitStatus.stdout.trim()) {
  console.error("PEACEPAD_IOS_DUAL_SIMULATOR_BLOCKED: the build checkout must be clean and committed.");
  process.exit(1);
}

run("eas", [
  "build",
  "--platform", "ios",
  "--profile", "staging-simulator-dual",
  "--non-interactive",
  "--no-wait"
]);
