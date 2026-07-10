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
  cleanRoleTitle: string;
  alignmentKeywords: string[];
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
    schedule?: {
      business_hours_start?: number;
      business_hours_end?: number;
      business_hours_interval_minutes?: number;
      after_hours_interval_minutes?: number;
      quiet_hours_start?: number;
      quiet_hours_end?: number;
      no_auto_send_weekdays?: number[];
    };
  };
  filters: {
    min_match_score: number;
    score_bands?: {
      auto_send_min: number;
      draft_min: number;
      needs_review_min: number;
    };
    labels: {
      inbound: string;
      drafted: string;
      needs_review: string;
      approve_send: string;
      sent: string;
      skipped: string;
      blocked: string;
      approved: string;
      trusted_recruiter?: string;
      resume_generated?: string;
      error?: string;
    };
  };
  risk_controls: {
    block_keywords: string[];
    require_review_keywords: string[];
  };
  trusted_recruiter_domains: string[];
  resume_tailoring?: {
    enabled: boolean;
    template_path: string;
    business_analysis_template_path?: string;
    it_management_template_path?: string;
    output_dir: string;
    attach_mode: "docx_only" | "docx_and_pdf" | "pdf_only";
    auto_send: boolean;
    auto_send_criteria?: {
      min_score?: number;
      require_recruiter_name?: boolean;
      require_clean_role_title?: boolean;
      require_resume_generated?: boolean;
      max_body_words?: number;
      no_html_artifacts?: boolean;
      no_sensitive_requests?: boolean;
    };
  };
  scraper?: {
    enabled: boolean;
    dice?: {
      enabled: boolean;
      keywords: string[];
      max_jobs_per_run: number;
    };
    indeed?: {
      enabled: boolean;
      keywords: string[];
      max_jobs_per_run: number;
    };
    linkedin?: {
      enabled: boolean;
      keywords: string[];
      max_jobs_per_run: number;
    };
  };
}

export interface ResumeMapConfig {
  default_resume: string;
  mappings: Array<{
    role_family: string;
    keywords: string[];
    resume: string;
  }>;
}

export interface ApplicationAnswersConfig {
  full_name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  city?: string;
  location?: string;
  current_title?: string;
  current_company?: string;
  work_authorization_text?: string;
  relocation_preference?: string;
  salary_expectation?: string;
  preferred_role_types?: string[];
  defaults?: {
    portfolio_url?: string;
  };
  eeo?: {
    gender?: string;
    veteran_status?: string;
    disability_status?: string;
    ethnicity?: string;
  };
}
