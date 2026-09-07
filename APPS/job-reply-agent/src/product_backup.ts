import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { pipeline } from "node:stream/promises";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import pg from "pg";

const BACKUP_MAGIC = Buffer.from("JOBAGENT-BACKUP-V1\n", "ascii");
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const BACKUP_PREFIX = "system/backups/";
const PENDING_PREFIX = `${BACKUP_PREFIX}pending/`;

function required(name: string): string {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function encryptionKey(): Buffer {
  const key = Buffer.from(required("BACKUP_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) {
    throw new Error("BACKUP_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return key;
}

function databaseEnvironment(connectionString: string): NodeJS.ProcessEnv {
  const url = new URL(connectionString);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) throw new Error("Backup database URL must identify a database.");
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: database,
    PGSSLMODE: url.hostname.endsWith(".railway.internal") ? "disable" : "require",
  };
}

function databaseUrlFor(connectionString: string, database: string): string {
  const url = new URL(connectionString);
  url.pathname = `/${database}`;
  return url.toString();
}

function poolFor(connectionString: string): pg.Pool {
  const url = new URL(connectionString);
  return new pg.Pool({
    connectionString,
    ssl: url.hostname.endsWith(".railway.internal")
      ? false
      : { rejectUnauthorized: false },
  });
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

async function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 8_000) stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with ${code}: ${stderr.trim()}`));
      }
    });
  });
}

async function sha256File(filename: string): Promise<string> {
  const hash = createHash("sha256");
  await pipeline(fs.createReadStream(filename), hash);
  return hash.digest("hex");
}

async function encryptFile(input: string, output: string, key: Buffer): Promise<void> {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  await fsp.writeFile(output, Buffer.concat([BACKUP_MAGIC, iv]), { mode: 0o600 });
  await pipeline(
    fs.createReadStream(input),
    cipher,
    fs.createWriteStream(output, { flags: "a", mode: 0o600 }),
  );
  await fsp.appendFile(output, cipher.getAuthTag());
}

async function decryptFile(input: string, output: string, key: Buffer): Promise<void> {
  const handle = await fsp.open(input, "r");
  try {
    const stat = await handle.stat();
    const minimumLength = BACKUP_MAGIC.length + IV_LENGTH + TAG_LENGTH + 1;
    if (stat.size < minimumLength) throw new Error("Encrypted backup is truncated.");

    const prefix = Buffer.alloc(BACKUP_MAGIC.length + IV_LENGTH);
    await handle.read(prefix, 0, prefix.length, 0);
    if (!prefix.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)) {
      throw new Error("Encrypted backup has an invalid format marker.");
    }

    const tag = Buffer.alloc(TAG_LENGTH);
    await handle.read(tag, 0, TAG_LENGTH, stat.size - TAG_LENGTH);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      prefix.subarray(BACKUP_MAGIC.length),
    );
    decipher.setAuthTag(tag);
    await pipeline(
      fs.createReadStream(input, {
        start: BACKUP_MAGIC.length + IV_LENGTH,
        end: stat.size - TAG_LENGTH - 1,
      }),
      decipher,
      fs.createWriteStream(output, { mode: 0o600 }),
    );
  } finally {
    await handle.close();
  }
}

async function publicTableCounts(
  database: pg.Pool | pg.PoolClient,
): Promise<Record<string, number>> {
  const tables = await database.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const counts: Record<string, number> = {};
  for (const { table_name: tableName } of tables.rows) {
    const result = await database.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM public.${quoteIdentifier(tableName)}`,
    );
    counts[tableName] = Number(result.rows[0]?.count || 0);
  }
  return counts;
}

function assertMatchingCounts(
  source: Record<string, number>,
  restored: Record<string, number>,
): void {
  const sourceTables = Object.keys(source);
  const restoredTables = Object.keys(restored);
  if (JSON.stringify(sourceTables) !== JSON.stringify(restoredTables)) {
    throw new Error("Restore drill produced a different public-table inventory.");
  }
  const mismatch = sourceTables.find((table) => source[table] !== restored[table]);
  if (mismatch) {
    throw new Error(
      `Restore drill count mismatch for ${mismatch}: ${source[mismatch]} != ${restored[mismatch]}.`,
    );
  }
}

function storageClient(): S3Client {
  return new S3Client({
    region: required("OBJECT_STORAGE_REGION"),
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
    forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === "true",
  });
}

async function uploadFile(
  client: S3Client,
  bucket: string,
  key: string,
  filename: string,
  metadata: Record<string, string>,
): Promise<void> {
  const stat = await fsp.stat(filename);
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fs.createReadStream(filename),
    ContentLength: stat.size,
    ContentType: "application/octet-stream",
    CacheControl: "private, no-store",
    Metadata: metadata,
  }));
}

async function downloadFile(
  client: S3Client,
  bucket: string,
  key: string,
  filename: string,
): Promise<void> {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error("Backup object download returned no body.");
  await pipeline(
    response.Body as NodeJS.ReadableStream,
    fs.createWriteStream(filename, { mode: 0o600 }),
  );
}

