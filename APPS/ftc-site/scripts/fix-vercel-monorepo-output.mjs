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
    for (const entry of ["images", "brand", "media", "connect", "favicon.ico", "logo.png"]) {
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

  // Copy every prerendered .html from .next/server/app into the static output
  // so static deploys serve routes like /garden-cleaners directly.
  const serverAppDir = path.join(nextDir, "server", "app");
  if (await pathExists(serverAppDir)) {
    const count = await copyPrerenderedHtml(serverAppDir, vercelOutputStaticDir);
    console.log(`[build-fix] Copied ${count} prerendered HTML files into .vercel/output/static.`);
  }
}

await ensureCompatibilityMirror();
