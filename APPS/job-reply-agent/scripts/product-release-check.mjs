import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const repositoryRoot = path.resolve(root, "..", "..");
const railwayIgnorePath = path.join(repositoryRoot, ".railwayignore");
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

for (const required of [
  "Dockerfile",
  "railway.web.toml",
  "railway.worker.toml",
  "railway.migrate.toml",
  "railway.backup.toml",
  "cloudflare/jobagent-edge/wrangler.jsonc",
  "cloudflare/jobagent-edge/src/index.js",
  "public/index.html",
  "public/landing.html",
  "public/landing.css",
  "public/landing.js",
  "public/product-preview.png",
  "public/app.js",
  "public/manifest.webmanifest",
  "public/sw.js",
  "public/privacy.html",
  "public/terms.html",
  "public/google-data.html",
  "public/retention.html",
  "public/account-deletion.html",
  "public/support.html",
  "public/icon-192.png",
  "public/icon-192.png.b64",
  "public/icon.png",
  "public/icon.png.b64",
  "migrations/008_safe_public_beta.sql",
  "migrations/009_application_evidence.sql",
  "migrations/010_trust_first_pilot.sql",
  "migrations/011_revenue_launch.sql",
  "scripts/install-trusted-runner.ps1",
  "scripts/provision-railway-database.mjs",
  "src/product_runner_client.ts",
  "src/product_pilot_import.ts"
]) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`Required release file is missing: ${required}`);
}

const railwayIgnore = fs.readFileSync(railwayIgnorePath, "utf8");
if (railwayIgnore.split(/\r?\n/).some((line) => line.trim() === "*.png")) {
  for (const asset of ["icon-192.png", "icon.png", "product-preview.png"]) {
    if (!railwayIgnore.includes(`!APPS/job-reply-agent/public/${asset}`)) {
      failures.push(`Railway upload rules exclude required public asset: ${asset}`);
    }
  }
}

for (const icon of ["icon-192.png", "icon.png"]) {
  const binary = fs.readFileSync(path.join(root, "public", icon));
  const fallback = Buffer.from(
    fs.readFileSync(path.join(root, "public", `${icon}.b64`), "ascii").trim(),
    "base64"
  );
  if (!binary.equals(fallback)) {
    failures.push(`PWA icon fallback does not match its binary source: ${icon}`);
  }
}

const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
if (lock.packages?.["node_modules/gaxios"]?.version === "7.1.4") {
  failures.push("Standalone lockfile still resolves the obsolete gaxios 7.1.4 release.");
}

for (const legacyWorkflow of ["job-reply-agent.yml", "job-reply-report.yml"]) {
  const workflow = path.join(repositoryRoot, ".github", "workflows", legacyWorkflow);
  if (fs.existsSync(workflow) && /^\s*schedule\s*:/m.test(fs.readFileSync(workflow, "utf8"))) {
    failures.push(`Legacy single-user schedule is still active: ${legacyWorkflow}`);
  }
}

