import crypto from "node:crypto";
import fs from "fs/promises";
import path from "path";

export type PeacePadUploadCategory = "chat" | "profiles" | "receipts" | "recordings";

const UPLOAD_CATEGORIES: readonly PeacePadUploadCategory[] = [
  "chat",
  "profiles",
  "receipts",
  "recordings",
];

export function getUploadOwnerKey(userId: string): string {
  return crypto.createHash("sha256").update(`peacepad-upload-owner:${userId}`).digest("hex");
}

export function buildOwnerScopedUploadPath(
  category: PeacePadUploadCategory,
  userId: string,
  filename: string,
): string {
  if (
    filename.length === 0 ||
    filename.length > 255 ||
    filename === "." ||
    filename === ".." ||
    path.posix.basename(filename) !== filename ||
    path.win32.basename(filename) !== filename
  ) {
    throw new Error("Invalid upload filename");
  }
  return `/uploads/${category}/${getUploadOwnerKey(userId)}/${filename}`;
}

function extractPathname(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.split(/[?#]/, 1)[0] || null;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    let configuredHost = "";
    try {
      configuredHost = new URL(process.env.PUBLIC_BASE_URL || "").hostname.toLowerCase();
    } catch {
      configuredHost = "";
    }
    if (
      host !== "peacepad.ca" &&
      !host.endsWith(".peacepad.ca") &&
      (!configuredHost || host !== configuredHost)
    ) {
      return null;
    }
    return parsed.pathname;
  } catch {
    return null;
  }
}

export function isOwnerScopedUploadReference(
  category: PeacePadUploadCategory,
  userId: string,
  value: unknown,
): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const pathname = extractPathname(value);
  if (!pathname) {
    return false;
  }

  const prefix = `/uploads/${category}/${getUploadOwnerKey(userId)}/`;
  const filename = pathname.slice(prefix.length);
  return (
    pathname.startsWith(prefix) &&
    filename.length > 0 &&
    path.posix.basename(filename) === filename
  );
}

export async function listOwnerScopedUploadPaths(
  userId: string,
  uploadsRoot = path.resolve(process.cwd(), "uploads"),
): Promise<string[]> {
  const ownerKey = getUploadOwnerKey(userId);
  const ownedPaths: string[] = [];

  for (const category of UPLOAD_CATEGORIES) {
    const ownerDirectory = path.join(uploadsRoot, category, ownerKey);
    let entries;
    try {
      entries = await fs.readdir(ownerDirectory, { withFileTypes: true });
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        continue;
      }
      throw error;
    }

    for (const entry of entries) {
      if (!entry.isFile() || entry.isSymbolicLink()) {
        continue;
      }
      ownedPaths.push(`/uploads/${category}/${ownerKey}/${entry.name}`);
    }
  }

  return ownedPaths.sort();
}
