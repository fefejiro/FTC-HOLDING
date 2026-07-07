import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type Database from "better-sqlite3";
import { logger } from "./logger.js";
import type { ApplicationAnswersConfig, ProfileConfig, RecruiterMessage, ResumeMapConfig, RulesConfig } from "./types.js";
import { createReplyDraftInThread, listRecruiterInboundMessages, sendDraftById, sendPlainTextEmail } from "./gmail.js";
import { generateApplyAssist, generateFollowups, generateInterviewPrep, generateOutreachDrafts, generatePackages, ingestGmailJobAlerts, insertHuntJob, normalizeSourceJob, scoreJobs, scrapeDice, scrapeIndeed, ingestScrapedJobs } from "./hunt.js";
import { parseRecruiterEmail } from "./job_parser.js";
import { scoreOpportunity } from "./match_scorer.js";
import { selectTailoringTemplatePath, tailorResumeForJD } from "./resume_tailor.js";
import { buildTailoredCoverLetter } from "./resume_style.js";
import { resolveProjectPath } from "./db.js";

const HARD_BLOCK_RE = /\b(us citizen|u\.s\. citizen|green card|permanent resident|security clearance)\b/i;
const SENSITIVE_FIELD_RE = /\b(salary|rate|work authorization|visa|sponsorship|relocation|eeo|legal attestation|references?|sin|ssn|passport|date of birth|dob|final submit)\b/i;
const RECRUITER_LIKE_RE = /\b(recruiter|talent|staffing|hiring|recruiting|agency|candidate|opportunity|role|position|opening|job)\b/i;

export interface AutomationConfig {
  profile: ProfileConfig;
  rules: RulesConfig;
  resumeMap: ResumeMapConfig;
  applicationAnswers: ApplicationAnswersConfig;
  env: {
    gmailClientId: string;
    gmailClientSecret: string;
    gmailRedirectUri: string;
    gmailTokensPath: string;
    gmailAccountEmail: string;
  };
}

export interface AutomationSummary {
  scanned: number;
  jobAlertsIngested: number;
  recruiterMessages: number;
  recruiterLinked: number;
  recruiterPaused: number;
  recruiterDraftsWaiting: number;
  recruiterDraftsSent: number;
  applyReady: number;
  applySubmitted: number;
  applySubmittedUnverified: number;
  applyPaused: number;
  applyBlocked: number;
  followupsCreated: number;
  packagesGenerated: number;
  interviewPrepGenerated: number;
}

export interface ApplicationQueueReport {
  auto_apply_ready: number;
  auto_apply_submitted: number;
  auto_apply_paused: number;
  auto_email_sent: number;
  auto_email_waiting_review: number;
  recruiter_drafts_waiting: number;
  unreplied_recruiter_emails: number;
  blocked_by_missing_answer: number;
  blocked_by_forbidden_authorization: number;
  followups_due: number;
  interview_prep_ready: number;
  top_tier_1_queue: Array<{
    job_id: number;
    title: string;
    company: string;
    apply_url: string;
    package_id: number | null;
    pause_fields: string[];
    next_action: string | null;
    status: string;
  }>;
  latest_recruiter_emails: Array<{
    message_id: string;
    subject: string;
    from: string;
    status: string;
    reason: string | null;
  }>;
}

export const automationDeps = {
  listRecruiterInboundMessages,
  ingestGmailJobAlerts,
  ingestRecruiterOpportunityEmails,
  scoreJobs,
  generatePackages,
  generateOutreachDrafts,
  generateFollowups,
  generateApplyAssist,
  generateInterviewPrep,
  runDicePreflight,
  runAutoApplyQueue,
  runAutoEmailQueue
};

interface FieldDescriptor {
  tag: string;
  name: string;
  id: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
}

interface FieldPlanEntry {
  descriptor: FieldDescriptor;
  answer: string;
  source: string;
  isSensitive: boolean;
}

interface ApplicationPlan {
  adapter: string;
  requiredFields: FieldDescriptor[];
  entries: FieldPlanEntry[];
  pauseReasons: Array<{ fieldName?: string; reason: string }>;
  submitLabel: string;
}

type SharedPlaywrightSession = {
  context: any;
  page: any;
  forceHeadless: boolean;
  keepAlive?: boolean;
  cdpAttached?: boolean;
  browser?: any;
};

let sharedPlaywrightSession: SharedPlaywrightSession | null = null;
let sharedPlaywrightExitHookRegistered = false;
let keepAliveTimeoutId: ReturnType<typeof setTimeout> | null = null;

function clearChromiumSingletonLocks(profileDir: string): void {
  const lockNames = ["SingletonLock", "SingletonCookie", "SingletonSocket"];
  for (const lockName of lockNames) {
    const lockPath = path.join(profileDir, lockName);
    if (fs.existsSync(lockPath)) {
      try {
        fs.rmSync(lockPath, { force: true });
      } catch {
        // ignore lock cleanup failures; launch will surface any real issue
      }
    }
  }
}

async function getSharedPlaywrightSession(forceHeadless: boolean): Promise<SharedPlaywrightSession> {
  if (sharedPlaywrightSession && sharedPlaywrightSession.forceHeadless !== forceHeadless) {
    await closeSharedPlaywrightSession();
  }

  if (sharedPlaywrightSession) {
    if (sharedPlaywrightSession.page?.isClosed?.()) {
      const existingPage = sharedPlaywrightSession.context.pages()[0];
      sharedPlaywrightSession.page = existingPage || await sharedPlaywrightSession.context.newPage();
    }
    return sharedPlaywrightSession;
  }

  const playwright = await import("playwright");
  const cdpUrl = process.env.JOB_AGENT_CDP_URL;

  // CDP attach mode: connect to a user-launched Chrome (--remote-debugging-port=9333)
  // so LinkedIn / Indeed bot detection sees a real human-launched browser.
  if (cdpUrl) {
    try {
      const browser = await playwright.chromium.connectOverCDP(cdpUrl);
      const contexts = browser.contexts();
      const context = contexts[0] || (await browser.newContext());
      const page = context.pages()[0] || (await context.newPage());
      sharedPlaywrightSession = {
        context,
        page,
        forceHeadless,
        keepAlive: true,
        cdpAttached: true,
        browser
      };
      logger.info({ cdpUrl }, "Auto-apply attached to existing Chrome via CDP.");
      if (!sharedPlaywrightExitHookRegistered) {
        sharedPlaywrightExitHookRegistered = true;
        process.once("exit", () => {
          // Do NOT close user-owned Chrome on exit when CDP-attached.
          sharedPlaywrightSession = null;
        });
      }
      return sharedPlaywrightSession;
    } catch (error) {
      logger.warn({ error, cdpUrl }, "CDP attach failed; falling back to launchPersistentContext.");
    }
  }

  // Strict mode: if JOB_AGENT_REQUIRE_CDP=true, REFUSE to launch a new window.
  // Used to stop LinkedIn/Indeed window spam — caller will pause the attempt.
  if (process.env.JOB_AGENT_REQUIRE_CDP === "true") {
    throw new Error(
      "JOB_AGENT_REQUIRE_CDP is set but no Chrome is attached. " +
      "Start Chrome with scripts/start-chrome-cdp.ps1 and set JOB_AGENT_CDP_URL=http://127.0.0.1:9333."
    );
  }

  const profileDir = process.env.JOB_AGENT_PROFILE_DIR || resolveProjectPath(".local", "pw-profile-job-reply");
  fs.mkdirSync(profileDir, { recursive: true });
  clearChromiumSingletonLocks(profileDir);

  let context;
  const browserChannel = process.env.JOB_AGENT_BROWSER_CHANNEL || "chrome";

  // Launch persistent context with system Chrome to reuse authenticated sessions
  // This profile directory persists cookies between runs
  console.log("[auto-apply] Using profile dir: " + profileDir);
  const stealthArgs = ["--disable-blink-features=AutomationControlled", "--no-first-run"];
  const ignoreDefault = ["--enable-automation"];
  try {
    context = await playwright.chromium.launchPersistentContext(profileDir, {
      channel: browserChannel,
      headless: forceHeadless,
      args: stealthArgs,
      ignoreDefaultArgs: ignoreDefault
    });
    await context
      .addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
      })
      .catch(() => undefined);
    logger.info({ browserChannel, profileDir }, "Auto-apply browser session started.");
  } catch (error) {
    logger.warn({ error, browserChannel }, "Persistent browser profile launch failed. Falling back to single-run browser context.");
    const browser = await playwright.chromium.launch({
      channel: browserChannel,
      headless: forceHeadless,
      args: stealthArgs,
      ignoreDefaultArgs: ignoreDefault
    });
    context = await browser.newContext();
    await context
      .addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
      })
      .catch(() => undefined);
  }

  const page = context.pages()[0] || (await context.newPage());

  sharedPlaywrightSession = {
    context,
    page,
    forceHeadless,
    keepAlive: false
  };

  if (!sharedPlaywrightExitHookRegistered) {
    sharedPlaywrightExitHookRegistered = true;
    process.once("exit", () => {
      if (sharedPlaywrightSession?.context && !sharedPlaywrightSession.keepAlive) {
        void sharedPlaywrightSession.context.close().catch(() => undefined);
      }
      sharedPlaywrightSession = null;
    });
  }

  return sharedPlaywrightSession;
}

async function closeSharedPlaywrightSession(): Promise<void> {
  if (!sharedPlaywrightSession) return;
  if (sharedPlaywrightSession.cdpAttached) {
    // Do not tear down a human-owned Chrome we attached to via CDP.
    await sharedPlaywrightSession.browser?.close?.().catch(() => undefined);
    sharedPlaywrightSession = null;
    return;
  }
  await sharedPlaywrightSession.context.close().catch(() => undefined);
  sharedPlaywrightSession = null;
}

export function normalizeApplicationAnswers(args: {
  profile: ProfileConfig;
  answers: ApplicationAnswersConfig;
}): Record<string, string> {
  const { profile, answers } = args;
  const map: Record<string, string> = {};
  const add = (key: string, value?: string) => {
    const cleaned = clean(value);
    if (cleaned) map[normalizeKey(key)] = cleaned;
  };

  add("name", answers.full_name || profile.name);
  add("full name", answers.full_name || profile.name);
  add("email", answers.email || profile.contact.email);
  add("phone", answers.phone || profile.contact.phone);
  add("linkedin", answers.linkedin_url || profile.contact.linkedin);
  add("linkedin url", answers.linkedin_url || profile.contact.linkedin);
  add("github", answers.github_url || profile.contact.github);
  add("github url", answers.github_url || profile.contact.github);
  add("portfolio", answers.portfolio_url || answers.defaults?.portfolio_url || "");
  add("portfolio website", answers.portfolio_url || answers.defaults?.portfolio_url || "");
  add("city", answers.city || profile.location.split(",")[0] || "");
  add("location", answers.location || profile.location);
  add("current title", answers.current_title || profile.target_titles[0] || "");
  add("current company", answers.current_company || "Una Labs");
  add("work authorization", answers.work_authorization_text || profile.work_authorization_note);
  add("authorization", answers.work_authorization_text || profile.work_authorization_note);
  add("visa", answers.work_authorization_text || profile.work_authorization_note);
  add("sponsorship", answers.work_authorization_text || profile.work_authorization_note);
  add("relocation", answers.relocation_preference || "Open to remote, hybrid, and Toronto-area roles");
  add("salary", answers.salary_expectation || "");
  add("salary expectation", answers.salary_expectation || "");
  add("rate", answers.salary_expectation || "");
  add("preferred role types", (answers.preferred_role_types || []).join(", "));
  add("eeo", formatEeo(answers.eeo));
  add("gender", answers.eeo?.gender);
  add("veteran", answers.eeo?.veteran_status);
  add("disability", answers.eeo?.disability_status);
  add("ethnicity", answers.eeo?.ethnicity);
  return map;
}

export function buildRecruiterAutoReply(args: {
  message: RecruiterMessage;
  parsed: ReturnType<typeof parseRecruiterEmail>;
  profile: ProfileConfig;
  answers: ApplicationAnswersConfig;
  score: number;
}): string {
  const recruiterFirst = args.parsed.recruiterName.trim().split(/\s+/)[0] || "there";
  const role = sanitizeReplyRole(args.parsed.cleanRoleTitle || args.parsed.roleTitle || "the role");
  const company = args.parsed.company || "your team";
  const strengths = args.profile.core_strengths.slice(0, 3).join(", ");
  const lines = [
    `Hi ${recruiterFirst},`,
    `Thank you for reaching out about ${role} at ${company}.`,
    `My background aligns well with this opportunity, especially across ${strengths}.`
  ];

  if (args.answers.work_authorization_text && /work authorization|visa|sponsorship|eligible/i.test(`${args.message.subject} ${args.message.body}`)) {
    lines.push(args.answers.work_authorization_text);
  }

  if (args.answers.salary_expectation && /salary|rate|compensation/i.test(`${args.message.subject} ${args.message.body}`)) {
    lines.push(`My compensation target is ${args.answers.salary_expectation}.`);
  }

  lines.push("I can share a role-focused resume and brief project examples if helpful for your team.");
  lines.push(
    "Best regards,",
    args.profile.name,
    args.profile.contact.email || "",
    "https://unalabs.cloud/",
    "416-473-2732",
    args.profile.contact.linkedin || ""
  );

  return normalizeVoiceText(trimToWordLimit(lines.filter(Boolean).join("\n\n"), 150));
}

