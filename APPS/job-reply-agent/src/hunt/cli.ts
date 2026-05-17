import type Database from "better-sqlite3";
import { logger } from "../logger.js";
import { loadHuntConfig, type HuntConfig } from "./config_loader.js";
import { countByStatus, countBySource, getJobsByStatus, upsertJob, setJobScore } from "./job_store.js";
import { recordAudit } from "./db.js";
import type { SourceAdapter, SourceRunResult } from "./sources/base_source.js";
import { greenhouseSource } from "./sources/greenhouse_source.js";
import { leverSource } from "./sources/lever_source.js";
import { ashbySource } from "./sources/ashby_source.js";
import { gmailAlertSource } from "./sources/gmail_alert_source.js";
import type { JobSource } from "./types.js";
import { buildPackageForJob } from "./package_builder";


export interface HuntCommandArgs {
  command: string;
  db: Database.Database;
  limitArg?: number;
  sourceArg?: string;
  dateArg?: string;
}

export async function runHuntCommand(args: HuntCommandArgs): Promise<void> {
  const { command, db, limitArg } = args;
  const config = loadHuntConfig();

  switch (command) {
    case "hunt:status": {
      const byStatus = countByStatus(db);
      const bySource = countBySource(db);
      logger.info({ byStatus, bySource }, "hunt:status");
      return;
    }

    case "hunt:scout": {
      const filter = args.sourceArg;
      const results = await runScout(db, config, { sourceFilter: filter });
      const summary = results.reduce(
        (acc, r) => {
          acc.fetched += r.fetched;
          acc.inserted += r.inserted;
          acc.updated += r.updated;
          acc.skipped += r.skipped;
          return acc;
        },
        { fetched: 0, inserted: 0, updated: 0, skipped: 0 }
      );
      logger.info({ results, summary }, "hunt:scout complete");
      recordAudit(db, {
        actor: "cli",
        action: "hunt:scout:complete",
        detail: { summary, sourceFilter: filter ?? null }
      });
      return;
    }

    case "hunt:score": {
      // Score all jobs with status 'discovered' or 'scored'
      const toScore = [
        ...getJobsByStatus(db, "discovered", 10000),
        ...getJobsByStatus(db, "scored", 10000)
      ];
      let scored = 0;
      let updated = 0;
      let blocked = 0;
      let needsReview = 0;
      let packageReady = 0;
      for (const job of toScore) {
        const breakdown = require("./scorer.js").scoreJob(job, config);
        let status: string = job.status;
        if (breakdown.hard_red_flag) {
          status = "blocked";
          blocked++;
        } else if (breakdown.bands.package_ready) {
          status = "package_ready";
          packageReady++;
        } else if (breakdown.bands.needs_review) {
          status = "needs_review";
          needsReview++;
        } else if (breakdown.bands.save_only) {
          status = "save_only";
        } else {
          status = "scored";
        }
        if (typeof job.id !== "number") throw new Error("Job missing id");
        setJobScore(db, job.id, status as import("./types.js").JobStatus, breakdown.total, breakdown, breakdown.soft_red_flags, breakdown.hard_red_flag ?? undefined);
        scored++;
        if (status !== job.status) updated++;
      }
      logger.info({ scored, updated, blocked, needsReview, packageReady }, "hunt:score complete");
      recordAudit(db, { actor: "cli", action: "hunt:score:complete", detail: { scored, updated, blocked, needsReview, packageReady } });
      return;
    }

    case "hunt:package": {
      // Generate resume and cover letter for all jobs with status 'package_ready'
      const jobs = getJobsByStatus(db, "package_ready", limitArg ?? 25);
      let generated = 0;
      let failed = 0;
      const results = [];
      for (const job of jobs) {
        try {
          const result = await buildPackageForJob(job, config, {
            templatePath: process.env.RESUME_TEMPLATE_PATH || "./resumes/source/Fejiro_AI_Workflow.docx",
            outputDir: process.env.RESUME_OUTPUT_DIR || "./resumes"
          });
          if (result.passedQualityGate) {
            // Update DB: insert documents, update application
            db.prepare(`INSERT INTO hunt_documents (job_id, kind, path, approved, created_at) VALUES (?, 'resume', ?, 1, datetime('now'))`).run(job.id, result.docxPath);
            db.prepare(`INSERT INTO hunt_documents (job_id, kind, path, approved, created_at) VALUES (?, 'cover_letter', ?, 1, datetime('now'))`).run(job.id, result.coverLetterPath);
            db.prepare(`UPDATE hunt_applications SET resume_path = ?, cover_letter_path = ?, state = 'package_ready', updated_at = datetime('now') WHERE job_id = ?`).run(result.docxPath, result.coverLetterPath, job.id);
            generated++;
          } else {
            failed++;
          }
          const { jobId: _ignored, ...rest } = result;
          results.push({ jobId: job.id, ...rest });
        } catch (err) {
          logger.error({ jobId: job.id, error: err }, "hunt:package: error generating package");
          failed++;
        }
      }
      logger.info({ generated, failed, results }, "hunt:package complete");
      recordAudit(db, { actor: "cli", action: "hunt:package:complete", detail: { generated, failed, results } });
      return;
    }

    case "hunt:apply-assist": {
      logger.info("hunt:apply-assist (Phase 5 — Playwright assist pending).");
      recordAudit(db, { actor: "cli", action: "hunt:apply-assist:invoked" });
      return;
    }

    case "hunt:approve-submit": {
      logger.info("hunt:approve-submit (Phase 5 — submit guard pending).");
      recordAudit(db, { actor: "cli", action: "hunt:approve-submit:invoked" });
      return;
    }

    case "hunt:interview-prep": {
      logger.info("hunt:interview-prep (Phase 6 — interview prep pending).");
      recordAudit(db, { actor: "cli", action: "hunt:interview-prep:invoked" });
      return;
    }

    case "hunt:report": {
      const packageReady = getJobsByStatus(db, "package_ready", limitArg ?? 25);
      const needsReview = getJobsByStatus(db, "needs_review", limitArg ?? 25);
      const blocked = getJobsByStatus(db, "blocked", 10);
      logger.info(
        {
          counts: {
            package_ready: packageReady.length,
            needs_review: needsReview.length,
            blocked: blocked.length
          }
        },
        "hunt:report (full report rendering pending — Phase 4)."
      );
      return;
    }

    case "hunt:export": {
      logger.info("hunt:export (Phase 4 — CRM exports pending).");
      return;
    }

    default: {
      logger.info(
        "Available hunt commands: hunt:status, hunt:scout, hunt:score, hunt:package, hunt:apply-assist, hunt:approve-submit, hunt:interview-prep, hunt:report, hunt:export"
      );
    }
  }
}

