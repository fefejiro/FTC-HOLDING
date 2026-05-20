import { format } from "date-fns";
import { loadConfig } from "./config.js";
import { getDb, resetDb } from "./db.js";
import { sendEmail } from "./email_sender.js";
import {
  applyStatusLabel,
  createReplyDraftInThread,
  exchangeCodeAndSaveTokens,
  getGmailConsentUrl,
  listRecruiterInboundMessages,
  sendDraftById,
  sendPlainTextEmail,
  scanInboxForRecruiters,
} from "./gmail.js";
import { logger } from "./logger.js";
import { getApprovedPendingDrafts, insertDecision, markDraftSent } from "./message_store.js";
import {
  approveAllDrafts,
  processGmailInbox,
  processMockInbox,
  sendApprovedDrafts
} from "./processor.js";
import { buildDailyReport, renderDailyReport } from "./reporter.js";
import { seedSampleData } from "./seed.js";
import { isHuntCommand, runHuntCommand } from "./hunt/cli.js";

function parseDateArg(argv: string[]): string | undefined {
  return parseOptionArg(argv, "date");
}

function parseOptionArg(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const index = argv.findIndex((item) => item === `--${name}` || item.startsWith(prefix));
  if (index === -1) return undefined;

  const found = argv[index];
  if (found.startsWith(prefix)) {
    return found.slice(prefix.length);
  }

  const next = argv[index + 1];
  if (!next || next.startsWith("--")) return undefined;
  return next;
}

export function parseCommandArgs(argv: string[]): {
  command: string | undefined;
  dateArg: string | undefined;
  codeArg: string | undefined;
  fileArg: string | undefined;
  limitArg: number | undefined;
  sourceArg: string | undefined;
} {
  const limitRaw = parseOptionArg(argv, "limit");
  const limitArg = limitRaw && /^\d+$/.test(limitRaw) ? Number(limitRaw) : undefined;
  return {
    command: argv[2],
    dateArg: parseDateArg(argv),
    codeArg: parseOptionArg(argv, "code"),
    fileArg: parseOptionArg(argv, "file"),
    limitArg,
    sourceArg: parseOptionArg(argv, "source")
  };
}

