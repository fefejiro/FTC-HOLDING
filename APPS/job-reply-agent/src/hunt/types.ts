import { z } from "zod";

/**
 * Job Hunt OS — domain types and zod schemas.
 *
 * Status values move forward only:
 *   discovered → scored → package_ready
 *                       → needs_review
 *                       → blocked
 *                       → save_only
 *                       → applied → interviewing → offer | rejected | withdrawn
 */
export const JOB_STATUS = [
  "discovered",
  "scored",
  "package_ready",
  "needs_review",
  "blocked",
  "save_only",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn"
] as const;
export type JobStatus = (typeof JOB_STATUS)[number];

export const JOB_SOURCE = [
  "greenhouse",
  "lever",
  "ashby",
  "gmail_alert",
  "ops_bps",
  "agency",
  "linkedin_manual",
  "workday_manual",
  "manual_paste"
] as const;
export type JobSource = (typeof JOB_SOURCE)[number];

export const jobSchema = z.object({
  id: z.number().int().optional(),
  source: z.enum(JOB_SOURCE),
  source_id: z.string(),
  url: z.string().url(),
  company: z.string(),
  title: z.string(),
  location: z.string().nullable().optional(),
  remote: z.boolean().nullable().optional(),
  description: z.string().nullable().optional(),
  compensation: z.string().nullable().optional(),
  posted_at: z.string().nullable().optional(),
  discovered_at: z.string(),
  status: z.enum(JOB_STATUS).default("discovered"),
  score: z.number().int().min(0).max(100).nullable().optional(),
  score_breakdown_json: z.string().nullable().optional(),
  red_flags_json: z.string().nullable().optional(),
  reason: z.string().nullable().optional()
});
export type Job = z.infer<typeof jobSchema>;

export const APPLICATION_STATE = [
  "draft",
  "package_ready",
  "submitted",
  "responded",
  "interview_scheduled",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
  "ghosted"
] as const;
export type ApplicationState = (typeof APPLICATION_STATE)[number];

export const applicationSchema = z.object({
  id: z.number().int().optional(),
  job_id: z.number().int(),
  state: z.enum(APPLICATION_STATE).default("draft"),
  submitted_at: z.string().nullable().optional(),
  submission_method: z.string().nullable().optional(),
  resume_path: z.string().nullable().optional(),
  cover_letter_path: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  last_followup_at: z.string().nullable().optional(),
  next_followup_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string()
});
export type Application = z.infer<typeof applicationSchema>;

export const documentSchema = z.object({
  id: z.number().int().optional(),
  job_id: z.number().int(),
  kind: z.enum(["resume", "cover_letter", "notes", "interview_packet"]),
  path: z.string(),
  approved: z.boolean().default(false),
  quality_flags_json: z.string().nullable().optional(),
  created_at: z.string()
});
export type Document = z.infer<typeof documentSchema>;

export const contactSchema = z.object({
  id: z.number().int().optional(),
  job_id: z.number().int().nullable().optional(),
  company: z.string(),
  name: z.string(),
  role: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  last_touched_at: z.string().nullable().optional(),
  created_at: z.string()
});
export type Contact = z.infer<typeof contactSchema>;

export interface ScoreBreakdown {
  title_match: number;
  skills_match: number;
  industry_match: number;
  location_fit: number;
  compensation_fit: number;
  work_authorization_fit: number;
  seniority_fit: number;
  application_effort: number;
  total: number;
  matched_terms: string[];
  missing_terms: string[];
}

export interface RawJob {
  source: JobSource;
  source_id: string;
  url: string;
  company: string;
  title: string;
  location?: string | null;
  remote?: boolean | null;
  description?: string | null;
  compensation?: string | null;
  posted_at?: string | null;
}
