import type Database from "better-sqlite3";
import { parseRecruiterEmail } from "./job_parser.js";
import { loadMockInbox } from "./intake_mock.js";
import { logger } from "./logger.js";
import { scoreOpportunity } from "./match_scorer.js";
import {
  approveDraft,
  getApprovedPendingDrafts,
  hasMessage,
  insertDecision,
  insertMessage,
  markDraftSent,
  upsertDraft,
  upsertOpportunity
} from "./message_store.js";
import { evaluateRisk } from "./red_flags.js";
import { generateReply } from "./reply_generator.js";
import { selectResume } from "./resume_selector.js";
import { tailorResumeForJD } from "./resume_tailor.js";
import type { ProfileConfig, RecruiterMessage, ResumeMapConfig, RulesConfig } from "./types.js";

type GmailLabelStatus = "drafted" | "needs_review" | "sent" | "skipped" | "blocked";

export function processMockInbox(params: {
  db: Database.Database;
  profile: ProfileConfig;
  rules: RulesConfig;
  resumeMap: ResumeMapConfig;
  includeTnLine?: boolean;
}): { processed: number; drafted: number; needsReview: number; blocked: number; skipped: number } {
  const { db, profile, rules, resumeMap } = params;
  const inbox = loadMockInbox();

  let processed = 0;
  let drafted = 0;
  let needsReview = 0;
  let blocked = 0;
  let skipped = 0;

  for (const message of inbox) {
    if (hasMessage(db, message.messageId)) {
      continue;
    }

    insertMessage(db, message);
    insertDecision(db, message.messageId, "processed", "Message ingested");
    processed += 1;

    const parsed = parseRecruiterEmail(message);
    const score = scoreOpportunity(parsed, profile, resumeMap, message.body);
    upsertOpportunity(db, message, parsed, score.score);

    const risk = evaluateRisk(
      message.body,
      rules.risk_controls.block_keywords,
      rules.risk_controls.require_review_keywords
    );

    if (risk.blocked) {
      blocked += 1;
      insertDecision(db, message.messageId, "blocked", risk.reasons.join("; "));
      continue;
    }

    if (score.score < rules.filters.min_match_score) {
      skipped += 1;
      insertDecision(db, message.messageId, "skipped", `Low score ${score.score}`);
      continue;
    }

    const resume = selectResume(parsed, message.body, resumeMap);
    const reply = generateReply({
      parsed,
      profile
    });

    upsertDraft(db, message, reply.subject, reply.body, resume);

    if (risk.needsReview || parsed.parserConfidence < 70) {
      needsReview += 1;
      insertDecision(db, message.messageId, "needs_review", "Manual approval needed");
      continue;
    }

    drafted += 1;
    insertDecision(db, message.messageId, "drafted", `Resume selected: ${resume.resumePath}`);
  }

  logger.info({ processed, drafted, needsReview, blocked, skipped }, "Mock intake completed.");
  return { processed, drafted, needsReview, blocked, skipped };
}