export async function runCommand(args: {
  command?: string;
  dateArg?: string;
  codeArg?: string;
  fileArg?: string;
  limitArg?: number;
  sourceArg?: string;
}): Promise<void> {
  const command = args.command;
  const dateArg = args.dateArg;
  const codeArg = args.codeArg;
  const fileArg = args.fileArg;
  const limitArg = args.limitArg;
  const sourceArg = args.sourceArg;
  const reportDate = dateArg || format(new Date(), "yyyy-MM-dd");

  if (command === "db:reset") {
    resetDb();
    logger.info("Database reset completed.");
    return;
  }

  const cfg = loadConfig();
  const db = getDb();

  if (isHuntCommand(command)) {
    await runHuntCommand({ command, db, limitArg, dateArg, sourceArg, fileArg });
    return;
  }

  if (command === "gmail:auth:url") {
    const url = getGmailConsentUrl(cfg.env);
    logger.info("Open this URL in your browser, authorize, then copy the code parameter:");
    logger.info(url);
    return;
  }

  if (command === "gmail:auth:save") {
    if (!codeArg) {
      logger.error("Missing --code=... argument.");
      return;
    }

    await exchangeCodeAndSaveTokens(cfg.env, codeArg);
    logger.info({ tokenPath: cfg.env.gmailTokensPath }, "OAuth tokens saved.");
    return;
  }

  if (command === "seed:sample") {
    seedSampleData(db, reportDate);
    logger.info({ reportDate }, "Sample data inserted.");
    return;
  }

  if (command === "process:mock") {
    if (!cfg.rules.automation.enabled || cfg.rules.automation.mode === "disabled") {
      logger.warn("Automation disabled. Skipping process:mock.");
      return;
    }

    const outcome = processMockInbox({
      db,
      profile: cfg.profile,
      rules: cfg.rules,
      resumeMap: cfg.resumeMap,
      includeTnLine: true
    });

    logger.info({ outcome }, "process:mock completed.");
    return;
  }

  if (command === "process:gmail") {
    if (!cfg.rules.automation.enabled || cfg.rules.automation.mode === "disabled") {
      logger.warn("Automation disabled. Skipping process:gmail.");
      return;
    }

      const scanLimit = limitArg ?? cfg.rules.automation.max_drafts_per_day * 3;
      const fetchLimit = limitArg ?? cfg.rules.automation.max_drafts_per_day;

      // Step 1: auto-scan inbox and label recruiter emails
      const scanResult = await scanInboxForRecruiters(
        cfg.env,
        cfg.rules.filters.labels.inbound,
        scanLimit
      );
      logger.info(scanResult, "Inbox scan complete.");

      // Step 2: process what was labeled
      const inbox = await listRecruiterInboundMessages(
      cfg.env,
      cfg.rules.filters.labels.inbound,
      fetchLimit
    );

    if (inbox.length === 0) {
      logger.info(
        { label: cfg.rules.filters.labels.inbound },
        "No inbound recruiter messages found."
      );
      return;
    }

    const outcome = await processGmailInbox({
      db,
      profile: cfg.profile,
      rules: cfg.rules,
      resumeMap: cfg.resumeMap,
      messages: inbox,
      includeTnLine: true,
      onStatusChange: async (messageId, status) => {
        await applyStatusLabel({
          cfg: cfg.env,
          messageId,
          labels: cfg.rules.filters.labels,
          status
        });
      },
      createDraft: async ({ message, subject, body, resumePath }) =>
        createReplyDraftInThread({
          cfg: cfg.env,
          message,
          replySubject: subject,
          replyBody: body,
          resumePath
        })
    });

    logger.info({ outcome }, "process:gmail completed.");
    return;
  }

  if (command === "approve:all") {
    const approved = approveAllDrafts(db);
    logger.info({ approved }, "approve:all completed.");
    return;
  }

  if (command === "send:approved") {
    const result = sendApprovedDrafts({ db, rules: cfg.rules });
    logger.info({ result }, "send:approved completed.");
    return;
  }

  if (command === "send:approved:gmail") {
    if (cfg.rules.automation.mode !== "approval_required" && cfg.rules.automation.mode !== "trusted_auto_send") {
      logger.warn("Current mode does not allow sending.");
      return;
    }

    const pending = getApprovedPendingDrafts(db)
      .filter((draft) => Boolean(draft.gmail_draft_id))
      .slice(0, cfg.rules.automation.max_sends_per_day);

    let sent = 0;
    let errors = 0;

    for (const draft of pending) {
      try {
        await sendDraftById(cfg.env, draft.gmail_draft_id as string);
        if (markDraftSent(db, draft.message_id)) {
          insertDecision(db, draft.message_id, "sent", "Approved Gmail draft sent");
          await applyStatusLabel({
            cfg: cfg.env,
            messageId: draft.message_id,
            labels: cfg.rules.filters.labels,
            status: "sent"
          });
          sent += 1;
        }
      } catch (error) {
        errors += 1;
        insertDecision(
          db,
          draft.message_id,
          "error",
          `Send failed: ${error instanceof Error ? error.message : "unknown error"}`
        );
      }
    }

    logger.info({ sent, errors, considered: pending.length }, "send:approved:gmail completed.");
    return;
  }

  if (command === "run:mock-cycle") {
    if (!cfg.rules.automation.enabled || cfg.rules.automation.mode === "disabled") {
      logger.warn("Automation disabled. Skipping run:mock-cycle.");
      return;
    }

    const processOutcome = processMockInbox({
      db,
      profile: cfg.profile,
      rules: cfg.rules,
      resumeMap: cfg.resumeMap,
      includeTnLine: true
    });
    const approved = approveAllDrafts(db);
    const sent = sendApprovedDrafts({ db, rules: cfg.rules });

    logger.info({ processOutcome, approved, sent }, "run:mock-cycle completed.");
    return;
  }

  if (command === "run:gmail-cycle") {
    if (!cfg.rules.automation.enabled || cfg.rules.automation.mode === "disabled") {
      logger.warn("Automation disabled. Skipping run:gmail-cycle.");
      return;
    }

    const inbox = await listRecruiterInboundMessages(
      cfg.env,
      cfg.rules.filters.labels.inbound,
      cfg.rules.automation.max_drafts_per_day
    );

    const processOutcome = await processGmailInbox({
      db,
      profile: cfg.profile,
      rules: cfg.rules,
      resumeMap: cfg.resumeMap,
      messages: inbox,
      includeTnLine: true,
      onStatusChange: async (messageId, status) => {
        await applyStatusLabel({
          cfg: cfg.env,
          messageId,
          labels: cfg.rules.filters.labels,
          status
        });
      },
      createDraft: async ({ message, subject, body, resumePath }) =>
        createReplyDraftInThread({
          cfg: cfg.env,
          message,
          replySubject: subject,
          replyBody: body,
          resumePath
        })
    });

    // Send only pre-approved drafts (those already marked as "approved" by the processor).
    // Do NOT auto-approve all drafts (draft-first control model).
    const pending = getApprovedPendingDrafts(db)
      .filter((draft) => Boolean(draft.gmail_draft_id))
      .slice(0, cfg.rules.automation.max_sends_per_day);

    let sent = 0;
    for (const draft of pending) {
      await sendDraftById(cfg.env, draft.gmail_draft_id as string);
      if (markDraftSent(db, draft.message_id)) {
        insertDecision(db, draft.message_id, "sent", "Approved Gmail draft sent");
        await applyStatusLabel({
          cfg: cfg.env,
          messageId: draft.message_id,
          labels: cfg.rules.filters.labels,
          status: "sent"
        });
        sent += 1;
      }
    }

    logger.info({ processOutcome, sent }, "run:gmail-cycle completed (only pre-approved drafts sent).");
    return;
  }

  if (command === "report:daily") {
    const report = buildDailyReport(db, new Date(`${reportDate}T18:00:00.000Z`));
    const rendered = renderDailyReport(report);

    logger.info("----- DAILY REPORT PREVIEW -----");
    logger.info(`Subject: ${rendered.subject}`);
    logger.info(`\n${rendered.body}`);

    if (!cfg.env.sendDailyEmail) {
      logger.info("DAILY_REPORT_ENABLE_SEND=false, skipping email send.");
      return;
    }

    if (cfg.env.authMode === "oauth") {
      await sendPlainTextEmail({
        cfg: cfg.env,
        to: cfg.env.reportTo,
        subject: rendered.subject,
        body: rendered.body,
        html: rendered.html
      });
    } else {
      if (!cfg.env.smtpUser || !cfg.env.smtpPass) {
        logger.warn(
          "Missing SMTP credentials. Set SMTP_USER and SMTP_PASS to send daily report email."
        );
        return;
      }

      await sendEmail({
        host: cfg.env.smtpHost,
        port: cfg.env.smtpPort,
        secure: cfg.env.smtpSecure,
        user: cfg.env.smtpUser,
        pass: cfg.env.smtpPass,
        to: cfg.env.reportTo,
        subject: rendered.subject,
        body: rendered.body
      });
    }

    logger.info({ to: cfg.env.reportTo }, "Daily report email sent.");
    return;
  }

  logger.info(
    "No command supplied. Use one of: gmail:auth:url, gmail:auth:save --code=..., db:reset, seed:sample, process:mock, process:gmail, approve:all, send:approved, send:approved:gmail, run:mock-cycle, run:gmail-cycle, report:daily, hunt:ingest, hunt:status, hunt:scout, hunt:score, hunt:package, hunt:apply-assist, hunt:approve-submit, hunt:interview-prep, hunt:report, hunt:export."
  );
}

async function run(): Promise<void> {
  const parsed = parseCommandArgs(process.argv);
  await runCommand(parsed);
}

run().catch((error) => {
  logger.error({ err: error }, "Fatal error in main.");
  process.exit(1);
});
