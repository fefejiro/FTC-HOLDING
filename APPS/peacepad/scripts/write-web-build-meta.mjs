import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputDir = path.join(projectRoot, "client", "public", "_peacepad");
const outputFile = path.join(outputDir, "build-meta.json");

const deployedAt = new Date();
const timestampId = `ts-${deployedAt.getTime()}`;

const gitSha =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  "";

const webBuildId =
  process.env.WEB_BUILD_ID ||
  process.env.CF_PAGES_DEPLOYMENT_ID ||
  process.env.RAILWAY_DEPLOYMENT_ID ||
  gitSha ||
  timestampId;

const payload = {
  webBuildId,
  deployedAt: deployedAt.toISOString(),
  gitSha: gitSha || undefined,
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`[build-meta] Wrote ${outputFile}`);
console.log(`[build-meta] webBuildId=${webBuildId}`);