export function isHuntCommand(command: string | undefined): command is string {
  return typeof command === "string" && command.startsWith("hunt:");
}

const REGISTERED_SOURCES: SourceAdapter[] = [
  greenhouseSource,
  leverSource,
  ashbySource,
  gmailAlertSource
];

export interface RunScoutOptions {
  sourceFilter?: string;
  adapters?: SourceAdapter[];
}

export async function runScout(
  db: Database.Database,
  config: HuntConfig,
  options: RunScoutOptions = {}
): Promise<SourceRunResult[]> {
  const adapters = options.adapters ?? REGISTERED_SOURCES;
  const filter = options.sourceFilter;
  const selected = adapters.filter((a) => {
    if (filter && a.source !== filter) return false;
    return a.isEnabled(config);
  });

  const results: SourceRunResult[] = [];
  for (const adapter of selected) {
    const result: SourceRunResult = {
      source: adapter.source as JobSource,
      fetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };
    try {
      const raw = await adapter.fetch(config);
      result.fetched = raw.length;
      for (const r of raw) {
        try {
          const { inserted } = upsertJob(db, r);
          if (inserted) result.inserted += 1;
          else result.updated += 1;
        } catch (err) {
          result.skipped += 1;
          result.errors.push(`${r.source_id}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      result.errors.push((err as Error).message);
    }
    results.push(result);
    recordAudit(db, {
      actor: "scout",
      action: "source:run",
      detail: {
        source: result.source,
        fetched: result.fetched,
        inserted: result.inserted,
        updated: result.updated,
        skipped: result.skipped,
        errorCount: result.errors.length
      }
    });
  }
  return results;
}
