const isPages = Boolean(process.env.CF_PAGES || process.env.CF_PAGES_COMMIT_SHA);
const project = process.env.CF_PAGES_PROJECT_NAME || "unknown";

if (!isPages) {
  console.log("[postinstall] Skipping: not running on Cloudflare Pages.");
  process.exit(0);
}

console.log(`[postinstall] Cloudflare Pages detected for project ${project}.`);
console.log(
  "[postinstall] No build is triggered during postinstall. Pages projects must define an explicit build command for their app surface.",
);