export function inspectFormHtml(html: string): FieldDescriptor[] {
  const labelMap = new Map<string, string>();
  for (const match of html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)) {
    const attrs = parseAttributes(match[1] || "");
    const labelText = stripTags(match[2] || "");
    const forId = attrs.for || attrs.htmlfor || attrs.id || "";
    if (forId && labelText) labelMap.set(forId, labelText);
  }

  const fields: FieldDescriptor[] = [];
  const tagRegex = /<(input|textarea|select)\b([^>]*)>(?:[\s\S]*?<\/\1>)?/gi;
  for (const match of html.matchAll(tagRegex)) {
    const tag = match[1].toLowerCase();
    const attrs = parseAttributes(match[2] || "");
    const id = attrs.id || "";
    const name = attrs.name || id || "";
    const label = normalizeLabel(labelMap.get(id) || attrs["aria-label"] || attrs.placeholder || name);
    const type = (attrs.type || tag).toLowerCase();
    const required = Boolean(attrs.required || attrs["aria-required"] === "true");
    const options = tag === "select"
      ? [...match[0].matchAll(/<option\b[^>]*>([\s\S]*?)<\/option>/gi)].map((option) => stripTags(option[1] || "")).filter(Boolean)
      : [];
    fields.push({ tag, name, id, type, label, placeholder: attrs.placeholder || "", required, options });
  }

  return fields;
}

export function buildApplicationPlan(args: {
  url: string;
  html: string;
  profile: ProfileConfig;
  answers: ApplicationAnswersConfig;
  job: { title: string; company: string; description: string; apply_url: string; source: string; work_authorization_language?: string; salary_or_rate?: string };
  packageRow: { resume_text: string; cover_letter_text: string; id: number } | null;
  resumeTemplatePath?: string;
  resumeOutputDir?: string;
}): ApplicationPlan {
  const adapter = detectAdapter(args.url, args.html);
  const fields = inspectFormHtml(args.html);
  const answerMap = normalizeApplicationAnswers({ profile: args.profile, answers: args.answers });
  const entries: FieldPlanEntry[] = [];
  const pauseReasons: Array<{ fieldName?: string; reason: string }> = [];

  for (const field of fields) {
    const resolved = resolveFieldAnswer(field, answerMap, args);
    if (resolved.answer) {
      entries.push({ descriptor: field, answer: resolved.answer, source: resolved.source, isSensitive: resolved.isSensitive });
      continue;
    }

    if (field.required || isSensitiveField(field)) {
      pauseReasons.push({ fieldName: field.name || field.id || field.label, reason: `Missing answer for ${field.label || field.name || field.type}` });
    }
  }

  if (/workday/i.test(adapter)) {
    pauseReasons.push({ reason: "Workday requires manual open and pause." });
  }

  if (HARD_BLOCK_RE.test(`${args.job.description} ${args.job.work_authorization_language || ""}`)) {
    pauseReasons.push({ reason: "Forbidden work authorization or clearance claim required." });
  }

  const submitLabel = adapter === "dice" ? "Submit Application" : "Submit";
  return { adapter, requiredFields: fields.filter((field) => field.required), entries, pauseReasons, submitLabel };
}

export async function runDailyHuntAutomation(params: {
  db: Database.Database;
  cfg: AutomationConfig;
  limit?: number;
}): Promise<AutomationSummary> {
  const { db, cfg } = params;
  if (!cfg.rules.automation.enabled || cfg.rules.automation.mode === "disabled") {
    return {
      scanned: 0,
      jobAlertsIngested: 0,
      recruiterMessages: 0,
      recruiterLinked: 0,
      recruiterPaused: 0,
      recruiterDraftsWaiting: 0,
      recruiterDraftsSent: 0,
      applyReady: 0,
      applySubmitted: 0,
      applySubmittedUnverified: 0,
      applyPaused: 0,
      applyBlocked: 0,
      followupsCreated: 0,
      packagesGenerated: 0,
      interviewPrepGenerated: 0
    };
  }

  // Scrape Dice and Indeed if enabled
  let scraped = { dice: 0, indeed: 0 };
  if (cfg.rules.scraper?.enabled) {
    if (cfg.rules.scraper?.dice?.enabled) {
      const keywords = cfg.rules.scraper.dice.keywords || ["enterprise architect"];
      const maxJobs = cfg.rules.scraper.dice.max_jobs_per_run || 25;
      for (const keyword of keywords) {
        try {
          const jobs = await scrapeDice(keyword, maxJobs);
          scraped.dice += ingestScrapedJobs(db, jobs, "dice");
        } catch (error) {
          console.error(`Dice scrape failed for "${keyword}":`, error);
        }
      }
    }
    if (cfg.rules.scraper?.indeed?.enabled) {
      const keywords = cfg.rules.scraper.indeed.keywords || ["enterprise architect"];
      const maxJobs = cfg.rules.scraper.indeed.max_jobs_per_run || 25;
      for (const keyword of keywords) {
        try {
          const jobs = await scrapeIndeed(keyword, maxJobs);
          scraped.indeed += ingestScrapedJobs(db, jobs, "indeed");
        } catch (error) {
          console.error(`Indeed scrape failed for "${keyword}":`, error);
        }
      }
    }
  }

  const inbox = await automationDeps.listRecruiterInboundMessages(cfg.env, cfg.rules.filters.labels.inbound, params.limit ?? cfg.rules.automation.max_drafts_per_day);
  const scanned = inbox.length;
  const jobAlerts = inbox.filter((message) => isJobAlertMessage(message));
  const recruiterMessages = inbox.filter((message) => !isJobAlertMessage(message));

  const huntAlerts = automationDeps.ingestGmailJobAlerts(db, jobAlerts);
  const recruiterResult = automationDeps.ingestRecruiterOpportunityEmails(db, recruiterMessages, cfg);

  const scored = automationDeps.scoreJobs(db);
  const packagesGenerated = automationDeps.generatePackages(db);
  const draftsGenerated = automationDeps.generateOutreachDrafts(db);
  const followupsCreated = automationDeps.generateFollowups(db);
  const applyReady = automationDeps.generateApplyAssist(db);
  const interviewPrepGenerated = automationDeps.generateInterviewPrep(db);
  const apply = await automationDeps.runAutoApplyQueue({ db, cfg });
  const email = await automationDeps.runAutoEmailQueue({ db, cfg, recruiterMessages });

  recordApplicationRun(db, {
    runType: "daily",
    status: "completed",
    summary: {
      scanned,
      jobAlerts: huntAlerts.jobs,
      recruiterLinked: recruiterResult.linked,
      scored,
      packagesGenerated,
      draftsGenerated,
      followupsCreated,
      applyReady,
      interviewPrepGenerated,
      applySubmitted: apply.submitted,
      applySubmittedUnverified: apply.submittedUnverified,
      applyPaused: apply.paused,
      applyBlocked: apply.blocked,
      emailSent: email.sent,
      emailWaitingReview: email.waitingReview
    }
  });

  return {
    scanned,
    jobAlertsIngested: huntAlerts.jobs,
    recruiterMessages: recruiterMessages.length,
    recruiterLinked: recruiterResult.linked,
    recruiterPaused: recruiterResult.paused,
    recruiterDraftsWaiting: email.waitingReview,
    recruiterDraftsSent: email.sent,
    applyReady,
    applySubmitted: apply.submitted,
    applySubmittedUnverified: apply.submittedUnverified,
    applyPaused: apply.paused,
    applyBlocked: apply.blocked,
    followupsCreated,
    packagesGenerated,
    interviewPrepGenerated
  };
}

export async function runAutoApplyQueue(params: {
  db: Database.Database;
  cfg: AutomationConfig;
  sourceFilter?: string;
  maxJobs?: number;
  requireDicePreflight?: boolean;
}): Promise<{ ready: number; submitted: number; submittedUnverified: number; paused: number; blocked: number }> {
  const { db, cfg } = params;
  if (!cfg.rules.automation.enabled || cfg.rules.automation.mode === "disabled") {
    return { ready: 0, submitted: 0, submittedUnverified: 0, paused: 0, blocked: 0 };
  }

  const runId = createApplicationRun(db, "auto-apply", "running");
  let eligibleJobs = db
    .prepare(
      `SELECT j.id, j.title, j.company, j.description, j.apply_url, j.source, j.source_url, j.work_authorization_language, j.salary_or_rate, j.score, j.tier, j.status, p.id AS package_id, p.resume_text, p.cover_letter_text
       FROM hunt_jobs j
       LEFT JOIN hunt_packages p ON p.job_id = j.id
       WHERE j.apply_url IS NOT NULL AND j.apply_url <> ''
        AND j.status IN ('package_generated','apply_ready','needs_review','blocked_needs_auth')
         AND COALESCE(j.tier, '') IN ('tier_1','tier_2','tier_3')
        AND (
          NOT EXISTS (SELECT 1 FROM application_attempts a WHERE a.job_id = j.id)
          OR EXISTS (
            SELECT 1
            FROM application_attempts a
            WHERE a.job_id = j.id
              AND a.status IN ('paused','needs_review','manual_open_pause','blocked_needs_auth')
          )
        )
       ORDER BY
        CASE WHEN j.description LIKE '[Dice evidence]%' THEN 0 ELSE 1 END,
        j.updated_at DESC,
        COALESCE(j.score, 0) DESC`
    )
    .all() as Array<any>;

  if (params.sourceFilter) {
    const normalizedSource = String(params.sourceFilter).trim().toLowerCase();
    eligibleJobs = eligibleJobs.filter((job) => String(job.source || "").trim().toLowerCase() === normalizedSource);
  }

  const BLOCKED_SOURCES = new Set(["linkedin", "indeed"]);
  const blockedHere: Array<any> = [];
  eligibleJobs = eligibleJobs.filter((job) => {
    const src = String(job.source || "").trim().toLowerCase();
    if (BLOCKED_SOURCES.has(src)) {
      blockedHere.push(job);
      return false;
    }
    return true;
  });
  for (const job of blockedHere) {
    recordApplicationAttempt(db, {
      runId,
      jobId: job.id,
      adapter: String(job.source || "generic").toLowerCase(),
      applyUrl: job.apply_url,
      status: "blocked",
      requiredFields: [],
      answeredFields: [],
      pauseReason: "source_disabled_high_bot_risk",
      finalUrl: job.apply_url
    });
  }

  if (params.maxJobs && params.maxJobs > 0) {
    eligibleJobs = eligibleJobs.slice(0, params.maxJobs);
  }

  let ready = 0;
  let submitted = 0;
  let submittedUnverified = 0;
  let paused = 0;
  let blocked = 0;

  for (const job of eligibleJobs) {
    ready += 1;
    const invalidUrlReason = getInvalidApplyUrlReason(job.apply_url || "");
    if (invalidUrlReason) {
      recordApplicationAttempt(db, {
        runId,
        jobId: job.id,
        adapter: "generic",
        applyUrl: job.apply_url,
        status: "blocked",
        requiredFields: [],
        answeredFields: [],
        pauseReason: invalidUrlReason,
        finalUrl: job.apply_url
      });
      blocked += 1;
      continue;
    }

    if (params.requireDicePreflight && String(job.source || "").trim().toLowerCase() === "dice") {
      const preflight = await automationDeps.runDicePreflight();
      if (!preflight.ok) {
        recordApplicationAttempt(db, {
          runId,
          jobId: job.id,
          adapter: "dice",
          applyUrl: job.apply_url,
          status: "blocked_needs_auth",
          requiredFields: [],
          answeredFields: [],
          pauseReason: preflight.reason,
          finalUrl: job.apply_url
        });
        blocked += 1;
        continue;
      }
    }

    const diceQualityReason = evaluateDiceQualityGate(job);
    if (diceQualityReason) {
      recordApplicationAttempt(db, {
        runId,
        jobId: job.id,
        adapter: "dice",
        applyUrl: job.apply_url,
        status: "blocked",
        requiredFields: [],
        answeredFields: [],
        pauseReason: diceQualityReason,
        finalUrl: job.apply_url
      });
      blocked += 1;
      continue;
    }

    if (/myworkdayjobs\.com|workdayjobs\.com/i.test(job.apply_url || "")) {
      recordApplicationAttempt(db, {
        runId,
        jobId: job.id,
        adapter: "workday",
        applyUrl: job.apply_url,
        status: "manual_open_pause",
        requiredFields: [],
        answeredFields: [],
        pauseReason: "Workday is manual open and pause only.",
      });
      paused += 1;
      continue;
    }

    const artifacts = await buildApplicationArtifacts({ db, cfg, job });
    const result = await submitApplication({
      job,
      artifacts,
      cfg
    });
    const reasonWithAck = await withApplyAcknowledgement({ cfg, job, result, artifacts });

    recordApplicationAttempt(db, {
      runId,
      jobId: job.id,
      adapter: result.adapter,
      applyUrl: job.apply_url,
      status: result.status,
      requiredFields: result.requiredFields,
      answeredFields: result.answeredFields,
      pauseReason: reasonWithAck,
      finalUrl: result.finalUrl,
      screenshotPath: result.screenshotPath,
      resumeArtifactPath: artifacts.resumePath || undefined,
      coverLetterArtifactPath: artifacts.coverLetterPath || undefined,
      submittedAt: result.status === "submitted" ? new Date().toISOString() : undefined
    });

    if (result.status === "submitted" || result.status === "submitted_verified") submitted += 1;
    if (result.status === "submitted_unverified") submittedUnverified += 1;
    if (result.status === "paused") paused += 1;
    if (result.status === "blocked" || result.status === "blocked_needs_auth") blocked += 1;
  }

  await closeSharedPlaywrightSession().catch(() => undefined);
  updateApplicationRun(db, runId, "completed", { ready, submitted, submittedUnverified, paused, blocked });
  return { ready, submitted, submittedUnverified, paused, blocked };
}

