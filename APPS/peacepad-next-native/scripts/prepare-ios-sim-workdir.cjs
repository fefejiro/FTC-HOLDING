const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = path.resolve(__dirname, "..");
const simRoot = path.join(root, ".sim", "peacepad-next-native-ios");
const args = new Set(process.argv.slice(2));

const copyEntries = [
  "app.json",
  "index.ts",
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

console.log(`Prepared standalone simulator workdir: ${simRoot}`);

if (args.has("--install")) {
  run({ cmd: "npm", args: ["install"] });
}

if (args.has("--doctor")) {
  run({ cmd: "npx", args: ["--yes", "expo-doctor@latest", "."] });
}

if (args.has("--ios")) {
  run({ cmd: "npx", args: ["expo", "start", "--ios", "--clear"] });
}

