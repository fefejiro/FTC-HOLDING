import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import YAML from "yaml";
import { buildTailoredCoverLetter, buildTailoredResumeContent, renderTailoredResumeText } from "./resume_style.js";
import type { RecruiterMessage } from "./types.js";
export { scrapeDice, scrapeIndeed, ingestScrapedJobs } from "./hunt/scraper.js";

export type HuntJobStatus =
  | "discovered"
  | "scored"
  | "package_ready"
  | "package_generated"
  | "outreach_ready"
  | "apply_ready"
  | "applied"
  | "interview"
  | "rejected"
  | "follow_up_due"
  | "needs_review"
  | "blocked";
export type HuntSource = "manual" | "gmail_alert" | "greenhouse" | "lever" | "ashby" | "linkedin" | "indeed" | "dice" | "monster" | "workday" | "recruiter" | "agency_alert";
export type HuntTier = "tier_1" | "tier_2" | "tier_3" | "blocked";

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

interface TruthBlocks {
  employment?: Array<{ bullets?: string[] }>;
  skills_pool?: string[];
  summary_pool?: string[];
}

export interface HuntScoreResult {
  score: number;
  tier: HuntTier;
  status: HuntJobStatus;
  next_action: string;
  reason: string;
}

const FORBIDDEN_AUTH_CLAIMS = [/\bu\.?s\.? citizen\b/i, /green card/i, /permanent resident/i, /security clearance/i];
const SENSITIVE_REVIEW = /\b(salary|rate|work authorization|visa|sponsorship|relocation|eeo|legal attestation|references?|sin|ssn|passport|date of birth|dob|final submit)\b/i;
const TIER_1_ROLES = /\b(business systems manager|technical program manager|program manager|senior manager|product owner|product manager|director)\b/i;
const TIER_2_ROLES = /\b(technical project manager|delivery manager|implementation manager|business analyst|systems analyst|solution consultant|project manager)\b/i;
const SYSTEMS_SIGNALS = /\b(erp|wms|warehouse management|pos|api|integration|integrations|enterprise systems|business systems|retail systems|supply chain|digital transformation|platform delivery|cloud migration|operations technology|uat|vendor|stakeholder|product ownership|program delivery|manhattan|sap|gcp|salesforce|crm)\b/i;
const AUTOMATION_SIGNALS = /\b(ai|automation|workflow|node|typescript|react|cloud|data|reporting)\b/i;
const JOB_ALERT_SENDERS = /\b(linkedin|indeed|dice|workday|greenhouse|lever|ashby|recruit|talent|staffing|agency|jobs?)\b/i;
const JOB_ALERT_SUBJECTS = /\b(job alert|jobs? for you|new jobs?|recommended jobs?|job matches?|hiring|opening|opportunit|application|position)\b/i;
const SOURCE_HOSTS: Array<[RegExp, HuntSource]> = [
  [/greenhouse\.io|boards\.greenhouse/i, "greenhouse"],
  [/lever\.co|jobs\.lever/i, "lever"],
  [/ashbyhq\.com|jobs\.ashbyhq/i, "ashby"],
  [/linkedin\.com/i, "linkedin"],
  [/indeed\.com/i, "indeed"],
  [/dice\.com/i, "dice"],
  [/monster\.(?:com|ca)/i, "monster"],
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
  const parsed = parseManualJobText(content);
  assertRealJobRecord(parsed);
  return insertHuntJob(db, parsed);
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
      const jobId = insertHuntJob(db, job);
      upsertHuntContact(db, jobId, job);
      jobs += 1;
    }
  }
  return { messages: alertMessages, jobs };
}

