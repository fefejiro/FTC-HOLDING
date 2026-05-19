import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { RecruiterMessage } from "./types.js";

export type HuntJobStatus = "discovered" | "scored" | "package_ready" | "package_generated" | "needs_review" | "blocked";
export type HuntSource = "manual" | "gmail_alert" | "greenhouse" | "lever" | "ashby" | "linkedin" | "indeed" | "dice" | "workday" | "recruiter" | "agency_alert";

export interface HuntJobInput {
  title?: string;
  company?: string;
  location?: string;
  work_mode?: string;
  employment_type?: string;
  source?: HuntSource | string;
  source_url?: string;
  apply_url?: string;
  description?: string;
  required_skills?: string[];
  preferred_skills?: string[];
  work_authorization_language?: string;
  salary_or_rate?: string;
  red_flags?: string[];
  gmail_message_id?: string;
  gmail_thread_id?: string;
  recruiter_email?: string;
}

export interface NormalizedHuntJob {
  title: string;
  company: string;
  location: string;
  work_mode: string;
  employment_type: string;
  source: string;
  source_url: string;
  apply_url: string;
  description: string;
  required_skills: string;
  preferred_skills: string;
  work_authorization_language: string;
  salary_or_rate: string;
  red_flags: string;
  gmail_message_id: string;
  gmail_thread_id: string;
  recruiter_email: string;
  needs_review: number;
}

const FORBIDDEN_AUTH_CLAIMS = [/\bu\.?s\.? citizen\b/i, /green card/i, /permanent resident/i, /security clearance/i];
const SENSITIVE_REVIEW = /\b(salary|rate|work authorization|visa|sponsorship|relocation|eeo|legal attestation|references?|sin|ssn|passport|date of birth|dob|final submit)\b/i;
const JOB_ALERT_SENDERS = /\b(linkedin|indeed|dice|workday|greenhouse|lever|ashby|recruit|talent|staffing|agency|jobs?)\b/i;
const JOB_ALERT_SUBJECTS = /\b(job alert|jobs? for you|new jobs?|recommended jobs?|job matches?|hiring|opening|opportunit|application|position)\b/i;
const SOURCE_HOSTS: Array<[RegExp, HuntSource]> = [
  [/greenhouse\.io|boards\.greenhouse/i, "greenhouse"],
  [/lever\.co|jobs\.lever/i, "lever"],
  [/ashbyhq\.com|jobs\.ashbyhq/i, "ashby"],
  [/linkedin\.com/i, "linkedin"],
  [/indeed\.com/i, "indeed"],
  [/dice\.com/i, "dice"],
  [/myworkdayjobs\.com|workdayjobs\.com/i, "workday"]
];

export function parseManualJobText(content: string): NormalizedHuntJob {
  const normalizedContent = stripByteOrderMark(content);
  const sourceUrl = getLabel(normalizedContent, "Source URL");
  const applyUrl = getLabel(normalizedContent, "Apply URL") || extractUrls(normalizedContent).find(isKnownJobUrl) || sourceUrl;
  return normalizeHuntJob({
    title: getLabel(normalizedContent, "Title") || guessTitle(normalizedContent),
    company: getLabel(normalizedContent, "Company") || getLabel(normalizedContent, "Employer") || guessCompany(normalizedContent),
    location: getLabel(normalizedContent, "Location"),
    source: normalizeSourceName(getLabel(normalizedContent, "Source") || applyUrl || sourceUrl || "manual"),
    source_url: sourceUrl,
    apply_url: applyUrl,
    description: getLabelBlock(normalizedContent, "Description") || normalizedContent.trim(),
    required_skills: extractSkills(normalizedContent, /required(?: skills| qualifications)?:([\s\S]*?)(?:preferred(?: skills| qualifications)?:|benefits?:|salary:|$)/i),
    preferred_skills: extractSkills(normalizedContent, /preferred(?: skills| qualifications)?:([\s\S]*?)(?:benefits?:|salary:|$)/i),
    work_authorization_language: extractLine(normalizedContent, /(work authorization|visa|sponsorship)[^\n]*/i),
    salary_or_rate: extractSalary(normalizedContent)
  });
}

