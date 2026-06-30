import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import YAML from "yaml";
import type {
  ApplicationAnswersConfig,
  ProfileConfig,
  ResumeMapConfig,
  RulesConfig
} from "./types.js";
import { resolveProjectPath } from "./db.js";

const profileSchema = z.object({
  name: z.string(),
  location: z.string(),
  target_titles: z.array(z.string()),
  core_strengths: z.array(z.string()),
  work_authorization_note: z.string(),
  contact: z.object({
    email: z.string().email(),
    phone: z.string(),
    linkedin: z.string().url(),
    github: z.string().url()
  })
});

const rulesSchema = z.object({
  automation: z.object({
    enabled: z.boolean(),
    mode: z.enum(["disabled", "draft_only", "approval_required", "trusted_auto_send"]),
    timezone: z.string(),
    max_drafts_per_day: z.number().int().positive(),
    max_sends_per_day: z.number().int().positive(),
    schedule: z
      .object({
        business_hours_start: z.number().int().min(0).max(23).optional(),
        business_hours_end: z.number().int().min(0).max(23).optional(),
        business_hours_interval_minutes: z.number().int().positive().optional(),
        after_hours_interval_minutes: z.number().int().positive().optional(),
        quiet_hours_start: z.number().int().min(0).max(23).optional(),
        quiet_hours_end: z.number().int().min(0).max(23).optional(),
        no_auto_send_weekdays: z.array(z.number().int().min(0).max(6)).optional()
      })
      .optional()
  }),
  filters: z.object({
    min_match_score: z.number().int().min(0).max(100),
    score_bands: z
      .object({
        auto_send_min: z.number().int().min(0).max(100),
        draft_min: z.number().int().min(0).max(100),
        needs_review_min: z.number().int().min(0).max(100)
      })
      .optional(),
    labels: z.object({
      inbound: z.string(),
      drafted: z.string(),
      needs_review: z.string(),
      approve_send: z.string(),
      sent: z.string(),
      skipped: z.string(),
      blocked: z.string(),
      approved: z.string(),
      trusted_recruiter: z.string().optional(),
      resume_generated: z.string().optional(),
      error: z.string().optional()
    })
  }),
  risk_controls: z.object({
    block_keywords: z.array(z.string()),
    require_review_keywords: z.array(z.string())
  }),
  scraper: z
    .object({
      enabled: z.boolean(),
      dice: z
        .object({
          enabled: z.boolean(),
          keywords: z.array(z.string()),
          max_jobs_per_run: z.number().int().positive()
        })
        .optional(),
      indeed: z
        .object({
          enabled: z.boolean(),
          keywords: z.array(z.string()),
          max_jobs_per_run: z.number().int().positive()
        })
        .optional(),
      linkedin: z
        .object({
          enabled: z.boolean(),
          keywords: z.array(z.string()),
          max_jobs_per_run: z.number().int().positive()
        })
        .optional(),
      robert_half: z
        .object({
          enabled: z.boolean(),
          keywords: z.array(z.string()),
          max_jobs_per_run: z.number().int().positive()
        })
        .optional(),
      workopolis: z
        .object({
          enabled: z.boolean(),
          keywords: z.array(z.string()),
          max_jobs_per_run: z.number().int().positive()
        })
        .optional(),
      mercor: z
        .object({
          enabled: z.boolean(),
          keywords: z.array(z.string()),
          max_jobs_per_run: z.number().int().positive()
        })
        .optional()
    })
    .optional(),
  trusted_recruiter_domains: z.array(z.string()),
  resume_tailoring: z
    .object({
      enabled: z.boolean(),
      template_path: z.string(),
      business_analysis_template_path: z.string().optional(),
      output_dir: z.string(),
      attach_mode: z.enum(["docx_only", "docx_and_pdf", "pdf_only"]),
      auto_send: z.boolean(),
      auto_send_criteria: z
        .object({
          min_score: z.number().int().min(0).max(100).optional(),
          require_recruiter_name: z.boolean().optional(),
          require_clean_role_title: z.boolean().optional(),
          require_resume_generated: z.boolean().optional(),
          max_body_words: z.number().int().positive().optional(),
          no_html_artifacts: z.boolean().optional(),
          no_sensitive_requests: z.boolean().optional()
        })
        .optional()
    })
    .optional()
});

const resumeMapSchema = z.object({
  default_resume: z.string(),
  mappings: z.array(
    z.object({
      role_family: z.string(),
      keywords: z.array(z.string()),
      resume: z.string()
    })
  )
});

function readYaml<T>(relativePath: string): T {
  const filePath = resolveProjectPath(relativePath);
  const raw = fs.readFileSync(filePath, "utf8");
  return YAML.parse(raw) as T;
}

export function loadConfig(): {
  profile: ProfileConfig;
  rules: RulesConfig;
  resumeMap: ResumeMapConfig;
  applicationAnswers: ApplicationAnswersConfig;
  env: {
    authMode: "oauth" | "smtp";
    gmailClientId: string;
    gmailClientSecret: string;
    gmailRedirectUri: string;
    gmailTokensPath: string;
    gmailAccountEmail: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPass: string;
    reportTo: string;
    timezone: string;
    sendDailyEmail: boolean;
  };
} {
  const profile = profileSchema.parse(readYaml<ProfileConfig>("config/profile.yaml"));
  const rules = rulesSchema.parse(readYaml<RulesConfig>("config/rules.yaml"));
  const resumeMap = resumeMapSchema.parse(readYaml<ResumeMapConfig>("config/resume_map.yaml"));
  const applicationAnswers = readYaml<ApplicationAnswersConfig>("config/application_answers.yaml");

  const authMode = process.env.GMAIL_AUTH_MODE === "smtp" ? "smtp" : "oauth";
  const gmailClientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
  const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
  const gmailRedirectUri =
    process.env.GMAIL_REDIRECT_URI ||
    process.env.GOOGLE_REDIRECT_URI ||
    "http://127.0.0.1:3007";
  const envTokensPath = process.env.GMAIL_TOKENS_PATH || "";
  const gmailTokensPath = envTokensPath
    ? (path.isAbsolute(envTokensPath) ? envTokensPath : resolveProjectPath(envTokensPath))
    : resolveProjectPath("data", "gmail_tokens.json");
  const gmailAccountEmail = process.env.GMAIL_ACCOUNT_EMAIL || "";

  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || "false") === "true";
  const smtpUser = process.env.SMTP_USER || "";
  const smtpPass = process.env.SMTP_PASS || "";
  const reportTo = process.env.REPORT_TO || gmailAccountEmail || smtpUser || profile.contact.email;
  const timezone = process.env.AGENT_TZ || rules.automation.timezone;
  const sendDailyEmail = String(process.env.DAILY_REPORT_ENABLE_SEND || "true") === "true";

  return {
    profile,
    rules,
    resumeMap,
    applicationAnswers,
    env: {
      authMode,
      gmailClientId,
      gmailClientSecret,
      gmailRedirectUri,
      gmailTokensPath,
      gmailAccountEmail,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      reportTo,
      timezone,
      sendDailyEmail
    }
  };
}
