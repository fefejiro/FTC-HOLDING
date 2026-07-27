import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";
import type { UserInstanceConfig } from "./instance.js";

const onboardingSchema = z.object({
  version: z.number().int().positive(),
  identity: z.object({
    full_name: z.string(),
    phone: z.string(),
    location: z.string(),
    postal_code: z.string().optional().default(""),
    linkedin_url: z.string(),
    portfolio_url: z.string().optional().default(""),
    github_url: z.string().optional().default("")
  }),
  preferences: z.object({
    target_titles: z.array(z.string()),
    excluded_titles: z.array(z.string()),
    locations: z.array(z.string()),
    work_modes: z.array(z.enum(["remote", "hybrid", "onsite"])),
    employment_types: z.array(z.string()),
    salary_or_rate: z.string(),
    relocation: z.string(),
    travel: z.string(),
    start_date: z.string()
  }),
  eligibility: z.object({
    work_authorization: z.string(),
    sponsorship_required: z.string()
  }),
  resumes: z.object({
    source_files: z.array(z.string()),
    default_file: z.string()
  }),
  job_platforms: z.array(z.string()),
  consent: z.object({
    profile_truth_confirmed: z.boolean(),
    recruiter_drafts: z.boolean(),
    recruiter_sends: z.boolean(),
    assisted_applications: z.boolean(),
    controlled_submissions: z.boolean(),
    approved_at: z.string()
  })
});

export type OnboardingRecord = z.infer<typeof onboardingSchema>;

const resumeUploadSchema = z.object({
  name: z.string().min(1).max(180),
  mimeType: z.string().max(120).optional().default(""),
  base64: z.string().min(1)
});

export interface ReadinessCheck {
  key: string;
  ready: boolean;
  detail: string;
}

export interface OnboardingReadiness {
  instanceId: string;
  ready: boolean;
  recordPath: string;
  completed: number;
  total: number;
  checks: ReadinessCheck[];
}

function present(value: string): boolean {
  const clean = value.trim();
  return Boolean(clean) && !/pending|unknown|tbd|confirm|clarif/i.test(clean);
}

function resolveResume(instance: UserInstanceConfig, value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(instance.paths.resumeRoot, value);
}

export function onboardingRecordPath(instance: UserInstanceConfig): string {
  return path.join(path.dirname(instance.manifestPath), "onboarding.yaml");
}

export function loadOnboardingRecord(instance: UserInstanceConfig): OnboardingRecord | null {
  const recordPath = onboardingRecordPath(instance);
  if (!fs.existsSync(recordPath)) return null;
  return onboardingSchema.parse(YAML.parse(fs.readFileSync(recordPath, "utf8")));
}

export function saveOnboardingSubmission(
  instance: UserInstanceConfig,
  input: { record: unknown; resume?: unknown }
): { readiness: OnboardingReadiness; savedResume?: string } {
  const record = onboardingSchema.parse(input.record);
  let savedResume: string | undefined;
  if (input.resume) {
    const upload = resumeUploadSchema.parse(input.resume);
    const extension = path.extname(upload.name).toLowerCase();
    if (![".pdf", ".doc", ".docx"].includes(extension)) {
      throw new Error("Resume must be PDF, DOC, or DOCX.");
    }
    const safeBase = path.basename(upload.name).replace(/[^a-zA-Z0-9._ -]+/g, "_");
    const bytes = Buffer.from(upload.base64, "base64");
    if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
      throw new Error("Resume must be between 1 byte and 8 MB.");
    }
    fs.mkdirSync(instance.paths.resumeRoot, { recursive: true });
    savedResume = path.join(instance.paths.resumeRoot, safeBase);
    fs.writeFileSync(savedResume, bytes);
    const storedName = path.basename(savedResume);
    record.resumes.source_files = Array.from(new Set([...record.resumes.source_files, storedName]));
    record.resumes.default_file = storedName;
  }

  fs.writeFileSync(onboardingRecordPath(instance), YAML.stringify(record), "utf8");
  return { readiness: evaluateOnboardingReadiness(instance), savedResume };
}

export function evaluateOnboardingReadiness(instance: UserInstanceConfig): OnboardingReadiness {
  const recordPath = onboardingRecordPath(instance);
  const record = loadOnboardingRecord(instance);
  if (!record) {
    return {
      instanceId: instance.id,
      ready: false,
      recordPath,
      completed: 0,
      total: 1,
      checks: [{ key: "record", ready: false, detail: "Onboarding record is missing." }]
    };
  }

  const resumeFiles = record.resumes.source_files.map((file) => resolveResume(instance, file));
  const defaultResume = record.resumes.default_file
    ? resolveResume(instance, record.resumes.default_file)
    : "";
  const checks: ReadinessCheck[] = [
    { key: "full_name", ready: present(record.identity.full_name), detail: "Full candidate name" },
    { key: "phone", ready: present(record.identity.phone), detail: "Phone number" },
    { key: "location", ready: present(record.identity.location), detail: "Current city/region/country" },
    { key: "linkedin", ready: /^https:\/\/.+/i.test(record.identity.linkedin_url), detail: "LinkedIn URL" },
    { key: "target_titles", ready: record.preferences.target_titles.length > 0, detail: "At least one target title" },
    { key: "locations", ready: record.preferences.locations.length > 0, detail: "At least one preferred location" },
    { key: "work_modes", ready: record.preferences.work_modes.length > 0, detail: "Remote/hybrid/onsite preference" },
    { key: "employment_types", ready: record.preferences.employment_types.length > 0, detail: "Employment type preference" },
    { key: "salary", ready: present(record.preferences.salary_or_rate), detail: "Salary or rate policy" },
    { key: "work_authorization", ready: present(record.eligibility.work_authorization), detail: "Work authorization" },
    { key: "sponsorship", ready: present(record.eligibility.sponsorship_required), detail: "Sponsorship requirement" },
    {
      key: "source_resumes",
      ready: resumeFiles.length > 0 && resumeFiles.every((file) => fs.existsSync(file)),
      detail: "Every declared source resume exists in the private resume vault"
    },
    {
      key: "default_resume",
      ready: Boolean(defaultResume) && fs.existsSync(defaultResume) && resumeFiles.includes(defaultResume),
      detail: "Default resume exists and belongs to the declared source set"
    },
    { key: "platforms", ready: record.job_platforms.length > 0, detail: "At least one job platform" },
    {
      key: "consent",
      ready:
        record.consent.profile_truth_confirmed &&
        record.consent.recruiter_drafts &&
        record.consent.assisted_applications &&
        present(record.consent.approved_at),
      detail: "Truth profile, recruiter drafting, assisted applications, and consent date"
    }
  ];

  const completed = checks.filter((check) => check.ready).length;
  return {
    instanceId: instance.id,
    ready: completed === checks.length,
    recordPath,
    completed,
    total: checks.length,
    checks
  };
}

export function assertOnboardingReady(instance: UserInstanceConfig): void {
  const readiness = evaluateOnboardingReadiness(instance);
  if (!readiness.ready) {
    const missing = readiness.checks.filter((check) => !check.ready).map((check) => check.key).join(", ");
    throw new Error(`Onboarding is incomplete for '${instance.id}'. Missing: ${missing}.`);
  }
}
