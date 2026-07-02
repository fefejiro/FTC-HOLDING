#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import process from "node:process";

const PROJECTS = {
  "ftc-holding": ["APPS/peacepad/*"],
  saywetin: ["APPS/saywetin/*"],
  gardencleaners: ["APPS/ftc-site/*", "PACKAGES/*"],
  "ftc-site-pages": ["APPS/ftc-site/*", "PACKAGES/*"],
};

function argValue(name) {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizePath(value) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function matches(pattern, file) {
  const normalizedPattern = normalizePath(pattern);
  const normalizedFile = normalizePath(file);
  if (normalizedPattern === "*") return true;
  if (normalizedPattern.endsWith("/*")) {
    return normalizedFile.startsWith(normalizedPattern.slice(0, -1));
  }
  if (normalizedPattern.startsWith("*.")) {
    return normalizedFile.endsWith(normalizedPattern.slice(1));
  }
  return normalizedFile === normalizedPattern;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function changedFilesFromEnv() {
  const raw = process.env.CF_GUARD_CHANGED_FILES || "";
  return raw
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function changedFilesFromGit() {
  const envFiles = changedFilesFromEnv();
  if (envFiles.length > 0) return envFiles;

  const head = process.env.CF_PAGES_COMMIT_SHA || "HEAD";
  const branch = process.env.CF_PAGES_BRANCH || "";
  const candidates = [];

  if (branch && branch !== "main") {
    candidates.push(["diff", "--name-only", `origin/main...${head}`]);
  }
  candidates.push(["diff", "--name-only", `${head}~1`, head]);
  candidates.push(["show", "--pretty=", "--name-only", head]);

  for (const args of candidates) {
    try {
      const output = git(args);
      const files = output.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      if (files.length > 0) return files;
    } catch {
      // Try the next diff strategy; Cloudflare shallow clones can vary.
    }
  }

  return [];
}

const project = argValue("--project") || process.env.CF_PAGES_PROJECT_NAME || "";
const includes = PROJECTS[project];

if (!includes) {
  console.log(`[cf-pages-ignore-build] Unknown project "${project || "(missing)"}"; proceeding with build.`);
  process.exit(1);
}

const changedFiles = changedFilesFromGit();
if (changedFiles.length === 0) {
  console.log("[cf-pages-ignore-build] No changed files detected; proceeding with build.");
  process.exit(1);
}

const relevantFiles = changedFiles.filter((file) => includes.some((pattern) => matches(pattern, file)));
if (relevantFiles.length === 0) {
  console.log(`[cf-pages-ignore-build] Ignoring ${project}; no matching changes.`);
  console.log(`[cf-pages-ignore-build] Includes: ${includes.join(", ")}`);
  process.exit(0);
}

console.log(`[cf-pages-ignore-build] Proceeding with ${project}; matched ${relevantFiles.length} file(s).`);
for (const file of relevantFiles.slice(0, 20)) {
  console.log(`- ${file}`);
}
process.exit(1);
