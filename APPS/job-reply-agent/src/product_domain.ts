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
  accountIdentifier?: string | null;
  expiresAt?: string | null;
  blockingReason?: string | null;
}

export interface ConnectorCertification extends ConnectorCapability {
  accountIdentifier: string | null;
  expiresAt: string | null;
  blockingReason: string | null;
}

export interface MatchExplanation {
  score: number;
  matchedRequirements: string[];
  missingRequirements: string[];
  policyConflicts: string[];
  evidenceFactIds: string[];
  generatedAt: string;
}

export interface AtsGapReport {
  coveredTerms: string[];
  missingTerms: string[];
  unsupportedTerms: string[];
  structuralFindings: string[];
  generatedAt: string;
}

export interface ApplicationTimelineEvent {
  id: string;
  applicationId: string;
  eventType:
    | "application_created"
    | "status_changed"
    | "proof_captured"
    | "evidence_stored"
    | "outcome_recorded";
  actorType: "user" | "agent" | "runner" | "system";
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export interface InterviewPrepQuestion {
  id: string;
  prompt: string;
  competency: string;
  approvedFactIds: string[];
}

export interface InterviewPrepSession {
  id: string;
  userId: string;
  jobMatchId: string;
  applicationId?: string | null;
  status: "ready" | "in_progress" | "completed";
  questions: InterviewPrepQuestion[];
  rehearsal: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export type OutcomeType =
  | "recruiter_reply"
  | "screening"
  | "interview"
  | "offer"
  | "rejection"
  | "withdrawal";

export interface OutcomeEvent {
  id: string;
  userId: string;
  applicationId: string;
  outcomeType: OutcomeType;
  metadata: Record<string, unknown>;
  occurredAt: string;
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

export interface TailoredApplicationPackageInput {
  jobMatchId: string;
  title: string;
  company: string;
  jobUrl: string;
  description: string;
  sourceResumeId: string;
  sourceResumeVersion: string;
  match: MatchExplanation;
  ats: AtsGapReport;
  approvedFacts: CareerFact[];
  interest: string;
  emphasis: string;
  avoid?: string;
  generatedAt?: string;
}

export function buildTailoredApplicationPackage(input: TailoredApplicationPackageInput) {
  const generatedAt = input.generatedAt || new Date().toISOString();
  const approvedFacts = selectApprovedCareerFacts(input.approvedFacts).approvedFacts;
  const facts = approvedFacts.slice(0, 8).map((fact) => ({
    id: fact.id,
    category: fact.category,
    statement: fact.statement,
    provenance: fact.provenance
  }));
  const role = input.title.trim() || "this role";
  const company = input.company.trim() || "the organization";
  const interest = input.interest.trim();
  const emphasis = input.emphasis.trim();
  const avoid = input.avoid?.trim() || "";
  const strengths = input.match.matchedRequirements.length
    ? input.match.matchedRequirements.join(", ")
    : "the approved experience in the source resume";
  const coverLetter = [
    `Dear ${company} hiring team,`,
    "",
    `I am interested in the ${role} opportunity because ${interest}`,
    "",
    `My application emphasizes ${emphasis}. The role's supported alignment includes ${strengths}.`,
    "",
    "I would welcome the opportunity to discuss how my verified experience could support your team.",
    "",
    "Sincerely,",
    "The candidate"
  ].join("\n");
  return {
    jobMatchId: input.jobMatchId,
    role,
    company,
    jobUrl: input.jobUrl,
    sourceResumeId: input.sourceResumeId,
    sourceResumeVersion: input.sourceResumeVersion,
    status: "approval_required" as const,
    resumeFocus: {
      headline: `${role} | ${company}`,
      summary: `Position the candidate around ${strengths}.`,
      evidenceFactIds: facts.map((fact) => fact.id),
      supportedRequirements: input.match.matchedRequirements,
      unsupportedRequirements: input.ats.unsupportedTerms
    },
    coverLetter,
    recruiterFollowUp: `Hello ${company} team, I have applied for the ${role} position and would be glad to discuss the role and my verified experience.`,
    applicationQuestions: [
      { question: "Why are you interested in this role?", answer: interest, source: "customer_input" },
      { question: "What should this application emphasize?", answer: emphasis, source: "customer_input" },
      { question: "What should be left out or handled carefully?", answer: avoid || "No additional exclusions provided.", source: "customer_input" }
    ],
    interviewPreparation: buildGroundedInterviewQuestions({
      title: role,
      company,
      careerFacts: approvedFacts
    }),
    approvedFacts: facts,
    missingInformationFlags: input.match.missingRequirements,
    truthGuard: "No unapproved facts or unsupported claims were added.",
    generatedAt
  };
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

const TRUST_SKILL_TERMS = [
  "acceptance criteria", "agile", "api", "azure", "business analysis",
  "change management", "cloud", "confluence", "crm", "cybersecurity", "data analysis",
  "digital transformation", "erp", "governance", "integration", "jira",
  "leadership", "pos", "process mapping", "product management", "program management",
  "project management", "requirements", "retail", "risk management", "sap",
  "sql", "stakeholder management", "supply chain", "uat", "vendor management", "wms"
] as const;

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

function detectedTerms(value: string): string[] {
  const haystack = normalized(value);
  return TRUST_SKILL_TERMS.filter((term) => haystack.includes(term));
}

export function buildTrustAnalysis(input: {
  score: number;
  jobDescription: string;
  careerFacts: CareerFact[];
  policyConflicts?: string[];
  structuralFindings?: string[];
  now?: string;
}): { match: MatchExplanation; ats: AtsGapReport } {
  const generatedAt = input.now || new Date().toISOString();
  const approvedFacts = selectApprovedCareerFacts(input.careerFacts).approvedFacts;
  const requiredTerms = detectedTerms(input.jobDescription);
  const evidence = approvedFacts.map((fact) => ({
    fact,
    terms: detectedTerms(fact.statement)
  }));
  const coveredTerms = requiredTerms.filter((term) =>
    evidence.some((entry) => entry.terms.includes(term))
  );
  const missingTerms = requiredTerms.filter((term) => !coveredTerms.includes(term));
  const evidenceFactIds = evidence
    .filter((entry) => entry.terms.some((term) => coveredTerms.includes(term)))
    .map((entry) => entry.fact.id);

  return {
    match: {
      score: Math.max(0, Math.min(100, Math.round(input.score))),
      matchedRequirements: uniqueSorted(coveredTerms),
      missingRequirements: uniqueSorted(missingTerms),
      policyConflicts: uniqueSorted(input.policyConflicts || []),
      evidenceFactIds: uniqueSorted(evidenceFactIds),
      generatedAt
    },
    ats: {
      coveredTerms: uniqueSorted(coveredTerms),
      missingTerms: uniqueSorted(missingTerms),
      unsupportedTerms: uniqueSorted(missingTerms),
      structuralFindings: uniqueSorted(input.structuralFindings || []),
      generatedAt
    }
  };
}

export function buildGroundedInterviewQuestions(input: {
  title: string;
  company: string;
  careerFacts: CareerFact[];
}): InterviewPrepQuestion[] {
  const approvedFacts = selectApprovedCareerFacts(input.careerFacts).approvedFacts;
  const factIds = approvedFacts.slice(0, 6).map((fact) => fact.id);
  const role = input.title.trim() || "this role";
  const company = input.company.trim() || "the organization";
  return [
    {
      id: "role-fit",
      prompt: `Which approved experiences best demonstrate your fit for ${role} at ${company}?`,
      competency: "role alignment",
      approvedFactIds: factIds
    },
    {
      id: "stakeholders",
      prompt: "Describe a time you aligned business and technical stakeholders around an ambiguous requirement.",
      competency: "stakeholder management",
      approvedFactIds: factIds
    },
    {
      id: "delivery",
      prompt: "Describe a delivery risk you identified early, how you handled it, and the verified outcome.",
      competency: "delivery and risk",
      approvedFactIds: factIds
    },
    {
      id: "change",
      prompt: "Describe a system or process change you helped move from discovery through adoption.",
      competency: "change leadership",
      approvedFactIds: factIds
    },
    {
      id: "questions",
      prompt: `What evidence-based questions will you ask ${company} about priorities, success measures, and constraints?`,
      competency: "candidate questions",
      approvedFactIds: []
    }
  ];
}
