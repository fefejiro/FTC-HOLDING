import { spawnSync } from "node:child_process";

const isPages = Boolean(process.env.CF_PAGES || process.env.CF_PAGES_COMMIT_SHA);
const project = process.env.CF_PAGES_PROJECT_NAME;
const targetProjects = new Set(["saywetin-pages", "saywetin"]);

if (!isPages) {
  console.log("[postinstall] Skipping: not running on Cloudflare Pages.");
  process.exit(0);
}

if (!project || !targetProjects.has(project)) {
  console.log(`[postinstall] Skipping: CF_PAGES_PROJECT_NAME=${project || "unknown"}`);
  process.exit(0);
}

console.log(`[postinstall] Building Saywetin for project ${project}...`);
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCmd, ["--prefix", "APPS/saywetin", "run", "build"], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
