import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const strict = process.argv.includes("--strict");
const failures = [];
const warnings = [];

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8"
  }).split("\0").filter(Boolean);
}

const forbiddenNames = [
  /(^|\/)(gmail_tokens|credentials|client_secret)[^/]*\.json$/i,
  /(^|\/)instances\/[^/]+\/secrets\//i
];
const secretPatterns = [
  /"refresh_token"\s*:\s*"(?!replace|example|your-)[^"$<{][^"]{8,}"/i,
  /"client_secret"\s*:\s*"(?!replace|example|your-)[^"$<{][^"]{8,}"/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
];

for (const relative of trackedFiles()) {
  const normalized = relative.replaceAll("\\", "/");
  const trackedEnvironmentFile =
    /(^|\/)\.env(?:\.|$)/i.test(normalized) && !/\.example$/i.test(normalized);
  if (trackedEnvironmentFile || forbiddenNames.some((pattern) => pattern.test(normalized))) {
    failures.push(`Tracked secret-like filename: ${normalized}`);
    continue;
  }
  const absolute = path.resolve(root, relative);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).size > 2_000_000) continue;
  const content = fs.readFileSync(absolute, "utf8");
  if (secretPatterns.some((pattern) => pattern.test(content))) {
    failures.push(`Tracked file contains a credential pattern: ${normalized}`);
  }
}

if (strict) {
  if (process.env.NODE_ENV !== "production") failures.push("NODE_ENV must equal production.");
  if (!/^postgres(?:ql)?:\/\//.test(process.env.DATABASE_URL || "")) failures.push("DATABASE_URL must be a PostgreSQL URL.");
  if (!/^https:\/\//.test(process.env.APP_ORIGIN || "")) failures.push("APP_ORIGIN must be an HTTPS origin.");
  if ((process.env.JOB_AGENT_INVITE_CODE || "").length < 24) failures.push("JOB_AGENT_INVITE_CODE must be at least 24 characters.");
  if (process.env.OBJECT_STORAGE_DRIVER !== "s3") failures.push("OBJECT_STORAGE_DRIVER must equal s3.");
  if (!(process.env.OBJECT_STORAGE_BUCKET || "").trim()) failures.push("OBJECT_STORAGE_BUCKET is required.");
  if (!(process.env.OBJECT_STORAGE_REGION || "").trim()) failures.push("OBJECT_STORAGE_REGION is required.");
  if (process.env.OBJECT_STORAGE_ENDPOINT && !/^https:\/\//.test(process.env.OBJECT_STORAGE_ENDPOINT)) failures.push("OBJECT_STORAGE_ENDPOINT must use HTTPS.");
  if (process.env.OBJECT_STORAGE_SSE === "aws:kms" && !(process.env.OBJECT_STORAGE_KMS_KEY_ID || "").trim()) failures.push("OBJECT_STORAGE_KMS_KEY_ID is required for KMS encryption.");
  if (process.env.ALLOW_LOCAL_OBJECT_STORAGE === "true") failures.push("ALLOW_LOCAL_OBJECT_STORAGE cannot be enabled in production.");
} else {
  warnings.push("Runtime environment checks skipped. Run production:check:strict in the deployment environment.");
}

const report = {
  checkedAt: new Date().toISOString(),
  mode: strict ? "strict" : "static",
  passed: failures.length === 0,
  failures,
  warnings
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
