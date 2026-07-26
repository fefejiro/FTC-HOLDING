import fs from "fs/promises";
import path from "path";

function extractUploadPath(value: string): string | null {
  let pathname = value.trim();
  if (!pathname) {
    return null;
  }

  try {
    if (/^https?:\/\//i.test(pathname)) {
      const parsed = new URL(pathname);
      const hostname = parsed.hostname.toLowerCase();
      if (hostname !== "peacepad.ca" && !hostname.endsWith(".peacepad.ca")) {
        return null;
      }
      pathname = parsed.pathname;
    }
  } catch {
    return null;
  }

  if (!pathname.startsWith("/uploads/")) {
    return null;
  }

  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

export function collectUserOwnedUploadPaths(value: unknown): string[] {
  const found = new Set<string>();
  const seen = new Set<object>();

  const visit = (candidate: unknown) => {
    if (typeof candidate === "string") {
      const uploadPath = extractUploadPath(candidate);
      if (uploadPath) {
        found.add(uploadPath);
      }
      return;
    }

    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) {
      return;
    }
    seen.add(candidate);

    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }

    Object.values(candidate as Record<string, unknown>).forEach(visit);
  };

  visit(value);
  return Array.from(found).sort();
}

type QuarantinedUploadEntry = {
  originalPath: string;
  quarantinePath: string;
};

export type QuarantinedUploadBatch = {
  quarantineRoot: string | null;
  entries: QuarantinedUploadEntry[];
};

type QuarantineManifest = {
  version: 1;
  accountId: string;
  createdAt: string;
  entries: Array<{
    originalRelativePath: string;
    quarantineName: string;
  }>;
};

