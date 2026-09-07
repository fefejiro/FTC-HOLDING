const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const ignoredDirectories = new Set([
  ".expo",
  ".git",
  ".sim",
  "android",
  "build",
  "coverage",
  "dist",
  "ios",
  "node_modules",
]);

const checks = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["GitHub token", /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ["credential-bearing URL", /https?:\/\/[^\s/:]+:[^\s/@]+@/],
  [
    "quoted secret literal",
    /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)\s*[=:]\s*["'](?!example|placeholder|replace-me|test-only)[^"'\r\n]{16,}["']/i,
  ],
  [
    "environment secret assignment",
    /^\s*(?:API_KEY|CLIENT_SECRET|ACCESS_TOKEN|PASSWORD)\s*=\s*(?!example|placeholder|replace-me|test-only)[A-Za-z0-9_+\/=.-]{16,}\s*$/m,
  ],
];

const candidates = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name) || entry.name.startsWith(".node_modules-")) continue;
      walk(fullPath);
      continue;
    }
    if (!/\.(?:cjs|js|json|md|ts|tsx|yaml|yml)$/.test(entry.name)) continue;
    if (fs.statSync(fullPath).size > 1024 * 1024) continue;
    candidates.push(fullPath);
  }
};

walk(root);

const findings = [];
for (const file of candidates) {
  const contents = fs.readFileSync(file, "utf8");
  for (const [label, pattern] of checks) {
    if (pattern.test(contents)) {
      findings.push(`${path.relative(root, file)}: ${label}`);
    }
  }
}

if (findings.length) {
  console.error("PeacePad Native secret scan failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`PeacePad Native secret scan OK (${candidates.length} files checked).`);