export function isJobAlertEmail(message: Pick<RecruiterMessage, "from" | "subject" | "body">): boolean {
  const combined = `${message.from}\n${message.subject}\n${message.body}`;
  if (JOB_ALERT_SENDERS.test(message.from) && JOB_ALERT_SUBJECTS.test(message.subject)) return true;
  if (SOURCE_HOSTS.some(([re]) => re.test(combined)) && JOB_ALERT_SUBJECTS.test(combined)) return true;
  return /\b(apply now|view job|job description|posted|remote|hybrid)\b/i.test(message.body) && JOB_ALERT_SENDERS.test(combined);
}

export function parseGmailJobAlert(message: RecruiterMessage): NormalizedHuntJob[] {
  if (!isJobAlertEmail(message)) return [];
  const urls = extractUrls(message.body);
  const sourceUrl = urls.find(isKnownJobUrl) || urls[0] || "";
  const source = normalizeSourceName(`${message.from} ${message.subject} ${sourceUrl}`);
  const blocks = splitPossibleJobBlocks(message.body);
  const jobs = blocks
    .map((block) => normalizeHuntJob({
      title: getLabel(block, "Title") || guessTitle(block) || guessTitle(message.subject),
      company: getLabel(block, "Company") || guessCompany(block) || guessCompany(message.from),
      location: getLabel(block, "Location") || guessLocation(block),
      source,
      source_url: sourceUrl,
      apply_url: extractUrls(block).find(isKnownJobUrl) || sourceUrl,
      description: block.trim() || message.body,
      required_skills: extractSkills(block, /(?:required|requirements|qualifications):([\s\S]*?)(?:preferred|benefits|apply|$)/i),
      preferred_skills: extractSkills(block, /preferred:([\s\S]*?)(?:benefits|apply|$)/i),
      work_authorization_language: extractLine(block, /(work authorization|visa|sponsorship)[^\n]*/i),
      salary_or_rate: extractSalary(block),
      gmail_message_id: message.messageId,
      gmail_thread_id: message.threadId,
      recruiter_email: extractEmail(message.from)
    }))
    .filter((job) => job.title || job.company || job.apply_url);
  return jobs.length > 0 ? jobs : [normalizeHuntJob({
    title: guessTitle(message.subject),
    company: guessCompany(message.from),
    source,
    source_url: sourceUrl,
    apply_url: sourceUrl,
    description: message.body,
    gmail_message_id: message.messageId,
    gmail_thread_id: message.threadId,
    recruiter_email: extractEmail(message.from)
  })];
}

export function normalizeSourceJob(input: HuntJobInput): NormalizedHuntJob {
  return normalizeHuntJob({ ...input, source: normalizeSourceName(`${input.source || ""} ${input.source_url || ""} ${input.apply_url || ""}`) });
}

export function ingestManualJob(db: Database.Database, filePath: string): number {
  const content = fs.readFileSync(path.resolve(filePath), "utf-8");
  return insertHuntJob(db, parseManualJobText(content));
}

export function ingestGmailJobAlerts(db: Database.Database, messages: RecruiterMessage[]): { messages: number; jobs: number } {
  let alertMessages = 0;
  let jobs = 0;
  for (const message of messages) {
    const parsed = parseGmailJobAlert(message);
    if (parsed.length === 0) continue;
    alertMessages += 1;
    for (const job of parsed) {
      if (hasExistingHuntJob(db, job)) continue;
      insertHuntJob(db, job);
      jobs += 1;
    }
  }
  return { messages: alertMessages, jobs };
}