export async function runAutoApplyOneJob(params: {
  db: Database.Database;
  cfg: AutomationConfig;
  jobId: number;
}): Promise<{
  jobId: number;
  status: ApplicationAttemptStatus | "not_found";
  reason?: string;
  finalUrl?: string;
  screenshotPath?: string;
  adapter?: string;
  requiredFields?: FieldDescriptor[];
  answeredFields?: FieldPlanEntry[];
  resumePath?: string | null;
  coverLetterPath?: string | null;
}> {
  const { db, cfg, jobId } = params;
  const job = db
    .prepare(
      `SELECT j.id, j.title, j.company, j.description, j.apply_url, j.source, j.source_url, j.work_authorization_language, j.salary_or_rate, j.tier, j.status, p.id AS package_id, p.resume_text, p.cover_letter_text
       FROM hunt_jobs j
       LEFT JOIN hunt_packages p ON p.job_id = j.id
       WHERE j.id=?
       LIMIT 1`
    )
    .get(jobId) as any | undefined;

  if (!job) {
    return { jobId, status: "not_found", reason: "Job not found" };
  }

  const runId = createApplicationRun(db, "auto-apply-one", "running");
  try {
    if (!["tier_1", "tier_2", "tier_3"].includes(String(job.tier || ""))) {
      const reason = `Job ${job.id} is ${job.tier || "unscored"} and blocked by tiered criteria (only tier_1, tier_2, and tier_3 can auto-apply).`;
      recordApplicationAttempt(db, {
        runId,
        jobId: job.id,
        adapter: "generic",
        applyUrl: job.apply_url,
        status: "blocked",
        requiredFields: [],
        answeredFields: [],
        pauseReason: reason,
        finalUrl: job.apply_url
      });
      updateApplicationRun(db, runId, "completed", { ready: 1, submitted: 0, paused: 0, blocked: 1 });
      return { jobId, status: "blocked", reason };
    }

    const invalidUrlReason = getInvalidApplyUrlReason(job.apply_url || "");
    if (invalidUrlReason) {
      recordApplicationAttempt(db, {
        runId,
        jobId: job.id,
        adapter: "generic",
        applyUrl: job.apply_url,
        status: "blocked",
        requiredFields: [],
        answeredFields: [],
        pauseReason: invalidUrlReason,
        finalUrl: job.apply_url
      });
      updateApplicationRun(db, runId, "completed", { ready: 1, submitted: 0, paused: 0, blocked: 1 });
      return { jobId, status: "blocked", reason: invalidUrlReason, finalUrl: job.apply_url };
    }

    if (String(job.source || "").trim().toLowerCase() === "dice") {
      const preflight = await automationDeps.runDicePreflight();
      if (!preflight.ok) {
        recordApplicationAttempt(db, {
          runId,
          jobId: job.id,
          adapter: "dice",
          applyUrl: job.apply_url,
          status: "blocked_needs_auth",
          requiredFields: [],
          answeredFields: [],
          pauseReason: preflight.reason,
          finalUrl: job.apply_url,
          screenshotPath: preflight.screenshotPath
        });
        updateApplicationRun(db, runId, "completed", { ready: 1, submitted: 0, paused: 0, blocked: 1 });
        return { jobId, status: "blocked_needs_auth", reason: preflight.reason, finalUrl: job.apply_url, screenshotPath: preflight.screenshotPath };
      }
      if (isVisibleFallbackWithoutCdp(preflight.reason)) {
        const reason = [
          preflight.reason,
          "Dice submit paused: authenticated Fejiro Chrome was verified visually, but CDP is unavailable, so the agent will not open or submit from another browser profile."
        ].join(" ");
        recordApplicationAttempt(db, {
          runId,
          jobId: job.id,
          adapter: "dice",
          applyUrl: job.apply_url,
          status: "manual_open_pause",
          requiredFields: [],
          answeredFields: [],
          pauseReason: reason,
          finalUrl: job.apply_url,
          screenshotPath: preflight.screenshotPath
        });
        updateApplicationRun(db, runId, "completed", { ready: 1, submitted: 0, paused: 1, blocked: 0 });
        return { jobId, status: "paused", reason, finalUrl: job.apply_url, screenshotPath: preflight.screenshotPath, adapter: "dice" };
      }
    }

    const diceQualityReason = evaluateDiceQualityGate(job);
    if (diceQualityReason) {
      recordApplicationAttempt(db, {
        runId,
        jobId: job.id,
        adapter: "dice",
        applyUrl: job.apply_url,
        status: "blocked",
        requiredFields: [],
        answeredFields: [],
        pauseReason: diceQualityReason,
        finalUrl: job.apply_url
      });
      updateApplicationRun(db, runId, "completed", { ready: 1, submitted: 0, paused: 0, blocked: 1 });
      return { jobId, status: "blocked", reason: diceQualityReason, finalUrl: job.apply_url };
    }

    if (/myworkdayjobs\.com|workdayjobs\.com/i.test(job.apply_url || "")) {
      recordApplicationAttempt(db, {
        runId,
        jobId: job.id,
        adapter: "workday",
        applyUrl: job.apply_url,
        status: "manual_open_pause",
        requiredFields: [],
        answeredFields: [],
        pauseReason: "Workday is manual open and pause only."
      });
      updateApplicationRun(db, runId, "completed", { ready: 1, submitted: 0, paused: 1, blocked: 0 });
      return { jobId, status: "paused", reason: "Workday is manual open and pause only." };
    }

    const artifacts = await buildApplicationArtifacts({ db, cfg, job });
    const result = await submitApplication({ job, artifacts, cfg });
    const reasonWithAck = await withApplyAcknowledgement({ cfg, job, result, artifacts });

    recordApplicationAttempt(db, {
      runId,
      jobId: job.id,
      adapter: result.adapter,
      applyUrl: job.apply_url,
      status: result.status,
      requiredFields: result.requiredFields,
      answeredFields: result.answeredFields,
      pauseReason: reasonWithAck,
      finalUrl: result.finalUrl,
      screenshotPath: result.screenshotPath,
      resumeArtifactPath: artifacts.resumePath || undefined,
      coverLetterArtifactPath: artifacts.coverLetterPath || undefined,
      submittedAt: result.status === "submitted" || result.status === "submitted_verified" || result.status === "submitted_unverified" ? new Date().toISOString() : undefined
    });

    updateApplicationRun(db, runId, "completed", {
      ready: 1,
      submitted: result.status === "submitted" || result.status === "submitted_verified" ? 1 : 0,
      submittedUnverified: result.status === "submitted_unverified" ? 1 : 0,
      paused: result.status === "paused" ? 1 : 0,
      blocked: result.status === "blocked" || result.status === "blocked_needs_auth" ? 1 : 0
    });

    return {
      jobId,
      status: result.status,
      reason: reasonWithAck,
      finalUrl: result.finalUrl,
      screenshotPath: result.screenshotPath,
      adapter: result.adapter,
      requiredFields: result.requiredFields,
      answeredFields: result.answeredFields,
      resumePath: artifacts.resumePath,
      coverLetterPath: artifacts.coverLetterPath
    };
  } catch (error) {
    updateApplicationRun(db, runId, "completed", { ready: 1, submitted: 0, paused: 0, blocked: 1 });
    return {
      jobId,
      status: "blocked",
      reason: error instanceof Error ? error.message : "Single job apply failed"
    };
  }
}

export async function runAutoEmailQueue(params: {
  db: Database.Database;
  cfg: AutomationConfig;
  recruiterMessages?: RecruiterMessage[];
}): Promise<{ sent: number; waitingReview: number; blocked: number }> {
  const { db, cfg } = params;
  if (!cfg.rules.automation.enabled || cfg.rules.automation.mode === "disabled") {
    return { sent: 0, waitingReview: 0, blocked: 0 };
  }

  const messages = params.recruiterMessages || (await listRecruiterInboundMessages(cfg.env, cfg.rules.filters.labels.inbound, cfg.rules.automation.max_drafts_per_day));
  const recruiterMessages = messages.filter((message) => !isJobAlertMessage(message));
  const sendCap = cfg.rules.automation.max_sends_per_day;

  let sent = 0;
  let waitingReview = 0;
  let blocked = 0;

  for (const message of recruiterMessages) {
    if (sent >= sendCap) break;
    if (db.prepare("SELECT 1 FROM email_auto_response_attempts WHERE message_id=? LIMIT 1").get(message.messageId)) continue;
    if (db.prepare("SELECT 1 FROM drafts WHERE message_id=? LIMIT 1").get(message.messageId)) continue;

    const parsed = parseRecruiterEmail(message);
    const score = scoreOpportunity(parsed, cfg.profile, cfg.resumeMap, message.body);
    const qualifies = RECRUITER_LIKE_RE.test(`${message.from} ${message.subject} ${message.body}`) && score.score >= 60;
    const hardBlock = HARD_BLOCK_RE.test(`${message.subject} ${message.body}`);
    const requiresSensitivePause = SENSITIVE_FIELD_RE.test(`${message.subject} ${message.body}`) && !cfg.applicationAnswers.work_authorization_text;

    if (!qualifies) {
      continue;
    }

    const body = buildRecruiterAutoReply({ message, parsed, profile: cfg.profile, answers: cfg.applicationAnswers, score: score.score });
    const packageRow = db
      .prepare(
        `SELECT p.resume_text
         FROM hunt_jobs j
         JOIN hunt_packages p ON p.job_id = j.id
         WHERE j.gmail_message_id=? OR j.gmail_thread_id=?
         ORDER BY p.id DESC
         LIMIT 1`
      )
      .get(message.messageId, message.threadId) as { resume_text?: string } | undefined;

    let recruiterResumePath: string | undefined;
    if (
      cfg.rules.resume_tailoring?.enabled
      && cfg.rules.resume_tailoring?.template_path
      && fs.existsSync(cfg.rules.resume_tailoring.template_path)
      && cfg.rules.resume_tailoring.output_dir
    ) {
      try {
        const templatePath = selectTailoringTemplatePath({
          parsed: parsed as any,
          jdText: message.body || parsed.cleanBody || "",
          defaultTemplatePath: cfg.rules.resume_tailoring.template_path,
          businessAnalysisTemplatePath: cfg.rules.resume_tailoring.business_analysis_template_path
        });
        const tailored = await tailorResumeForJD({
          parsed: parsed as any,
          jdText: message.body || parsed.cleanBody || "",
          templatePath,
          outputDir: cfg.rules.resume_tailoring.output_dir
        });
        recruiterResumePath = tailored.docxPath;
      } catch {
        recruiterResumePath = undefined;
      }
    }

    if (!recruiterResumePath && packageRow?.resume_text) {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-reply-agent-recruiter-"));
      recruiterResumePath = path.join(tmpDir, "recruiter-resume.txt");
      fs.writeFileSync(recruiterResumePath, packageRow.resume_text, "utf8");
    }

    if (hardBlock) {
      insertEmailAutoAttempt(db, {
        messageId: message.messageId,
        threadId: message.threadId,
        sender: message.from,
        subject: message.subject,
        status: "blocked",
        score: score.score,
        reason: "Forbidden authorization or clearance requirement",
        body
      });
      blocked += 1;
      continue;
    }

    if (requiresSensitivePause) {
      const draft = await createReplyDraftInThread({ cfg: cfg.env, message, replySubject: `Re: ${parsed.roleTitle}`, replyBody: body, resumePath: recruiterResumePath });
      insertEmailAutoAttempt(db, {
        messageId: message.messageId,
        threadId: message.threadId,
        sender: message.from,
        subject: message.subject,
        status: "waiting_review",
        score: score.score,
        draftId: draft.draftId,
        reason: "Missing saved answer for sensitive field",
        body
      });
      waitingReview += 1;
      continue;
    }

    const hasTailoredResume = Boolean(recruiterResumePath && /\.docx$/i.test(recruiterResumePath));
    const autoSendEligible = hasTailoredResume && score.score >= 75 && !/\bunknown\b/i.test(body) && body.split(/\s+/).length <= 150;
    const draft = await createReplyDraftInThread({ cfg: cfg.env, message, replySubject: `Re: ${parsed.roleTitle}`, replyBody: body, resumePath: recruiterResumePath });

    if (autoSendEligible) {
      await sendDraftById(cfg.env, draft.draftId);
      insertEmailAutoAttempt(db, {
        messageId: message.messageId,
        threadId: message.threadId,
        sender: message.from,
        subject: message.subject,
        status: "sent",
        score: score.score,
        draftId: draft.draftId,
        sentMessageId: draft.draftId,
        reason: "Auto-send threshold met",
        body
      });
      sent += 1;
    } else {
      insertEmailAutoAttempt(db, {
        messageId: message.messageId,
        threadId: message.threadId,
        sender: message.from,
        subject: message.subject,
        status: "waiting_review",
        score: score.score,
        draftId: draft.draftId,
        reason: hasTailoredResume ? "Below auto-send threshold or waiting review" : "DOCX resume artifact missing so manual review is required",
        body
      });
      waitingReview += 1;
    }
  }

  return { sent, waitingReview, blocked };
}

export function ingestRecruiterOpportunityEmails(db: Database.Database, messages: RecruiterMessage[], cfg: AutomationConfig): { linked: number; paused: number } {
  let linked = 0;
  let paused = 0;

  for (const message of messages) {
    if (!isRecruiterOpportunity(message) || isJobAlertMessage(message)) continue;
    const parsed = parseRecruiterEmail(message);
    const score = scoreOpportunity(parsed, cfg.profile, cfg.resumeMap, message.body);
    const existing = db.prepare("SELECT id FROM hunt_jobs WHERE gmail_message_id=? OR gmail_thread_id=? LIMIT 1").get(message.messageId, message.threadId) as { id: number } | undefined;
    const jobId = existing?.id || insertHuntJob(db, normalizeSourceJob({
      title: parsed.cleanRoleTitle || parsed.roleTitle,
      company: parsed.company,
      location: parsed.location,
      work_mode: parsed.isUsRole ? "remote" : "",
      employment_type: parsed.employmentType,
      source: "recruiter",
      source_url: "",
      apply_url: "",
      description: parsed.cleanBody || message.body,
      required_skills: parsed.alignmentKeywords,
      preferred_skills: [],
      work_authorization_language: cfg.profile.work_authorization_note,
      salary_or_rate: parsed.salaryOrRate,
      red_flags: [],
      gmail_message_id: message.messageId,
      gmail_thread_id: message.threadId,
      recruiter_email: extractEmail(message.from)
    }));

    upsertContactForJob(db, jobId, parsed.company, extractEmail(message.from), message);
    db.prepare("UPDATE hunt_jobs SET next_action=?, status=?, needs_review=?, updated_at=? WHERE id=?").run(
      score.score < 65 ? "review_recruiter_email" : "draft_recruiter_reply",
      score.score < 65 ? "needs_review" : "discovered",
      score.score < 65 ? 1 : 0,
      new Date().toISOString(),
      jobId
    );

    if (score.score < 65 || !parsed.company || !parsed.roleTitle) {
      paused += 1;
    } else {
      linked += 1;
    }
  }

  return { linked, paused };
}

