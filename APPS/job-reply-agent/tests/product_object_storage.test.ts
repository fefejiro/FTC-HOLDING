import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertResumeStorageOwnership,
  buildResumeStorageKey,
  LocalProductObjectStorage,
  objectStorageConfig,
  S3ProductObjectStorage
} from "../src/product_object_storage.js";

const roots: string[] = [];
const userId = "11111111-1111-4111-8111-111111111111";
const sha256 = "a".repeat(64);

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  delete process.env.OBJECT_STORAGE_DRIVER;
  delete process.env.ALLOW_LOCAL_OBJECT_STORAGE;
});

describe("private product object storage", () => {
  it("stores and deletes a tenant-owned resume outside PostgreSQL", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jobagent-objects-"));
    roots.push(root);
    const storage = new LocalProductObjectStorage(root);
    await expect(storage.assertReady()).resolves.toBeUndefined();
    const key = buildResumeStorageKey(userId, sha256);
    await storage.putObject({
      key,
      content: Buffer.from("%PDF-private"),
      mimeType: "application/pdf"
    });
    await expect(storage.getObject(key)).resolves.toEqual(Buffer.from("%PDF-private"));
    await expect(storage.signedDownloadUrl(key, "resume.pdf")).resolves.toBeNull();
    await storage.deleteObject(key);
    await expect(storage.getObject(key)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects cross-tenant and malformed object keys", () => {
    const key = buildResumeStorageKey(userId, sha256);
    expect(() => assertResumeStorageOwnership(userId, key)).not.toThrow();
    expect(() => assertResumeStorageOwnership("22222222-2222-4222-8222-222222222222", key))
      .toThrow(/does not belong/);
    expect(() => buildResumeStorageKey(userId, "../escape")).toThrow(/Invalid/);
  });

  it("fails closed when production is configured with filesystem storage", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.OBJECT_STORAGE_DRIVER = "local";
    try {
      expect(() => objectStorageConfig()).toThrow(/Production requires/);
      process.env.ALLOW_LOCAL_OBJECT_STORAGE = "true";
      expect(objectStorageConfig().driver).toBe("local");
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("requires an explicit KMS key when KMS encryption is selected", () => {
    expect(() => new S3ProductObjectStorage({
      driver: "s3",
      bucket: "private-resumes",
      region: "ca-central-1",
      serverSideEncryption: "aws:kms"
    })).toThrow(/KMS_KEY_ID/);
  });
});
