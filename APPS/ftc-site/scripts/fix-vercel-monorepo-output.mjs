import { cp, lstat, mkdir, readdir, rm, symlink } from "node:fs/promises";
import path from "node:path";

async function copyPrerenderedHtml(serverAppDir, staticOutDir) {
  // Walk .next/server/app and copy every prerendered .html file into the
  // static output preserving its relative path. This is what makes Cloudflare
  // Pages (static-only deploys) actually serve routes like /garden-cleaners.
  const stack = [serverAppDir];
  let copied = 0;
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!entry.name.endsWith(".html")) continue;
      const rel = path.relative(serverAppDir, abs);
      // Skip dynamic route HTML stubs (they live in [param] folders) — copy them anyway, they’re harmless.
      const dest = path.join(staticOutDir, rel);
      await mkdir(path.dirname(dest), { recursive: true });
      await cp(abs, dest, { force: true });
      copied += 1;
      // Also write an index.html alias inside a folder so /foo/ resolves.
      const baseName = entry.name.slice(0, -".html".length);
      if (baseName !== "index") {
        const aliasDir = path.join(staticOutDir, path.dirname(rel), baseName);
        await mkdir(aliasDir, { recursive: true });
        await cp(abs, path.join(aliasDir, "index.html"), { force: true });
      }
    }
  }
  return copied;
}

async function pathExists(target) {
  try {
    await lstat(target);
    return true;
  } catch {
    return false;
  }
}

function shouldCopyPagesWorker() {
  const explicitWorkerTarget = String(process.env.FTC_SITE_EDGE_WORKER || "").trim().toLowerCase();
  if (["garden", "garden-cleaners", "gardencleaners", "1", "true"].includes(explicitWorkerTarget)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(explicitWorkerTarget)) {
    return false;
  }
  // Add OG Trades Academy static build target support
  const explicitPagesTarget = String(process.env.FTC_SITE_PAGES_TARGET || "").trim().toLowerCase();
  if (["og-trades", "ogtrades", "og-trades-academy", "ogtradesacademy"].includes(explicitPagesTarget)) {
    return true;
  }

  const pagesUrl = String(process.env.CF_PAGES_URL || "").trim().toLowerCase();
  if (pagesUrl.includes("gardencleaners")) {
    return true;
  }
  if (pagesUrl.includes("ogtradesacademy")) {
    return true;
  }

  // Default to no worker for core ftc-site/unalabs deployments.
  return false;
}

