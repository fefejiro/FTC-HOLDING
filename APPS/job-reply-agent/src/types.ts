export type AgentMode = "disabled" | "draft_only" | "approval_required" | "trusted_auto_send";

export type DecisionStatus =
  | "processed"
  | "drafted"
  | "needs_review"
  | "approved"
  | "sent"
  | "skipped"
  | "blocked"
  | "error";

export interface RecruiterMessage {
  messageId: string;
  threadId: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  internetMessageId?: string;
  references?: string;
}

export interface ParsedOpportunity {
  roleTitle: string;
  company: string;
  location: string;
  employmentType: string;
  salaryOrRate: string;
  summary: string;
  recruiterName: string;
  parserConfidence: number;
  cleanBody: string;
  isUsRole: boolean;
}

export interface ResumeSelection {
  resumePath: string;
  roleFamily: string;
  why: string;
}

export interface DecisionResult {
  status: DecisionStatus;
  reason?: string;
}

export interface DailyCounts {
  processed: number;
  drafted: number;
  needsReview: number;
  approvedAndSent: number;
  skipped: number;
  blocked: number;
  errors: number;
}

export interface TopOpportunity {
  roleTitle: string;
  company?: string | null;
  location: string;
  employmentType?: string | null;
  salaryOrRate?: string | null;
  remote?: "Remote" | "Hybrid" | "Onsite" | "Unspecified";
  matchScore: number;
  status: DecisionStatus;
  contact?: string | null;
  needsFollowUp?: boolean;
  inboundSubject?: string | null;
  replySubject?: string | null;
  replyPreview?: string | null;
  resumeName?: string | null;
  threadLink?: string | null;
  draftLink?: string | null;
  sentLink?: string | null;
}

export interface DailyReport {
  reportDate: string;
  counts: DailyCounts;
  topOpportunities: TopOpportunity[];
  blockedRiskItems: string[];
  suggestedTomorrowActions: string[];
}

export interface ProfileConfig {
  name: string;
  location: string;
  target_titles: string[];
  core_strengths: string[];
  work_authorization_note: string;
  contact: {
    email: string;
    phone: string;
    linkedin: string;
    github: string;
  };
}

export interface RulesConfig {
  automation: {
    enabled: boolean;
    mode: AgentMode;
    timezone: string;
    max_drafts_per_day: number;
    max_sends_per_day: number;
  };
  filters: {
    min_match_score: number;
    labels: {
      inbound: string;
      drafted: string;
      needs_review: string;
      approve_send: string;
      sent: string;
      skipped: string;
      blocked: string;
    };
  };
  risk_controls: {
    block_keywords: string[];
    require_review_keywords: string[];
  };
  trusted_recruiter_domains: string[];
}

export interface ResumeMapConfig {
  default_resume: string;
  mappings: Array<{
    role_family: string;
    keywords: string[];
    resume: string;
  }>;
}