if (strict) {
  if (process.env.NODE_ENV !== "production") failures.push("NODE_ENV must equal production.");
  const processType = String(process.env.JOB_AGENT_PROCESS || "all").trim().toLowerCase();
  if (!["web", "worker", "migrate", "backup", "all"].includes(processType)) {
    failures.push("JOB_AGENT_PROCESS must be web, worker, migrate, backup, or all.");
  }
  const databaseUrls = {
    runtime: process.env.DATABASE_URL || "",
    migration: process.env.MIGRATION_DATABASE_URL || "",
    queue: process.env.JOB_QUEUE_DATABASE_URL || "",
    backup: process.env.BACKUP_DATABASE_URL || ""
  };
  const requiredDatabases = processType === "web"
    ? ["runtime"]
    : processType === "worker"
      ? ["runtime", "queue"]
      : processType === "migrate"
        ? ["runtime", "migration"]
        : processType === "backup"
          ? ["backup"]
          : ["runtime", "migration", "queue", "backup"];
  for (const name of requiredDatabases) {
    const value = databaseUrls[name];
    if (!/^postgres(?:ql)?:\/\//.test(value)) failures.push(`${name} database URL must be a PostgreSQL URL.`);
  }
  try {
    const roles = requiredDatabases.map((name) => decodeURIComponent(new URL(databaseUrls[name]).username));
    if (roles.some((role) => !role)) failures.push("Every required database URL must identify a role.");
    if (new Set(roles).size !== roles.length) {
      failures.push("Database roles assigned to this process must be distinct.");
    }
  } catch {
    failures.push("Required database URLs could not be parsed.");
  }
  if (["web", "worker", "all"].includes(processType)) {
    try {
      const origin = new URL(process.env.APP_ORIGIN || "");
      if (origin.protocol !== "https:" || origin.origin !== process.env.APP_ORIGIN) {
        failures.push("APP_ORIGIN must be a canonical HTTPS origin without a path.");
      }
    } catch {
      failures.push("APP_ORIGIN must be a valid HTTPS origin.");
    }
    for (const candidate of String(process.env.APP_ALLOWED_ORIGINS || "").split(",").filter(Boolean)) {
      try {
        const origin = new URL(candidate.trim());
        if (origin.protocol !== "https:" || origin.origin !== candidate.trim() || candidate.includes("*")) {
          failures.push("APP_ALLOWED_ORIGINS must contain canonical HTTPS origins without wildcards.");
        }
      } catch {
        failures.push("APP_ALLOWED_ORIGINS contains an invalid origin.");
      }
    }
  }
  if (process.env.AUTO_MIGRATE === "true") failures.push("AUTO_MIGRATE must be disabled for runtime services.");
  if (processType !== "migrate") {
    if (process.env.OBJECT_STORAGE_DRIVER !== "s3") failures.push("OBJECT_STORAGE_DRIVER must equal s3.");
    if (!(process.env.OBJECT_STORAGE_BUCKET || "").trim()) failures.push("OBJECT_STORAGE_BUCKET is required.");
    if (!(process.env.OBJECT_STORAGE_REGION || "").trim()) failures.push("OBJECT_STORAGE_REGION is required.");
    if (!(process.env.AWS_ACCESS_KEY_ID || "").trim()) failures.push("AWS_ACCESS_KEY_ID is required.");
    if (!(process.env.AWS_SECRET_ACCESS_KEY || "").trim()) failures.push("AWS_SECRET_ACCESS_KEY is required.");
    if (process.env.OBJECT_STORAGE_ENDPOINT && !/^https:\/\//.test(process.env.OBJECT_STORAGE_ENDPOINT)) failures.push("OBJECT_STORAGE_ENDPOINT must use HTTPS.");
    if (process.env.OBJECT_STORAGE_SSE === "aws:kms" && !(process.env.OBJECT_STORAGE_KMS_KEY_ID || "").trim()) failures.push("OBJECT_STORAGE_KMS_KEY_ID is required for KMS encryption.");
    if (process.env.ALLOW_LOCAL_OBJECT_STORAGE === "true") failures.push("ALLOW_LOCAL_OBJECT_STORAGE cannot be enabled in production.");
    if (["web", "worker", "all"].includes(processType)) {
      if (!(process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim()) failures.push("GMAIL_CLIENT_ID or GOOGLE_CLIENT_ID is required.");
      if (!(process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "").trim()) failures.push("GMAIL_CLIENT_SECRET or GOOGLE_CLIENT_SECRET is required.");
      if (!(process.env.TRANSACTIONAL_EMAIL_FROM || "").includes("@")) failures.push("TRANSACTIONAL_EMAIL_FROM is required.");
      const resendConfigured = (process.env.RESEND_API_KEY || "").startsWith("re_");
      const gatewayUrl = process.env.JOBAGENT_EMAIL_GATEWAY_URL || "";
      const billingGatewayUrl = process.env.JOBAGENT_BILLING_GATEWAY_URL || "";
      const billingSecret = process.env.JOBAGENT_BILLING_SHARED_SECRET || "";
      const gatewayConfigured = /^https:\/\//.test(gatewayUrl) && billingSecret.length >= 32;
      if (!resendConfigured && !gatewayConfigured) {
        failures.push("Resend or the authenticated JobAgent email gateway must be configured.");
      }
      if (resendConfigured) {
        if (!(process.env.RESEND_INBOUND_WEBHOOK_SECRET || "").startsWith("whsec_")) failures.push("RESEND_INBOUND_WEBHOOK_SECRET is required when Resend is enabled.");
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(process.env.INBOUND_EMAIL_DOMAIN || "")) failures.push("INBOUND_EMAIL_DOMAIN must be a valid domain when Resend is enabled.");
      }
      if (processType === "web" || processType === "all") {
        if (!/^https:\/\//.test(billingGatewayUrl)) failures.push("JOBAGENT_BILLING_GATEWAY_URL must use HTTPS.");
        if (billingSecret.length < 32) failures.push("JOBAGENT_BILLING_SHARED_SECRET must be at least 32 characters.");
        if (process.env.PUBLIC_SIGNUP_ENABLED !== "true") failures.push("PUBLIC_SIGNUP_ENABLED must be true for the revenue launch.");
        if (process.env.BILLING_CHECKOUT_ENABLED !== "true") failures.push("BILLING_CHECKOUT_ENABLED must be true for the revenue launch.");
        const signupCap = Number(process.env.PUBLIC_SIGNUP_CAP || "");
        if (!Number.isInteger(signupCap) || signupCap < 1 || signupCap > 10_000) {
          failures.push("PUBLIC_SIGNUP_CAP must be an integer between 1 and 10000.");
        }
      }
    }
  }

  if (["web", "worker", "all"].includes(processType)) {
    const activeKeyVersion = (process.env.OAUTH_TOKEN_ACTIVE_KEY_VERSION || "v1").trim();
    let oauthKeys = {};
    try {
      if (process.env.OAUTH_TOKEN_ENCRYPTION_KEYS) {
        oauthKeys = JSON.parse(process.env.OAUTH_TOKEN_ENCRYPTION_KEYS);
      } else if (process.env.OAUTH_TOKEN_ENCRYPTION_KEY) {
        oauthKeys = { [activeKeyVersion]: process.env.OAUTH_TOKEN_ENCRYPTION_KEY };
      }
    } catch {
      failures.push("OAUTH_TOKEN_ENCRYPTION_KEYS must be valid JSON.");
    }
    const activeKey = typeof oauthKeys === "object" && oauthKeys !== null
      ? oauthKeys[activeKeyVersion]
      : undefined;
    if (!activeKey) {
      failures.push(`OAuth encryption key version ${activeKeyVersion} is required.`);
    } else if (Buffer.from(activeKey, "base64").length !== 32) {
      failures.push(`OAuth encryption key version ${activeKeyVersion} must decode to 32 bytes.`);
    }
  }
  if (["backup", "all"].includes(processType)) {
    const backupKey = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY || "", "base64");
    if (backupKey.length !== 32) {
      failures.push("BACKUP_ENCRYPTION_KEY must decode to exactly 32 bytes.");
    }
  }
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