export async function processGmailInbox(params: {
  db: Database.Database;
  profile: ProfileConfig;
  rules: RulesConfig;
  resumeMap: ResumeMapConfig;
  messages: RecruiterMessage[];
  includeTnLine?: boolean;
  createDraft: (args: {
    message: RecruiterMessage;
    subject: string;
    body: string;
    resumePath: string;
  }) => Promise<{ draftId: string; recipientEmail: string }>;
  onStatusChange?: (messageId: string, status: GmailLabelStatus) => Promise<void>;
}): Promise<{
  processed: number;
  drafted: number;
  needsReview: number;
  blocked: number;
  skipped: number;
  errors: number;
}> {
  const { db, profile, rules, resumeMap } = params;

  let processed = 0;
  let drafted = 0;
  let needsReview = 0;
  let blocked = 0;
  let skipped = 0;
  let errors = 0;

  const selfEmail = (profile.contact?.email || "").toLowerCase().trim();

  for (const message of params.messages) {
    if (hasMessage(db, message.messageId)) {
      continue;
    }

    // Skip messages that we sent ourselves (replies looped back through the
    // inbound label). The reporter would otherwise show our own address as the
    // recruiter contact.
    if (selfEmail && (message.from || "").toLowerCase().includes(selfEmail)) {
      skipped += 1;
      logger.info({ messageId: message.messageId, from: message.from }, "Skipped self-sent message.");
      continue;
    }

    insertMessage(db, message);
    insertDecision(db, message.messageId, "processed", "Message ingested from Gmail");
    processed += 1;

    const parsed = parseRecruiterEmail(message);
    const score = scoreOpportunity(parsed, profile, resumeMap, message.body);
    upsertOpportunity(db, message, parsed, score.score);

    const risk = evaluateRisk(
      message.body,
      rules.risk_controls.block_keywords,
      rules.risk_controls.require_review_keywords
    );

    if (risk.blocked) {
      blocked += 1;
      insertDecision(db, message.messageId, "blocked", risk.reasons.join("; "));
      await params.onStatusChange?.(message.messageId, "blocked");
      continue;
    }

    if (score.score < rules.filters.min_match_score) {
      skipped += 1;
      insertDecision(db, message.messageId, "skipped", `Low score ${score.score}`);
      await params.onStatusChange?.(message.messageId, "skipped");
      continue;
    }

    const resume = selectResume(parsed, message.body, resumeMap);
    const reply = generateReply({
      parsed,
      profile
    });

    let attachPath = resume.resumePath;
    const tailoring = rules.resume_tailoring;
    if (tailoring?.enabled) {
      try {
        const tailored = await tailorResumeForJD({
          parsed,
          jdText: message.body,
          templatePath: tailoring.template_path,
          outputDir: tailoring.output_dir
        });
        attachPath = tailored.docxPath;
        insertDecision(
          db,
          message.messageId,
          "processed",
          `Tailored resume generated: ${tailored.docxPath}`
        );
      } catch (error) {
        logger.warn(
          { messageId: message.messageId, error: error instanceof Error ? error.message : String(error) },
          "Tailoring failed; falling back to static resume."
        );
      }
    }

    try {
      const draftMeta = await params.createDraft({
        message,
        subject: reply.subject,
        body: reply.body,
        resumePath: attachPath
      });

      upsertDraft(db, message, reply.subject, reply.body, { ...resume, resumePath: attachPath }, {
        gmailDraftId: draftMeta.draftId,
        recipientEmail: draftMeta.recipientEmail
      });
    } catch (error) {
      errors += 1;
      insertDecision(
        db,
        message.messageId,
        "error",
        `Draft creation failed: ${error instanceof Error ? error.message : "unknown error"}`
      );
      continue;
    }

    if (risk.needsReview || parsed.parserConfidence < 70) {
      needsReview += 1;
      insertDecision(db, message.messageId, "needs_review", "Manual approval needed");
      await params.onStatusChange?.(message.messageId, "needs_review");
      continue;
    }

    drafted += 1;
    insertDecision(db, message.messageId, "drafted", `Resume selected: ${attachPath}`);
    await params.onStatusChange?.(message.messageId, "drafted");
  }

  logger.info({ processed, drafted, needsReview, blocked, skipped, errors }, "Gmail intake completed.");
  return { processed, drafted, needsReview, blocked, skipped, errors };
}

export function approveAllDrafts(db: Database.Database): number {
  const rows = db.prepare("SELECT message_id FROM drafts WHERE approved = 0").all() as Array<{ message_id: string }>;
  let approved = 0;
  for (const row of rows) {
    if (approveDraft(db, row.message_id)) {
      approved += 1;
      insertDecision(db, row.message_id, "approved", "Approved for send");
    }
  }
  return approved;
}

export function sendApprovedDrafts(params: {
  db: Database.Database;
  rules: RulesConfig;
}): { sent: number; skipped: number } {
  const { db, rules } = params;

  if (rules.automation.mode !== "approval_required" && rules.automation.mode !== "trusted_auto_send") {
    return { sent: 0, skipped: 0 };
  }

  const candidates = getApprovedPendingDrafts(db).slice(0, rules.automation.max_sends_per_day);
  let sent = 0;

  for (const candidate of candidates) {
    if (markDraftSent(db, candidate.message_id)) {
      sent += 1;
      insertDecision(db, candidate.message_id, "sent", "Approved draft sent");
    }
  }

  return { sent, skipped: Math.max(0, candidates.length - sent) };
}
