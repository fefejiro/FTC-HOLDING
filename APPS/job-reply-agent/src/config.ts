import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import YAML from "yaml";
import type { ProfileConfig, ResumeMapConfig, RulesConfig } from "./types.js";

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
    max_sends_per_day: z.number().int().positive()
  }),
  filters: z.object({
    min_match_score: z.number().int().min(0).max(100),
    labels: z.object({
      inbound: z.string(),
      drafted: z.string(),
      needs_review: z.string(),
      approve_send: z.string(),
      sent: z.string(),
      skipped: z.string(),
      blocked: z.string()
    })
  }),
  risk_controls: z.object({
    block_keywords: z.array(z.string()),
    require_review_keywords: z.array(z.string())
  }),
  trusted_recruiter_domains: z.array(z.string()),
  resume_tailoring: z
    .object({
      enabled: z.boolean(),
      template_path: z.string(),
      output_dir: z.string(),
      attach_mode: z.enum(["docx_only", "docx_and_pdf", "pdf_only"]),
      auto_send: z.boolean()
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
  const filePath = path.join(process.cwd(), relativePath);
  const raw = fs.readFileSync(filePath, "utf8");
  return YAML.parse(raw) as T;
}

export function loadConfig(): {
  profile: ProfileConfig;
  rules: RulesConfig;
  resumeMap: ResumeMapConfig;
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

  const authMode = process.env.GMAIL_AUTH_MODE === "smtp" ? "smtp" : "oauth";
  const gmailClientId = process.env.GMAIL_CLIENT_ID || "";
  const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET || "";
  const gmailRedirectUri = process.env.GMAIL_REDIRECT_URI || "http://localhost:3007/oauth2callback";
  const gmailTokensPath =
    process.env.GMAIL_TOKENS_PATH || path.join(process.cwd(), "data", "gmail_tokens.json");
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
