const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const startRequested = process.argv.includes("--start");
const prepareOnly = process.argv.includes("--prepare-only");
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

function run(command, args, env = buildEnvironment, cwd = root) {
  const isWindowsEas = process.platform === "win32" && command === "eas";
  const executable = isWindowsEas ? (process.env.ComSpec || "cmd.exe") : command;
  const quote = (value) => /[\s"&|<>^]/.test(String(value)) ? JSON.stringify(String(value)) : String(value);
  const commandArgs = isWindowsEas
    ? ["/d", "/s", "/c", ["eas", ...args.map(quote)].join(" ")]
    : args;
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
    env: buildEnvironment,
    windowsHide: true
  });
  if (result.status !== 0) process.exit(result.status || 1);
  return result.stdout.trim();
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

if (!startRequested && !prepareOnly) {
  console.log("PEACEPAD_IOS_DUAL_SIMULATOR_BUILD_CHECK_READY");
  console.log("No build or submission was started. Pass --start only from a clean committed checkout.");
  process.exit(0);
}

const gitStatus = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8", windowsHide: true });
if (gitStatus.status !== 0 || (startRequested && gitStatus.stdout.trim())) {
  console.error("PEACEPAD_IOS_DUAL_SIMULATOR_BLOCKED: the build checkout must be clean and committed.");
  process.exit(1);
}

const isolatedRoot = path.resolve(workRoot, "source");
const safeParent = `${path.resolve(workRoot)}${path.sep}`;
if (!isolatedRoot.startsWith(safeParent)) {
  console.error("PEACEPAD_IOS_DUAL_SIMULATOR_BLOCKED: isolated source path escaped the approved D:-backed work root.");
  process.exit(1);
}
const archivePath = path.resolve(workRoot, "peacepad-next-native-source.tar");
const repositoryRoot = capture("git", ["rev-parse", "--show-toplevel"]);
const sourceCommit = capture("git", ["rev-parse", "HEAD"], repositoryRoot);
const sourceTreeObject = capture("git", ["rev-parse", "HEAD:APPS/peacepad-next-native"], repositoryRoot);
fs.rmSync(isolatedRoot, { recursive: true, force: true });
fs.mkdirSync(isolatedRoot, { recursive: true });
try {
  run("git", ["-c", "core.autocrlf=false", "archive", "--format=tar", `--output=${archivePath}`, sourceTreeObject], buildEnvironment, repositoryRoot);
  run("tar", ["-xf", archivePath, "-C", isolatedRoot]);
} finally {
  fs.rmSync(archivePath, { force: true });
}
run("git", ["init", "-q"], buildEnvironment, isolatedRoot);
run("git", ["config", "core.autocrlf", "false"], buildEnvironment, isolatedRoot);
run("git", ["config", "user.name", "PeacePad Release Control"], buildEnvironment, isolatedRoot);
run("git", ["config", "user.email", "release-control@users.noreply.github.com"], buildEnvironment, isolatedRoot);
run("git", ["add", "--all"], buildEnvironment, isolatedRoot);
run("git", ["commit", "-qm", `Package PeacePad Native V2 source ${sourceCommit}`], buildEnvironment, isolatedRoot);
const copiedTreeObject = capture("git", ["rev-parse", "HEAD^{tree}"], isolatedRoot);
if (sourceTreeObject !== copiedTreeObject) {
  console.error("PEACEPAD_IOS_DUAL_SIMULATOR_BLOCKED: isolated app source does not match the exact reviewed Git tree.");
  process.exit(1);
}
console.log(`PeacePad isolated app tree verified: ${sourceTreeObject}`);

if (prepareOnly) {
  console.log("PEACEPAD_IOS_DUAL_SIMULATOR_ISOLATED_SOURCE_READY");
  console.log("No EAS build or submission was started.");
  process.exit(0);
}

run("eas", [
  "build",
  "--platform", "ios",
  "--profile", "staging-simulator-dual",
  "--non-interactive",
  "--no-wait"
], buildEnvironment, isolatedRoot);
