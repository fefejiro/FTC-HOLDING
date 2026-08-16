import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { ApplicationProof, RunnerTask } from "./product_domain.js";
import { runnerSignature } from "./product_public_beta_repository.js";

interface RunnerConfig {
  origin: string;
  deviceId: string;
  deviceSecret: string;
  candidateUserId: string;
  name: string;
  enrolledAt: string;
}

interface HandlerResult {
  resultStatus: ApplicationProof["resultStatus"];
  resumeId?: string | null;
  answers?: Record<string, unknown>;
  finalUrl?: string | null;
  evidenceReference?: string | null;
  evidencePath?: string | null;
}

interface LeasedTask {
  task: RunnerTask;
  leaseToken: string;
}

const ALLOWED_ACTIONS = new Set<RunnerTask["action"]>([
  "auth_check",
  "discover",
  "prepare",
  "assist_submit",
  "verify_proof"
]);
const ALLOWED_RESULTS = new Set<ApplicationProof["resultStatus"]>([
  "submitted_verified",
  "submitted_unverified",
  "manual_gate",
  "blocked_auth",
  "blocked_proof",
  "failed"
]);

function option(name: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || "";
}

function runnerRoot(): string {
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.resolve(process.env.JOB_AGENT_RUNNER_HOME || path.join(local, "UnaLabs", "JobAgent"));
}

function configPath(): string {
  return path.resolve(process.env.JOB_AGENT_RUNNER_CONFIG || path.join(runnerRoot(), "runner.json"));
}

function validOrigin(value: string): string {
  const origin = new URL(value).origin;
  const parsed = new URL(origin);
  if (parsed.protocol !== "https:"
      && !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    throw new Error("Runner origin must use HTTPS.");
  }
  return origin;
}

async function saveConfig(config: RunnerConfig): Promise<void> {
  const target = configPath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
  await fs.rename(temporary, target);
  await fs.chmod(target, 0o600).catch(() => undefined);
}

async function loadConfig(): Promise<RunnerConfig> {
  const parsed = JSON.parse(await fs.readFile(configPath(), "utf8")) as RunnerConfig;
  if (!/^[0-9a-f-]{36}$/i.test(parsed.deviceId)
      || !/^[0-9a-f-]{36}$/i.test(parsed.candidateUserId)
      || parsed.deviceSecret.length < 40) {
    throw new Error("Runner configuration is incomplete or invalid.");
  }
  parsed.origin = validOrigin(parsed.origin);
  return parsed;
}

async function enroll(): Promise<void> {
  const origin = validOrigin(option("origin"));
  const token = option("token");
  const name = option("name") || os.hostname();
  if (token.length < 20) throw new Error("--token is required.");
  const response = await fetch(`${origin}/api/v1/runner/enroll`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token,
      name,
      platform: `${process.platform}-${process.arch}`
    })
  });
  const body = await response.json() as any;
  if (!response.ok) throw new Error(body.error || "Runner enrollment failed.");
  const config: RunnerConfig = {
    origin,
    deviceId: String(body.deviceId),
    deviceSecret: String(body.deviceSecret),
    candidateUserId: String(body.candidateUserId),
    name,
    enrolledAt: new Date().toISOString()
  };
  await saveConfig(config);
  console.log(JSON.stringify({
    event: "runner_enrolled",
    deviceId: config.deviceId,
    candidateUserId: config.candidateUserId,
    configPath: configPath()
  }));
}