export function insertHuntJob(db: Database.Database, p: NormalizedHuntJob): number {
  const stmt = db.prepare(`INSERT INTO hunt_jobs (title,company,location,work_mode,employment_type,source,source_url,apply_url,description,required_skills,preferred_skills,work_authorization_language,salary_or_rate,red_flags,gmail_message_id,gmail_thread_id,recruiter_email,status,needs_review,created_at,updated_at) VALUES (@title,@company,@location,@work_mode,@employment_type,@source,@source_url,@apply_url,@description,@required_skills,@preferred_skills,@work_authorization_language,@salary_or_rate,@red_flags,@gmail_message_id,@gmail_thread_id,@recruiter_email,@status,@needs_review,@created_at,@updated_at)`);
  const now = new Date().toISOString();
  const info = stmt.run({ ...p, status: p.needs_review ? "needs_review" : "discovered", created_at: now, updated_at: now });
  return Number(info.lastInsertRowid);
}

export function scoreJobs(db: Database.Database): number {
  const jobs = db.prepare("SELECT id, description, required_skills, needs_review, red_flags FROM hunt_jobs WHERE status IN ('discovered','needs_review')").all() as any[];
  let n = 0;
  for (const j of jobs) {
    const skills = parseJsonArray(j.required_skills);
    const flags = parseJsonArray(j.red_flags);
    const score = Math.min(100, 35 + skills.length * 9 + (/typescript|node|react|salesforce|workflow|ai|automation|crm/i.test(j.description) ? 20 : 0));
    const status = flags.includes("forbidden_auth_claim_present") ? "blocked" : j.needs_review ? "needs_review" : score >= 60 ? "scored" : "blocked";
    db.prepare("UPDATE hunt_jobs SET score=?, status=?, updated_at=? WHERE id=?").run(score, status, new Date().toISOString(), j.id);
    n++;
  }
  return n;
}

export function generatePackages(db: Database.Database): number {
  const jobs = db.prepare("SELECT id,title,company,description,work_authorization_language FROM hunt_jobs WHERE status='scored'").all() as any[];
  let n = 0;
  for (const j of jobs) {
    if (FORBIDDEN_AUTH_CLAIMS.some((re) => re.test(`${j.description} ${j.work_authorization_language || ""}`))) {
      db.prepare("UPDATE hunt_jobs SET status='blocked', needs_review=1, updated_at=? WHERE id=?").run(new Date().toISOString(), j.id);
      continue;
    }
    const resume = `Tailored resume summary for ${j.title} at ${j.company}. Focus: systems delivery, automation, stakeholder clarity, and measurable execution.`;
    const cover = `Dear Hiring Team,\n\nI am interested in the ${j.title} role at ${j.company}. My background combines product delivery, workflow automation, CRM systems, and practical AI tooling. I would welcome the chance to discuss how that mix can help your team move faster with less operational drag.`;
    db.prepare("INSERT INTO hunt_packages (job_id,resume_text,cover_letter_text,next_action,created_at) VALUES (?,?,?,?,?)").run(j.id, resume, cover, "review_outreach_drafts", new Date().toISOString());
    db.prepare("UPDATE hunt_jobs SET status='package_generated', updated_at=? WHERE id=?").run(new Date().toISOString(), j.id);
    n++;
  }
  return n;
}

export function generateOutreachDrafts(db: Database.Database): number {
  const rows = db.prepare("SELECT id,title,company,recruiter_email FROM hunt_jobs WHERE status='package_generated'").all() as any[];
  const templates = ["linkedin_connection_note", "recruiter_followup_email", "cold_recruiter_intro", "post_application_followup"];
  let count = 0;
  for (const r of rows) {
    for (const draftType of templates) {
      if ((db.prepare("SELECT COUNT(*) as c FROM hunt_outreach_drafts WHERE job_id=? AND draft_type=?").get(r.id, draftType) as any).c > 0) continue;
      const body = sanitizeDraft(buildOutreachBody(draftType, r.title, r.company));
      db.prepare("INSERT INTO hunt_outreach_drafts (job_id,draft_type,body,status,created_at) VALUES (?,?,?,?,?)").run(r.id, draftType, body, "waiting", new Date().toISOString());
      count++;
    }
  }
  return count;
}

