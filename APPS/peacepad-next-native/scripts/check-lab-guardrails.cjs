const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const appJson = JSON.parse(read("app.json"));
const packageJson = JSON.parse(read("package.json"));
const stagingInvitationMigration = read("staging/migrations/0001_invitation_slice.sql");

const iosBundle = appJson.expo?.ios?.bundleIdentifier;
const androidPackage = appJson.expo?.android?.package;
const extra = appJson.expo?.extra || {};

const failures = [];

if (appJson.expo?.name !== "PeacePad") {
  failures.push("The visible app name must remain PeacePad.");
}

if (iosBundle !== "ca.peacepad.nextnative.lab" || androidPackage !== "ca.peacepad.nextnative.lab") {
  failures.push("Native lab identifiers must remain ca.peacepad.nextnative.lab.");
}

if (iosBundle === "ca.peacepad.family") {
  failures.push("iOS bundleIdentifier must not equal submitted production bundle ca.peacepad.family.");
}

if (androidPackage === "ca.peacepad.family") {
  failures.push("Android package must not equal submitted production bundle ca.peacepad.family.");
}

if (extra.productionApiWritesEnabled !== false) {
  failures.push("productionApiWritesEnabled must remain false in the lab app.");
}

if (extra.diagnosticsEnabled !== false) {
  failures.push("diagnosticsEnabled must remain false in the checked-in app config.");
}

if (!packageJson.private) {
  failures.push("package.json must remain private.");
}

if (packageJson.scripts?.["staging:start"] !== "tsx src/staging/server.ts") {
  failures.push("The isolated staging server must use the reviewed staging entrypoint.");
}

if (!/\bcode_hash\s+text\s+not\s+null\s+unique\b/i.test(stagingInvitationMigration)) {
  failures.push("Staging invitations must persist a unique code hash.");
}

if (/^\s*(code|deep_link)\s+(text|varchar)/im.test(stagingInvitationMigration)) {
  failures.push("Staging invitations must not define plaintext code or deep-link columns.");
}

if (!/CREATE TABLE IF NOT EXISTS peacepad_native_staging\.invitation_resolution_claims/i.test(stagingInvitationMigration)) {
  failures.push("Invitation resolution proof must be durable across staging instances.");
}

if (/^\s*(requester_key|session_token)\s+(text|varchar)/im.test(stagingInvitationMigration)) {
  failures.push("Staging resolution proof must not persist raw requester or session values.");
}

if (!/REVOKE ALL ON ALL TABLES IN SCHEMA peacepad_native_staging FROM PUBLIC/i.test(stagingInvitationMigration)) {
  failures.push("Staging invitation tables must revoke default PUBLIC access.");
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
  if (!isTestFixture && /allowFontScaling\s*=\s*(?:\{\s*)?false/.test(text)) {
    failures.push(`${rel} disables Dynamic Type font scaling.`);
  }
  if (!isTestFixture && /(?:\u00e2\u20ac|\u00c3[\u0080-\u00bf])/.test(text)) {
    failures.push(`${rel} contains likely mojibake encoding artifacts.`);
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
