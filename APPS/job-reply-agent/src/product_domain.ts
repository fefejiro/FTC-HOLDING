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
