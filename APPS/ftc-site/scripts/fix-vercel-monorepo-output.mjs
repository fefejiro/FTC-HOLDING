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
  const compatRoot = path.join(projectRoot, "APPS", "ftc-site");
  const compatNextDir = path.join(compatRoot, ".next");
  const vercelOutputStaticDir = path.join(projectRoot, ".vercel", "output", "static");

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
    if (await pathExists(vercelOutputStaticDir)) {
      await rm(vercelOutputStaticDir, { recursive: true, force: true });
    }
    await cp(nextStaticDir, vercelOutputStaticDir, { recursive: true });
    console.log("[build-fix] Copied .next/static to .vercel/output/static for Cloudflare Pages.");
  }
}

await ensureCompatibilityMirror();