const QUARANTINE_DIRECTORY = ".peacepad-deletion-quarantine";
const QUARANTINE_MANIFEST = "manifest.json";

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await fs.lstat(candidate);
    return true;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function writeManifest(
  quarantineRoot: string,
  manifest: QuarantineManifest,
): Promise<void> {
  const finalPath = path.join(quarantineRoot, QUARANTINE_MANIFEST);
  const temporaryPath = `${finalPath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(manifest), {
    encoding: "utf8",
    mode: 0o600,
  });
  await fs.rename(temporaryPath, finalPath);
}

async function resolveOwnedUploadTargets(
  uploadPaths: string[],
  uploadsRoot: string,
): Promise<{ canonicalRoot: string; targets: string[] }> {
  const resolvedRoot = path.resolve(uploadsRoot);
  let canonicalRoot: string;

  try {
    canonicalRoot = await fs.realpath(resolvedRoot);
  } catch (error: any) {
    if (error?.code === "ENOENT" && uploadPaths.length === 0) {
      return { canonicalRoot: resolvedRoot, targets: [] };
    }
    throw new Error("The upload directory could not be verified.");
  }

  const targets: string[] = [];
  for (const uploadPath of uploadPaths) {
    if (!uploadPath.startsWith("/uploads/")) {
      throw new Error("An owned upload reference was not a local PeacePad upload.");
    }

    const relativePath = uploadPath.replace(/^\/uploads\//, "");
    const target = path.resolve(canonicalRoot, relativePath);
    const lexicalRelative = path.relative(canonicalRoot, target);
    const isLexicallyWithinRoot =
      lexicalRelative.length > 0 &&
      !lexicalRelative.startsWith(`..${path.sep}`) &&
      lexicalRelative !== ".." &&
      !path.isAbsolute(lexicalRelative);
    if (!isLexicallyWithinRoot) {
      throw new Error("An owned upload reference escaped the upload directory.");
    }

    try {
      const linkStat = await fs.lstat(target);
      if (linkStat.isSymbolicLink() || !linkStat.isFile()) {
        throw new Error("An owned upload reference was not a regular file.");
      }

      const realTarget = await fs.realpath(target);
      const realRelative = path.relative(canonicalRoot, realTarget);
      const isReallyWithinRoot =
        realRelative.length > 0 &&
        !realRelative.startsWith(`..${path.sep}`) &&
        realRelative !== ".." &&
        !path.isAbsolute(realRelative);
      if (!isReallyWithinRoot) {
        throw new Error("An owned upload resolved outside the upload directory.");
      }

      targets.push(target);
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        // A missing file is already deleted and needs no further cleanup.
        continue;
      }
      throw error;
    }
  }

  return { canonicalRoot, targets: Array.from(new Set(targets)).sort() };
}

export async function quarantineUserOwnedUploadFiles(
  uploadPaths: string[],
  uploadsRoot = path.resolve(process.cwd(), "uploads"),
  accountId = "unknown-account",
): Promise<QuarantinedUploadBatch> {
  const { canonicalRoot, targets } = await resolveOwnedUploadTargets(uploadPaths, uploadsRoot);
  if (targets.length === 0) {
    return { quarantineRoot: null, entries: [] };
  }

  const quarantineBase = path.join(canonicalRoot, QUARANTINE_DIRECTORY);
  await fs.mkdir(quarantineBase, { recursive: true });
  const quarantineRoot = await fs.mkdtemp(path.join(quarantineBase, "account-"));
  const entries: QuarantinedUploadEntry[] = targets.map((originalPath, index) => ({
    originalPath,
    quarantinePath: path.join(quarantineRoot, `file-${index}`),
  }));
  const manifest: QuarantineManifest = {
    version: 1,
    accountId,
    createdAt: new Date().toISOString(),
    entries: entries.map((entry) => ({
      originalRelativePath: path.relative(canonicalRoot, entry.originalPath),
      quarantineName: path.basename(entry.quarantinePath),
    })),
  };

  try {
    // Persist the complete recovery plan before the first file move. Startup
    // reconciliation can then restore files while the account exists, or
    // finish deletion after the account has become a tombstone.
    await writeManifest(quarantineRoot, manifest);
    for (const entry of entries) {
      await fs.rename(entry.originalPath, entry.quarantinePath);
    }
  } catch (error) {
    await restoreQuarantinedUploadFiles({ quarantineRoot, entries }).catch(() => undefined);
    throw error;
  }

  return { quarantineRoot, entries };
}

export async function restoreQuarantinedUploadFiles(
  batch: QuarantinedUploadBatch,
): Promise<void> {
  for (const entry of [...batch.entries].reverse()) {
    if (await pathExists(entry.quarantinePath)) {
      await fs.mkdir(path.dirname(entry.originalPath), { recursive: true });
      if (await pathExists(entry.originalPath)) {
        throw new Error("Cannot restore a quarantined upload over an existing file.");
      }
      await fs.rename(entry.quarantinePath, entry.originalPath);
    }
  }
  if (batch.quarantineRoot) {
    await fs.rm(batch.quarantineRoot, { recursive: true, force: true });
  }
}

export async function commitQuarantinedUploadDeletion(
  batch: QuarantinedUploadBatch,
): Promise<number> {
  if (!batch.quarantineRoot) {
    return 0;
  }
  await fs.rm(batch.quarantineRoot, { recursive: true, force: false });
  return batch.entries.length;
}

export async function reconcileQuarantinedUploadFiles(
  isAccountActive: (accountId: string) => Promise<boolean>,
  uploadsRoot = path.resolve(process.cwd(), "uploads"),
): Promise<{ restored: number; deleted: number; skipped: number }> {
  const quarantineBase = path.join(path.resolve(uploadsRoot), QUARANTINE_DIRECTORY);
  let directories;
  try {
    directories = await fs.readdir(quarantineBase, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return { restored: 0, deleted: 0, skipped: 0 };
    }
    throw error;
  }

  let restored = 0;
  let deleted = 0;
  let skipped = 0;
  const canonicalRoot = await fs.realpath(path.resolve(uploadsRoot));

  for (const directory of directories) {
    if (!directory.isDirectory() || !directory.name.startsWith("account-")) {
      continue;
    }
    const quarantineRoot = path.join(quarantineBase, directory.name);
    try {
      const rawManifest = await fs.readFile(
        path.join(quarantineRoot, QUARANTINE_MANIFEST),
        "utf8",
      );
      const manifest = JSON.parse(rawManifest) as QuarantineManifest;
      if (
        manifest.version !== 1 ||
        typeof manifest.accountId !== "string" ||
        !Array.isArray(manifest.entries)
      ) {
        throw new Error("Invalid deletion quarantine manifest");
      }

      const entries: QuarantinedUploadEntry[] = manifest.entries.map((entry) => {
        const originalPath = path.resolve(canonicalRoot, entry.originalRelativePath);
        const relative = path.relative(canonicalRoot, originalPath);
        if (
          !relative ||
          relative === ".." ||
          relative.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relative) ||
          path.basename(entry.quarantineName) !== entry.quarantineName
        ) {
          throw new Error("Unsafe deletion quarantine manifest");
        }
        return {
          originalPath,
          quarantinePath: path.join(quarantineRoot, entry.quarantineName),
        };
      });

      if (await isAccountActive(manifest.accountId)) {
        await restoreQuarantinedUploadFiles({ quarantineRoot, entries });
        restored += entries.length;
      } else {
        await fs.rm(quarantineRoot, { recursive: true, force: false });
        deleted += entries.length;
      }
    } catch {
      // Fail closed. Unknown or malformed quarantine data is never silently
      // deleted, and cannot be served from a public upload route.
      skipped += 1;
    }
  }

  return { restored, deleted, skipped };
}

export async function deleteUserOwnedUploadFiles(
  uploadPaths: string[],
  uploadsRoot = path.resolve(process.cwd(), "uploads"),
): Promise<{ deleted: number; skipped: number }> {
  let canonicalRoot: string;
  try {
    canonicalRoot = await fs.realpath(path.resolve(uploadsRoot));
  } catch {
    return { deleted: 0, skipped: uploadPaths.length };
  }

  let deleted = 0;
  let skipped = 0;

  for (const uploadPath of uploadPaths) {
    const relativePath = uploadPath.replace(/^\/uploads\//, "");
    const target = path.resolve(canonicalRoot, relativePath);
    const lexicalRelative = path.relative(canonicalRoot, target);
    const isLexicallyWithinRoot =
      lexicalRelative.length > 0 &&
      !lexicalRelative.startsWith(`..${path.sep}`) &&
      lexicalRelative !== ".." &&
      !path.isAbsolute(lexicalRelative);

    if (!isLexicallyWithinRoot) {
      skipped += 1;
      continue;
    }

    try {
      // Resolve links before unlinking so an in-root symlink or junction cannot
      // make account deletion remove a file outside the upload directory.
      const realTarget = await fs.realpath(target);
      const realRelative = path.relative(canonicalRoot, realTarget);
      const isReallyWithinRoot =
        realRelative.length > 0 &&
        !realRelative.startsWith(`..${path.sep}`) &&
        realRelative !== ".." &&
        !path.isAbsolute(realRelative);
      if (!isReallyWithinRoot) {
        skipped += 1;
        continue;
      }

      await fs.unlink(target);
      deleted += 1;
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        continue;
      }
      skipped += 1;
    }
  }

  return { deleted, skipped };
}