async function enforceRetention(
  client: S3Client,
  bucket: string,
  retentionDays: number,
): Promise<number> {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let removed = 0;
  let continuationToken: string | undefined;
  do {
    const result = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: BACKUP_PREFIX,
      ContinuationToken: continuationToken,
    }));
    for (const object of result.Contents || []) {
      if (
        object.Key
        && !object.Key.startsWith(PENDING_PREFIX)
        && object.LastModified
        && object.LastModified.getTime() < cutoff
      ) {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key }));
        removed += 1;
      }
    }
    continuationToken = result.IsTruncated
      ? result.NextContinuationToken
      : undefined;
  } while (continuationToken);
  return removed;
}

async function runBackup(): Promise<void> {
  const startedAt = new Date();
  const connectionString = required("BACKUP_DATABASE_URL");
  const key = encryptionKey();
  const bucket = required("OBJECT_STORAGE_BUCKET");
  const retentionDays = Math.min(
    Math.max(Number(process.env.BACKUP_RETENTION_DAYS || "30"), 1),
    30,
  );
  const timestamp = startedAt.toISOString().replace(/[:.]/g, "-");
  const backupName = `jobagent-${timestamp}.dump.enc`;
  const finalKey = `${BACKUP_PREFIX}${backupName}`;
  const pendingKey = `${PENDING_PREFIX}${backupName}`;
  const temporaryRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "jobagent-backup-"));
  const dumpPath = path.join(temporaryRoot, "jobagent.dump");
  const encryptedPath = path.join(temporaryRoot, backupName);
  const downloadedPath = path.join(temporaryRoot, `downloaded-${backupName}`);
  const restorePath = path.join(temporaryRoot, "restore.dump");
  const restoreDatabase = `jobagent_restore_${Date.now()}`;
  const adminPool = poolFor(databaseUrlFor(connectionString, "postgres"));
  const sourcePool = poolFor(connectionString);
  const client = storageClient();
  let restorePool: pg.Pool | undefined;
  let pendingUploaded = false;
  let restoreCreated = false;

  try {
    const snapshotClient = await sourcePool.connect();
    let sourceCounts: Record<string, number>;
    try {
      await snapshotClient.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
      const snapshotResult = await snapshotClient.query<{ snapshot: string }>(
        "SELECT pg_export_snapshot() AS snapshot",
      );
      const snapshot = snapshotResult.rows[0]?.snapshot;
      if (!snapshot) throw new Error("PostgreSQL did not return a backup snapshot.");
      await run("pg_dump", [
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--snapshot",
        snapshot,
        "--file",
        dumpPath,
      ], databaseEnvironment(connectionString));
      sourceCounts = await publicTableCounts(snapshotClient);
      await snapshotClient.query("COMMIT");
    } catch (error) {
      await snapshotClient.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      snapshotClient.release();
    }
    const sourceHash = await sha256File(dumpPath);
    await encryptFile(dumpPath, encryptedPath, key);
    const encryptedHash = await sha256File(encryptedPath);
    await uploadFile(client, bucket, pendingKey, encryptedPath, {
      format: "jobagent-backup-v1",
      sha256: encryptedHash,
      createdat: startedAt.toISOString(),
      state: "pending-restore-drill",
    });
    pendingUploaded = true;
    await downloadFile(client, bucket, pendingKey, downloadedPath);
    if (await sha256File(downloadedPath) !== encryptedHash) {
      throw new Error("Downloaded encrypted backup failed its SHA-256 check.");
    }
    await decryptFile(downloadedPath, restorePath, key);
    if (await sha256File(restorePath) !== sourceHash) {
      throw new Error("Decrypted backup failed its SHA-256 check.");
    }

    await adminPool.query(`CREATE DATABASE ${quoteIdentifier(restoreDatabase)} TEMPLATE template0`);
    restoreCreated = true;
    const restoreUrl = databaseUrlFor(connectionString, restoreDatabase);
    await run("pg_restore", [
      "--exit-on-error",
      "--no-owner",
      "--no-privileges",
      "--dbname",
      restoreDatabase,
      restorePath,
    ], databaseEnvironment(restoreUrl));
    restorePool = poolFor(restoreUrl);
    const restoredCounts = await publicTableCounts(restorePool);
    assertMatchingCounts(sourceCounts, restoredCounts);

    await uploadFile(client, bucket, finalKey, encryptedPath, {
      format: "jobagent-backup-v1",
      sha256: encryptedHash,
      createdat: startedAt.toISOString(),
      state: "restore-verified",
      tablecount: String(Object.keys(sourceCounts).length),
    });
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: pendingKey }));
    pendingUploaded = false;
    const removed = await enforceRetention(client, bucket, retentionDays);
    console.log(JSON.stringify({
      event: "jobagent_backup_verified",
      key: finalKey,
      sha256: encryptedHash,
      tables: Object.keys(sourceCounts).length,
      retentionDays,
      expiredObjectsRemoved: removed,
      durationMs: Date.now() - startedAt.getTime(),
    }));
  } finally {
    if (restorePool) await restorePool.end();
    if (restoreCreated) {
      await adminPool.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1",
        [restoreDatabase],
      );
      await adminPool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(restoreDatabase)}`);
    }
    if (pendingUploaded) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: pendingKey }));
    }
    await sourcePool.end();
    await adminPool.end();
    key.fill(0);
    await fsp.rm(temporaryRoot, { recursive: true, force: true });
  }
}

await runBackup();
