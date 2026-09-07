import type Database from "better-sqlite3";
import type { ApplicationProof, ApplicationProofStatus } from "./instance.js";

const TRANSITIONS: Record<ApplicationProofStatus, ApplicationProofStatus[]> = {
  discovered: ["rejected_by_policy", "package_ready", "withdrawn"],
  rejected_by_policy: ["package_ready", "withdrawn"],
  package_ready: ["needs_approval", "manual_gate", "submission_attempted", "withdrawn"],
  needs_approval: ["package_ready", "manual_gate", "submission_attempted", "withdrawn"],
  manual_gate: ["package_ready", "submission_attempted", "withdrawn"],
  submission_attempted: ["submitted_unverified", "submitted_verified", "failed", "withdrawn"],
  submitted_unverified: ["submitted_verified", "failed", "withdrawn"],
  submitted_verified: ["withdrawn"],
  failed: ["package_ready", "withdrawn"],
  withdrawn: []
};

export interface RecordApplicationProofInput extends ApplicationProof {
  createdAt?: string;
}

function assertVerificationEvidence(input: RecordApplicationProofInput): void {
  if (input.status !== "submitted_verified") return;
  if (!input.verifiedAt) {
    throw new Error("submitted_verified requires verifiedAt.");
  }
  if (!input.evidencePath && !input.finalUrl) {
    throw new Error("submitted_verified requires a confirmation URL or evidence artifact.");
  }
}

export function getApplicationProof(
  db: Database.Database,
  instanceId: string,
  jobId: number
): ApplicationProof | null {
  const row = db.prepare(
    `SELECT instance_id, job_id, status, resume_version, answers_json, final_url, evidence_path, verified_at
     FROM application_proofs WHERE instance_id=? AND job_id=?`
  ).get(instanceId, jobId) as {
    instance_id: string;
    job_id: number;
    status: ApplicationProofStatus;
    resume_version: string | null;
    answers_json: string;
    final_url: string | null;
    evidence_path: string | null;
    verified_at: string | null;
  } | undefined;
  if (!row) return null;
  return {
    instanceId: row.instance_id,
    jobId: row.job_id,
    status: row.status,
    resumeVersion: row.resume_version || undefined,
    answersJson: row.answers_json,
    finalUrl: row.final_url || undefined,
    evidencePath: row.evidence_path || undefined,
    verifiedAt: row.verified_at || undefined
  };
}

export function recordApplicationProof(
  db: Database.Database,
  input: RecordApplicationProofInput
): ApplicationProof {
  assertVerificationEvidence(input);
  const existing = getApplicationProof(db, input.instanceId, input.jobId);
  if (existing && existing.status !== input.status && !TRANSITIONS[existing.status].includes(input.status)) {
    throw new Error(`Invalid application proof transition: ${existing.status} -> ${input.status}.`);
  }

  const now = input.createdAt || new Date().toISOString();
  db.prepare(
    `INSERT INTO application_proofs
      (instance_id, job_id, status, resume_version, answers_json, final_url, evidence_path, verified_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(instance_id, job_id) DO UPDATE SET
       status=excluded.status,
       resume_version=COALESCE(excluded.resume_version, application_proofs.resume_version),
       answers_json=CASE WHEN excluded.answers_json='{}' THEN application_proofs.answers_json ELSE excluded.answers_json END,
       final_url=COALESCE(excluded.final_url, application_proofs.final_url),
       evidence_path=COALESCE(excluded.evidence_path, application_proofs.evidence_path),
       verified_at=COALESCE(excluded.verified_at, application_proofs.verified_at),
       updated_at=excluded.updated_at`
  ).run(
    input.instanceId,
    input.jobId,
    input.status,
    input.resumeVersion || null,
    input.answersJson || "{}",
    input.finalUrl || null,
    input.evidencePath || null,
    input.verifiedAt || null,
    now,
    now
  );

  return getApplicationProof(db, input.instanceId, input.jobId) as ApplicationProof;
}
