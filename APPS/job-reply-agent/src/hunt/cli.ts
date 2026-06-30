import type Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../logger.js";
import {
  buildHuntReport,
  generateApplyAssist,
  generateInterviewPrep,
  generatePackages,
  ingestManualJob,
  scoreJobs
} from "../hunt.js";

const HUNT_COMMANDS = new Set([
  "hunt:ingest",
  "hunt:status",
  "hunt:scout",
  "hunt:score",
  "hunt:package",
  "hunt:apply-assist",
  "hunt:apply-one",
  "hunt:approve-submit",
  "hunt:interview-prep",
  "hunt:report",
  "hunt:export",
  "hunt:scrape-dice",
  "hunt:scrape-indeed",
  "hunt:scrape-linkedin",
  "hunt:scrape-robert-half",
  "hunt:scrape-workopolis",
  "hunt:scrape-mercor",
  "hunt:scrape-all",
  "hunt:dice-preflight",
  "hunt:verify-dice-applied",
  "hunt:verify-indeed-applied",
  "hunt:application-proof",
  "hunt:reconcile-application-proof",
  "hunt:trust-report",
  "hunt:premium-queue",
  "hunt:prepare-artifacts"
]);

export function isHuntCommand(command?: string): boolean {
  return Boolean(command && HUNT_COMMANDS.has(command));
}

type VerificationResult = {
  ok: boolean;
  reason: string;
  url?: string;
  screenshotPath?: string;
};

function isCdpUnavailableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /connectOverCDP|ECONNREFUSED\s+127\.0\.0\.1:9333|CDP browser|CDP session|remote debugging/i.test(message);
}

function storedVerifiedProofFallback(args: {
  db: Database.Database;
  jobId: number;
  sourceLabel: string;
  err: unknown;
}): VerificationResult {
  if (!isCdpUnavailableError(args.err)) {
    throw args.err;
  }

  const row = args.db.prepare(`
    SELECT a.status, a.pause_reason, a.final_url, a.screenshot_path, a.submitted_at,
           a.resume_artifact_path, a.cover_letter_artifact_path,
           j.status AS job_status, j.title, j.company
    FROM application_attempts a
    JOIN hunt_jobs j ON j.id = a.job_id
    WHERE a.job_id=?
      AND (
        a.status IN ('submitted_verified', 'applied_verified')
        OR j.status IN ('submitted_verified', 'applied_verified', 'applied')
      )
    ORDER BY COALESCE(a.submitted_at, a.updated_at, a.created_at) DESC, a.id DESC
    LIMIT 1
  `).get(args.jobId) as {
    status: string;
    pause_reason: string | null;
    final_url: string | null;
    screenshot_path: string | null;
    submitted_at: string | null;
    resume_artifact_path: string | null;
    cover_letter_artifact_path: string | null;
    job_status: string;
    title: string;
    company: string;
  } | undefined;

  if (!row) {
    return {
      ok: false,
      reason: `${args.sourceLabel} live applied-history verification could not run because Chrome CDP is unavailable, and no stored verified proof exists for job ${args.jobId}. Start Fejiro Chrome with remote debugging before live verification.`
    };
  }

  return {
    ok: true,
    reason: `${args.sourceLabel} stored verified proof found for ${row.company} - ${row.title}. Live applied-history verification did not run because Chrome CDP is unavailable. Stored status=${row.status}; job status=${row.job_status}; submitted=${row.submitted_at || "unknown"}.`,
    url: row.final_url || undefined,
    screenshotPath: row.screenshot_path || undefined
  };
}

