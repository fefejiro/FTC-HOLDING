import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const DIST_DIR = resolve(process.cwd(), "dist");
const BLOCKED_TEXT = "REPLIT_DOMAINS not provided";

function walkFiles(rootDir) {
  const entries = readdirSync(rootDir);
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(rootDir, entry);
    const entryStats = statSync(fullPath);

    if (entryStats.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (entryStats.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function containsBlockedText(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    return content.includes(BLOCKED_TEXT);
  } catch {
    return false;
  }
}

const files = walkFiles(DIST_DIR);
const matched = files.filter((filePath) => containsBlockedText(filePath));

if (matched.length > 0) {
  console.error("[build] ERROR: stale REPLIT_DOMAINS hard-fail found in dist output");
  for (const filePath of matched) {
    console.error(` - ${filePath}`);
  }
  process.exit(1);
}

console.log("[build] PASS: dist output contains no stale REPLIT_DOMAINS hard-fail text.");
