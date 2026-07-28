import crypto from "node:crypto";
import { PgBoss } from "pg-boss";
import type { QueueJobEnvelope, QueueOperation } from "./product_domain.js";

export const PRODUCT_QUEUE_NAMES: Record<QueueOperation, string> = {
  "gmail.sync": "jobagent-gmail-sync",
  "jobs.discover": "jobagent-jobs-discover",
  "jobs.score": "jobagent-jobs-score",
  "package.generate": "jobagent-package-generate",
  "recruiter.send_approved": "jobagent-recruiter-send-approved",
  "proof.reconcile": "jobagent-proof-reconcile",
  "digest.send": "jobagent-digest-send",
  "retention.cleanup": "jobagent-retention-cleanup"
};

const DEAD_LETTER_QUEUE = "jobagent-dead-letter";

export function productQueueConfig() {
  const connectionString = String(
    process.env.JOB_QUEUE_DATABASE_URL
    || (process.env.NODE_ENV !== "production" ? process.env.DATABASE_URL : "")
    || ""
  ).trim();
  if (!connectionString) throw new Error("JOB_QUEUE_DATABASE_URL is required for the product worker.");
  return {
    connectionString,
    schema: String(process.env.JOB_QUEUE_SCHEMA || "jobagent_queue").trim(),
    ssl: String(process.env.JOB_QUEUE_DATABASE_SSL ?? (process.env.NODE_ENV === "production" ? "true" : "false")) === "true"
  };
}

export function createProductQueue(): PgBoss {
  const config = productQueueConfig();
  return new PgBoss({
    connectionString: config.connectionString,
    schema: config.schema,
    application_name: "una-jobagent-worker",
    ssl: config.ssl
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
      : false,
    max: Number(process.env.JOB_QUEUE_POOL_MAX || 5),
    createSchema: false,
    migrate: true,
    schedule: true,
    supervise: true
  });
}

export function newQueueEnvelope(
  userId: string,
  operation: QueueOperation,
  idempotencyKey?: string
): QueueJobEnvelope {
  return {
    jobId: crypto.randomUUID(),
    userId,
    runId: crypto.randomUUID(),
    operation,
    idempotencyKey: idempotencyKey || crypto.randomUUID(),
    scheduledAt: new Date().toISOString(),
    attempt: 0
  };
}

export async function ensureProductQueues(queue: PgBoss): Promise<void> {
  await queue.createQueue(DEAD_LETTER_QUEUE, {
    retentionSeconds: 30 * 24 * 60 * 60
  });
  for (const name of Object.values(PRODUCT_QUEUE_NAMES)) {
    await queue.createQueue(name, {
      retryLimit: 5,
      retryDelay: 60,
      retryBackoff: true,
      retryDelayMax: 60 * 60,
      expireInSeconds: 30 * 60,
      retentionSeconds: 14 * 24 * 60 * 60,
      deadLetter: DEAD_LETTER_QUEUE
    });
  }
}

export async function enqueueProductJob(
  queue: PgBoss,
  envelope: QueueJobEnvelope
): Promise<string | null> {
  return queue.send(PRODUCT_QUEUE_NAMES[envelope.operation], envelope, {
    singletonKey: envelope.idempotencyKey,
    group: { id: `${envelope.userId}:${envelope.operation}` }
  });
}
