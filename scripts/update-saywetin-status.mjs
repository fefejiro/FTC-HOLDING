import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const statusDocPath = path.join(root, "DOCS", "SAYWETIN_STATUS.md");
const metricsDocPath = path.join(root, "DOCS", "SAYWETIN_TEST_VELOCITY.md");
const masterDocPath = path.join(root, "FTC_MASTER.md");

const WEB_ORIGIN = String(process.env.SAYWETIN_SMOKE_WEB || "https://saywetin.app").trim().replace(/\/$/, "");
const API_ORIGIN = String(process.env.SAYWETIN_SMOKE_API || "https://api.saywetin.app").trim().replace(/\/$/, "");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function replaceBetweenMarkers(text, startMarker, endMarker, replacement) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Markers not found or malformed: ${startMarker} ... ${endMarker}`);
  }

  const before = text.slice(0, start + startMarker.length);
  const after = text.slice(end);
  return `${before}\n${replacement}\n${after}`;
}

function ensureMasterSection(masterText, summaryBlock) {
  const title = "## SayWetin Ops Snapshot (Auto)";
  const startMarker = "<!-- AUTO:SAYWETIN_MASTER:START -->";
  const endMarker = "<!-- AUTO:SAYWETIN_MASTER:END -->";

  if (!masterText.includes(title)) {
    const anchor = "\n---\n\n## Quick Commands";
    const block = `\n${title}\n\n${startMarker}\n${summaryBlock}\n${endMarker}\n`;
    if (masterText.includes(anchor)) {
      return masterText.replace(anchor, `${block}${anchor}`);
    }
    return `${masterText.trimEnd()}\n\n${block}`;
  }

  const textWithMarkers = masterText.includes(startMarker) && masterText.includes(endMarker)
    ? masterText
    : masterText.replace(title, `${title}\n\n${startMarker}\n${endMarker}`);

  return replaceBetweenMarkers(textWithMarkers, startMarker, endMarker, summaryBlock);
}

async function runCheck(name, url, expectedStatus = [200]) {
  const response = await fetch(url, { method: "GET", redirect: "manual" });
  const ok = expectedStatus.includes(response.status);

  return {
    name,
    ok,
    detail: ok ? String(response.status) : `expected ${expectedStatus.join("/")} got ${response.status}`,
  };
}

function getTestFiles() {
  const files = [];
  const stack = [path.join(root, "APPS", "saywetin")];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) {
          continue;
        }
        stack.push(fullPath);
        continue;
      }

      if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function countTestsInFiles(files) {
  let count = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const matches = content.match(/\b(?:it|test)\s*\(/g);
    count += matches ? matches.length : 0;
  }
  return count;
}

function getCommitCountSince(days) {
  try {
    const result = execSync(`git rev-list --count --since="${days} days ago" HEAD -- APPS/saywetin`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return Number(result || 0);
  } catch {
    return 0;
  }
}

function getLastCommitForSayWetin() {
  try {
    return execSync('git log -1 --format="%h %cs %s" -- APPS/saywetin', {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "Unavailable";
  }
}

async function main() {
  const now = new Date().toISOString();

  const checks = [
    await runCheck("SayWetin web", `${WEB_ORIGIN}/`),
    await runCheck("SayWetin API health", `${API_ORIGIN}/health`),
    await runCheck("SayWetin API status", `${API_ORIGIN}/api/status`),
  ];

  const passed = checks.filter((check) => check.ok).length;
  const failed = checks.length - passed;

  const testFiles = getTestFiles();
  const testCases = countTestsInFiles(testFiles);

  const commits14d = getCommitCountSince(14);
  const commits30d = getCommitCountSince(30);
  const lastCommit = getLastCommitForSayWetin();

  const snapshotBlock = [
    `- Generated at: ${now}`,
    `- Web origin: ${WEB_ORIGIN}`,
    `- API origin: ${API_ORIGIN}`,
    `- Smoke status: ${passed}/${checks.length} checks passed`,
    `- Test suite status: ${testCases} tests across ${testFiles.length} files`,
    `- Velocity status: ${commits14d} commits (14d), ${commits30d} commits (30d)`,
  ].join("\n");

  const smokeTable = [
    "| Check | Result | Detail |",
    "|-------|--------|--------|",
    ...checks.map((check) => `| ${check.name} | ${check.ok ? "PASS" : "FAIL"} | ${check.detail} |`),
  ].join("\n");

  const testsBlock = [
    `- Test files: ${testFiles.length}`,
    `- Test cases: ${testCases}`,
    "- Command: npm --prefix APPS/saywetin run test",
  ].join("\n");

  const velocityBlock = [
    `- Commits (14d): ${commits14d}`,
    `- Commits (30d): ${commits30d}`,
    `- Last commit touching APPS/saywetin: ${lastCommit}`,
  ].join("\n");

  const metricsBlock = [
    `- Updated at: ${now}`,
    `- Test files: ${testFiles.length}`,
    `- Test cases: ${testCases}`,
    `- Commit velocity (14d): ${commits14d}`,
    `- Commit velocity (30d): ${commits30d}`,
    "- Canonical status source: DOCS/SAYWETIN_STATUS.md",
  ].join("\n");

  let statusDoc = readText(statusDocPath);
  statusDoc = replaceBetweenMarkers(statusDoc, "<!-- AUTO:SAYWETIN_SNAPSHOT:START -->", "<!-- AUTO:SAYWETIN_SNAPSHOT:END -->", snapshotBlock);
  statusDoc = replaceBetweenMarkers(statusDoc, "<!-- AUTO:SAYWETIN_SMOKE:START -->", "<!-- AUTO:SAYWETIN_SMOKE:END -->", smokeTable);
  statusDoc = replaceBetweenMarkers(statusDoc, "<!-- AUTO:SAYWETIN_TESTS:START -->", "<!-- AUTO:SAYWETIN_TESTS:END -->", testsBlock);
  statusDoc = replaceBetweenMarkers(statusDoc, "<!-- AUTO:SAYWETIN_VELOCITY:START -->", "<!-- AUTO:SAYWETIN_VELOCITY:END -->", velocityBlock);
  writeText(statusDocPath, statusDoc);

  let metricsDoc = readText(metricsDocPath);
  metricsDoc = replaceBetweenMarkers(metricsDoc, "<!-- AUTO:SAYWETIN_TEST_VELOCITY:START -->", "<!-- AUTO:SAYWETIN_TEST_VELOCITY:END -->", metricsBlock);
  writeText(metricsDocPath, metricsDoc);

  const masterSummary = [
    `- Updated at: ${now}`,
    `- Smoke checks: ${passed}/${checks.length} passing`,
    `- Test suite: ${testCases} tests across ${testFiles.length} files`,
    `- Velocity: ${commits14d} commits (14d), ${commits30d} commits (30d)`,
    "- Canonical status doc: DOCS/SAYWETIN_STATUS.md",
  ].join("\n");

  let masterDoc = readText(masterDocPath);
  masterDoc = ensureMasterSection(masterDoc, masterSummary);
  writeText(masterDocPath, masterDoc);

  console.log("SayWetin status documentation updated successfully.");
  console.log(`- Updated: DOCS/SAYWETIN_STATUS.md`);
  console.log(`- Updated: DOCS/SAYWETIN_TEST_VELOCITY.md`);
  console.log(`- Updated: FTC_MASTER.md`);
  console.log(`- Smoke: ${passed}/${checks.length} passed`);

  if (failed > 0) {
    console.warn("Warning: one or more SayWetin smoke checks failed. Review DOCS/SAYWETIN_STATUS.md for details.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
