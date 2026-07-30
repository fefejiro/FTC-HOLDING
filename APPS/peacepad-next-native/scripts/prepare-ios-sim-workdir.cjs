const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(root, "..", "..");
const simRoot = path.join(root, ".sim", "peacepad-next-native-ios");
const args = new Set(process.argv.slice(2));

const copyEntries = [
  "app.json",
  "index.ts",
  "metro.config.js",
  "package.json",
  "tsconfig.json",
  "README.md",
  "src",
  "docs",
  "scripts/check-lab-guardrails.cjs"
];

function rmrf(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function copyOne(entry) {
  const from = path.join(root, entry);
  const to = path.join(simRoot, entry);
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

function run(command, options = {}) {
  cp.execFileSync(command.cmd, command.args, {
    cwd: options.cwd || simRoot,
    stdio: "inherit",
    shell: process.platform === "win32"
  });
}

function readGit(args) {
  try {
    return cp.execFileSync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

rmrf(simRoot);
fs.mkdirSync(simRoot, { recursive: true });
for (const entry of copyEntries) copyOne(entry);

const packagePath = path.join(simRoot, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
packageJson.scripts = {
  start: "expo start",
  ios: "expo start --ios",
  guardrails: "node scripts/check-lab-guardrails.cjs",
  typecheck: "tsc --noEmit"
};
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const appJson = JSON.parse(
  fs.readFileSync(path.join(simRoot, "app.json"), "utf8"),
);
const proofContext = {
  generatedAt: new Date().toISOString(),
  sourceCommit: readGit(["rev-parse", "HEAD"]),
  sourceDirty: readGit(["status", "--porcelain"]) !== "",
  iosBundleIdentifier: appJson.expo?.ios?.bundleIdentifier ?? "unknown",
  productionApiWritesEnabled:
    appJson.expo?.extra?.productionApiWritesEnabled ?? "unknown",
};
fs.writeFileSync(
  path.join(simRoot, "SIMULATOR_PROOF_CONTEXT.json"),
  `${JSON.stringify(proofContext, null, 2)}\n`,
);

console.log(`Prepared standalone simulator workdir: ${simRoot}`);
console.log(
  `Proof context: ${proofContext.sourceCommit} (dirty: ${proofContext.sourceDirty})`,
);

if (args.has("--install")) {
  run({ cmd: "npm", args: ["install"] });
}

if (args.has("--doctor")) {
  run({ cmd: "npx", args: ["--yes", "expo-doctor@latest", "."] });
}

if (args.has("--ios")) {
  run({ cmd: "npx", args: ["expo", "start", "--ios", "--clear"] });
}