export function insertHuntJob(db: Database.Database, p: NormalizedHuntJob): number {
  assertRealJobRecord(p);
  const stmt = db.prepare(`INSERT INTO hunt_jobs (title,company,location,work_mode,employment_type,source,source_url,apply_url,description,required_skills,preferred_skills,work_authorization_language,salary_or_rate,red_flags,gmail_message_id,gmail_thread_id,recruiter_email,status,needs_review,created_at,updated_at) VALUES (@title,@company,@location,@work_mode,@employment_type,@source,@source_url,@apply_url,@description,@required_skills,@preferred_skills,@work_authorization_language,@salary_or_rate,@red_flags,@gmail_message_id,@gmail_thread_id,@recruiter_email,@status,@needs_review,@created_at,@updated_at)`);
  const now = new Date().toISOString();
  const info = stmt.run({ ...p, status: p.needs_review ? "needs_review" : "discovered", created_at: now, updated_at: now });
  return Number(info.lastInsertRowid);
}

export function scoreJobs(db: Database.Database): number {
  const jobs = db.prepare("SELECT id,title,company,location,work_mode,description,required_skills,preferred_skills,needs_review,red_flags,source,recruiter_email FROM hunt_jobs WHERE status IN ('discovered','needs_review')").all() as any[];
  let n = 0;
  for (const j of jobs) {
    const result = scoreHuntJob(j);
    db.prepare("UPDATE hunt_jobs SET score=?, tier=?, tier_reason=?, status=?, next_action=?, updated_at=? WHERE id=?")
      .run(result.score, result.tier, result.reason, result.status, result.next_action, new Date().toISOString(), j.id);
    upsertHuntContact(db, j.id, {
      company: j.company,
      source: j.source,
      recruiter_email: j.recruiter_email
    });
    n++;
  }
  return n;
}

export function scoreHuntJob(job: {
  title?: string;
  company?: string;
  location?: string;
  work_mode?: string;
  description?: string;
  required_skills?: string;
  preferred_skills?: string;
  needs_review?: number;
  red_flags?: string;
}): HuntScoreResult {
  const requiredSkills = parseJsonArray(job.required_skills || "[]");
  const preferredSkills = parseJsonArray(job.preferred_skills || "[]");
  const flags = parseJsonArray(job.red_flags || "[]");
  const haystack = `${job.title || ""}\n${job.company || ""}\n${job.description || ""}\n${requiredSkills.join("\n")}\n${preferredSkills.join("\n")}`;

  if (flags.includes("forbidden_auth_claim_present") || FORBIDDEN_AUTH_CLAIMS.some((re) => re.test(haystack))) {
    return {
      score: 0,
      tier: "blocked",
      status: "blocked",
      next_action: "do_not_apply",
      reason: "Hard block: forbidden work authorization, permanent residency, citizenship, or clearance language."
    };
  }

  const roleTier1 = TIER_1_ROLES.test(haystack);
  const roleTier2 = TIER_2_ROLES.test(haystack);
  const systems = countMatches(haystack, SYSTEMS_SIGNALS);
  const automation = countMatches(haystack, AUTOMATION_SIGNALS);
  const skillScore = Math.min(24, (requiredSkills.length + preferredSkills.length) * 4);
  const geoScore = scoreGeographyPreference(job.location || "", job.work_mode || "");

  if (roleTier1 && systems > 0) {
    return {
      score: Math.min(100, 72 + systems * 6 + automation * 3 + skillScore + geoScore),
      tier: "tier_1",
      status: job.needs_review ? "needs_review" : "scored",
      next_action: job.needs_review ? "review_sensitive_fields_then_package" : "generate_package",
      reason: "Tier 1 role with enterprise systems, platform, integration, retail, supply chain, or transformation signal."
    };
  }

  if (roleTier1 || (roleTier2 && systems > 0)) {
    return {
      score: Math.min(89, 58 + systems * 5 + automation * 2 + skillScore + geoScore),
      tier: "tier_2",
      status: "needs_review",
      next_action: "review_medium_fit",
      reason: roleTier1
        ? "Tier 1 role title found, but systems/platform signal is weak or unclear."
        : "Tier 2 delivery, BA, implementation, or project role with systems signal."
    };
  }

  const genericProject = /\bproject manager\b/i.test(haystack);
  if (genericProject && systems === 0) {
    return {
      score: Math.min(100, 35 + geoScore),
      tier: "tier_3",
      status: "blocked",
      next_action: "skip_generic_pm",
      reason: "Generic Project Manager role without ERP, WMS, POS, API, platform, or transformation signal."
    };
  }

  const score = Math.min(74, 35 + systems * 6 + automation * 4 + skillScore + geoScore);
  return {
    score,
    tier: score >= 60 ? "tier_3" : "blocked",
    status: score >= 60 ? (job.needs_review ? "needs_review" : "scored") : "blocked",
    next_action: score >= 60 ? (job.needs_review ? "review_sensitive_fields_then_package" : "review_low_fit") : "skip_low_fit",
    reason: score >= 60 ? "Some relevant signals found, but not enough for Tier 1 or Tier 2." : "Low fit for the current hunt strategy."
  };
}

