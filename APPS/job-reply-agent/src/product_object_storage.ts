import fs from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type ObjectStorageDriver = "local" | "s3";

export interface StoredObject {
  key: string;
  content: Buffer;
  mimeType: string;
  filename?: string;
}

export interface ProductObjectStorage {
  readonly driver: ObjectStorageDriver;
  assertReady(): Promise<void>;
  putObject(object: StoredObject): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  signedDownloadUrl(key: string, filename: string, expiresInSeconds?: number): Promise<string | null>;
}

export interface ObjectStorageConfig {
  driver: ObjectStorageDriver;
  localRoot?: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  serverSideEncryption?: "AES256" | "aws:kms";
  kmsKeyId?: string;
}

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;
const STORAGE_KEY = /^users\/([0-9a-f-]{36})\/resumes\/([a-f0-9]{64})$/i;
const PRIVATE_STORAGE_KEY = /^users\/([0-9a-f-]{36})\/(resumes|proof)\/([a-f0-9]{64})$/i;

export function buildResumeStorageKey(userId: string, sha256: string): string {
  if (!USER_ID.test(userId) || !SHA256.test(sha256)) throw new Error("Invalid resume storage identity.");
  return `users/${userId.toLowerCase()}/resumes/${sha256}`;
}

export function assertResumeStorageOwnership(userId: string, key: string): void {
  const match = STORAGE_KEY.exec(key);
  if (!match || match[1].toLowerCase() !== userId.toLowerCase()) {
    throw new Error("Resume object does not belong to the authenticated user.");
  }
}

export function buildProofStorageKey(userId: string, sha256: string): string {
  if (!USER_ID.test(userId) || !SHA256.test(sha256)) throw new Error("Invalid proof storage identity.");
  return `users/${userId.toLowerCase()}/proof/${sha256}`;
}

export function assertPrivateStorageOwnership(userId: string, key: string): void {
  const match = PRIVATE_STORAGE_KEY.exec(key);
  if (!match || match[1].toLowerCase() !== userId.toLowerCase()) {
    throw new Error("Private object does not belong to the authenticated user.");
  }
}

function safeLocalPath(root: string, key: string): string {
  if (!PRIVATE_STORAGE_KEY.test(key)) throw new Error("Invalid private object key.");
  const absoluteRoot = path.resolve(root);
  const target = path.resolve(absoluteRoot, ...key.split("/"));
  if (target !== absoluteRoot && !target.startsWith(`${absoluteRoot}${path.sep}`)) {
    throw new Error("Private object path escaped its storage root.");
  }
  return target;
}

function assertValidStorageKey(key: string): void {
  if (!PRIVATE_STORAGE_KEY.test(key)) throw new Error("Invalid private object key.");
}

export class LocalProductObjectStorage implements ProductObjectStorage {
  readonly driver = "local" as const;

  constructor(private readonly root: string) {
    if (!root.trim()) throw new Error("OBJECT_STORAGE_LOCAL_ROOT is required for local object storage.");
  }

  async putObject(object: StoredObject): Promise<void> {
    const target = safeLocalPath(this.root, object.key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(temporary, object.content, { mode: 0o600 });
    await fs.rename(temporary, target);
  }

  async assertReady(): Promise<void> {
    await fs.mkdir(path.resolve(this.root), { recursive: true });
    await fs.access(path.resolve(this.root));
  }

  async getObject(key: string): Promise<Buffer> {
    return fs.readFile(safeLocalPath(this.root, key));
  }

  async deleteObject(key: string): Promise<void> {
    await fs.rm(safeLocalPath(this.root, key), { force: true });
  }

  async signedDownloadUrl(): Promise<null> {
    return null;
  }
}

export class S3ProductObjectStorage implements ProductObjectStorage {
  readonly driver = "s3" as const;
  private readonly client: S3Client;

  constructor(private readonly config: ObjectStorageConfig) {
    if (!config.bucket || !config.region) {
      throw new Error("OBJECT_STORAGE_BUCKET and OBJECT_STORAGE_REGION are required for S3 storage.");
    }
    if (config.serverSideEncryption === "aws:kms" && !config.kmsKeyId) {
      throw new Error("OBJECT_STORAGE_KMS_KEY_ID is required when KMS encryption is enabled.");
    }
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle
    });
  }

  async putObject(object: StoredObject): Promise<void> {
    assertValidStorageKey(object.key);
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: object.key,
      Body: object.content,
      ContentType: object.mimeType,
      CacheControl: "private, no-store",
      Metadata: { sha256: object.key.split("/").at(-1) || "" },
      ...(this.config.serverSideEncryption
        ? {
            ServerSideEncryption: this.config.serverSideEncryption,
            SSEKMSKeyId: this.config.serverSideEncryption === "aws:kms"
              ? this.config.kmsKeyId
              : undefined
          }
        : {})
    }));
  }

  async assertReady(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
  }

  async getObject(key: string): Promise<Buffer> {
    assertValidStorageKey(key);
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key
    }));
    if (!response.Body) throw new Error("Private object response had no body.");
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async deleteObject(key: string): Promise<void> {
    assertValidStorageKey(key);
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key
    }));
  }

  async signedDownloadUrl(key: string, filename: string, expiresInSeconds = 300): Promise<string> {
    assertValidStorageKey(key);
    const safeFilename = filename.replace(/["\r\n]/g, "_");
    return getSignedUrl(this.client, new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${safeFilename}"`
    }), { expiresIn: Math.min(Math.max(expiresInSeconds, 30), 900) });
  }
}

export function objectStorageConfig(): ObjectStorageConfig {
  const driver = String(process.env.OBJECT_STORAGE_DRIVER || "local").trim().toLowerCase();
  const encryption = String(process.env.OBJECT_STORAGE_SSE || "AES256").trim().toLowerCase();
  if (driver !== "local" && driver !== "s3") throw new Error("OBJECT_STORAGE_DRIVER must be local or s3.");
  if (!["none", "aes256", "aws:kms"].includes(encryption)) {
    throw new Error("OBJECT_STORAGE_SSE must be none, AES256, or aws:kms.");
  }
  if (process.env.NODE_ENV === "production" && driver !== "s3" && process.env.ALLOW_LOCAL_OBJECT_STORAGE !== "true") {
    throw new Error("Production requires private S3-compatible object storage.");
  }
  return {
    driver,
    localRoot: process.env.OBJECT_STORAGE_LOCAL_ROOT,
    bucket: process.env.OBJECT_STORAGE_BUCKET,
    region: process.env.OBJECT_STORAGE_REGION,
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
    forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === "true",
    serverSideEncryption: encryption === "none"
      ? undefined
      : encryption === "aws:kms" ? "aws:kms" : "AES256",
    kmsKeyId: process.env.OBJECT_STORAGE_KMS_KEY_ID
  };
}

export function createProductObjectStorage(config = objectStorageConfig()): ProductObjectStorage {
  if (config.driver === "s3") return new S3ProductObjectStorage(config);
  return new LocalProductObjectStorage(config.localRoot || path.resolve(".local", "product-objects"));
}
