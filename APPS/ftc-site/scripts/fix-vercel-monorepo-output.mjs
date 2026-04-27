import { cp, lstat, mkdir, rm, symlink } from "node:fs/promises";
import path from "node:path";

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
}

await ensureCompatibilityMirror();
