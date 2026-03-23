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
    return;
  } catch (error) {
    console.warn(
      `[build-fix] Junction creation failed, falling back to copy: ${
        error instanceof Error ? error.message : "unknown"
      }`
    );
  }

  await cp(nextDir, compatNextDir, { recursive: true, force: true });
  console.log("[build-fix] Copied .next into compatibility path for monorepo Pages/Vercel builds.");
}

await ensureCompatibilityMirror();