export function buildApplicationQueueReport(db: Database.Database): ApplicationQueueReport {
  const auto_apply_ready = countQuery(db, "SELECT COUNT(*) AS c FROM hunt_apply_sessions WHERE status='assist_ready'");
  const auto_apply_submitted = countQuery(db, "SELECT COUNT(*) AS c FROM application_submit_results WHERE status='submitted'");
  const auto_apply_paused = countQuery(db, "SELECT COUNT(*) AS c FROM hunt_apply_sessions WHERE status='manual_open_pause'") + countQuery(db, "SELECT COUNT(*) AS c FROM application_attempts WHERE status IN ('paused','needs_review','manual_open_pause')");
  const auto_email_sent = countQuery(db, "SELECT COUNT(*) AS c FROM email_auto_response_attempts WHERE status='sent'");
  const auto_email_waiting_review = countQuery(db, "SELECT COUNT(*) AS c FROM email_auto_response_attempts WHERE status='waiting_review'");
  const recruiter_drafts_waiting = auto_email_waiting_review;
  const blocked_by_missing_answer = countQuery(db, "SELECT COUNT(*) AS c FROM application_attempts WHERE status='needs_review' AND pause_reason LIKE '%Missing answer%'");
  const blocked_by_forbidden_authorization = countQuery(db, "SELECT COUNT(*) AS c FROM application_attempts WHERE status IN ('blocked','needs_review') AND pause_reason LIKE '%Forbidden work authorization%'");
  const followups_due = countQuery(db, "SELECT COUNT(*) AS c FROM hunt_followups WHERE status='due'");
  const interview_prep_ready = countQuery(db, "SELECT COUNT(*) AS c FROM hunt_interview_prep");

  const top_tier_1_queue = db
    .prepare(
      `SELECT j.id AS job_id, j.title, j.company, j.apply_url, p.id AS package_id, s.pause_fields_json, j.next_action, j.status
       FROM hunt_jobs j
       LEFT JOIN hunt_apply_sessions s ON s.job_id = j.id
       LEFT JOIN hunt_packages p ON p.job_id = j.id
       WHERE j.tier = 'tier_1'
       ORDER BY
         CASE
           WHEN lower(COALESCE(j.location, '')) LIKE '%usa%'
             OR lower(COALESCE(j.location, '')) LIKE '%united states%'
             OR lower(COALESCE(j.location, '')) LIKE '%u.s.%'
             OR lower(COALESCE(j.location, '')) LIKE '%canada%'
             OR lower(COALESCE(j.location, '')) LIKE '%toronto%'
             OR lower(COALESCE(j.location, '')) LIKE '%ontario%'
             THEN 2
           ELSE 0
         END DESC,
         CASE
           WHEN lower(COALESCE(j.work_mode, '')) LIKE '%remote%' OR lower(COALESCE(j.location, '')) LIKE '%remote%' THEN 3
           WHEN lower(COALESCE(j.work_mode, '')) LIKE '%hybrid%' OR lower(COALESCE(j.location, '')) LIKE '%hybrid%' THEN 2
           WHEN lower(COALESCE(j.work_mode, '')) LIKE '%onsite%' OR lower(COALESCE(j.location, '')) LIKE '%onsite%' OR lower(COALESCE(j.location, '')) LIKE '%on-site%' OR lower(COALESCE(j.location, '')) LIKE '%on site%' THEN 1
           ELSE 0
         END DESC,
         j.score DESC,
         j.id DESC
       LIMIT 15`
    )
    .all()
    .map((row: any) => ({
      job_id: row.job_id,
      title: row.title || "",
      company: row.company || "",
      apply_url: row.apply_url || "",
      package_id: row.package_id ?? null,
      pause_fields: parseJsonArray(row.pause_fields_json),
      next_action: row.next_action || null,
      status: row.status || ""
    }));

  const latest_recruiter_emails = db
    .prepare(
      `SELECT message_id, thread_id, sender, subject, status, reason
       FROM email_auto_response_attempts
       ORDER BY id DESC
       LIMIT 10`
    )
    .all()
    .map((row: any) => ({
      message_id: row.message_id,
      subject: row.subject || row.message_id,
      from: row.sender || row.thread_id,
      status: row.status,
      reason: row.reason ?? null
    }));

  return {
    auto_apply_ready,
    auto_apply_submitted,
    auto_apply_paused,
    auto_email_sent,
    auto_email_waiting_review,
    recruiter_drafts_waiting,
    unreplied_recruiter_emails: recruiter_drafts_waiting,
    blocked_by_missing_answer,
    blocked_by_forbidden_authorization,
    followups_due,
    interview_prep_ready,
    top_tier_1_queue,
    latest_recruiter_emails
  };
}

export async function runAutoApplyQueueAndReport(params: {
  db: Database.Database;
  cfg: AutomationConfig;
  sourceFilter?: string;
  maxJobs?: number;
  requireDicePreflight?: boolean;
}): Promise<{ summary: { ready: number; submitted: number; submittedUnverified: number; paused: number; blocked: number }; report: ApplicationQueueReport }> {
  const summary = await runAutoApplyQueue(params);
  return { summary, report: buildApplicationQueueReport(params.db) };
}

function isVisibleFallbackWithoutCdp(reason: string): boolean {
  return /visible\s+fallback|cdp\s+is\s+unavailable|did not expose the configured CDP endpoint|no Chrome is attached/i.test(String(reason || ""));
}

export async function runDicePreflight(): Promise<{ ok: boolean; reason: string; screenshotPath?: string }> {
  const timeoutMs = Math.max(5000, Number(process.env.JOB_AGENT_PREFLIGHT_TIMEOUT_MS || 20000));
  try {
    const session = await getSharedPlaywrightSession(process.env.JOB_AGENT_HEADLESS === "true" || process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true");
    const page = session.page || (await session.context.newPage());
    page.setDefaultTimeout(timeoutMs);
    page.setDefaultNavigationTimeout(timeoutMs);

    await page.goto("https://www.dice.com/dashboard", { waitUntil: "domcontentloaded", timeout: timeoutMs });
    let snapshot = await readDicePreflightSnapshot(page);

    if (snapshot.looksPending) {
      const waitMs = Math.min(15000, Math.max(5000, timeoutMs - 1000));
      await page.waitForURL(/dice\.com\/(dashboard|my-jobs|jobs|profile|job-detail)/i, { timeout: waitMs }).catch(() => undefined);
      await page.waitForTimeout(1500).catch(() => undefined);
      snapshot = await readDicePreflightSnapshot(page);
    }

    if (snapshot.looksPending) {
      await page.reload({ waitUntil: "domcontentloaded", timeout: Math.min(10000, timeoutMs) }).catch(() => undefined);
      await page.waitForTimeout(1500).catch(() => undefined);
      snapshot = await readDicePreflightSnapshot(page);
    }

    if (snapshot.looksPending) {
      const screenshotPath = makeDicePreflightScreenshotPath("pending");
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
      return {
        ok: false,
        reason: `Dice preflight pending: Dice is still showing a sign-in/loading transition at ${snapshot.url}. Retry after the page finishes or refresh the Fejiro automation tab.`,
        screenshotPath
      };
    }

    if (snapshot.looksSignedOut) {
      const screenshotPath = makeDicePreflightScreenshotPath("signed-out");
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
      return {
        ok: false,
        reason: `Dice preflight failed: signed-in Dice session was not detected at ${snapshot.url}.`,
        screenshotPath
      };
    }

    if (snapshot.looksAuthenticatedShell) {
      return {
        ok: true,
        reason: `Dice preflight passed: authenticated browser session detected at ${snapshot.url}.`
      };
    }

    if (snapshot.text.length < 25 && /dice\.com/i.test(snapshot.url)) {
      const screenshotPath = makeDicePreflightScreenshotPath("blank");
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
      return {
        ok: false,
        reason: `Dice preflight inconclusive: Dice returned a mostly blank page at ${snapshot.url}. Refresh the Fejiro automation tab and rerun preflight.`,
        screenshotPath
      };
    }

    return { ok: true, reason: "Dice preflight passed: authenticated browser session detected." };
  } catch (error) {
    const visibleFallback = runVisibleDicePreflightFallback(timeoutMs, error);
    if (visibleFallback) return visibleFallback;

    return {
      ok: false,
      reason: `Dice preflight failed: ${error instanceof Error ? error.message : "browser check failed"}.`
    };
  } finally {
    await closeSharedPlaywrightSession().catch(() => undefined);
  }
}

type VisibleDicePreflightCapture = {
  requestedUrl?: string;
  finalUrl?: string;
  visibleChromeTitleBefore?: string;
  visibleChromeTitleAfterNavigation?: string;
  screenshotPath?: string;
};

export function classifyVisibleDicePreflightCapture(capture: VisibleDicePreflightCapture): { ok: boolean; reason: string; screenshotPath?: string } {
  const finalUrl = clean(capture.finalUrl || capture.requestedUrl || "");
  const title = clean(capture.visibleChromeTitleAfterNavigation || "");
  const combined = clean(`${finalUrl} ${title} ${capture.visibleChromeTitleBefore || ""}`);
  const screenshotPath = capture.screenshotPath;

  if (/accounts\.google\.com|\/login|signin|sign\s*in|log\s*in|create account/i.test(combined)) {
    return {
      ok: false,
      reason: `Dice visible preflight failed: signed-in Dice session was not detected at ${finalUrl || title || "the visible Chrome tab"}.`,
      screenshotPath
    };
  }

  const looksLikeDiceShell = /dice\.com/i.test(combined);
  const looksAuthenticated =
    /\/dashboard|\/my-jobs|\/jobs|\/profile|\/profiles|\/job-detail/i.test(finalUrl) ||
    /\b(Profile|Home Feed|Profile Visibility|Alerts|Improve Your Profile|Fejiro Efiuvwere)\b/i.test(combined);

  if (looksLikeDiceShell && looksAuthenticated) {
    return {
      ok: true,
      reason: `Dice preflight passed: visible Fejiro Chrome session is authenticated at ${finalUrl || title}.`,
      screenshotPath
    };
  }

  return {
    ok: false,
    reason: `Dice visible preflight inconclusive at ${finalUrl || title || "the visible Chrome tab"}.`,
    screenshotPath
  };
}

function runVisibleDicePreflightFallback(
  timeoutMs: number,
  cdpError: unknown
): { ok: boolean; reason: string; screenshotPath?: string } | null {
  if (process.env.JOB_AGENT_DISABLE_VISIBLE_DICE_PREFLIGHT === "true") return null;

  const scriptPath = resolveProjectPath("scripts", "visible_chrome_dom_dump.py");
  if (!fs.existsSync(scriptPath)) return null;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = diceDebugDir();
  fs.mkdirSync(outDir, { recursive: true });
  const capturePath = path.join(outDir, `dice-visible-preflight-${stamp}.json`);
  const screenshotPath = path.join(outDir, `dice-visible-preflight-${stamp}.png`);
  const waitSeconds = String(Math.max(5, Math.min(20, Math.ceil(timeoutMs / 1000))));

  try {
    execFileSync(
      "python",
      [
        scriptPath,
        "--url",
        "https://www.dice.com/dashboard",
        "--out",
        capturePath,
        "--screenshot",
        screenshotPath,
        "--wait",
        waitSeconds,
        "--no-dump"
      ],
      {
        cwd: resolveProjectPath("."),
        stdio: "pipe",
        timeout: timeoutMs + 10000
      }
    );
    const capture = JSON.parse(fs.readFileSync(capturePath, "utf8")) as VisibleDicePreflightCapture;
    const classified = classifyVisibleDicePreflightCapture({
      ...capture,
      screenshotPath: capture.screenshotPath || screenshotPath
    });
    const rawCdpReason = cdpError instanceof Error ? cdpError.message : "CDP attach failed";
    const cdpReason = /JOB_AGENT_REQUIRE_CDP|Start Chrome with scripts\/start-chrome-cdp\.ps1/i.test(rawCdpReason)
      ? "Chrome did not expose the configured CDP endpoint"
      : rawCdpReason;
    return {
      ...classified,
      reason: `${classified.reason} Visible fallback used because CDP is unavailable: ${cdpReason}`
    };
  } catch (visibleError) {
    logger.warn({ error: visibleError }, "Visible Dice preflight fallback failed.");
    return null;
  }
}

async function readDicePreflightSnapshot(page: any): Promise<{
  html: string;
  text: string;
  url: string;
  looksSignedOut: boolean;
  looksPending: boolean;
  looksAuthenticatedShell: boolean;
}> {
  const html = await page.content().catch(() => "");
  const text = await page.locator("body").innerText({ timeout: 5000 }).catch(() => stripTags(html));
  const url = page.url();
  const combined = `${url}\n${html}\n${text}`;
  const looksPending = /signing\s+you\s+in|just\s+a\s+moment|loading|please\s+wait/i.test(combined);
  const looksSignedOut = /sign\s*in|log\s*in|create account|forgot password/i.test(combined) || /\/login|signin/i.test(url);
  const looksAuthenticatedShell = /dice\.com\/(?:dashboard|my-jobs|jobs|profile|job-detail)/i.test(url) && !looksSignedOut && !looksPending;
  return {
    html,
    text: clean(text.replace(/\s+/g, " ")),
    url,
    looksSignedOut,
    looksPending,
    looksAuthenticatedShell
  };
}

function makeDicePreflightScreenshotPath(slug: string): string {
  return path.join(diceDebugDir(), `dice-preflight-${safeFileSlug(slug)}-${Date.now()}.png`);
}

export function syncApplicationProofFromMessages(db: Database.Database, messages: RecruiterMessage[]): { verified: number } {
  let verified = 0;
  const candidates = db
    .prepare(
      `SELECT a.id AS attempt_id, a.job_id, j.title, j.company
       FROM application_attempts a
       JOIN hunt_jobs j ON j.id = a.job_id
       WHERE a.status IN ('submitted_unverified','applied_unverified')
          OR j.status IN ('applied_unverified','submitted_unverified')`
    )
    .all() as Array<{ attempt_id: number; job_id: number; title: string; company: string }>;

  for (const row of candidates) {
    const title = normalizeProofText(row.title);
    const company = normalizeProofText(row.company);
    if (!title || !company) continue;

    const proof = messages.find((message) => {
      if (/\[job agent\]/i.test(`${message.from} ${message.subject}`)) return false;
      const text = normalizeProofText(`${message.from} ${message.subject} ${message.body}`);
      return text.includes(title) && text.includes(company) && /\b(application|applied|applying|received|submitted|thank)\b/.test(text);
    });
    if (!proof) continue;

    const now = new Date().toISOString();
    const reason = `Verified from Gmail message ${proof.messageId}: ${proof.subject}`;
    db.prepare("UPDATE application_attempts SET status='submitted_verified', pause_reason=?, updated_at=? WHERE id=?")
      .run(reason, now, row.attempt_id);
    db.prepare("UPDATE hunt_jobs SET status='applied_verified', next_action='interview_followup', updated_at=? WHERE id=?")
      .run(now, row.job_id);
    verified += 1;
  }

  return { verified };
}

/**
 * Get persistent browser session that can be kept alive across multiple apply runs.
 * Set keepAlive=true to prevent automatic closure on process exit.
 */
export async function getPersistentBrowserSession(forceHeadless: boolean, keepAlive: boolean = false): Promise<SharedPlaywrightSession> {
  const session = await getSharedPlaywrightSession(forceHeadless);
  if (keepAlive && !session.keepAlive) {
    session.keepAlive = true;
  }
  return session;
}

/**
 * Close the persistent browser session.
 */
export async function closePersistentBrowserSession(): Promise<void> {
  if (keepAliveTimeoutId) {
    clearTimeout(keepAliveTimeoutId);
    keepAliveTimeoutId = null;
  }
  await closeSharedPlaywrightSession();
}

/**
 * Process multiple jobs in a single browser session.
 * Keeps browser open until all jobs are processed.
 */
export async function runAutoApplyBatch(params: {
  db: Database.Database;
  cfg: AutomationConfig;
  jobIds: number[];
}): Promise<{ results: Array<{ jobId: number; status: string; reason?: string }>; }> {
  const { db, cfg, jobIds } = params;
  const results = [];

  // Launch persistent browser once
  const session = await getPersistentBrowserSession(false, true);

  for (const jobId of jobIds) {
    const result = await runAutoApplyOneJob({ db, cfg, jobId });
    results.push({
      jobId: result.jobId,
      status: result.status,
      reason: result.reason
    });
  }

  return { results };
}

function evaluateDiceQualityGate(job: any): string {
  if (String(job.source || "").trim().toLowerCase() !== "dice") return "";
  if (process.env.JOB_AGENT_DICE_ALLOW_LOW_MATCH === "true") return "";

  const evidence = parseDiceEvidence(job.description || "");
  const minDiceMatch = Math.max(0, Number(process.env.JOB_AGENT_DICE_MIN_MATCH_SCORE || 40));
  const maxPostedAgeDays = Math.max(1, Number(process.env.JOB_AGENT_DICE_MAX_POSTED_AGE_DAYS || 21));

  if (typeof evidence.matchScore === "number" && evidence.matchScore < minDiceMatch) {
    return `Dice quality gate: match score ${evidence.matchScore}% is below ${minDiceMatch}%.`;
  }

  const postedAgeDays = relativeDiceAgeDays(evidence.postedText);
  if (postedAgeDays !== null && postedAgeDays > maxPostedAgeDays) {
    return `Dice freshness gate: ${evidence.postedText} is older than ${maxPostedAgeDays} days.`;
  }

  const safeApplyButtons = new Set(["visible", "easy_apply_visible", "unknown"]);
  if (evidence.applyButton && !safeApplyButtons.has(evidence.applyButton)) {
    return `Dice apply gate: apply button status is ${evidence.applyButton}.`;
  }

  return "";
}

function evaluateDiceDetailQualityGate(url: string, html: string): string {
  if (!/dice\.com/i.test(url)) return "";
  if (process.env.JOB_AGENT_DICE_ALLOW_LOW_MATCH === "true") return "";

  const text = stripTags(html);
  const minDiceMatch = Math.max(0, Number(process.env.JOB_AGENT_DICE_MIN_MATCH_SCORE || 40));
  const maxPostedAgeDays = Math.max(1, Number(process.env.JOB_AGENT_DICE_MAX_POSTED_AGE_DAYS || 21));
  const matchRaw =
    text.match(/Dice\s+Job\s+Match\s+Score[^0-9]*(\d{1,3})%/i)?.[1] ||
    text.match(/Job\s+Match\s+score\s+is\s+(\d{1,3})%/i)?.[1] ||
    text.match(/\b(\d{1,3})%\s+MEETS\b/i)?.[1] ||
    "";
  const matchScore = /^\d+$/.test(matchRaw) ? Number(matchRaw) : null;
  if (typeof matchScore === "number" && matchScore < minDiceMatch) {
    return `Dice quality gate: detail page match score ${matchScore}% is below ${minDiceMatch}%.`;
  }

  const postedText = text.match(/\bPosted\s+[^.]*?(?:ago|today|yesterday)\b/i)?.[0] || "";
  const postedAgeDays = relativeDiceAgeDays(postedText);
  if (postedAgeDays !== null && postedAgeDays > maxPostedAgeDays) {
    return `Dice freshness gate: ${postedText} is older than ${maxPostedAgeDays} days.`;
  }

  return "";
}

function parseDiceEvidence(description: string): {
  matchScore: number | null;
  postedText: string;
  updatedText: string;
  applyButton: string;
  scrapedAt: string;
} {
  const line = String(description || "").split(/\r?\n/).find((entry) => entry.startsWith("[Dice evidence]")) || "";
  const matchRaw = line.match(/\bmatch_score=(\d{1,3}|unknown)\b/i)?.[1] || "";
  const matchScore = /^\d+$/.test(matchRaw) ? Number(matchRaw) : null;
  return {
    matchScore,
    postedText: line.match(/\bposted="([^"]*)"/i)?.[1] || "",
    updatedText: line.match(/\bupdated="([^"]*)"/i)?.[1] || "",
    applyButton: line.match(/\bapply_button=([a-z_]+)/i)?.[1] || "",
    scrapedAt: line.match(/\bscraped_at=([^;\s]+)/i)?.[1] || ""
  };
}

