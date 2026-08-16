import { fileURLToPath } from "node:url";
import type { Job, PgBoss } from "pg-boss";
import { closeProductPool, getProductPool, withTenant } from "./product_db.js";
import type { QueueJobEnvelope, QueueOperation } from "./product_domain.js";
import {
  cleanupExpiredProductData,
  ensureConnectorCapabilities,
  getAutomationPolicy
} from "./product_public_beta_repository.js";
import { schedulerConnectorStatusSurface } from "./product_release_gates.js";
import {
  createProductQueue,
  enqueueProductJob,
  ensureProductQueues,
  newQueueEnvelope,
  PRODUCT_QUEUE_NAMES
} from "./product_queue.js";

function hourInTimeZone(timeZone: string): number {
  const value = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23"
  }).format(new Date());
  return Number(value);
}

export function inQuietHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

async function createAgentRun(
  userId: string,
  operation: QueueOperation,
  runId: string
): Promise<void> {
  await withTenant(userId, (client) => client.query(
    `INSERT INTO agent_runs
       (id, user_id, run_type, status, redacted_summary, started_at)
     VALUES ($1,$2,$3,'running','{}'::jsonb,now())
     ON CONFLICT (id) DO NOTHING`,
    [runId, userId, operation]
  ));
}

async function finishAgentRun(
  userId: string,
  runId: string,
  status: "completed" | "failed" | "cancelled",
  summary: Record<string, unknown>
): Promise<void> {
  await withTenant(userId, (client) => client.query(
    `UPDATE agent_runs
        SET status=$3, redacted_summary=$4::jsonb, completed_at=now()
      WHERE user_id=$1 AND id=$2`,
    [userId, runId, status, JSON.stringify(summary)]
  ));
}

async function accountStatus(userId: string): Promise<string | null> {
  const result = await getProductPool().query(
    "SELECT status FROM product_users WHERE id=$1 AND status <> 'deleted'",
    [userId]
  );
  return result.rows[0]?.status || null;
}

async function runSafeOperation(envelope: QueueJobEnvelope): Promise<Record<string, unknown>> {
  const db = getProductPool();
  if (envelope.operation === "retention.cleanup") {
    return { outcome: "completed", ...(await cleanupExpiredProductData(db)) };
  }
  const connectors = await ensureConnectorCapabilities(db, envelope.userId);
  const source = envelope.operation === "gmail.sync" || envelope.operation === "recruiter.send_approved"
    ? connectors.find((item) => item.source === "gmail")
    : null;
  const schedulerStatus = source ? schedulerConnectorStatusSurface(source.status) : null;
  if (schedulerStatus && !schedulerStatus.schedulerEligible) {
    return { outcome: "paused", reason: schedulerStatus.schedulerGate, ...schedulerStatus };
  }
  if (envelope.operation === "recruiter.send_approved") {
    const policy = await getAutomationPolicy(db, envelope.userId);
    if (!policy.recruiterSends) {
      return { outcome: "paused", reason: "recruiter_sends_not_authorized" };
    }
  }
  return {
    outcome: "shadow_ready",
    reason: "external_action_requires_certified_connector_handler",
    ...(schedulerStatus || {})
  };
}

async function handleEnvelope(envelope: QueueJobEnvelope): Promise<Record<string, unknown>> {
  if (!envelope?.userId || !envelope?.runId || !envelope?.operation) {
    throw new Error("Queue envelope is incomplete.");
  }
  const status = await accountStatus(envelope.userId);
  if (!status || status === "paused") {
    return { outcome: "cancelled", reason: status ? "account_paused" : "account_missing" };
  }
  const policy = await getAutomationPolicy(getProductPool(), envelope.userId);
  const currentHour = hourInTimeZone(policy.timeZone);
  if (envelope.operation !== "retention.cleanup"
      && inQuietHours(currentHour, policy.quietHoursStart, policy.quietHoursEnd)) {
    return { outcome: "deferred", reason: "quiet_hours" };
  }
  await createAgentRun(envelope.userId, envelope.operation, envelope.runId);
  try {
    const summary = await runSafeOperation(envelope);
    await finishAgentRun(envelope.userId, envelope.runId, "completed", summary);
    return summary;
  } catch (error) {
    await finishAgentRun(envelope.userId, envelope.runId, "failed", {
      outcome: "failed",
      errorClass: error instanceof Error ? error.name : "UnknownError"
    });
    throw error;
  }
}

async function registerWorkers(queue: PgBoss): Promise<void> {
  for (const [operation, name] of Object.entries(PRODUCT_QUEUE_NAMES) as Array<[QueueOperation, string]>) {
    await queue.work<QueueJobEnvelope>(
      name,
      { batchSize: 1, groupConcurrency: 1, localConcurrency: 2 },
      async (jobs: Job<QueueJobEnvelope>[]) => {
        const outputs = [];
        for (const job of jobs) {
          if (job.data.operation !== operation) throw new Error("Queue operation does not match its queue.");
          outputs.push(await handleEnvelope(job.data));
        }
        return outputs;
      }
    );
  }
}

async function reconcileUserSchedules(queue: PgBoss): Promise<void> {
  const users = await getProductPool().query<{ id: string }>(
    "SELECT id FROM product_users WHERE status IN ('onboarding','active')"
  );
  const slot = new Date().toISOString().slice(0, 16);
  for (const user of users.rows) {
    await enqueueProductJob(queue, newQueueEnvelope(
      user.id,
      "gmail.sync",
      `gmail-sync:${user.id}:${slot}`
    ));
    await enqueueProductJob(queue, newQueueEnvelope(
      user.id,
      "proof.reconcile",
      `proof-reconcile:${user.id}:${slot}`
    ));
  }
  const day = new Date().toISOString().slice(0, 10);
  if (users.rows[0]) {
    await enqueueProductJob(queue, newQueueEnvelope(
      users.rows[0].id,
      "retention.cleanup",
      `retention:${day}`
    ));
  }
}

export async function startProductWorker(): Promise<void> {
  const queue = createProductQueue();
  await queue.start();
  await ensureProductQueues(queue);
  await registerWorkers(queue);
  await reconcileUserSchedules(queue);
  const timer = setInterval(() => {
    reconcileUserSchedules(queue).catch((error) => {
      console.error(JSON.stringify({ event: "schedule_reconcile_failed", error: error?.name || "Error" }));
    });
  }, 5 * 60_000);
  const shutdown = async () => {
    clearInterval(timer);
    await queue.stop({ graceful: true, timeout: 30_000 });
    await closeProductPool();
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
  console.log(JSON.stringify({ event: "worker_ready", queues: Object.values(PRODUCT_QUEUE_NAMES) }));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  startProductWorker().catch((error) => {
    console.error(JSON.stringify({ event: "worker_failed", error: error instanceof Error ? error.message : "Unknown error" }));
    process.exitCode = 1;
  });
}