async function ensureCompatibilityMirror() {
  const projectRoot = process.cwd();
  const nextDir = path.join(projectRoot, ".next");
  const publicDir = path.join(projectRoot, "public");
  const compatRoot = path.join(projectRoot, "APPS", "ftc-site");
  const compatNextDir = path.join(compatRoot, ".next");
  const vercelOutputStaticDir = path.join(projectRoot, ".vercel", "output", "static");
  const vercelOutputNextStaticDir = path.join(vercelOutputStaticDir, "_next", "static");

  if (!(await pathExists(nextDir))) {
    return;
  }

  await mkdir(compatRoot, { recursive: true });

  if (await pathExists(compatNextDir)) {
    await rm(compatNextDir, { recursive: true, force: true });
  }

  try {
    await symlink(nextDir, compatNextDir, "junction");
    console.log("[build-fix] Created .next compatibility junction for monorepo Pages/Vercel builds.");
  } catch (error) {
    console.warn(
      `[build-fix] Junction creation failed, falling back to copy: ${
        error instanceof Error ? error.message : "unknown"
      }`
    );
  }

  if (await pathExists(vercelOutputStaticDir)) {
    await rm(vercelOutputStaticDir, { recursive: true, force: true });
    console.log("[build-fix] Removed stale .vercel/output/static before packaging.");
  }

  // Copy .next/static to .vercel/output/static for Cloudflare Pages
  const nextStaticDir = path.join(nextDir, "static");
  if (await pathExists(nextStaticDir)) {
    await mkdir(path.join(projectRoot, ".vercel", "output"), { recursive: true });
    if (await pathExists(vercelOutputNextStaticDir)) {
      await rm(vercelOutputNextStaticDir, { recursive: true, force: true });
    }
    await mkdir(path.dirname(vercelOutputNextStaticDir), { recursive: true });
    await cp(nextStaticDir, vercelOutputNextStaticDir, { recursive: true });
    console.log("[build-fix] Copied .next/static to .vercel/output/static/_next/static for Cloudflare Pages.");
  }

  // Ensure public static assets (images, brand, media, etc.) exist in output root.
  if (await pathExists(publicDir)) {
    await mkdir(vercelOutputStaticDir, { recursive: true });
    for (const entry of ["images", "brand", "media", "connect", "favicon.ico", "logo.png", "sitemap.xml", "robots.txt"]) {
      const sourcePath = path.join(publicDir, entry);
      const destinationPath = path.join(vercelOutputStaticDir, entry);
      if (await pathExists(sourcePath)) {
        await cp(sourcePath, destinationPath, { recursive: true, force: true });
      }
    }
    console.log("[build-fix] Synced required public assets into .vercel/output/static.");
  }

  // Copy Cloudflare Pages control files if present.
  for (const controlFile of ["_redirects", "_headers"]) {
    const sourcePath = path.join(publicDir, controlFile);
    const destinationPath = path.join(vercelOutputStaticDir, controlFile);
    if (await pathExists(sourcePath)) {
      await cp(sourcePath, destinationPath, { force: true });
      console.log(`[build-fix] Copied public/${controlFile} to .vercel/output/static/${controlFile}.`);
    }
  }

  const workerSourcePath = path.join(publicDir, "_worker.js");
  const workerDestinationPath = path.join(vercelOutputStaticDir, "_worker.js");
  if (await pathExists(workerSourcePath)) {
    if (shouldCopyPagesWorker()) {
      await cp(workerSourcePath, workerDestinationPath, { force: true });
      console.log("[build-fix] Copied public/_worker.js to .vercel/output/static/_worker.js for brand Pages routing.");
    } else if (await pathExists(workerDestinationPath)) {
      await rm(workerDestinationPath, { force: true });
      console.log("[build-fix] Removed stale .vercel/output/static/_worker.js outside Garden Pages build.");
    }
  }

  // Copy every prerendered .html from .next/server/app into the static output
  // so static deploys serve routes like /garden-cleaners or /og-trades-academy directly.
  const serverAppDir = path.join(nextDir, "server", "app");
  let ogIndexCopied = false;
  if (await pathExists(serverAppDir)) {
    const count = await copyPrerenderedHtml(serverAppDir, vercelOutputStaticDir);
    console.log(`[build-fix] Copied ${count} prerendered HTML files into .vercel/output/static.`);

    // If OG build target, copy og-trades-academy/index.html to root index.html
    const pagesTarget = String(process.env.FTC_SITE_PAGES_TARGET || "").trim().toLowerCase();
    if (["og-trades", "ogtrades", "og-trades-academy", "ogtradesacademy"].includes(pagesTarget)) {
      const ogIndexPath = path.join(vercelOutputStaticDir, "og-trades-academy", "index.html");
      const rootIndexPath = path.join(vercelOutputStaticDir, "index.html");
      if (await pathExists(ogIndexPath)) {
        await cp(ogIndexPath, rootIndexPath, { force: true });
        ogIndexCopied = true;
        console.log("[build-fix] Copied og-trades-academy/index.html to root index.html for OG static output.");
      } else {
        console.error("[build-fix] ERROR: og-trades-academy/index.html does not exist. OG static output is incomplete.");
      }
    }
  }

  // Verify OG content at root index.html if OG build
  const pagesTarget = String(process.env.FTC_SITE_PAGES_TARGET || "").trim().toLowerCase();
  if (["og-trades", "ogtrades", "og-trades-academy", "ogtradesacademy"].includes(pagesTarget)) {
    const rootIndexPath = path.join(vercelOutputStaticDir, "index.html");
    if (await pathExists(rootIndexPath)) {
      const indexContent = await import('node:fs/promises').then(fs => fs.readFile(rootIndexPath, 'utf8'));
      if (!indexContent.includes("OG_Trades Academy") && !indexContent.includes("Founder-led forex")) {
        console.error("[build-fix] ERROR: Root index.html does not contain OG Trades Academy content. Build is invalid.");
      } else {
        console.log("[build-fix] Verified OG Trades Academy content at root index.html.");
      }
      if (indexContent.includes("Una Labs")) {
        console.error("[build-fix] ERROR: Root index.html contains Una Labs branding. Build is invalid for OG.");
      }
    }
  }
}

await ensureCompatibilityMirror();