function scoreGeographyPreference(location: string, workMode: string): number {
  const blob = `${location || ""} ${workMode || ""}`.toLowerCase();
  let bonus = 0;

  if (/\b(remote\b|work from home|wfh)\b/.test(blob)) bonus += 12;
  else if (/\bhybrid\b/.test(blob)) bonus += 10;
  else if (/\bonsite\b|\bon-site\b|\bon site\b/.test(blob)) bonus += 6;

  if (/\b(canada|toronto|ontario|vancouver|montreal|calgary|ottawa|edmonton|winnipeg|halifax)\b/.test(blob)) {
    bonus += 12;
  }
  if (/\b(united states|usa|u\.s\.a\.|u\.s\.)\b/.test(blob)) {
    bonus += 12;
  }

  return Math.min(24, bonus);
}

export function generatePackages(db: Database.Database): number {
  const jobs = db.prepare(`
    SELECT id,title,company,description,required_skills,preferred_skills,work_authorization_language,status,next_action,tier
    FROM hunt_jobs
    WHERE status = 'scored'
       OR (
         status = 'needs_review'
         AND next_action = 'review_medium_fit'
         AND COALESCE(tier, '') IN ('tier_1','tier_2','tier_3')
       )
  `).all() as any[];
  let n = 0;
  for (const j of jobs) {
    const title = cleanText(j.title || "");
    const company = cleanText(j.company || "");
    if (!title || !company) {
      db.prepare("UPDATE hunt_jobs SET status='needs_review', needs_review=1, next_action='review_missing_role_or_company', updated_at=? WHERE id=?").run(new Date().toISOString(), j.id);
      continue;
    }

    if (FORBIDDEN_AUTH_CLAIMS.some((re) => re.test(`${j.description} ${j.work_authorization_language || ""}`))) {
      db.prepare("UPDATE hunt_jobs SET status='blocked', needs_review=1, updated_at=? WHERE id=?").run(new Date().toISOString(), j.id);
      continue;
    }

    const requiredSkills = parseJsonArray(j.required_skills);
    const preferredSkills = parseJsonArray(j.preferred_skills);
    const styledResume = buildTailoredResumeContent({
      roleTitle: title,
      company,
      jdText: j.description || ""
    });

    if (styledResume.needsReview) {
      db.prepare("UPDATE hunt_jobs SET status='needs_review', needs_review=1, next_action='review_resume_contamination', updated_at=? WHERE id=?").run(new Date().toISOString(), j.id);
      continue;
    }

    const resume = renderTailoredResumeText(styledResume);
    const cover = buildCoverLetterText({
      title,
      company,
      requiredSkills,
      preferredSkills,
      truth: {}
    });

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO hunt_packages (job_id,resume_text,cover_letter_text,next_action,created_at)
      VALUES (?,?,?,?,?)
      ON CONFLICT(job_id) DO UPDATE SET
        resume_text=excluded.resume_text,
        cover_letter_text=excluded.cover_letter_text,
        next_action=excluded.next_action
    `).run(j.id, resume, cover, "review_outreach_drafts", now);
    db.prepare("UPDATE hunt_jobs SET status='package_generated', next_action='review_apply_assist', updated_at=? WHERE id=?").run(now, j.id);
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

export function upsertHuntContact(db: Database.Database, jobId: number, job: Pick<HuntJobInput, "company" | "source" | "recruiter_email">): number | null {
  const email = cleanText(job.recruiter_email || "");
  const company = cleanText(job.company || "");
  if (!email && !company) return null;

  const now = new Date().toISOString();
  const existing = db
    .prepare("SELECT id FROM hunt_contacts WHERE COALESCE(email,'')=? AND COALESCE(company,'')=? LIMIT 1")
    .get(email, company) as { id: number } | undefined;

  if (existing) {
    db.prepare("UPDATE hunt_contacts SET source=?, last_job_id=?, updated_at=? WHERE id=?")
      .run(job.source || "", jobId, now, existing.id);
    return existing.id;
  }

  const info = db.prepare("INSERT INTO hunt_contacts (name,email,company,source,last_job_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
    .run("", email, company, job.source || "", jobId, now, now);
  return Number(info.lastInsertRowid);
}

export function generateFollowups(db: Database.Database, now = new Date()): number {
  const rows = db.prepare(`
    SELECT id,title,company,source,recruiter_email,created_at,status
    FROM hunt_jobs
    WHERE status IN ('package_generated','outreach_ready','apply_ready','applied','follow_up_due')
  `).all() as any[];
  const schedule = [
    { type: "day_2_followup", days: 2 },
    { type: "day_5_followup", days: 5 },
    { type: "day_10_followup", days: 10 }
  ];
  let created = 0;

  for (const row of rows) {
    const contactId = upsertHuntContact(db, row.id, row);
    const createdAt = new Date(row.created_at || now.toISOString());
    for (const item of schedule) {
      const due = addDays(createdAt, item.days);
      const note = `${item.type.replace(/_/g, " ")} for ${row.title || "role"}${row.company ? ` at ${row.company}` : ""}`;
      const result = db.prepare(`
        INSERT OR IGNORE INTO hunt_followups (job_id,contact_id,followup_type,due_at,status,note,created_at)
        VALUES (?,?,?,?,?,?,?)
      `).run(row.id, contactId, item.type, due.toISOString(), due <= now ? "due" : "scheduled", note, new Date().toISOString());
      if (result.changes > 0) created += 1;
    }
  }

  db.prepare(`
    UPDATE hunt_jobs
    SET status='follow_up_due', next_action='review_due_followups', updated_at=?
    WHERE id IN (SELECT job_id FROM hunt_followups WHERE status='due')
      AND status IN ('package_generated','outreach_ready','apply_ready','applied')
  `).run(new Date().toISOString());

  return created;
}

export function getDueFollowups(db: Database.Database, now = new Date()): any[] {
  db.prepare("UPDATE hunt_followups SET status='due' WHERE status='scheduled' AND due_at<=?")
    .run(now.toISOString());
  return db.prepare(`
    SELECT f.id,f.job_id,f.contact_id,f.followup_type,f.due_at,f.status,f.note,j.title,j.company,c.email
    FROM hunt_followups f
    LEFT JOIN hunt_jobs j ON j.id=f.job_id
    LEFT JOIN hunt_contacts c ON c.id=f.contact_id
    WHERE f.status='due'
    ORDER BY f.due_at ASC, f.id ASC
  `).all();
}

export function listDueFollowups(db: Database.Database): any[] {
  return db.prepare(`
    SELECT f.id,f.job_id,f.contact_id,f.followup_type,f.due_at,f.status,f.note,j.title,j.company,c.email
    FROM hunt_followups f
    LEFT JOIN hunt_jobs j ON j.id=f.job_id
    LEFT JOIN hunt_contacts c ON c.id=f.contact_id
    WHERE f.status='due'
    ORDER BY f.due_at ASC, f.id ASC
  `).all();
}

export function getHuntContacts(db: Database.Database): any[] {
  return db.prepare("SELECT id,name,email,company,source,last_job_id,last_contacted_at,created_at,updated_at FROM hunt_contacts ORDER BY updated_at DESC, id DESC LIMIT 25").all();
}

export function generateApplyAssist(db: Database.Database): number {
  const SAFE_FIELDS = ["name", "email", "phone", "city", "linkedin_url", "portfolio_website", "current_title", "current_company", "resume_upload", "cover_letter_upload"];
  const PAUSE_FIELDS = ["work_authorization", "sponsorship", "salary_rate", "relocation", "eeo", "legal_attestation", "references", "sin_ssn", "passport", "date_of_birth", "final_submit"];
  
  const jobs = db.prepare(`
    SELECT id, title, company, description, apply_url, source, source_url, work_authorization_language 
    FROM hunt_jobs j
    WHERE status IN ('package_generated', 'outreach_ready') 
    AND NOT EXISTS (SELECT 1 FROM hunt_apply_sessions WHERE job_id = j.id)
  `).all() as any[];

  let n = 0;
  for (const job of jobs) {
    if (!job.apply_url) continue;

    const applyUrl = job.apply_url;
    const isWorkday = /myworkdayjobs\.com|workdayjobs\.com/i.test(applyUrl);
    const isGreenhouse = /greenhouse\.io|boards\.greenhouse/i.test(applyUrl);
    const isLever = /lever\.co|jobs\.lever/i.test(applyUrl);
    const isAshby = /ashbyhq\.com|jobs\.ashbyhq/i.test(applyUrl);

    const pauseFields = [...PAUSE_FIELDS];
    if (job.description) {
      if (SENSITIVE_REVIEW.test(job.description)) {
        pauseFields.push("sensitive_content_detected");
      }
    }
    if (job.work_authorization_language) {
      if (SENSITIVE_REVIEW.test(job.work_authorization_language)) {
        pauseFields.push("authorization_language_sensitive");
      }
    }

    const status = isWorkday ? "manual_open_pause" : (isGreenhouse || isLever || isAshby) ? "assist_ready" : "assist_ready";

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO hunt_apply_sessions 
      (job_id, apply_url, status, safe_fields_json, pause_fields_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(job.id, applyUrl, status, JSON.stringify(SAFE_FIELDS), JSON.stringify(pauseFields), now, now);

    db.prepare("UPDATE hunt_jobs SET next_action = ?, updated_at = ? WHERE id = ?").run("review_apply_assist", now, job.id);
    n++;
  }
  return n;
}

export function generateInterviewPrep(db: Database.Database): number {
  const truth = loadTruthBlocks();
  
  const jobs = db.prepare(`
    SELECT id, title, company, description, required_skills, preferred_skills
    FROM hunt_jobs j
    WHERE status = 'interview'
    AND NOT EXISTS (SELECT 1 FROM hunt_interview_prep WHERE job_id = j.id)
  `).all() as any[];

  let n = 0;
  for (const job of jobs) {
    const requiredSkills = parseJsonArray(job.required_skills || "[]");
    const preferredSkills = parseJsonArray(job.preferred_skills || "[]");
    const allSkills = [...requiredSkills, ...preferredSkills];
    
    const companyBrief = `${job.company} - ${job.title || "Role"}`;
    const roleFitSummary = buildTruthBackedResumeText({
      title: job.title,
      company: job.company,
      description: job.description || "",
      requiredSkills,
      preferredSkills,
      truth
    }).split("\n").slice(0, 8).join("\n");

    const likelyQuestions = generateLikelyQuestions(job.title, job.company, job.description || "", requiredSkills);
    const starStories = generateStarStoryPrompts(requiredSkills);
    const technicalTalkingPoints = selectSkills(truth, [...allSkills, job.description].join("\n"));
    const questionsForInterviewer = generateQuestionsForInterviewer(job.company);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO hunt_interview_prep
      (job_id, company_brief, role_fit_summary, likely_questions_json, star_stories_json, technical_talking_points_json, questions_for_interviewer_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      job.id,
      companyBrief,
      roleFitSummary,
      JSON.stringify(likelyQuestions),
      JSON.stringify(starStories),
      JSON.stringify(technicalTalkingPoints),
      JSON.stringify(questionsForInterviewer),
      now,
      now
    );

    db.prepare("UPDATE hunt_jobs SET next_action = ?, updated_at = ? WHERE id = ?").run("review_interview_prep", now, job.id);
    n++;
  }
  return n;
}

export function buildHuntReport(db: Database.Database): string {
  const statuses = [
    "discovered",
    "scored",
    "package_ready",
    "package_generated",
    "outreach_ready",
    "apply_ready",
    "applied",
    "applied_verified",
    "submitted_verified",
    "submitted_unverified",
    "interview",
    "follow_up_due",
    "needs_review",
    "blocked"
  ];
  const counts = Object.fromEntries(statuses.map((s) => [s, (db.prepare("SELECT COUNT(*) as c FROM hunt_jobs WHERE status=?").get(s) as any).c]));
  const drafts = (db.prepare("SELECT COUNT(*) as c FROM hunt_outreach_drafts WHERE status='waiting'").get() as any).c;
  const followupsDue = (db.prepare("SELECT COUNT(*) as c FROM hunt_followups WHERE status='due'").get() as any).c;
  const contacts = (db.prepare("SELECT COUNT(*) as c FROM hunt_contacts").get() as any).c;
  const recruiterWaiting = (db.prepare("SELECT COUNT(*) as c FROM email_auto_response_attempts WHERE status='waiting_review'").get() as any).c;
  const tierCounts = Object.fromEntries(["tier_1", "tier_2", "tier_3", "blocked"].map((tier) => [tier, (db.prepare("SELECT COUNT(*) as c FROM hunt_jobs WHERE tier=?").get(tier) as any).c]));
  const latest = db.prepare("SELECT id,title,company,source,status,score,tier,next_action,needs_review FROM hunt_jobs ORDER BY id DESC LIMIT 10").all() as any[];
  const recommended = followupsDue ? "review_due_followups" : drafts ? "review_outreach_drafts" : counts.scored ? "run_hunt_package" : counts.discovered ? "run_hunt_score" : counts.needs_review ? "review_sensitive_or_uncertain_jobs" : "ingest_more_jobs";
  return JSON.stringify({
    ...counts,
    tier_counts: tierCounts,
    contacts,
    followups_due: followupsDue,
    outreach_drafts_waiting: drafts,
    apply_assist_ready: (db.prepare("SELECT COUNT(*) as c FROM hunt_apply_sessions WHERE status='assist_ready'").get() as any).c,
    apply_assist_needs_review: (db.prepare("SELECT COUNT(*) as c FROM hunt_apply_sessions WHERE status='manual_open_pause'").get() as any).c,
    interview_prep_ready: (db.prepare("SELECT COUNT(*) as c FROM hunt_interview_prep").get() as any).c,
    recruiter_drafts_waiting: recruiterWaiting,
    unreplied_recruiter_emails: recruiterWaiting,
    auto_apply_ready: (db.prepare("SELECT COUNT(*) as c FROM application_attempts WHERE status IN ('ready','needs_review','manual_open_pause')").get() as any).c,
    auto_apply_submitted: (db.prepare("SELECT COUNT(*) as c FROM application_submit_results WHERE status='submitted'").get() as any).c,
    auto_apply_paused: (db.prepare("SELECT COUNT(*) as c FROM application_attempts WHERE status IN ('paused','blocked','needs_review','manual_open_pause')").get() as any).c,
    auto_email_sent: (db.prepare("SELECT COUNT(*) as c FROM email_auto_response_attempts WHERE status='sent'").get() as any).c,
    auto_email_waiting_review: (db.prepare("SELECT COUNT(*) as c FROM email_auto_response_attempts WHERE status='waiting_review'").get() as any).c,
    latest,
    recommended_next_action: recommended
  }, null, 2);
}

function generateLikelyQuestions(title: string, company: string, description: string, skills: string[]): string[] {
  const questions: string[] = [];
  
  if (skills.includes("TypeScript") || skills.includes("JavaScript")) {
    questions.push("Walk me through a time you optimized a complex TypeScript or JavaScript codebase.");
  }
  if (skills.includes("Node")) {
    questions.push("Describe your experience building and scaling Node.js applications in production.");
  }
  if (skills.includes("React")) {
    questions.push("Tell me about a challenging React component or state management issue you resolved.");
  }
  if (/manager|lead|director/i.test(title)) {
    questions.push("How do you approach building high-performing teams and managing difficult stakeholders?");
  }
  if (/integration|api|system/i.test(title) || skills.includes("API")) {
    questions.push("Walk me through a complex integration or API project. How did you design and execute it?");
  }
  if (/automation|workflow/i.test(description)) {
    questions.push("Describe a time you designed or implemented automation that had measurable business impact.");
  }
  
  questions.push("What's a project where you had to learn quickly in an unfamiliar domain? How did you approach it?");
  questions.push("Tell me about a disagreement you had with a team member or stakeholder. How did you resolve it?");
  questions.push("How do you prioritize when you have multiple competing demands?");
  questions.push("What's your approach to code quality and technical debt?");
  
  return [...new Set(questions)].slice(0, 8);
}

function generateStarStoryPrompts(skills: string[]): string[] {
  const stories: string[] = [];
  
  stories.push("Situation: A project was at risk of missing a deadline.\n  Task: What was your role in addressing it?\n  Action: What steps did you take?\n  Result: What was the outcome?");
  stories.push("Situation: You had to work across teams with different priorities.\n  Task: How did you navigate conflicting goals?\n  Action: What communication and compromise did you use?\n  Result: How did you resolve it?");
  stories.push("Situation: You discovered a critical flaw or bottleneck late in a project.\n  Task: How did you handle it?\n  Action: Did you escalate, refactor, or propose a workaround?\n  Result: What did you learn?");
  
  if (skills.some((s) => /automation|workflow|ai|tool/.test(s.toLowerCase()))) {
    stories.push("Situation: You automated or simplified a repetitive or error-prone process.\n  Task: What problem did you identify?\n  Action: How did you design and build the solution?\n  Result: What was the measurable impact?");
  }
  
  return stories;
}

function generateQuestionsForInterviewer(company: string): string[] {
  return [
    `What does success look like for this role in the first 90 days at ${company}?`,
    "What are the biggest challenges your team is facing right now?",
    "How does this team measure the impact of its work?",
    "What is the typical career path for someone in this role?",
    "How do you approach technical decisions and trade-offs here?",
    "What is the onboarding process like, and how much ramp-up time is typical?"
  ];
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
  const safe = String(content || "");
  const chunks = safe
    .split(/\n(?=(?:title|role|position|job):\s)|\n{2,}(?=.*\b(apply|view job|remote|hybrid)\b)/i)
    .map(cleanText)
    .filter(Boolean);
  return chunks.length > 1 ? chunks.slice(0, 10) : [safe];
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
  if (draftType === "linkedin_connection_note") {
    return [
      `Hi there,`,
      `I noticed the ${role} opportunity at ${org} and wanted to connect.`,
      `I work across product delivery, systems operations, automation, and practical AI workflows.`,
      `Open to sharing a short profile if useful.`,
      `Best regards,`,
      `Fejiro Efiuvwere`,
      `https://unalabs.cloud/`,
      `416-473-2732`
    ].join("\n\n");
  }
  if (draftType === "recruiter_followup_email") {
    return [
      `Hello,`,
      `Following up on the ${role} opportunity at ${org}.`,
      `I am interested and available to continue the process.`,
      `If helpful, I can share a role-focused profile and availability for a quick call.`,
      `Best regards,`,
      `Fejiro Efiuvwere`,
      `https://unalabs.cloud/`,
      `416-473-2732`
    ].join("\n\n");
  }
  if (draftType === "post_application_followup") {
    return [
      `Hello,`,
      `I recently applied for ${role} at ${org}.`,
      `I remain strongly interested and would appreciate any update on next steps.`,
      `Happy to provide additional details if needed.`,
      `Best regards,`,
      `Fejiro Efiuvwere`,
      `https://unalabs.cloud/`,
      `416-473-2732`
    ].join("\n\n");
  }
  return [
    `Hello,`,
    `I am exploring ${role} opportunities and came across ${org}.`,
    `My background combines product delivery, CRM systems, operations automation, and AI workflow implementation.`,
    `If there is an active fit, I would value the chance to speak.`,
    `Best regards,`,
    `Fejiro Efiuvwere`,
    `https://unalabs.cloud/`,
    `416-473-2732`
  ].join("\n\n");
}

