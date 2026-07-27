#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const PROJECTS = {
  "ftc-holding": {
    includes: ["APPS/peacepad/*"],
    excludes: [
      "APPS/peacepad/docs/*",
      "APPS/peacepad/ios-prep/*",
      "APPS/peacepad/*.md",
    ],
  },
  saywetin: {
    includes: ["APPS/saywetin/*"],
    excludes: [],
  },
  gardencleaners: {
    includes: ["APPS/ftc-site/*", "PACKAGES/*"],
    excludes: [],
  },
  "ftc-site-pages": {
    includes: ["APPS/ftc-site/*", "PACKAGES/*"],
    excludes: [],
  },
};

function normalizePath(value) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

export function matches(pattern, file) {
  const normalizedPattern = normalizePath(pattern);
  const normalizedFile = normalizePath(file);
  const expression = `^${escapeRegExp(normalizedPattern).replaceAll("*", ".*")}$`;
  return new RegExp(expression).test(normalizedFile);
}

export function evaluateChanges(project, changedFiles) {
  const config = PROJECTS[project];
  if (!config) {
    return { decision: "build", reason: "unknown-project", matchedFiles: [] };
  }

  const normalizedFiles = changedFiles.map(normalizePath);
  const eligibleFiles = normalizedFiles.filter(
    (file) => !config.excludes.some((pattern) => matches(pattern, file)),
  );
  const matchedFiles = eligibleFiles.filter((file) =>
    config.includes.some((pattern) => matches(pattern, file)),
  );

  return {
    decision: matchedFiles.length > 0 ? "build" : "skip",
    reason: matchedFiles.length > 0 ? "included-change" : "no-included-change",
    matchedFiles,
  };
}

function argValue(name) {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
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
      const files = output
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
      if (files.length > 0) return files;
    } catch {
      // Cloudflare shallow clones vary, so try the next safe diff strategy.
    }
  }

  return [];
}

export function main() {
  const project = argValue("--project") || process.env.CF_PAGES_PROJECT_NAME || "";
  const config = PROJECTS[project];

  if (!config) {
    console.log(
      `[cf-pages-ignore-build] Unknown project "${project || "(missing)"}"; proceeding with build.`,
    );
    return 1;
  }

  const changedFiles = changedFilesFromGit();
  if (changedFiles.length === 0) {
    console.log("[cf-pages-ignore-build] No changed files detected; proceeding with build.");
    return 1;
  }

  const result = evaluateChanges(project, changedFiles);
  if (result.decision === "skip") {
    console.log(`[cf-pages-ignore-build] Ignoring ${project}; no deployable changes.`);
    console.log(`[cf-pages-ignore-build] Includes: ${config.includes.join(", ")}`);
    if (config.excludes.length > 0) {
      console.log(`[cf-pages-ignore-build] Excludes: ${config.excludes.join(", ")}`);
    }
    return 0;
  }

  console.log(
    `[cf-pages-ignore-build] Proceeding with ${project}; matched ${result.matchedFiles.length} file(s).`,
  );
  for (const file of result.matchedFiles.slice(0, 20)) {
    console.log(`- ${file}`);
  }
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
