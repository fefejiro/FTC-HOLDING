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

type GmailLabelStatus = "drafted" | "needs_review" | "sent" | "skipped" | "blocked" | "approved";

/**
 * Determine if auto-send is eligible based on score, time-of-day, and config guards.
 * Even if score is high, auto-send may be blocked by quiet hours or mode restrictions.
 */
function isAutoSendEligible(params: {
  score: number;
  rules: RulesConfig;
  recruiterEmail?: string;
  recruiterName?: string;
}): { eligible: boolean; reason: string } {
  const { score, rules, recruiterEmail, recruiterName } = params;

  // Check score band
  const autoBand = rules.filters.score_bands?.auto_send_min ?? 75;
  if (score < autoBand) {
    return { eligible: false, reason: `Score ${score} below auto-send threshold ${autoBand}` };
  }

  // Check automation mode
  const mode = rules.automation.mode;
  if (mode === "disabled" || mode === "draft_only") {
    return { eligible: false, reason: `Automation mode is ${mode}` };
  }

  // Check resume tailoring auto-send flag
  if (rules.resume_tailoring?.enabled && !rules.resume_tailoring?.auto_send) {
    return { eligible: false, reason: "Resume tailoring enabled but auto_send is disabled" };
  }

  // Check quiet hours
  const schedule = rules.automation.schedule;
  if (schedule?.quiet_hours_start !== undefined && schedule?.quiet_hours_end !== undefined) {
    const now = new Date();
    const currentHour = now.getHours();
    const quietStart = schedule.quiet_hours_start;
    const quietEnd = schedule.quiet_hours_end;

    let inQuietHours = false;
    if (quietStart < quietEnd) {
      inQuietHours = currentHour >= quietStart && currentHour < quietEnd;
    } else {
      // Quiet hours wrap around midnight (e.g., 23–7)
      inQuietHours = currentHour >= quietStart || currentHour < quietEnd;
    }

    if (inQuietHours) {
      return { eligible: false, reason: `Currently in quiet hours (${quietStart}:00–${quietEnd}:00)` };
    }
  }

  // Check trusted recruiter (if mode is not "trusted_auto_send", require manual review)
  if (mode === "approval_required") {
    return { eligible: false, reason: "Automation mode requires approval" };
  }

  if (mode === "trusted_auto_send" && recruiterEmail) {
    const domain = recruiterEmail.split("@")[1]?.toLowerCase();
    if (domain && !rules.trusted_recruiter_domains.includes(domain)) {
      return { eligible: false, reason: `Recruiter domain ${domain} not in trusted list` };
    }
  }

  return { eligible: true, reason: "All auto-send guards passed" };
}

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

    // Apply score-band decision logic (instead of single min_match_score threshold)
    const scoreBands = rules.filters.score_bands || { auto_send_min: 75, draft_min: 69, needs_review_min: 55 };
    let decisionStatus: GmailLabelStatus;
    let decisionReason: string;

    if (score.score < scoreBands.needs_review_min) {
      decisionStatus = "skipped";
      decisionReason = `Score ${score.score} below needs_review threshold ${scoreBands.needs_review_min}`;
    } else if (score.score < scoreBands.draft_min) {
      decisionStatus = "needs_review";
      decisionReason = `Score ${score.score} in needs_review band (${scoreBands.needs_review_min}–${scoreBands.draft_min - 1})`;
    } else if (score.score < scoreBands.auto_send_min) {
      decisionStatus = "drafted";
      decisionReason = `Score ${score.score} in draft band (${scoreBands.draft_min}–${scoreBands.auto_send_min - 1})`;
    } else {
      // Score is high; check if auto-send guards allow it
      const autoSendCheck = isAutoSendEligible({
        score: score.score,
        rules,
        recruiterEmail: message.from,
        recruiterName: parsed.recruiterName
      });

      if (autoSendCheck.eligible) {
        decisionStatus = "approved";
        decisionReason = `Score ${score.score} eligible for auto-send: ${autoSendCheck.reason}`;
      } else {
        decisionStatus = "drafted";
        decisionReason = `Score ${score.score} high but auto-send blocked: ${autoSendCheck.reason}`;
      }
    }

    if (decisionStatus === "skipped") {
      skipped += 1;
      insertDecision(db, message.messageId, "skipped", decisionReason);
      await params.onStatusChange?.(message.messageId, "skipped");
      continue;
    }

    // For needs_review: skip draft creation if high parser uncertainty
    if (decisionStatus === "needs_review" && parsed.parserConfidence < 70) {
      needsReview += 1;
      insertDecision(db, message.messageId, "needs_review", `${decisionReason}; parser confidence ${parsed.parserConfidence}%`);
      await params.onStatusChange?.(message.messageId, "needs_review");
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

    // Apply final status label based on decision
    if (decisionStatus === "needs_review") {
      needsReview += 1;
      insertDecision(db, message.messageId, "needs_review", decisionReason);
      await params.onStatusChange?.(message.messageId, "needs_review");
    } else if (decisionStatus === "drafted") {
      drafted += 1;
      insertDecision(db, message.messageId, "drafted", decisionReason);
      await params.onStatusChange?.(message.messageId, "drafted");
    } else if (decisionStatus === "approved") {
      // Auto-send eligible: approve and prepare for immediate send
      drafted += 1;
      if (approveDraft(db, message.messageId)) {
        insertDecision(db, message.messageId, "approved", decisionReason);
        await params.onStatusChange?.(message.messageId, "approved");
      } else {
        insertDecision(db, message.messageId, "drafted", `${decisionReason}; approval failed`);
        await params.onStatusChange?.(message.messageId, "drafted");
      }
    }
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