function relativeDiceAgeDays(value: string): number | null {
  const text = String(value || "").trim().toLowerCase();
  if (!text || text === "unknown") return null;
  if (/\btoday\b/.test(text)) return 0;
  if (/\byesterday\b/.test(text)) return 1;

  const amount = Number(text.match(/\b(\d+)\b/)?.[1] || NaN);
  if (!Number.isFinite(amount)) return null;
  if (/\bmonth/.test(text)) return amount * 30;
  if (/\bweek/.test(text)) return amount * 7;
  if (/\bday/.test(text)) return amount;
  if (/\bhour|\bminute/.test(text)) return 0;
  return null;
}

function createApplicationRun(db: Database.Database, runType: string, status: string): number {
  const now = new Date().toISOString();
  const info = db.prepare("INSERT INTO application_runs (run_type, status, summary_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(runType, status, "{}", now, now);
  return Number(info.lastInsertRowid);
}

function updateApplicationRun(db: Database.Database, runId: number, status: string, summary: Record<string, unknown>): void {
  db.prepare("UPDATE application_runs SET status=?, summary_json=?, updated_at=? WHERE id=?").run(status, JSON.stringify(summary), new Date().toISOString(), runId);
}

function recordApplicationRun(db: Database.Database, args: { runType: string; status: string; summary: Record<string, unknown> }): number {
  const now = new Date().toISOString();
  const info = db.prepare("INSERT INTO application_runs (run_type, status, summary_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(args.runType, args.status, JSON.stringify(args.summary), now, now);
  return Number(info.lastInsertRowid);
}

function recordApplicationAttempt(db: Database.Database, args: {
  runId: number;
  jobId: number;
  adapter: string;
  applyUrl?: string;
  status: string;
  requiredFields: FieldDescriptor[];
  answeredFields: FieldPlanEntry[];
  pauseReason?: string;
  finalUrl?: string;
  screenshotPath?: string;
  resumeArtifactPath?: string;
  coverLetterArtifactPath?: string;
  submittedAt?: string;
}): number {
  const now = new Date().toISOString();
  const mappedJobStatus =
    args.status === "submitted" || args.status === "submitted_verified"
      ? "applied_verified"
      : args.status === "submitted_unverified"
        ? "applied_unverified"
        : args.status === "blocked_needs_auth"
          ? "blocked_needs_auth"
          : args.status === "paused"
            ? "needs_review"
            : "blocked";
  const nextAction =
    args.status === "submitted" || args.status === "submitted_verified"
      ? "interview_followup"
      : args.status === "submitted_unverified"
        ? "sync_platform_or_email_proof"
        : args.status === "blocked_needs_auth"
          ? "restore_authenticated_browser"
          : "review_apply_assist";
  db.prepare("UPDATE hunt_jobs SET status=?, next_action=?, updated_at=? WHERE id=?")
    .run(mappedJobStatus, nextAction, now, args.jobId);

  const existing = db.prepare("SELECT id FROM application_attempts WHERE job_id=? LIMIT 1").get(args.jobId) as { id: number } | undefined;
  if (existing) {
    db.prepare(
      `UPDATE application_attempts SET run_id=?, adapter=?, apply_url=?, status=?, required_fields_json=?, answered_fields_json=?, pause_reason=?, final_url=?, screenshot_path=?, resume_artifact_path=?, cover_letter_artifact_path=?, submitted_at=?, updated_at=? WHERE job_id=?`
    ).run(
      args.runId,
      args.adapter,
      args.applyUrl || null,
      args.status,
      JSON.stringify(args.requiredFields.map((field) => field.label || field.name || field.type)),
      JSON.stringify(args.answeredFields.map((field) => ({ name: field.descriptor.name, label: field.descriptor.label, answer: field.answer, source: field.source }))),
      args.pauseReason || null,
      args.finalUrl || null,
      args.screenshotPath || null,
      args.resumeArtifactPath || null,
      args.coverLetterArtifactPath || null,
      args.submittedAt || null,
      now,
      args.jobId
    );
    return existing.id;
  }

  const info = db.prepare(
    `INSERT INTO application_attempts (run_id, job_id, adapter, apply_url, status, required_fields_json, answered_fields_json, pause_reason, final_url, screenshot_path, resume_artifact_path, cover_letter_artifact_path, submitted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    args.runId,
    args.jobId,
    args.adapter,
    args.applyUrl || null,
    args.status,
    JSON.stringify(args.requiredFields.map((field) => field.label || field.name || field.type)),
    JSON.stringify(args.answeredFields.map((field) => ({ name: field.descriptor.name, label: field.descriptor.label, answer: field.answer, source: field.source }))),
    args.pauseReason || null,
    args.finalUrl || null,
    args.screenshotPath || null,
    args.resumeArtifactPath || null,
    args.coverLetterArtifactPath || null,
    args.submittedAt || null,
    now,
    now
  );
  return Number(info.lastInsertRowid);
}

function insertEmailAutoAttempt(db: Database.Database, args: {
  messageId: string;
  threadId: string;
  sender?: string;
  subject?: string;
  status: string;
  score?: number;
  draftId?: string;
  sentMessageId?: string;
  reason?: string;
  body?: string;
}): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO email_auto_response_attempts (message_id, thread_id, sender, subject, status, score, draft_id, sent_message_id, reason, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(message_id) DO UPDATE SET
       status = excluded.status,
       score = excluded.score,
       draft_id = COALESCE(excluded.draft_id, email_auto_response_attempts.draft_id),
       sent_message_id = COALESCE(excluded.sent_message_id, email_auto_response_attempts.sent_message_id),
       reason = COALESCE(excluded.reason, email_auto_response_attempts.reason),
       body = COALESCE(excluded.body, email_auto_response_attempts.body),
       sender = COALESCE(excluded.sender, email_auto_response_attempts.sender),
       subject = COALESCE(excluded.subject, email_auto_response_attempts.subject),
       updated_at = excluded.updated_at`
  ).run(args.messageId, args.threadId, args.sender ?? null, args.subject ?? null, args.status, args.score ?? null, args.draftId ?? null, args.sentMessageId ?? null, args.reason ?? null, args.body ?? null, now, now);
}

async function buildApplicationArtifacts(args: {
  db: Database.Database;
  cfg: AutomationConfig;
  job: any;
}): Promise<{ resumePath: string | null; coverLetterPath: string | null; screenshotPath: string | null }> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-reply-agent-"));
  const packageRow = args.job.package_id ? { resume_text: args.job.resume_text, cover_letter_text: args.job.cover_letter_text } : null;
  const resumePath = packageRow ? path.join(tmpDir, "resume.txt") : null;
  const coverLetterPath = packageRow ? path.join(tmpDir, "cover-letter.txt") : null;

  if (packageRow && resumePath && coverLetterPath) {
    fs.writeFileSync(resumePath, packageRow.resume_text || "", "utf8");
    fs.writeFileSync(coverLetterPath, packageRow.cover_letter_text || "", "utf8");
  }

  const screenshotPath: string | null = null;

  if (args.cfg.rules.resume_tailoring?.enabled && args.cfg.rules.resume_tailoring?.template_path && fs.existsSync(args.cfg.rules.resume_tailoring.template_path)) {
    const cleanRole = clean(args.job.title);
    const cleanCompany = clean(args.job.company);
    if (!cleanRole || !cleanCompany) {
      return { resumePath, coverLetterPath, screenshotPath };
    }

    const parsed = {
      roleTitle: cleanRole,
      company: cleanCompany,
      location: "",
      employmentType: "",
      summary: args.job.description || "",
      recruiterName: "",
      parserConfidence: 80,
      cleanBody: args.job.description || "",
      cleanRoleTitle: cleanRole,
      alignmentKeywords: [],
      salaryOrRate: args.job.salary_or_rate || "",
      isUsRole: false
    };
    try {
      const templatePath = selectTailoringTemplatePath({
        parsed: parsed as any,
        jdText: args.job.description || "",
        defaultTemplatePath: args.cfg.rules.resume_tailoring.template_path,
        businessAnalysisTemplatePath: args.cfg.rules.resume_tailoring.business_analysis_template_path
      });
      const result = await tailorResumeForJD({
        parsed: parsed as any,
        jdText: args.job.description || "",
        templatePath,
        outputDir: args.cfg.rules.resume_tailoring.output_dir
      });
      if (packageRow?.cover_letter_text) {
        const coverDir = args.cfg.rules.resume_tailoring.output_dir || path.dirname(result.docxPath);
        fs.mkdirSync(coverDir, { recursive: true });
        const coverBase = path.basename(result.docxPath).replace(/\.docx$/i, " Cover Letter.txt");
        const durableCoverLetterPath = path.join(coverDir, coverBase);
        fs.writeFileSync(durableCoverLetterPath, packageRow.cover_letter_text || "", "utf8");
        return { resumePath: result.docxPath, coverLetterPath: durableCoverLetterPath, screenshotPath };
      }
      return { resumePath: result.docxPath, coverLetterPath, screenshotPath };
    } catch {
      return { resumePath, coverLetterPath, screenshotPath };
    }
  }

  return { resumePath, coverLetterPath, screenshotPath };
}

type ApplicationAttemptStatus =
  | "submitted"
  | "submitted_verified"
  | "submitted_unverified"
  | "paused"
  | "blocked"
  | "blocked_needs_auth";

async function submitApplication(args: {
  job: any;
  artifacts: { resumePath: string | null; coverLetterPath: string | null; screenshotPath: string | null };
  cfg: AutomationConfig;
}): Promise<{ status: ApplicationAttemptStatus; reason?: string; finalUrl?: string; screenshotPath?: string; adapter: string; requiredFields: FieldDescriptor[]; answeredFields: FieldPlanEntry[] }> {
  const { job, cfg } = args;
  let adapter = detectAdapter(job.apply_url || "", "");
  const finalUrl = job.apply_url || "";

  try {
    const forceHeadless = process.env.JOB_AGENT_HEADLESS === "true" || process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
    const session = await getSharedPlaywrightSession(forceHeadless);
    const contextPages = session.context.pages();
    for (let index = 1; index < contextPages.length; index += 1) {
      await contextPages[index].close().catch(() => undefined);
    }
    const page = contextPages[0] || session.page || await session.context.newPage();
    session.page = page;
    await page.goto(job.apply_url, { waitUntil: "domcontentloaded" });

    const html = await page.content();
    const visibleText = await collectVisibleTextIncludingShadow(page).catch(() => "");
    const pageSnapshot = `${stripTags(html)} ${visibleText}`;
    const diceDetailQualityReason = evaluateDiceDetailQualityGate(page.url() || job.apply_url || "", pageSnapshot);
    if (diceDetailQualityReason) {
      const screenshotPath = args.artifacts.screenshotPath ? args.artifacts.screenshotPath : path.join(os.tmpdir(), `job-reply-agent-dice-quality-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
      return { status: "blocked", reason: diceDetailQualityReason, finalUrl: page.url() || finalUrl, screenshotPath, adapter: "dice", requiredFields: [], answeredFields: [] };
    }

    if (String(job.source || "").trim().toLowerCase() === "dice" || /dice\.com/i.test(page.url() || job.apply_url || "")) {
      return await submitDiceEasyApply({
        page,
        context: session.context,
        job,
        artifacts: args.artifacts,
        cfg,
        detailText: pageSnapshot,
        finalUrl
      });
    }

    const closedReason = detectClosedOrRemovedPosting(job.apply_url || "", pageSnapshot);
    if (closedReason) {
      const screenshotPath = args.artifacts.screenshotPath ? args.artifacts.screenshotPath : path.join(os.tmpdir(), `job-reply-agent-closed-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
      return { status: "blocked", reason: closedReason, finalUrl: page.url() || finalUrl, screenshotPath, adapter, requiredFields: [], answeredFields: [] };
    }

    adapter = detectAdapter(job.apply_url || "", html);
    const humanGateReason = detectHumanGate(job.apply_url || "", pageSnapshot);
    if (humanGateReason) {
      const screenshotPath = args.artifacts.screenshotPath ? args.artifacts.screenshotPath : path.join(os.tmpdir(), `job-reply-agent-human-gate-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
      return { status: "paused", reason: humanGateReason, finalUrl: page.url() || finalUrl, screenshotPath, adapter, requiredFields: [], answeredFields: [] };
    }

    const plan = buildApplicationPlan({
      url: job.apply_url,
      html,
      profile: cfg.profile,
      answers: cfg.applicationAnswers,
      job,
      packageRow: job.package_id ? { id: job.package_id, resume_text: job.resume_text, cover_letter_text: job.cover_letter_text } : null,
      resumeTemplatePath: cfg.rules.resume_tailoring?.template_path,
      resumeOutputDir: cfg.rules.resume_tailoring?.output_dir
    });

    if (plan.pauseReasons.length > 0) {
      const reason = plan.pauseReasons.map((item) => item.reason).join("; ");
      const screenshotPath = args.artifacts.screenshotPath ? args.artifacts.screenshotPath : path.join(os.tmpdir(), `job-reply-agent-pause-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
      return { status: "paused", reason, finalUrl: page.url() || finalUrl, screenshotPath, adapter, requiredFields: plan.requiredFields, answeredFields: plan.entries };
    }

    for (const entry of plan.entries) {
      await fillFieldOnPage(page, entry.descriptor, entry.answer, args.artifacts);
    }

    const submitButton = page.getByRole("button", { name: /submit|apply|send application|review and submit/i }).first();
    if (await submitButton.count().catch(() => 0)) {
      await submitButton.click().catch(() => undefined);
    }

    await page.waitForLoadState("networkidle").catch(() => undefined);
    const screenshotPath = args.artifacts.screenshotPath ? args.artifacts.screenshotPath : path.join(os.tmpdir(), `job-reply-agent-submit-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    const currentUrl = page.url();
    return { status: "submitted_unverified", reason: "Submit clicked; waiting for platform or Gmail confirmation proof.", finalUrl: currentUrl || finalUrl, screenshotPath, adapter, requiredFields: plan.requiredFields, answeredFields: plan.entries };
  } catch (error) {
    return { status: "paused", reason: error instanceof Error ? error.message : "Browser automation failed", finalUrl, screenshotPath: args.artifacts.screenshotPath || undefined, adapter, requiredFields: [], answeredFields: [] };
  }
}

async function submitDiceEasyApply(args: {
  page: any;
  context: any;
  job: any;
  artifacts: { resumePath: string | null; coverLetterPath: string | null; screenshotPath: string | null };
  cfg: AutomationConfig;
  detailText: string;
  finalUrl: string;
}): Promise<{ status: ApplicationAttemptStatus; reason?: string; finalUrl?: string; screenshotPath?: string; adapter: string; requiredFields: FieldDescriptor[]; answeredFields: FieldPlanEntry[] }> {
  const { page, context, job, artifacts, cfg } = args;
  const screenshotPath = artifacts.screenshotPath || path.join(os.tmpdir(), `job-reply-agent-dice-${Date.now()}.png`);

  if (!/easy\s+apply/i.test(args.detailText)) {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    return {
      status: "blocked",
      reason: "Dice Easy Apply only is enabled. This posting is external/non-Easy Apply, so it was not submitted.",
      finalUrl: page.url() || args.finalUrl,
      screenshotPath,
      adapter: "dice",
      requiredFields: [],
      answeredFields: []
    };
  }

  if (!artifacts.resumePath || !/\.docx$/i.test(artifacts.resumePath) || !fs.existsSync(artifacts.resumePath)) {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    return {
      status: "paused",
      reason: "DOCX resume artifact is required before Dice Easy Apply can submit.",
      finalUrl: page.url() || args.finalUrl,
      screenshotPath,
      adapter: "dice",
      requiredFields: [],
      answeredFields: []
    };
  }

  const pagesBefore = new Set(context.pages());
  const easyApply = page.getByRole("button", { name: /easy\s+apply/i }).first();
  const easyApplyLink = page.getByRole("link", { name: /easy\s+apply/i }).first();
  const diceWizardLink = page.locator('a[href*="/job-applications/"]').first();
  if (await easyApply.count().catch(() => 0)) {
    await easyApply.click({ timeout: 15000 }).catch(() => undefined);
  } else if (await easyApplyLink.count().catch(() => 0)) {
    await easyApplyLink.click({ timeout: 15000 }).catch(() => undefined);
  } else if (await diceWizardLink.count().catch(() => 0)) {
    await diceWizardLink.click({ timeout: 15000 }).catch(() => undefined);
  } else {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    return {
      status: "blocked",
      reason: "Dice Easy Apply text was present, but no clickable Easy Apply control was found.",
      finalUrl: page.url() || args.finalUrl,
      screenshotPath,
      adapter: "dice",
      requiredFields: [],
      answeredFields: []
    };
  }

  await page.waitForTimeout(2500);
  const newPage = context.pages().find((candidate: any) => !pagesBefore.has(candidate));
  const applyPage = newPage || page;
  await applyPage.bringToFront().catch(() => undefined);

  if (!/dice\.com/i.test(applyPage.url())) {
    await applyPage.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    return {
      status: "blocked",
      reason: `Dice Easy Apply opened an external ATS (${applyPage.url()}). External applications are paused until a dedicated verified flow is available.`,
      finalUrl: applyPage.url() || args.finalUrl,
      screenshotPath,
      adapter: detectAdapter(applyPage.url(), ""),
      requiredFields: [],
      answeredFields: []
    };
  }

  await attachDiceResume(applyPage, artifacts.resumePath);
  await attachDiceCoverLetter(applyPage, artifacts.coverLetterPath);
  const answeredFields: FieldPlanEntry[] = [];
  answeredFields.push(...(await fillDiceEasyApplySafeFields({ page: applyPage, job, cfg, artifacts })));
  await captureDiceDebugScreenshot(applyPage, job, "files-attached");

  let clickedFinalSubmit = false;
  for (let step = 0; step < 4; step += 1) {
    answeredFields.push(...(await fillDiceEasyApplySafeFields({ page: applyPage, job, cfg, artifacts })));
    await captureDiceDebugScreenshot(applyPage, job, `step-${step + 1}-after-fill`);
    const action = applyPage.getByRole("button", { name: /next|submit|send application|apply/i }).last();
    if (!(await action.count().catch(() => 0))) break;
    const actionText = clean(await action.innerText().catch(() => ""));
    if (!/next/i.test(actionText)) {
      await captureDiceDebugScreenshot(applyPage, job, "final-review-before-submit");
    }
    await action.click({ timeout: 15000 }).catch(() => undefined);
    await applyPage.waitForTimeout(4000);
    if (!/next/i.test(actionText)) {
      clickedFinalSubmit = true;
      break;
    }
  }

  if (!clickedFinalSubmit) {
    await applyPage.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    return {
      status: "paused",
      reason: "Dice Easy Apply wizard did not reach a final submit button.",
      finalUrl: applyPage.url() || args.finalUrl,
      screenshotPath,
      adapter: "dice",
      requiredFields: [],
      answeredFields: []
    };
  }

  await applyPage.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  await captureDiceDebugScreenshot(applyPage, job, "after-submit");

  const history = await verifyDiceAppliedHistory({
    context,
    title: job.title || "",
    company: job.company || ""
  });

  if (history.ok) {
    return {
      status: "submitted_verified",
      reason: `Verified in Dice Applied Jobs history: ${history.reason}`,
      finalUrl: history.url || applyPage.url() || args.finalUrl,
      screenshotPath: history.screenshotPath || screenshotPath,
      adapter: "dice",
      requiredFields: [],
      answeredFields
    };
  }

  return {
    status: "paused",
    reason: `Dice Easy Apply did not verify in Applied Jobs history. ${history.reason}`,
    finalUrl: history.url || applyPage.url() || args.finalUrl,
    screenshotPath: history.screenshotPath || screenshotPath,
    adapter: "dice",
    requiredFields: [],
    answeredFields
  };
}

function resolveFieldAnswer(field: FieldDescriptor, answerMap: Record<string, string>, args: { job: any; packageRow: any; profile: ProfileConfig; answers: ApplicationAnswersConfig }): { answer: string; source: string; isSensitive: boolean } {
  const candidates = [field.label, field.name, field.placeholder, field.id].filter(Boolean).map(normalizeKey);
  const fieldText = `${field.label} ${field.name} ${field.placeholder} ${field.id}`.toLowerCase();
  const sensitive = isSensitiveField(field);

  for (const candidate of candidates) {
    const value = answerMap[candidate];
    if (value) return { answer: value, source: "saved_answer", isSensitive: sensitive };
  }

  // Provide resilient fallback matching for common application prompts
  // whose labels vary widely across ATS providers.
  if (/work authorization|authorized to work|legally authorized|eligible to work|visa|sponsorship|citizen|permanent\s+resident/.test(fieldText)) {
    const choice = resolveWorkAuthorizationChoice(field, fieldText, args);
    if (choice) return { ...choice, isSensitive: true };

    const value = clean(args.answers.work_authorization_text || args.profile.work_authorization_note);
    if (value) return { answer: value, source: "saved_answer_fallback", isSensitive: true };
  }

  if (/salary|compensation|pay|rate|expected.*(salary|compensation)|desired.*(salary|compensation)/.test(fieldText)) {
    const value = clean(args.answers.salary_expectation);
    if (value) return { answer: value, source: "saved_answer_fallback", isSensitive: true };
  }

  if (/relocation|willing to relocate/.test(fieldText)) {
    const value = clean(args.answers.relocation_preference);
    if (value) return { answer: value, source: "saved_answer_fallback", isSensitive: true };
  }

  if (/gender|veteran|disability|ethnicity|eeo|equal employment/.test(fieldText)) {
    const value = clean(formatEeo(args.answers.eeo));
    if (value) return { answer: value, source: "saved_answer_fallback", isSensitive: true };
  }

  if (/resume|cv/i.test(`${field.label} ${field.name} ${field.placeholder}`) && args.packageRow?.resume_text) {
    return { answer: args.packageRow.resume_text, source: "generated_package", isSensitive: false };
  }

  if (/cover letter|message|why are you interested|tell us/i.test(`${field.label} ${field.name} ${field.placeholder}`)) {
    // Lower ROI by default: only provide cover-letter style text when the field is required.
    if (!field.required) {
      return { answer: "", source: "", isSensitive: false };
    }

    const tailored = String(args.packageRow?.cover_letter_text || "").trim();
    if (tailored) {
      return { answer: tailored, source: "generated_package", isSensitive: false };
    }

    return { answer: buildRequiredCoverLetter(args.job, args.profile), source: "generated_required_cover_letter", isSensitive: false };
  }

  return { answer: "", source: "", isSensitive: sensitive };
}

function resolveWorkAuthorizationChoice(
  field: FieldDescriptor,
  fieldText: string,
  args: { profile: ProfileConfig; answers: ApplicationAnswersConfig }
): { answer: string; source: string } | null {
  if (!isYesNoField(field)) return null;

  const workAuthText = clean(args.answers.work_authorization_text || args.profile.work_authorization_note).toLowerCase();
  const canadianCitizen = /\bcanadian citizen\b/.test(workAuthText);
  if (!canadianCitizen) return null;

  const asksCanadianCitizenOrPr =
    /canadian/.test(fieldText) &&
    (/citizen/.test(fieldText) || /permanent\s+resident/.test(fieldText) || /\bpr\b/.test(fieldText));
  if (asksCanadianCitizenOrPr) {
    return { answer: "Yes", source: "saved_canadian_citizenship" };
  }

  const asksCanadaWorkEligibility =
    /canada|canadian/.test(fieldText) &&
    /(authorized|authorised|eligible|legally).{0,80}(work|employment)/.test(fieldText);
  if (asksCanadaWorkEligibility) {
    return { answer: "Yes", source: "saved_canada_work_authorization" };
  }

  const asksCanadaSponsorship =
    /(canada|canadian)/.test(fieldText) &&
    /(require|need|now|future|currently).{0,100}(sponsor|sponsorship|visa)/.test(fieldText);
  if (asksCanadaSponsorship || /(sponsor|sponsorship|visa).{0,100}(canada|canadian)/.test(fieldText)) {
    return { answer: "No", source: "saved_canada_work_authorization" };
  }

  return null;
}

function isYesNoField(field: FieldDescriptor): boolean {
  const optionText = field.options.join(" ").toLowerCase();
  if (/\byes\b/.test(optionText) && /\bno\b/.test(optionText)) return true;
  return /^(radio|checkbox|select)$/i.test(field.type);
}

function isSensitiveField(field: FieldDescriptor): boolean {
  return SENSITIVE_FIELD_RE.test(`${field.label} ${field.name} ${field.placeholder}`);
}

function isRecruiterOpportunity(message: RecruiterMessage): boolean {
  const combined = `${message.from} ${message.subject} ${message.body}`;
  return RECRUITER_LIKE_RE.test(combined) && !isJobAlertMessage(message);
}

function isJobAlertMessage(message: RecruiterMessage): boolean {
  return /job alert|new jobs?|recommended jobs?|job matches?|apply now|view job/i.test(`${message.subject} ${message.body}`);
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function upsertContactForJob(db: Database.Database, jobId: number, company: string, email: string, message: RecruiterMessage): void {
  db.prepare(
    `INSERT INTO hunt_contacts (name, email, company, source, last_job_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(email, company) DO UPDATE SET last_job_id = excluded.last_job_id, source = excluded.source, updated_at = excluded.updated_at`
  ).run("", email || "", company || "", "recruiter", jobId, new Date().toISOString(), new Date().toISOString());
}

function extractEmail(value: string): string {
  return value.match(/<([^>]+)>/)?.[1] || value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function countQuery(db: Database.Database, sql: string): number {
  const row = db.prepare(sql).get() as { c?: number; count?: number } | undefined;
  return Number(row?.c ?? row?.count ?? 0);
}

function normalizeKey(value: string): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeProofText(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clean(value?: string | null): string {
  return String(value || "").trim();
}

function diceDebugDir(): string {
  const dir = resolveProjectPath(".local", "dice-debug");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function indeedProofDir(): string {
  const dir = resolveProjectPath(".local", "indeed-proof");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeFileSlug(value: string): string {
  return clean(value)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .toLowerCase() || "dice";
}

function makeDiceDebugScreenshotPath(job: any, slug: string): string {
  const jobPart = safeFileSlug(`${job?.id || "job"}-${job?.company || "company"}-${job?.title || "role"}`);
  return path.join(diceDebugDir(), `${jobPart}-${safeFileSlug(slug)}-${Date.now()}.png`);
}

async function captureDiceDebugScreenshot(page: any, job: any, slug: string): Promise<string | undefined> {
  const screenshotPath = makeDiceDebugScreenshotPath(job, slug);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  return fs.existsSync(screenshotPath) ? screenshotPath : undefined;
}

function buildRequiredCoverLetter(job: any, profile: ProfileConfig): string {
  const role = clean(job?.title);
  const company = clean(job?.company);
  if (!role || !company) {
    return normalizeVoiceText([
      "Dear Hiring Team,",
      "I can share role-specific alignment once the target role title and company are confirmed.",
      "Best regards,",
      profile.name,
      profile.contact?.email || ""
    ].join("\n\n"));
  }

  const cover = buildTailoredCoverLetter({
    roleTitle: role,
    company,
    jdText: clean(job?.description),
    profileName: profile.name,
    profileEmail: profile.contact?.email || ""
  });
  return normalizeVoiceText(cover.text);
}

function normalizeVoiceText(value: string): string {
  return value
    .replace(/[—–]+/g, " ")
    .replace(/\s--\s|--/g, " ")
    .replace(/\b(um|uh)\b/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeReplyRole(raw: string): string {
  const cleaned = String(raw || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/[|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const withoutLead = cleaned
    .replace(/^job\s+opportunity\s+as\s+/i, "")
    .replace(/^hiring\s+for\s+/i, "")
    .replace(/^opportunity\s+for\s+/i, "");

  const firstClause = withoutLead.split(/\.|:|\(|\)|\s+-\s+/)[0].trim();
  const words = firstClause.split(/\s+/).filter(Boolean).slice(0, 8);
  const compact = words.join(" ").replace(/[^a-zA-Z0-9/&+\- ]/g, "").trim();
  return compact || "the role";
}

function normalizeLabel(value: string): string {
  return clean(value).replace(/\s+/g, " ");
}

function stripTags(value: string): string {
  return clean(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

async function collectVisibleTextIncludingShadow(page: any): Promise<string> {
  const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  if (clean(bodyText)) return clean(bodyText.replace(/\s+/g, " "));

  return await page.evaluate(() => {
    const chunks: string[] = [];
    function walk(node: Node): void {
      if (node.nodeType === Node.TEXT_NODE) {
        const value = (node.textContent || "").replace(/\s+/g, " ").trim();
        if (value) chunks.push(value);
        return;
      }
      if (!(node instanceof Element || node instanceof ShadowRoot || node instanceof DocumentFragment)) return;
      if (node instanceof Element && node.shadowRoot) walk(node.shadowRoot);
      for (const child of Array.from(node.childNodes)) walk(child);
    }
    walk(document);
    return chunks.join(" ").replace(/\s+/g, " ").trim();
  });
}

async function attachDiceResume(page: any, resumePath: string): Promise<void> {
  const currentText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  const resumeFileName = path.basename(resumePath);
  if (currentText.includes(resumeFileName)) return;

  const resumeOptions = page.getByRole("button", { name: /file options/i }).first();
  if (await resumeOptions.count().catch(() => 0)) {
    await resumeOptions.click({ timeout: 10000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    const replace = page.getByRole("menuitem", { name: /replace/i }).first();
    if (await replace.count().catch(() => 0)) {
      await replace.click({ timeout: 10000 }).catch(() => undefined);
      await page.waitForTimeout(500);
    }
  }

  const fileInputs = page.locator("input[type='file']");
  const count = await fileInputs.count().catch(() => 0);
  if (count > 0) {
    await fileInputs.first().setInputFiles(resumePath);
    await page.waitForTimeout(1000);
  }
}

async function attachDiceCoverLetter(page: any, coverLetterPath?: string | null): Promise<void> {
  if (!coverLetterPath || !fs.existsSync(coverLetterPath)) return;
  if (process.env.JOB_AGENT_DICE_UPLOAD_COVER_FILE !== "true") return;
  if (!/\.(docx|pdf)$/i.test(coverLetterPath)) return;

  const currentText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  const coverFileName = path.basename(coverLetterPath);
  if (currentText.includes(coverFileName)) return;
  if (!/cover\s+letter/i.test(currentText)) return;

  const fileInputs = page.locator("input[type='file']");
  const count = await fileInputs.count().catch(() => 0);
  if (count <= 0) return;

  const target = count >= 2 ? fileInputs.nth(count - 1) : fileInputs.first();
  await target.setInputFiles(coverLetterPath).catch(() => undefined);
  await page.waitForTimeout(1000);
}

async function fillDiceEasyApplySafeFields(args: {
  page: any;
  job: any;
  cfg: AutomationConfig;
  artifacts: { resumePath: string | null; coverLetterPath: string | null; screenshotPath: string | null };
}): Promise<FieldPlanEntry[]> {
  const { page, cfg, job } = args;
  const answers = cfg.applicationAnswers;
  const profile = cfg.profile;
  const answeredFields: FieldPlanEntry[] = [];
  const safeTextAnswers: Array<[RegExp, string]> = [
    [/first\s*name/i, (answers.full_name || profile.name || "").split(/\s+/)[0] || ""],
    [/last\s*name/i, (answers.full_name || profile.name || "").split(/\s+/).slice(1).join(" ") || ""],
    [/full\s*name|name/i, answers.full_name || profile.name || ""],
    [/email/i, answers.email || profile.contact.email || ""],
    [/verify\s*email|confirm\s*email/i, answers.email || profile.contact.email || ""],
    [/phone/i, answers.phone || profile.contact.phone || ""],
    [/linkedin/i, answers.linkedin_url || profile.contact.linkedin || ""],
    [/city/i, answers.city || profile.location.split(",")[0] || ""]
  ];

  for (const [label, value] of safeTextAnswers) {
    if (!value) continue;
    const field = page.getByLabel(label).first();
    const filled = (await field.count().catch(() => 0)) > 0
      ? await field.fill(value, { timeout: 1500 }).then(() => true).catch(() => false)
      : false;
    if (filled) {
      answeredFields.push({
        descriptor: { tag: "input", name: "", id: "", type: "text", label: String(label), placeholder: "", required: false, options: [] },
        answer: value,
        source: "saved_answer_dice",
        isSensitive: false
      });
    }
  }

  const coverText = clean(job.cover_letter_text || "");
  if (coverText) {
    const field = page.getByLabel(/cover letter|message|note/i).first();
    const filled = (await field.count().catch(() => 0)) > 0
      ? await field.fill(coverText, { timeout: 1500 }).then(() => true).catch(() => false)
      : false;
    if (filled) {
      answeredFields.push({
        descriptor: { tag: "textarea", name: "", id: "", type: "text", label: "cover letter", placeholder: "", required: false, options: [] },
        answer: coverText.slice(0, 300),
        source: "generated_package",
        isSensitive: false
      });
    }
  }

  answeredFields.push(...(await answerDiceKnownRadioQuestions(page, cfg)));
  return answeredFields;
}

async function answerDiceKnownRadioQuestions(page: any, cfg: AutomationConfig): Promise<FieldPlanEntry[]> {
  const workAuthText = clean(cfg.applicationAnswers.work_authorization_text || cfg.profile.work_authorization_note);
  const canAnswerWorkAuth = /canadian citizen|tn status|eligible/i.test(workAuthText);
  const relocationText = clean(cfg.applicationAnswers.relocation_preference);
  const relocationAnswer = /relocat/i.test(relocationText) ? "Yes" : "No";

  const decisions = await page.evaluate(
    ({ canAnswerWorkAuth: canWorkAuth, relocationAnswer: relocateAnswer }: { canAnswerWorkAuth: boolean; relocationAnswer: string }) => {
      type Decision = { question: string; answer: string; source: string; clicked: boolean };

      function isVisible(el: Element): boolean {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      }

      function compact(value: string): string {
        return String(value || "").replace(/\s+/g, " ").trim();
      }

      function groupFor(input: HTMLInputElement): HTMLElement {
        let node = (input.closest("fieldset,[role='radiogroup']") || input.parentElement) as HTMLElement | null;
        let best = node || input;
        while (node && node !== document.body) {
          const radios = Array.from(node.querySelectorAll("input[type='radio']"));
          const text = compact(node.innerText || "");
          if (radios.length <= 6 && text.length <= 800) best = node;
          node = node.parentElement;
        }
        return best as HTMLElement;
      }

      function optionText(input: HTMLInputElement, group: HTMLElement): string {
        const explicit = input.id ? group.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null;
        const nested = input.closest("label");
        const aria = input.getAttribute("aria-label") || "";
        return compact(`${aria} ${(explicit as HTMLElement | null)?.innerText || ""} ${(nested as HTMLElement | null)?.innerText || ""} ${input.value || ""}`);
      }

      function clickAnswer(group: HTMLElement, answer: string): boolean {
        const radios = Array.from(group.querySelectorAll("input[type='radio']")) as HTMLInputElement[];
        const target = radios.find((input) => {
          const text = optionText(input, group).toLowerCase();
          if (answer.toLowerCase() === "yes") return /^yes\b/.test(text) || text === "y" || input.value.toLowerCase() === "yes";
          if (answer.toLowerCase() === "no") return /^no\b/.test(text) || text === "n" || input.value.toLowerCase() === "no";
          return text.includes(answer.toLowerCase());
        });
        if (!target) return false;
        const label = target.id ? group.querySelector(`label[for="${CSS.escape(target.id)}"]`) : target.closest("label");
        (label as HTMLElement | null)?.click();
        target.click();
        return true;
      }

      const seen = new Set<string>();
      const results: Decision[] = [];
      const inputs = Array.from(document.querySelectorAll("input[type='radio']")) as HTMLInputElement[];
      for (const input of inputs) {
        const key = input.name || input.id || `${input.getBoundingClientRect().top}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const group = groupFor(input);
        if (!isVisible(group)) continue;
        const radios = Array.from(group.querySelectorAll("input[type='radio']")) as HTMLInputElement[];
        if (radios.some((radio) => radio.checked)) continue;

        const question = compact(group.innerText || "");
        const lower = question.toLowerCase();
        let answer = "";
        let source = "";
        if (canWorkAuth && /authorized|eligible|legally.*work|work.*united states|work.*u\.?s/i.test(lower) && !/sponsorship/i.test(lower)) {
          answer = "Yes";
          source = "saved_work_authorization";
        } else if (/sponsorship|visa sponsor/i.test(lower)) {
          answer = "No";
          source = "saved_work_authorization";
        } else if (/relocat|relocation/i.test(lower)) {
          answer = relocateAnswer;
          source = "saved_relocation_preference";
        }

        if (!answer) continue;
        results.push({ question, answer, source, clicked: clickAnswer(group, answer) });
      }

      return results;
    },
    { canAnswerWorkAuth, relocationAnswer }
  ).catch(() => [] as Array<{ question: string; answer: string; source: string; clicked: boolean }>);

  return (decisions as Array<{ question: string; answer: string; source: string; clicked: boolean }>)
    .filter((item: { question: string; answer: string; source: string; clicked: boolean }) => item.clicked)
    .map((item: { question: string; answer: string; source: string; clicked: boolean }) => ({
      descriptor: { tag: "input", name: "", id: "", type: "radio", label: item.question.slice(0, 300), placeholder: "", required: true, options: ["Yes", "No"] },
      answer: item.answer,
      source: item.source,
      isSensitive: true
    }));
}

async function verifyDiceAppliedHistory(args: {
  context: any;
  title: string;
  company: string;
}): Promise<{ ok: boolean; reason: string; url?: string; screenshotPath?: string }> {
  const page = await args.context.newPage();
  const screenshotPath = path.join(diceDebugDir(), `dice-applied-history-${safeFileSlug(`${args.company}-${args.title}`)}-${Date.now()}.png`);
  try {
    await page.goto("https://www.dice.com/my-jobs?type=applied", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);
    const text = await collectVisibleTextIncludingShadow(page).catch(() => "");
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    if (/dashboard\/login|sign\s*in|log\s*in|create an account/i.test(`${page.url()} ${text}`)) {
      return {
        ok: false,
        reason: "Dice Applied Jobs verification could not run because the CDP browser is not signed in to Dice.",
        url: page.url(),
        screenshotPath
      };
    }
    const normalized = normalizeProofText(text);
    const titleNeedle = normalizeProofText(args.title);
    const companyNeedle = normalizeProofText(args.company);
    const titleWords = titleNeedle.split(" ").filter((word) => word.length > 2);
    const titleMatched = titleNeedle && (normalized.includes(titleNeedle) || titleWords.filter((word) => normalized.includes(word)).length >= Math.min(3, titleWords.length));
    const companyMatched = companyNeedle && normalized.includes(companyNeedle);

    if (titleMatched && companyMatched) {
      return { ok: true, reason: `${args.company} - ${args.title} appears in Dice Applied Jobs.`, url: page.url(), screenshotPath };
    }

    return {
      ok: false,
      reason: `${args.company} - ${args.title} was not found in Dice Applied Jobs history.`,
      url: page.url(),
      screenshotPath
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}

export function matchesIndeedAppliedHistoryText(args: {
  text: string;
  title: string;
  company: string;
}): boolean {
  const normalized = normalizeProofText(args.text);
  const titleNeedle = normalizeProofText(args.title);
  const companyNeedle = normalizeProofText(args.company);
  const titleWords = titleNeedle.split(" ").filter((word) => word.length > 2);
  const companyWords = companyNeedle.split(" ").filter((word) => word.length > 2 && !["inc", "llc", "ltd", "corp", "co"].includes(word));
  const titleMatched = Boolean(titleNeedle)
    && (normalized.includes(titleNeedle) || titleWords.filter((word) => normalized.includes(word)).length >= Math.min(3, titleWords.length));
  const companyMatched = Boolean(companyNeedle)
    && (normalized.includes(companyNeedle) || companyWords.filter((word) => normalized.includes(word)).length >= Math.min(2, companyWords.length || 2));
  return titleMatched && companyMatched;
}

export async function verifyIndeedAppliedHistoryForJob(job: {
  title: string;
  company: string;
}): Promise<{ ok: boolean; reason: string; url?: string; screenshotPath?: string }> {
  const cdpUrl = process.env.JOB_AGENT_CDP_URL;
  if (!cdpUrl) {
    return {
      ok: false,
      reason: "Indeed Applied verification requires the existing Fejiro Chrome CDP session. Set JOB_AGENT_CDP_URL before verifying."
    };
  }

  const playwright = await import("playwright");
  const browser = await playwright.chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = await context.newPage();
  const screenshotPath = path.join(indeedProofDir(), `indeed-applied-history-${safeFileSlug(`${job.company}-${job.title}`)}-${Date.now()}.png`);

  try {
    await page.goto("https://myjobs.indeed.com/applied", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);
    const text = await collectVisibleTextIncludingShadow(page).catch(() => "");
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    if (/dashboard\/login|\/login|sign\s*in|log\s*in|create an account|continue with google/i.test(`${page.url()} ${text}`)) {
      return {
        ok: false,
        reason: "Indeed Applied verification could not run because the CDP browser is not signed in to Indeed.",
        url: page.url(),
        screenshotPath
      };
    }

    if (matchesIndeedAppliedHistoryText({ text, title: job.title, company: job.company })) {
      return {
        ok: true,
        reason: `${job.company} - ${job.title} appears in Indeed My Jobs Applied history.`,
        url: page.url(),
        screenshotPath
      };
    }

    return {
      ok: false,
      reason: `${job.company} - ${job.title} was not found in Indeed My Jobs Applied history.`,
      url: page.url(),
      screenshotPath
    };
  } finally {
    await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

export async function verifyDiceAppliedHistoryForJob(job: {
  title: string;
  company: string;
}): Promise<{ ok: boolean; reason: string; url?: string; screenshotPath?: string }> {
  const session = await getSharedPlaywrightSession(process.env.JOB_AGENT_HEADLESS === "true" || process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true");
  try {
    return await verifyDiceAppliedHistory({
      context: session.context,
      title: job.title,
      company: job.company
    });
  } finally {
    await closeSharedPlaywrightSession().catch(() => undefined);
  }
}

function parseAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of input.matchAll(/([a-zA-Z_:][\w:-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    attrs[match[1].toLowerCase()] = match[3] || match[4] || match[5] || "";
  }
  return attrs;
}

function formatEeo(eeo?: ApplicationAnswersConfig["eeo"]): string {
  return [eeo?.gender, eeo?.veteran_status, eeo?.disability_status, eeo?.ethnicity].filter(Boolean).join(", ");
}

function trimToWordLimit(value: string, limit: number): string {
  const words = value.split(/\s+/).filter(Boolean);
  return words.length <= limit ? value.trim() : words.slice(0, limit).join(" ");
}

function detectAdapter(url: string, html: string): string {
  const combined = `${url} ${html}`.toLowerCase();
  if (combined.includes("workday")) return "workday";
  if (combined.includes("indeed")) return "indeed";
  if (combined.includes("dice")) return "dice";
  if (combined.includes("greenhouse") || combined.includes("lever") || combined.includes("ashby") || combined.includes("apply")) return "simple_ats";
  return "generic";
}

function detectHumanGate(url: string, html: string): string {
  const combined = `${url} ${html}`.toLowerCase();
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (/recaptcha|hcaptcha|cf-turnstile|g-recaptcha|captcha/i.test(combined)) {
    return "Captcha or bot challenge detected. Complete it in one authenticated browser session, then rerun Auto Apply.";
  }
  if (host.includes("indeed") && /sign in|signin|log in|continue with google|continue with apple|verify it's you|enter code/i.test(combined)) {
    return "Indeed sign-in or identity verification detected. Complete this step in one authenticated browser session, then rerun Auto Apply.";
  }
  if (host.includes("linkedin") && /sign in|signin|log in|verify|checkpoint|security challenge|challenge/i.test(combined)) {
    return "LinkedIn authentication or checkpoint detected. Complete it in one authenticated browser session, then rerun Auto Apply.";
  }
  return "";
}

function getInvalidApplyUrlReason(url: string): string {
  const value = clean(url).toLowerCase();
  if (!value) return "Missing apply URL.";
  if (!/^https?:\/\//.test(value)) return "Apply URL must start with http or https.";
  if (/https?:\/\/(www\.)?httpbin\.org\//i.test(value)) {
    return "Apply URL is a test endpoint and is blocked from auto-apply.";
  }
  if (/[\/?&]example([\/?&=]|$)/i.test(value) || /example\.com/i.test(value)) {
    return "Apply URL is a placeholder/example link and is blocked from auto-apply.";
  }
  if (/\/errorpages\/404|\b404\b/i.test(value)) {
    return "Apply URL appears to be a 404/error route and is blocked from auto-apply.";
  }
  return "";
}

function detectClosedOrRemovedPosting(url: string, html: string): string {
  const combined = `${url}\n${html}`.toLowerCase();
  if (/job you are looking for is no longer open|posting you\'re looking for might have closed|we couldn\'t find anything here|this job is no longer available|position has been filled|position is no longer accepting applications/.test(combined)) {
    return "Job posting appears closed or removed. Blocked from auto-submit.";
  }
  return "";
}

async function withApplyAcknowledgement(args: {
  cfg: AutomationConfig;
  job: any;
  result: { status: ApplicationAttemptStatus; reason?: string; finalUrl?: string; adapter: string };
  artifacts: { resumePath: string | null; coverLetterPath: string | null; screenshotPath: string | null };
}): Promise<string | undefined> {
  const baseReason = args.result.reason;
  if (args.result.status !== "submitted" && args.result.status !== "submitted_verified" && args.result.status !== "submitted_unverified") return baseReason;
  if (isSyntheticOrValidationJob(args.job)) {
    return `${baseReason || "Auto-submit approved"}; acknowledgment email skipped for synthetic/validation record.`;
  }

  const to = clean(args.cfg.profile?.contact?.email) || clean(args.cfg.env.gmailAccountEmail);
  if (!to) return `${baseReason || "Auto-submit approved"}; acknowledgment email skipped (no recipient configured).`;

  const subject = `[Job Agent] Application ${args.result.status.toUpperCase()} - ${clean(args.job?.title) || "Role"} @ ${clean(args.job?.company) || "Company"}`;
  const body = [
    `Application status: ${args.result.status}`,
    `Role: ${clean(args.job?.title) || "Unknown"}`,
    `Company: ${clean(args.job?.company) || "Unknown"}`,
    `Tier: ${clean(args.job?.tier) || "Unknown"}`,
    `Source: ${clean(args.job?.source) || "Unknown"}`,
    `Apply URL: ${clean(args.job?.apply_url) || "n/a"}`,
    `Final URL: ${clean(args.result.finalUrl) || clean(args.job?.apply_url) || "n/a"}`,
    `Adapter: ${clean(args.result.adapter) || "unknown"}`,
    `Resume Artifact: ${clean(args.artifacts.resumePath) || "n/a"}`,
    `Cover Letter Artifact: ${clean(args.artifacts.coverLetterPath) || "n/a"}`,
    `Timestamp: ${new Date().toISOString()}`
  ].join("\n");

  try {
    await sendPlainTextEmail({
      cfg: args.cfg.env,
      to,
      subject,
      body
    });
    return `${baseReason || "Auto-submit approved"}; acknowledgment email sent to ${to}.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown mail error";
    return `${baseReason || "Auto-submit approved"}; acknowledgment email failed (${message}).`;
  }
}

function isSyntheticOrValidationJob(job: any): boolean {
  const haystack = [
    clean(job?.title),
    clean(job?.company),
    clean(job?.source),
    clean(job?.apply_url),
    clean(job?.source_url)
  ]
    .join(" ")
    .toLowerCase();

  return /\b(validation|synthetic|test)\b/.test(haystack)
    || /example\.com|\/example\//.test(haystack)
    || /https?:\/\/(www\.)?httpbin\.org\//.test(haystack);
}

async function fillFieldOnPage(page: any, field: FieldDescriptor, answer: string, artifacts: { resumePath: string | null; coverLetterPath: string | null; screenshotPath: string | null }): Promise<void> {
  const selector = field.id ? `#${cssEscape(field.id)}` : field.name ? `[name="${cssEscape(field.name)}"]` : null;
  const locator = selector ? page.locator(selector) : page.getByLabel(field.label || field.name || field.id);

  if (field.type === "file") {
    const target = /cover letter|message/i.test(`${field.label} ${field.name}`)
      ? artifacts.coverLetterPath || artifacts.resumePath
      : artifacts.resumePath || artifacts.coverLetterPath;
    if (target) {
      await locator.setInputFiles(target).catch(() => undefined);
    }
    return;
  }

  if (field.tag === "select") {
    await locator.selectOption({ label: answer }).catch(async () => {
      await locator.selectOption(answer).catch(() => undefined);
    });
    return;
  }

  if (field.type === "checkbox" || field.type === "radio") {
    if (/^(yes|true|on|checked)$/i.test(answer)) {
      await locator.check().catch(() => undefined);
    }
    return;
  }

  await locator.fill(answer).catch(async () => {
    await locator.pressSequentially(answer).catch(() => undefined);
  });
}

function cssEscape(value: string): string {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