async function signedPost<T>(
  config: RunnerConfig,
  pathname: string,
  payload: unknown
): Promise<T> {
  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(24).toString("base64url");
  const signature = runnerSignature(config.deviceSecret, {
    method: "POST",
    pathname,
    timestamp,
    nonce,
    bodyHash: crypto.createHash("sha256").update(body).digest("hex")
  });
  const response = await fetch(`${config.origin}${pathname}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-runner-device-id": config.deviceId,
      "x-runner-timestamp": timestamp,
      "x-runner-nonce": nonce,
      "x-runner-signature": signature
    },
    body
  });
  const result = await response.json() as any;
  if (!response.ok) throw new Error(result.error || `Runner request failed (${response.status}).`);
  return result as T;
}

function constantEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyRunnerTask(config: RunnerConfig, task: RunnerTask): void {
  if (task.candidateUserId !== config.candidateUserId) {
    throw new Error("Runner task candidate does not match the enrolled candidate.");
  }
  if (!ALLOWED_ACTIONS.has(task.action)) {
    throw new Error("Runner task action is not allowed by this client.");
  }
  if (new Date(task.expiresAt).getTime() <= Date.now()) {
    throw new Error("Runner task lease has expired.");
  }
  const { signature, ...unsigned } = task;
  const expected = runnerSignature(config.deviceSecret, unsigned);
  if (!constantEqual(expected, signature)) {
    throw new Error("Runner task signature is invalid.");
  }
  if (task.payload?.expectedCandidateUserId
      && task.payload.expectedCandidateUserId !== config.candidateUserId) {
    throw new Error("Runner task payload identifies a different candidate.");
  }
}

function handlerCommand(): { executable: string; args: string[] } | null {
  const executable = String(process.env.JOB_AGENT_RUNNER_HANDLER || "").trim();
  if (!executable) return null;
  let args: string[] = [];
  if (process.env.JOB_AGENT_RUNNER_HANDLER_ARGS_JSON) {
    const parsed = JSON.parse(process.env.JOB_AGENT_RUNNER_HANDLER_ARGS_JSON);
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      throw new Error("JOB_AGENT_RUNNER_HANDLER_ARGS_JSON must be a JSON string array.");
    }
    args = parsed;
  }
  return { executable: path.resolve(executable), args };
}

async function runHandler(task: RunnerTask): Promise<HandlerResult> {
  const command = handlerCommand();
  if (!command) {
    throw new Error("JOB_AGENT_RUNNER_HANDLER is not configured; no task was leased.");
  }
  await fs.access(command.executable);
  const taskRoot = path.join(runnerRoot(), "tasks");
  await fs.mkdir(taskRoot, { recursive: true });
  const taskFile = path.join(taskRoot, `${task.id}.json`);
  const outputFile = path.join(taskRoot, `${task.id}.proof.json`);
  await fs.writeFile(taskFile, `${JSON.stringify(task, null, 2)}\n`, { mode: 0o600 });
  await fs.rm(outputFile, { force: true });
  const timeoutMs = Math.min(
    Math.max(Number(process.env.JOB_AGENT_RUNNER_HANDLER_TIMEOUT_MS || 480_000), 30_000),
    540_000
  );
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command.executable, [
      ...command.args,
      `--task=${taskFile}`,
      `--proof-output=${outputFile}`
    ], {
      shell: false,
      stdio: "inherit",
      windowsHide: true,
      timeout: timeoutMs
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`Runner handler exited with ${signal || code}.`));
    });
  });
  const result = JSON.parse(await fs.readFile(outputFile, "utf8")) as HandlerResult;
  if (!ALLOWED_RESULTS.has(result.resultStatus)) {
    throw new Error("Runner handler returned an unsupported result status.");
  }
  if (result.answers && (Array.isArray(result.answers) || typeof result.answers !== "object")) {
    throw new Error("Runner handler answers must be a redacted object.");
  }
  if (result.resultStatus === "submitted_verified"
      && (!result.finalUrl || (!result.evidenceReference && !result.evidencePath))) {
    throw new Error("Verified submission requires a final URL and evidence.");
  }
  return result;
}

async function evidencePayload(evidencePath?: string | null): Promise<{
  filename: string;
  mimeType: "image/png" | "image/jpeg" | "application/pdf";
  base64: string;
} | undefined> {
  if (!evidencePath) return undefined;
  const absolute = path.resolve(evidencePath);
  const extension = path.extname(absolute).toLowerCase();
  const mimeType = extension === ".png"
    ? "image/png"
    : [".jpg", ".jpeg"].includes(extension)
      ? "image/jpeg"
      : extension === ".pdf"
        ? "application/pdf"
        : null;
  if (!mimeType) throw new Error("Proof evidence must be PNG, JPEG, or PDF.");
  const content = await fs.readFile(absolute);
  if (!content.length || content.length > 5_000_000) {
    throw new Error("Proof evidence must be between 1 byte and 5 MB.");
  }
  return {
    filename: path.basename(absolute),
    mimeType,
    base64: content.toString("base64")
  };
}

async function heartbeat(config: RunnerConfig): Promise<void> {
  await signedPost(config, "/api/v1/runner/device/heartbeat", {});
  console.log(JSON.stringify({
    event: "runner_heartbeat",
    deviceId: config.deviceId,
    candidateUserId: config.candidateUserId,
    at: new Date().toISOString()
  }));
}

async function runOnce(config: RunnerConfig): Promise<boolean> {
  if (!handlerCommand()) {
    await heartbeat(config);
    console.log(JSON.stringify({
      event: "runner_idle",
      reason: "handler_not_configured"
    }));
    return false;
  }
  const leased = await signedPost<LeasedTask | { task: null }>(
    config,
    "/api/v1/runner/device/tasks/lease",
    {}
  );
  if (!leased.task) {
    console.log(JSON.stringify({ event: "runner_idle", reason: "no_task" }));
    return false;
  }
  const task = leased.task as RunnerTask;
  verifyRunnerTask(config, task);
  const result = await runHandler(task);
  const proof: ApplicationProof = {
    candidateUserId: config.candidateUserId,
    applicationId: task.applicationId || null,
    taskId: task.id,
    source: task.source,
    resultStatus: result.resultStatus,
    resumeId: result.resumeId || null,
    answers: result.answers || {},
    finalUrl: result.finalUrl || null,
    evidenceReference: result.evidenceReference || null,
    capturedAt: new Date().toISOString()
  };
  const evidence = await evidencePayload(result.evidencePath);
  const saved = await signedPost<{ accepted: boolean; proofId: string }>(
    config,
    "/api/v1/runner/device/proofs",
    { leaseToken: leased.leaseToken, proof, evidence }
  );
  console.log(JSON.stringify({
    event: "runner_task_completed",
    taskId: task.id,
    resultStatus: proof.resultStatus,
    proofId: saved.proofId
  }));
  return true;
}

async function runLoop(config: RunnerConfig): Promise<void> {
  const interval = Math.max(Number(process.env.JOB_AGENT_RUNNER_POLL_SECONDS || 30), 15) * 1_000;
  let stopping = false;
  process.once("SIGINT", () => { stopping = true; });
  process.once("SIGTERM", () => { stopping = true; });
  while (!stopping) {
    try {
      await runOnce(config);
    } catch (error) {
      console.error(JSON.stringify({
        event: "runner_cycle_failed",
        errorClass: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : "Runner cycle failed."
      }));
    }
    if (stopping) break;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

export async function runProductRunnerClient(): Promise<void> {
  const command = process.argv[2];
  if (command === "enroll") return enroll();
  const config = await loadConfig();
  if (command === "heartbeat") return heartbeat(config);
  if (command === "run-once") {
    await runOnce(config);
    return;
  }
  if (command === "run") return runLoop(config);
  throw new Error("Use enroll, heartbeat, run-once, or run.");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  runProductRunnerClient().catch((error) => {
    console.error(error instanceof Error ? error.message : "Trusted runner failed.");
    process.exitCode = 1;
  });
}
