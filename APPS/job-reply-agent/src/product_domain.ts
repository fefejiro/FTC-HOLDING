export const APPLICATION_STATES = [
  "discovered",
  "recommended",
  "saved",
  "package_generating",
  "package_ready",
  "approval_required",
  "approved",
  "submission_in_progress",
  "applied",
  "submission_failed",
  "recruiter_response",
  "screening",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
  "follow_up_due",
  "blocked"
] as const;

export type ApplicationState = (typeof APPLICATION_STATES)[number];

export const SENSITIVE_QUESTION_TYPES = [
  "salary",
  "right_to_represent",
  "work_authorization",
  "sponsorship",
  "criminal_history",
  "disability",
  "demographic",
  "security_clearance",
  "relocation",
  "legal_declaration",
  "non_compete"
] as const;

export type SensitiveQuestionType = (typeof SENSITIVE_QUESTION_TYPES)[number];
export type FactVerificationStatus = "unverified" | "review_required" | "approved" | "rejected";

export const CONNECTOR_SOURCES = [
  "gmail",
  "linkedin",
  "indeed",
  "dice",
  "monster"
] as const;

export type ConnectorSource = (typeof CONNECTOR_SOURCES)[number];

export const CONNECTOR_STATUSES = [
  "certified_live",
  "pilot_only",
  "manual_only",
  "blocked_auth",
  "blocked_proof",
  "disabled"
] as const;

export type ConnectorStatus = (typeof CONNECTOR_STATUSES)[number];

export interface ConnectorCapability {
  source: ConnectorSource;
  status: ConnectorStatus;
  discovery: boolean;
  packageGeneration: boolean;
  assistedSubmission: boolean;
  controlledSubmission: boolean;
  proofReconciliation: boolean;
  evidenceReference?: string | null;
  verifiedAt?: string | null;
}

export type QueueOperation =
  | "gmail.sync"
  | "jobs.discover"
  | "jobs.score"
  | "package.generate"
  | "recruiter.send_approved"
  | "proof.reconcile"
  | "digest.send"
  | "retention.cleanup";

export interface QueueJobEnvelope {
  jobId: string;
  userId: string;
  runId: string;
  operation: QueueOperation;
  idempotencyKey: string;
  scheduledAt: string;
  attempt: number;
}

export interface RunnerTask {
  id: string;
  candidateUserId: string;
  source: Exclude<ConnectorSource, "gmail">;
  action: "auth_check" | "discover" | "prepare" | "assist_submit" | "verify_proof";
  applicationId?: string | null;
  payload: Record<string, unknown>;
  proofRequired: boolean;
  expiresAt: string;
  signature: string;
}

export interface ApplicationProof {
  candidateUserId: string;
  applicationId?: string | null;
  taskId: string;
  source: Exclude<ConnectorSource, "gmail">;
  resultStatus:
    | "submitted_verified"
    | "submitted_unverified"
    | "manual_gate"
    | "blocked_auth"
    | "blocked_proof"
    | "failed";
  resumeId?: string | null;
  answers: Record<string, unknown>;
  finalUrl?: string | null;
  evidenceReference?: string | null;
  capturedAt: string;
}

export interface CareerFact {
  id: string;
  userId: string;
  category: string;
  statement: string;
  verificationStatus: FactVerificationStatus;
  provenance: Record<string, unknown>;
}

export interface GenerationFactSelection {
  approvedFacts: CareerFact[];
  reviewFlags: Array<{ factId: string; reason: string }>;
}

export function selectApprovedCareerFacts(facts: CareerFact[]): GenerationFactSelection {
  const approvedFacts = facts.filter((fact) => fact.verificationStatus === "approved");
  const reviewFlags = facts
    .filter((fact) => fact.verificationStatus !== "approved")
    .map((fact) => ({
      factId: fact.id,
      reason: `Career fact is ${fact.verificationStatus} and cannot be used for generation.`
    }));
  return { approvedFacts, reviewFlags };
}

export function requiresExplicitApproval(sensitivity: "normal" | SensitiveQuestionType): boolean {
  return sensitivity !== "normal";
}

export interface JobIdentity {
  source: string;
  sourceId?: string | null;
  canonicalUrl?: string | null;
  company: string;
  title: string;
  location?: string | null;
  descriptionFingerprint: string;
}

function normalized(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function isDuplicateJob(left: JobIdentity, right: JobIdentity): boolean {
  if (normalized(left.source) === normalized(right.source)
      && left.sourceId && right.sourceId
      && normalized(left.sourceId) === normalized(right.sourceId)) return true;
  if (left.canonicalUrl && right.canonicalUrl
      && normalized(left.canonicalUrl) === normalized(right.canonicalUrl)) return true;
  return normalized(left.company) === normalized(right.company)
    && normalized(left.title) === normalized(right.title)
    && normalized(left.location) === normalized(right.location)
    && left.descriptionFingerprint === right.descriptionFingerprint;
}

export function assertMailboxOwnership(configuredMailbox: string, authenticatedMailbox: string): void {
  const expected = normalized(configuredMailbox);
  const actual = normalized(authenticatedMailbox);
  if (!expected || !actual || expected !== actual) {
    throw new Error("Authenticated mailbox does not match the user-owned integration.");
  }
}