export function buildHuntReport(db: Database.Database): string {
  const statuses = ["discovered", "scored", "package_ready", "package_generated", "needs_review", "blocked"];
  const counts = Object.fromEntries(statuses.map((s) => [s, (db.prepare("SELECT COUNT(*) as c FROM hunt_jobs WHERE status=?").get(s) as any).c]));
  const drafts = (db.prepare("SELECT COUNT(*) as c FROM hunt_outreach_drafts WHERE status='waiting'").get() as any).c;
  const latest = db.prepare("SELECT id,title,company,source,status,score,needs_review FROM hunt_jobs ORDER BY id DESC LIMIT 10").all() as any[];
  const recommended = drafts ? "review_outreach_drafts" : counts.scored ? "run_hunt_package" : counts.discovered ? "run_hunt_score" : counts.needs_review ? "review_sensitive_or_uncertain_jobs" : "ingest_more_jobs";
  return JSON.stringify({ ...counts, outreach_drafts_waiting: drafts, latest, recommended_next_action: recommended }, null, 2);
}

function normalizeHuntJob(input: HuntJobInput): NormalizedHuntJob {
  const description = cleanText(input.description || "");
  const redFlags = [...(input.red_flags || []), ...detectRedFlags(`${description}\n${input.work_authorization_language || ""}`)];
  const needsReview = !input.title || !input.company || redFlags.length > 0 || SENSITIVE_REVIEW.test(description);
  return {
    title: cleanText(input.title || ""),
    company: cleanText(input.company || ""),
    location: cleanText(input.location || ""),
    work_mode: input.work_mode || detectWorkMode(description),
    employment_type: input.employment_type || detectEmploymentType(description),
    source: String(input.source || "manual"),
    source_url: input.source_url || "",
    apply_url: input.apply_url || input.source_url || "",
    description,
    required_skills: JSON.stringify(input.required_skills || []),
    preferred_skills: JSON.stringify(input.preferred_skills || []),
    work_authorization_language: input.work_authorization_language || "",
    salary_or_rate: input.salary_or_rate || extractSalary(description),
    red_flags: JSON.stringify([...new Set(redFlags)]),
    gmail_message_id: input.gmail_message_id || "",
    gmail_thread_id: input.gmail_thread_id || "",
    recruiter_email: input.recruiter_email || "",
    needs_review: needsReview ? 1 : 0
  };
}

function hasExistingHuntJob(db: Database.Database, job: NormalizedHuntJob): boolean {
  if (job.apply_url) {
    const byUrl = db.prepare("SELECT id FROM hunt_jobs WHERE apply_url=? LIMIT 1").get(job.apply_url);
    if (byUrl) return true;
  }
  if (job.gmail_message_id && job.title) {
    const byMessage = db.prepare("SELECT id FROM hunt_jobs WHERE gmail_message_id=? AND title=? LIMIT 1").get(job.gmail_message_id, job.title);
    if (byMessage) return true;
  }
  return false;
}

function getLabel(content: string, label: string): string {
  const match = content.match(new RegExp(`^${escapeRegex(label)}:\\s*(.+)$`, "im"));
  return match ? cleanText(match[1]) : "";
}

function getLabelBlock(content: string, label: string): string {
  const match = content.match(new RegExp(`^${escapeRegex(label)}:\\s*([\\s\\S]+)$`, "im"));
  return match ? cleanText(match[1]) : "";
}

function extractSkills(content: string, re: RegExp): string[] {
  const match = content.match(re);
  if (!match) return [];
  return match[1].split(/\n|,|;/).map((s) => cleanText(s.replace(/^[-*]\s*/, ""))).filter(Boolean).slice(0, 20);
}

function splitPossibleJobBlocks(content: string): string[] {
  const chunks = content.split(/\n(?=(?:title|role|position|job):\s)|\n{2,}(?=.*\b(apply|view job|remote|hybrid)\b)/i).map(cleanText).filter(Boolean);
  return chunks.length > 1 ? chunks.slice(0, 10) : [content];
}

function guessTitle(content: string): string {
  const lines = content.split(/\r?\n/).map(cleanText).filter(Boolean);
  return lines.find((line) => /\b(engineer|developer|manager|analyst|architect|consultant|specialist|designer|scientist|product|program|project)\b/i.test(line) && line.length < 100) || "";
}