function sanitizeDraft(body: string): string {
  const clean = cleanText(
    body
      .replace(/[\u2014\u2013]+/g, " ")
      .replace(/\s--\s|--/g, " ")
      .replace(/\b(um|uh)\b/gi, "")
      .replace(/<[^>]+>/g, "")
  );
  return clean.split(/\s+/).slice(0, 140).join(" ");
}

function countMatches(value: string, re: RegExp): number {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  const global = new RegExp(re.source, flags);
  return new Set([...value.matchAll(global)].map((match) => match[0].toLowerCase())).size;
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function loadTruthBlocks(): TruthBlocks {
  const truthPath = path.join(process.cwd(), "config", "resume_truth_blocks.yaml");
  if (!fs.existsSync(truthPath)) return {};
  try {
    const parsed = YAML.parse(fs.readFileSync(truthPath, "utf-8"));
    return parsed && typeof parsed === "object" ? parsed as TruthBlocks : {};
  } catch {
    return {};
  }
}

function buildTruthBackedResumeText(args: {
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  truth: TruthBlocks;
}): string {
  const styled = buildTailoredResumeContent({
    roleTitle: args.title,
    company: args.company,
    jdText: `${args.description}\n${args.requiredSkills.join("\n")}\n${args.preferredSkills.join("\n")}`
  });
  return renderTailoredResumeText(styled);
}

function buildCoverLetterText(args: {
  title: string;
  company: string;
  requiredSkills: string[];
  preferredSkills: string[];
  truth: TruthBlocks;
}): string {
  const cover = buildTailoredCoverLetter({
    roleTitle: args.title,
    company: args.company,
    jdText: [...args.requiredSkills, ...args.preferredSkills].join("\n")
  });
  return cover.text;
}

function selectSummary(truth: TruthBlocks, description: string): string {
  const summaries = truth.summary_pool?.filter(Boolean) || [];
  if (summaries.length > 0) return cleanText(summaries[0]);
  if (/ai|automation|workflow|agent/i.test(description)) {
    return "Systems delivery lead with experience turning ambiguous workflow problems into reliable tools, automations, and operating processes.";
  }
  return "Systems delivery lead with experience across enterprise applications, workflow automation, stakeholder alignment, and practical execution.";
}

function selectSkills(truth: TruthBlocks, haystack: string): string[] {
  const pool = truth.skills_pool?.filter(Boolean) || [
    "Automation & Workflow Design",
    "Project Management & SDLC",
    "Business Analysis & Requirements Gathering",
    "API Integration",
    "CRM Systems"
  ];
  const lower = haystack.toLowerCase();
  const matched = pool.filter((skill) => skill.toLowerCase().split(/[^a-z0-9]+/).some((part) => part.length > 3 && lower.includes(part)));
  return [...new Set(matched.length > 0 ? matched : pool)].slice(0, 6);
}

function selectTruthBullets(truth: TruthBlocks, haystack: string): string[] {
  const lower = haystack.toLowerCase();
  const allBullets = (truth.employment || []).flatMap((job) => job.bullets || []);
  const matched = allBullets.filter((bullet) =>
    bullet.toLowerCase().split(/[^a-z0-9]+/).some((part) => part.length > 4 && lower.includes(part))
  );
  return [...new Set(matched.length > 0 ? matched : allBullets)].slice(0, 6);
}

function cleanText(value?: string | null): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function assertRealJobRecord(job: Pick<NormalizedHuntJob, "title" | "company" | "source_url" | "apply_url" | "description">): void {
  const haystack = [job.title, job.company, job.source_url, job.apply_url, job.description]
    .map((value) => cleanText(value || ""))
    .join("\n")
    .toLowerCase();

  const isSynthetic = /\bvalidation\b|\bsynthetic\b/.test(haystack)
    || /https?:\/\/(www\.)?httpbin\.org\//.test(haystack)
    || /example\.com|\/example\//.test(haystack);

  if (isSynthetic) {
    throw new Error("Synthetic or placeholder job data is blocked. Provide a real job posting URL and details.");
  }
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