export async function runHuntCommand(args: {
  command?: string;
  db: Database.Database;
  limitArg?: number;
  dateArg?: string;
  sourceArg?: string;
  fileArg?: string;
  jobIdArg?: number;
}): Promise<void> {
  const { command, db, fileArg } = args;

  if (command === "hunt:ingest") {
    if (!fileArg) {
      throw new Error("Missing --file argument for hunt:ingest.");
    }

    const inserted = ingestManualJob(db, fileArg);
    logger.info({ inserted, fileArg }, "hunt:ingest completed.");
    return;
  }

  if (command === "hunt:status" || command === "hunt:report") {
    logger.info(`\n${buildHuntReport(db)}`);
    return;
  }

  if (command === "hunt:trust-report") {
    const { buildTrustReport, printTrustReport, writeTrustReport } = await import("./trust_report.js");
    const report = buildTrustReport(db, {
      limit: args.limitArg,
      sourceFilter: args.sourceArg
    });
    printTrustReport(report);
    const file = writeTrustReport(report);
    logger.info({ file, rows: report.rows.length }, "hunt:trust-report written.");
    return;
  }

  if (command === "hunt:premium-queue") {
    const { buildPremiumQueueReport, printPremiumQueueReport, writePremiumQueueReport } = await import("./premium_queue.js");
    const report = buildPremiumQueueReport(db, {
      limit: args.limitArg,
      sourceFilter: args.sourceArg || "dice"
    });
    printPremiumQueueReport(report);
    const file = writePremiumQueueReport(report);
    logger.info({ file, rows: report.rows.length }, "hunt:premium-queue written.");
    return;
  }

  if (command === "hunt:prepare-artifacts") {
    const { loadConfig } = await import("../config.js");
    const { preparePremiumQueueArtifacts } = await import("./premium_queue.js");
    const cfg = loadConfig();
    const templatePath = cfg.rules.resume_tailoring?.template_path || "";
    const outputDir = cfg.rules.resume_tailoring?.output_dir || path.resolve(".local", "inspectable-resumes");
    const result = await preparePremiumQueueArtifacts(db, {
      limit: args.limitArg,
      sourceFilter: args.sourceArg || "dice",
      templatePath,
      businessAnalysisTemplatePath: cfg.rules.resume_tailoring?.business_analysis_template_path,
      outputDir
    });
    logger.info(result, "hunt:prepare-artifacts completed.");
    return;
  }

  if (command === "hunt:dice-preflight") {
    const { runDicePreflight } = await import("../automation.js");
    const result = await runDicePreflight();
    logger.info(result, "hunt:dice-preflight completed.");
    return;
  }

  if (command === "hunt:verify-dice-applied") {
    if (!args.jobIdArg) {
      throw new Error("Missing --job-id argument for hunt:verify-dice-applied.");
    }
    const job = db.prepare("SELECT id, title, company FROM hunt_jobs WHERE id=? LIMIT 1").get(args.jobIdArg) as { id: number; title: string; company: string } | undefined;
    if (!job) {
      throw new Error(`Job ${args.jobIdArg} not found.`);
    }
    const { verifyDiceAppliedHistoryForJob } = await import("../automation.js");
    let result: VerificationResult;
    try {
      result = await verifyDiceAppliedHistoryForJob(job);
    } catch (err) {
      result = storedVerifiedProofFallback({ db, jobId: job.id, sourceLabel: "Dice", err });
    }
    if (result.ok) {
      const now = new Date().toISOString();
      db.prepare("UPDATE hunt_jobs SET status='applied_verified', next_action='interview_followup', updated_at=? WHERE id=?").run(now, job.id);
      db.prepare("UPDATE application_attempts SET status='submitted_verified', pause_reason=?, screenshot_path=COALESCE(?, screenshot_path), updated_at=? WHERE job_id=?")
        .run(result.reason, result.screenshotPath || null, now, job.id);
    }
    logger.info({ job, result }, "hunt:verify-dice-applied completed.");
    return;
  }

  if (command === "hunt:verify-indeed-applied") {
    if (!args.jobIdArg) {
      throw new Error("Missing --job-id argument for hunt:verify-indeed-applied.");
    }
    const job = db.prepare("SELECT id, title, company FROM hunt_jobs WHERE id=? LIMIT 1").get(args.jobIdArg) as { id: number; title: string; company: string } | undefined;
    if (!job) {
      throw new Error(`Job ${args.jobIdArg} not found.`);
    }
    const { verifyIndeedAppliedHistoryForJob } = await import("../automation.js");
    let result: VerificationResult;
    try {
      result = await verifyIndeedAppliedHistoryForJob(job);
    } catch (err) {
      result = storedVerifiedProofFallback({ db, jobId: job.id, sourceLabel: "Indeed", err });
    }
    if (result.ok) {
      const now = new Date().toISOString();
      db.prepare("UPDATE hunt_jobs SET status='applied_verified', next_action='interview_followup', updated_at=? WHERE id=?").run(now, job.id);
      db.prepare(`
        UPDATE application_attempts
        SET status='submitted_verified',
            pause_reason=?,
            screenshot_path=COALESCE(?, screenshot_path),
            final_url=COALESCE(?, final_url),
            submitted_at=COALESCE(submitted_at, ?),
            updated_at=?
        WHERE job_id=?
      `).run(result.reason, result.screenshotPath || null, result.url || null, now, now, job.id);
    }
    logger.info({ job, result }, "hunt:verify-indeed-applied completed.");
    return;
  }

  if (command === "hunt:application-proof") {
    const limit = Math.max(1, args.limitArg || 50);
    const rows = db.prepare(`
      SELECT a.id AS attempt_id, a.job_id, a.status AS attempt_status, a.pause_reason,
             a.screenshot_path, a.final_url, j.title, j.company, j.source, j.status AS job_status
      FROM application_attempts a
      JOIN hunt_jobs j ON j.id = a.job_id
      WHERE a.status IN ('submitted','submitted_verified','applied_verified','submitted_unverified','applied_unverified')
         OR j.status IN ('applied','applied_verified','submitted_verified','applied_unverified','submitted_unverified')
      ORDER BY a.updated_at DESC, a.id DESC
      LIMIT ?
    `).all(limit);
    logger.info({ rows }, "hunt:application-proof completed.");
    return;
  }

  if (command === "hunt:reconcile-application-proof") {
    const now = new Date().toISOString();
    const attempts = db.prepare(`
      UPDATE application_attempts
      SET status='submitted_unverified',
          pause_reason=COALESCE(pause_reason, 'Historical applied/submitted row reconciled: platform or Gmail proof still required.'),
          updated_at=?
      WHERE status='submitted'
        AND COALESCE(screenshot_path, '') = ''
    `).run(now).changes;
    const jobs = db.prepare(`
      UPDATE hunt_jobs
      SET status='applied_unverified',
          next_action='sync_platform_or_email_proof',
          updated_at=?
      WHERE status='applied'
    `).run(now).changes;
    logger.info({ attempts, jobs }, "hunt:reconcile-application-proof completed.");
    return;
  }

  if (command === "hunt:score") {
    const scored = scoreJobs(db);
    logger.info({ scored }, "hunt:score completed.");
    return;
  }

  if (command === "hunt:package") {
    const packaged = generatePackages(db);
    logger.info({ packaged }, "hunt:package completed.");
    return;
  }

  if (command === "hunt:apply-assist") {
    const sessions = generateApplyAssist(db);
    logger.info({ sessions }, "hunt:apply-assist completed.");
    return;
  }

  if (command === "hunt:apply-one") {
    if (!args.jobIdArg) {
      throw new Error("Missing --job-id argument for hunt:apply-one.");
    }
    const { loadConfig } = await import("../config.js");
    const { closePersistentBrowserSession, runAutoApplyOneJob } = await import("../automation.js");
    const cfg = loadConfig();
    let result;
    try {
      result = await runAutoApplyOneJob({ db, cfg, jobId: args.jobIdArg });
    } finally {
      await closePersistentBrowserSession().catch(() => undefined);
    }
    logger.info({ result }, "hunt:apply-one completed.");
    return;
  }

  if (command === "hunt:interview-prep") {
    const prep = generateInterviewPrep(db);
    logger.info({ prep }, "hunt:interview-prep completed.");
    return;
  }

  if (command === "hunt:scout") {
    logger.info("hunt:scout is currently manual-source only in this build. Use hunt:score and hunt:package after ingest.");
    return;
  }

  if (command === "hunt:approve-submit") {
    const { loadConfig } = await import("../config.js");
    const { runAutoApplyQueueAndReport } = await import("../automation.js");
    const cfg = loadConfig();
    const { summary, report } = await runAutoApplyQueueAndReport({
      db,
      cfg,
      sourceFilter: args.sourceArg,
      maxJobs: args.limitArg
    });
    logger.info({ summary, sourceFilter: args.sourceArg || "all", maxJobs: args.limitArg || null }, "hunt:approve-submit completed.");
    logger.info({ report }, "hunt:approve-submit report snapshot.");
    return;
  }

  if (command === "hunt:export") {
    const { loadConfig } = await import("../config.js");
    const { selectTailoringTemplatePath, tailorResumeForJD } = await import("../resume_tailor.js");
    const cfg = loadConfig();
    let templatePath = cfg.rules.resume_tailoring?.template_path || "";
    const primaryOutputDir = cfg.rules.resume_tailoring?.output_dir || path.resolve(".local", "inspectable-resumes");
    let outputDir = primaryOutputDir;
    fs.mkdirSync(outputDir, { recursive: true });
    if (!templatePath) {
      throw new Error("hunt:export requires rules.resume_tailoring.template_path");
    }

    const fallbackTemplate = path.resolve(".local", "resume-references", "Fejiro_Efiuvwere_Canadian_Tire_Manager_Network_Analytics_Resume.docx");
    if (!fs.existsSync(templatePath) && fs.existsSync(fallbackTemplate)) {
      templatePath = fallbackTemplate;
    }

    const limit = Math.max(1, args.limitArg || 10);
    const jobs = db.prepare(`
      SELECT j.id, j.title, j.company, j.description
      FROM hunt_jobs j
      JOIN hunt_packages p ON p.job_id = j.id
      WHERE j.status IN ('package_generated','apply_ready','applied','needs_review')
      ORDER BY j.id DESC
      LIMIT ?
    `).all(limit) as Array<{ id: number; title: string; company: string; description: string }>;

    const exported: Array<{ jobId: number; title: string; company: string; docxPath: string }> = [];
    const exportManifest: Array<{ jobId: number; title: string; company: string; outputDir: string; reason: string }> = [];
    for (const job of jobs) {
      try {
        const selectedTemplatePath = selectTailoringTemplatePath({
          parsed: {
            roleTitle: job.title,
            cleanRoleTitle: job.title,
            company: job.company
          } as any,
          jdText: job.description || "",
          defaultTemplatePath: templatePath,
          businessAnalysisTemplatePath: cfg.rules.resume_tailoring?.business_analysis_template_path
        });
        const result = await tailorResumeForJD({
          parsed: {
            roleTitle: job.title,
            company: job.company
          } as any,
          jdText: job.description || "",
          templatePath: selectedTemplatePath,
          outputDir
        });
        exported.push({ jobId: job.id, title: job.title, company: job.company, docxPath: result.docxPath });
        exportManifest.push({ jobId: job.id, title: job.title, company: job.company, outputDir, reason: "primary_output_dir" });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error || "");
        if (/\bEBUSY\b|resource busy or locked/i.test(message)) {
          outputDir = path.resolve(".local", "inspectable-resumes");
          fs.mkdirSync(outputDir, { recursive: true });
          const selectedTemplatePath = selectTailoringTemplatePath({
            parsed: {
              roleTitle: job.title,
              cleanRoleTitle: job.title,
              company: job.company
            } as any,
            jdText: job.description || "",
            defaultTemplatePath: templatePath,
            businessAnalysisTemplatePath: cfg.rules.resume_tailoring?.business_analysis_template_path
          });
          const result = await tailorResumeForJD({
            parsed: {
              roleTitle: job.title,
              company: job.company
            } as any,
            jdText: job.description || "",
            templatePath: selectedTemplatePath,
            outputDir
          });
          exported.push({ jobId: job.id, title: job.title, company: job.company, docxPath: result.docxPath });
          exportManifest.push({ jobId: job.id, title: job.title, company: job.company, outputDir, reason: `fallback_due_to_locked_primary:${primaryOutputDir}` });
          continue;
        }

        if (templatePath !== fallbackTemplate && fs.existsSync(fallbackTemplate)) {
          templatePath = fallbackTemplate;
          const selectedTemplatePath = selectTailoringTemplatePath({
            parsed: {
              roleTitle: job.title,
              cleanRoleTitle: job.title,
              company: job.company
            } as any,
            jdText: job.description || "",
            defaultTemplatePath: templatePath,
            businessAnalysisTemplatePath: cfg.rules.resume_tailoring?.business_analysis_template_path
          });
          const result = await tailorResumeForJD({
            parsed: {
              roleTitle: job.title,
              company: job.company
            } as any,
            jdText: job.description || "",
            templatePath: selectedTemplatePath,
            outputDir
          });
          exported.push({ jobId: job.id, title: job.title, company: job.company, docxPath: result.docxPath });
          exportManifest.push({ jobId: job.id, title: job.title, company: job.company, outputDir, reason: `fallback_template_used:${fallbackTemplate}` });
          continue;
        }
        throw error;
      }
    }

    const manifestPath = path.join(outputDir, "export-manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify({
      primaryOutputDir,
      templatePath,
      exportedAt: new Date().toISOString(),
      exported,
      exportManifest
    }, null, 2), "utf8");

    logger.info({ count: exported.length, outputDir, exported }, "hunt:export completed.");
    return;
  }

  if (command === "hunt:scrape-dice" || command === "hunt:scrape-all") {
    const { scrapeDiceFresh, ingestScrapedJobs, closeSharedScraperSession } = await import("./scraper.js");
    const { loadConfig } = await import("../config.js");
    const cfg = loadConfig();
    try {
      if (cfg.rules.scraper?.enabled === false || cfg.rules.scraper?.dice?.enabled === false) {
        logger.info("hunt:scrape-dice skipped (disabled in rules.scraper).");
      } else {
        const keywords = cfg.rules.scraper?.dice?.keywords || ["enterprise architect"];
        const maxJobs = args.limitArg || cfg.rules.scraper?.dice?.max_jobs_per_run || 25;

        let diceIngested = 0;
        for (const keyword of keywords) {
          const jobs = await scrapeDiceFresh(keyword, maxJobs);
          diceIngested += ingestScrapedJobs(db, jobs, "dice");
        }
        logger.info({ diceIngested }, "hunt:scrape-dice completed.");
      }
    } finally {
      await closeSharedScraperSession().catch(() => undefined);
    }
    if (command === "hunt:scrape-dice") return;
  }

  if (command === "hunt:scrape-indeed" || command === "hunt:scrape-all") {
    const { scrapeIndeed, ingestScrapedJobs, closeSharedScraperSession } = await import("./scraper.js");
    const { loadConfig } = await import("../config.js");
    const cfg = loadConfig();
    try {
      if (cfg.rules.scraper?.enabled === false || cfg.rules.scraper?.indeed?.enabled === false) {
        logger.info("hunt:scrape-indeed skipped (disabled in rules.scraper).");
      } else {
        const keywords = cfg.rules.scraper?.indeed?.keywords || ["enterprise architect"];
        const maxJobs = args.limitArg || cfg.rules.scraper?.indeed?.max_jobs_per_run || 25;

        let indeedIngested = 0;
        for (const keyword of keywords) {
          const jobs = await scrapeIndeed(keyword, maxJobs);
          indeedIngested += ingestScrapedJobs(db, jobs, "indeed");
        }
        logger.info({ indeedIngested }, "hunt:scrape-indeed completed.");
      }
    } finally {
      await closeSharedScraperSession().catch(() => undefined);
    }
    if (command === "hunt:scrape-indeed") return;
  }

  if (command === "hunt:scrape-linkedin" || command === "hunt:scrape-all") {
    const { scrapeLinkedIn, ingestScrapedJobs, closeSharedScraperSession } = await import("./scraper.js");
    const { loadConfig } = await import("../config.js");
    const cfg = loadConfig();
    try {
      if (cfg.rules.scraper?.enabled === false || cfg.rules.scraper?.linkedin?.enabled === false) {
        logger.info("hunt:scrape-linkedin skipped (disabled in rules.scraper).");
      } else {
        const keywords = cfg.rules.scraper?.linkedin?.keywords || ["enterprise architect"];
        const maxJobs = args.limitArg || cfg.rules.scraper?.linkedin?.max_jobs_per_run || 25;

        let linkedinIngested = 0;
        for (const keyword of keywords) {
          const jobs = await scrapeLinkedIn(keyword, maxJobs);
          linkedinIngested += ingestScrapedJobs(db, jobs, "linkedin");
        }
        logger.info({ linkedinIngested }, "hunt:scrape-linkedin completed.");
      }
    } finally {
      await closeSharedScraperSession().catch(() => undefined);
    }
    if (command === "hunt:scrape-linkedin") return;
  }

  if (command === "hunt:scrape-all") {
    // Both Dice and Indeed already processed above
    return;
  }

  // Keep behavior explicit for unknown routes.
  throw new Error(`Unsupported hunt command: ${command || "<empty>"}`);
}