function guessCompany(content: string): string {
  const fromName = content.match(/^"?([^"<@]+)"?\s*</)?.[1];
  if (fromName && !/jobs?|recruit|talent|notification|alert/i.test(fromName)) return cleanText(fromName);
  const company = content.match(/\b(?:at|company:)\s+([A-Z][A-Za-z0-9&.,' -]{2,50})/);
  return company ? cleanText(company[1]) : "";
}

function guessLocation(content: string): string {
  return extractLine(content, /\b(remote|hybrid|onsite|on-site|toronto|canada|united states|usa|new york|san francisco|austin|seattle)\b[^\n]*/i);
}

function normalizeSourceName(value: string): HuntSource | string {
  for (const [re, source] of SOURCE_HOSTS) {
    if (re.test(value)) return source;
  }
  if (/recruit|talent|staffing|agency/i.test(value)) return "recruiter";
  return value && value !== "manual" ? "gmail_alert" : "manual";
}

function detectWorkMode(text: string): string {
  if (/hybrid/i.test(text)) return "hybrid";
  if (/remote/i.test(text)) return "remote";
  if (/onsite|on-site/i.test(text)) return "onsite";
  return "";
}

function detectEmploymentType(text: string): string {
  if (/contract|corp-to-corp|c2c|w2/i.test(text)) return "contract";
  if (/full[- ]?time/i.test(text)) return "full-time";
  if (/part[- ]?time/i.test(text)) return "part-time";
  return "";
}

function detectRedFlags(text: string): string[] {
  const flags: string[] = [];
  if (FORBIDDEN_AUTH_CLAIMS.some((re) => re.test(text))) flags.push("forbidden_auth_claim_present");
  if (SENSITIVE_REVIEW.test(text)) flags.push("sensitive_fields_present");
  return flags;
}

function extractLine(content: string, re: RegExp): string {
  return content.split(/\r?\n/).find((line) => re.test(line))?.trim() || "";
}

function extractSalary(content: string): string {
  return content.match(/(?:\$|CAD|USD)\s?\d[\d,]*k?(?:\s?[-/to]+\s?(?:\$|CAD|USD)?\s?\d[\d,]*k?)?(?:\s?(?:per|\/)\s?(?:hour|hr|year|yr))?|\b\d{2,3}k\b/i)?.[0] || "";
}

function extractUrls(content: string): string[] {
  return [...content.matchAll(/https?:\/\/[^\s<>"')]+/gi)].map((m) => m[0].replace(/[.,;]+$/, ""));
}

function isKnownJobUrl(url: string): boolean {
  return SOURCE_HOSTS.some(([re]) => re.test(url)) || /\/jobs?\//i.test(url);
}

function extractEmail(from: string): string {
  return from.match(/<([^>]+)>/)?.[1] || from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function buildOutreachBody(draftType: string, title: string, company: string): string {
  const role = title || "the role";
  const org = company || "your team";
  if (draftType === "linkedin_connection_note") return `Hi, I saw ${role} at ${org} and wanted to connect. My background spans systems delivery, automation, and practical AI workflows.`;
  if (draftType === "recruiter_followup_email") return `Hi, I am following up on ${role} at ${org}. I am interested and would value any guidance on fit, timing, and next steps.`;
  if (draftType === "post_application_followup") return `Hi, I applied for ${role} at ${org}. I wanted to share my continued interest and ask if there is anything useful I can clarify.`;
  return `Hi, I am exploring ${role} opportunities and noticed ${org}. My work combines product delivery, CRM systems, automation, and AI workflow implementation.`;
}

function sanitizeDraft(body: string): string {
  const clean = cleanText(body.replace(/[—–]/g, "-").replace(/<[^>]+>/g, ""));
  return clean.split(/\s+/).slice(0, 120).join(" ");
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripByteOrderMark(value: string): string {
  return value.replace(/^\uFEFF/, "");
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
