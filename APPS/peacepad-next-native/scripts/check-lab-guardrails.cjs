const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const appJson = JSON.parse(read("app.json"));
const packageJson = JSON.parse(read("package.json"));

const iosBundle = appJson.expo?.ios?.bundleIdentifier;
const androidPackage = appJson.expo?.android?.package;
const extra = appJson.expo?.extra || {};

const failures = [];

if (iosBundle === "ca.peacepad.family") {
  failures.push("iOS bundleIdentifier must not equal submitted production bundle ca.peacepad.family.");
}

if (androidPackage === "ca.peacepad.family") {
  failures.push("Android package must not equal submitted production bundle ca.peacepad.family.");
}

if (extra.productionApiWritesEnabled !== false) {
  failures.push("productionApiWritesEnabled must remain false in the lab app.");
}

if (!packageJson.private) {
  failures.push("package.json must remain private.");
}

const sourceFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".expo", "ios", "android"].includes(entry.name)) continue;
      walk(full);
    } else if (/\.(ts|tsx|js|json|md)$/.test(entry.name)) {
      sourceFiles.push(full);
    }
  }
};
walk(root);

for (const file of sourceFiles) {
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, "utf8");
  const isTestFixture = /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(rel);
  if (!isTestFixture && /api\.peacepad\.ca/.test(text)) {
    failures.push(`${rel} references production API api.peacepad.ca.`);
  }
  const affirmativeText = text
    .split(/\r?\n/)
    .filter((line) => !/^\s*[-*]?\s*do not\b/i.test(line))
    .join("\n");

  const unsafeLegalClaim =
    /we\s+(guarantee|determine|predict)\s+court/i.test(affirmativeText) ||
    /guaranteed\s+admissibility/i.test(affirmativeText) ||
    /legal advice provider/i.test(affirmativeText);

  if (unsafeLegalClaim) {
    failures.push(`${rel} contains unsafe positive legal positioning.`);
  }
}

if (failures.length) {
  console.error("PeacePad Next Native guardrail check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PeacePad Next Native guardrails OK.");
