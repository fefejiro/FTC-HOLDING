import { format } from "date-fns";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfig } from "./config.js";
import { getDb, resetDb, resolveDbPath } from "./db.js";
import { sendEmail } from "./email_sender.js";
import {
  applyStatusLabel,
  applyStatusLabelToThreads,
  checkGmailAuthStatus,
  createDraftFromStoredContent,
  createReplyDraftInThread,
  exchangeCodeAndSaveTokens,
  getGmailConsentUrl,
  listSentMessagesForThreads,
  listRecruiterInboundMessages,
  removeInboundLabelFromProcessedMessages,
  sendDraftById,
  sendPlainTextEmail,
  scanInboxForRecruiters,
} from "./gmail.js";
import { logger } from "./logger.js";
import {
  getApprovedPendingDrafts,
  getPendingDraftsForReconciliation,
  getSentDraftThreadsPendingLabelSync,
  insertDecision,
  markSentDraftThreadLabelSynced,
  markDraftSentWithProof,
  updateDraftTransportMeta
} from "./message_store.js";
import {
  approveAllDrafts,
  processGmailInbox,
  processMockInbox,
  sendApprovedDrafts
} from "./processor.js";
import { buildDailyReport, renderDailyReport } from "./reporter.js";
import { seedSampleData } from "./seed.js";
import { isHuntCommand, runHuntCommand } from "./hunt/cli.js";
import { runAutoApplyQueueAndReport, runDicePreflight, syncApplicationProofFromMessages } from "./automation.js";
import { assertInstanceReady, instanceBanner, loadUserInstance } from "./instance.js";
import { evaluateOnboardingReadiness } from "./onboarding.js";
import { matchSentDraftProofs } from "./sent_reconciliation.js";

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

async function requireGmailAuth(command: string, cfg: Parameters<typeof checkGmailAuthStatus>[0]): Promise<boolean> {
  const status = await checkGmailAuthStatus(cfg);
  if (status.ok) return true;

  logger.error(
    {
      command,
      gmail: status,
      nextAction: "Run npm run gmail:auth:local, complete Google consent, then rerun npm run gmail:status."
    },
    "Gmail auth blocked; refusing to run recruiter email workflow."
  );
  process.exitCode = 1;
  return false;
}

function extractEmailAddress(value: string): string {
  return value.match(/<([^>]+)>/)?.[1] || value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function isStaleDraftError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /message not a draft|requested entity was not found|not found|invalid argument/i.test(message);
}

function resolveRecipientEmailForDraft(db: any, draft: {
  message_id: string;
  recipient_email: string | null;
}): string | null {
  if (draft.recipient_email && /@/.test(draft.recipient_email)) {
    return draft.recipient_email;
  }

  const row = db.prepare("SELECT sender FROM messages WHERE message_id=? LIMIT 1").get(draft.message_id) as { sender?: string } | undefined;
  const parsed = extractEmailAddress(row?.sender || "");
  return parsed || null;
}

async function ensureSendableDraftId(params: {
  db: any;
  cfg: any;
  draft: {
    message_id: string;
    thread_id: string;
    subject: string;
    body: string;
    resume_path: string;
    gmail_draft_id: string | null;
    recipient_email: string | null;
  };
}): Promise<string> {
  if (params.draft.gmail_draft_id) {
    return params.draft.gmail_draft_id;
  }

  const recipient = resolveRecipientEmailForDraft(params.db, params.draft);
  if (!recipient) {
    throw new Error("Cannot recreate Gmail draft: missing recipient email.");
  }

  const rebuilt = await createDraftFromStoredContent({
    cfg: params.cfg,
    threadId: params.draft.thread_id,
    to: recipient,
    subject: params.draft.subject,
    body: params.draft.body,
    resumePath: params.draft.resume_path || undefined
  });

  updateDraftTransportMeta(params.db, params.draft.message_id, {
    gmailDraftId: rebuilt.draftId,
    recipientEmail: recipient
  });

  return rebuilt.draftId;
}

async function sendApprovedDraftsViaGmail(params: {
  db: any;
  cfg: any;
  maxSendsPerDay: number;
  labels: any;
}): Promise<{ sent: number; errors: number; considered: number }> {
  const pending = getApprovedPendingDrafts(params.db).slice(0, params.maxSendsPerDay);
  let sent = 0;
  let errors = 0;

  for (const draft of pending) {
    try {
      let draftId = await ensureSendableDraftId({ db: params.db, cfg: params.cfg, draft });
      let sentProof: { messageId: string; threadId: string; sentAt: string };

      try {
        sentProof = await sendDraftById(params.cfg, draftId);
      } catch (sendError) {
        if (!isStaleDraftError(sendError)) {
          throw sendError;
        }

        // Rebuild stale/missing Gmail draft and retry once.
        const recipient = resolveRecipientEmailForDraft(params.db, draft);
        if (!recipient) {
          throw sendError;
        }

        const rebuilt = await createDraftFromStoredContent({
          cfg: params.cfg,
          threadId: draft.thread_id,
          to: recipient,
          subject: draft.subject,
          body: draft.body,
          resumePath: draft.resume_path || undefined
        });

        updateDraftTransportMeta(params.db, draft.message_id, {
          gmailDraftId: rebuilt.draftId,
          recipientEmail: recipient
        });

        draftId = rebuilt.draftId;
        sentProof = await sendDraftById(params.cfg, draftId);
      }

      if (markDraftSentWithProof(params.db, draft.message_id, {
        sentMessageId: sentProof.messageId,
        sentAt: sentProof.sentAt,
        manual: false
      })) {
        insertDecision(params.db, draft.message_id, "sent", "Approved Gmail draft sent");
        const labelResult = await applyStatusLabelToThreads({
          cfg: params.cfg,
          threadIds: [draft.thread_id],
          labels: params.labels,
          status: "sent"
        });
        if (labelResult.updatedThreadIds.includes(draft.thread_id)) {
          markSentDraftThreadLabelSynced(params.db, draft.thread_id);
        }
        if (labelResult.errors.length > 0) {
          throw new Error(labelResult.errors[0].error);
        }
        sent += 1;
      }
    } catch (error) {
      errors += 1;
      insertDecision(
        params.db,
        draft.message_id,
        "error",
        `Send failed: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }

  return { sent, errors, considered: pending.length };
}

function processedGmailLabelNames(labels: any): string[] {
  return [
    labels.drafted,
    labels.needs_review,
    labels.sent,
    labels.skipped,
    labels.blocked,
    labels.approved,
    labels.error
  ].filter((label): label is string => Boolean(label));
}

async function reconcileManuallySentDrafts(params: {
  db: any;
  cfg: any;
  labels: any;
  lookbackDays?: number;
}): Promise<{ considered: number; matched: number; unmatched: number; labelErrors: number }> {
  const lookbackDays = params.lookbackDays ?? 30;
  const pending = getPendingDraftsForReconciliation(params.db, lookbackDays);
  if (pending.length === 0) {
    return { considered: 0, matched: 0, unmatched: 0, labelErrors: 0 };
  }

  const proofs = await listSentMessagesForThreads(
    params.cfg,
    Array.from(new Set(pending.map((draft) => draft.thread_id))),
    lookbackDays
  );
  const reconciliation = matchSentDraftProofs(pending, proofs);
  let matched = 0;
  let labelErrors = 0;

  for (const { draft, proof } of reconciliation.matches) {
    if (!markDraftSentWithProof(params.db, draft.message_id, {
      sentMessageId: proof.messageId,
      sentAt: proof.sentAt,
      manual: true
    })) {
      continue;
    }

    matched += 1;
    insertDecision(
      params.db,
      draft.message_id,
      "sent",
      `Manual Gmail send reconciled with sent message ${proof.messageId}`
    );
  }

  const threadsNeedingLabelSync = getSentDraftThreadsPendingLabelSync(params.db);
  const labelResult = await applyStatusLabelToThreads({
    cfg: params.cfg,
    threadIds: threadsNeedingLabelSync,
    labels: params.labels,
    status: "sent"
  });
  for (const threadId of labelResult.updatedThreadIds) {
    markSentDraftThreadLabelSynced(params.db, threadId);
  }
  labelErrors = labelResult.errors.length;
  for (const failure of labelResult.errors) {
    logger.warn(failure, "Sent Gmail thread label could not be synchronized.");
  }

  return {
    considered: pending.length,
    matched,
    unmatched: reconciliation.unmatched.length,
    labelErrors
  };
}

export function parseCommandArgs(argv: string[]): {
  command: string | undefined;
  dateArg: string | undefined;
  codeArg: string | undefined;
  fileArg: string | undefined;
  limitArg: number | undefined;
  jobIdArg: number | undefined;
  sourceArg: string | undefined;
  confirmArg: string | undefined;
  instanceArg: string | undefined;
} {
  const limitRaw = parseOptionArg(argv, "limit");
  const limitArg = limitRaw && /^\d+$/.test(limitRaw) ? Number(limitRaw) : undefined;
  const jobIdRaw = parseOptionArg(argv, "job-id") || parseOptionArg(argv, "id");
  const jobIdArg = jobIdRaw && /^\d+$/.test(jobIdRaw) ? Number(jobIdRaw) : undefined;
  return {
    command: argv[2],
    dateArg: parseDateArg(argv),
    codeArg: parseOptionArg(argv, "code"),
    fileArg: parseOptionArg(argv, "file"),
    limitArg,
    jobIdArg,
    sourceArg: parseOptionArg(argv, "source"),
    confirmArg: parseOptionArg(argv, "confirm"),
    instanceArg: parseOptionArg(argv, "instance")
  };
}

export async function runCommand(args: {
  command?: string;
  dateArg?: string;
  codeArg?: string;
  fileArg?: string;
  limitArg?: number;
  jobIdArg?: number;
  sourceArg?: string;
  confirmArg?: string;
  instanceArg?: string;
}): Promise<void> {
  if (args.instanceArg) {
    process.env.JOB_AGENT_INSTANCE_ID = args.instanceArg;
  }
  const command = args.command;
  const dateArg = args.dateArg;
  const codeArg = args.codeArg;
  const fileArg = args.fileArg;
  const limitArg = args.limitArg;
  const jobIdArg = args.jobIdArg;
  const sourceArg = args.sourceArg;
  const confirmArg = args.confirmArg;
  const reportDate = dateArg || format(new Date(), "yyyy-MM-dd");
  const instance = loadUserInstance(args.instanceArg);
  logger.info(instanceBanner(instance), "JobAgent instance selected.");

  if (command === "instance:status") {
    return;
  }
  if (command === "instance:onboarding-status") {
    const readiness = evaluateOnboardingReadiness(instance);
    logger.info(readiness, "JobAgent onboarding readiness.");
    if (!readiness.ready) process.exitCode = 1;
    return;
  }

  assertInstanceReady(instance, command || "");
  if (command === "instance:ready") {
    logger.info(instanceBanner(instance), "JobAgent instance is approved and activated.");
    return;
  }

  if (command === "db:reset") {
    if (confirmArg !== "RESET") {
      logger.error({ dbPath: resolveDbPath() }, "Refusing destructive reset. Re-run with --confirm=RESET to proceed.");
      return;
    }
    resetDb();
    logger.info({ dbPath: resolveDbPath() }, "Database reset completed.");
    return;
  }

  const cfg = loadConfig();
  const db = getDb();

  if (isHuntCommand(command)) {
    await runHuntCommand({ command, db, limitArg, dateArg, sourceArg, fileArg, jobIdArg });
    return;
  }

  if (command === "gmail:auth:url") {
    const url = getGmailConsentUrl(cfg.env, { fresh: true });
    logger.info({
      redirectUri: cfg.env.gmailRedirectUri,
      callbackServer: "npm run serve"
    }, "Open this URL in your browser after the callback server is running. OAuth tokens save automatically on /oauth2callback.");
    logger.info(url);
    return;
  }

  if (command === "gmail:auth:local") {
    const url = getGmailConsentUrl(cfg.env, { fresh: true });
    logger.info({
      redirectUri: cfg.env.gmailRedirectUri,
      steps: [
        "Run npm run serve in another terminal if it is not already running.",
        "Open the URL below in the signed-in browser.",
        "After the success page, run npm run gmail:status."
      ]
    }, "Gmail local OAuth flow prepared.");
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
      includeTnLine: cfg.instance.proactiveWorkAuthorization
    });

    logger.info({ outcome }, "process:mock completed.");
    return;
  }

  if (command === "process:gmail") {
    if (!cfg.rules.automation.enabled || cfg.rules.automation.mode === "disabled") {
      logger.warn("Automation disabled. Skipping process:gmail.");
      return;
    }
    if (!(await requireGmailAuth(command, cfg.env))) return;

      const reconciliation = await reconcileManuallySentDrafts({
        db,
        cfg: cfg.env,
        labels: cfg.rules.filters.labels
      });
      logger.info(reconciliation, "Manual Gmail send reconciliation completed.");

      const scanLimit = limitArg ?? cfg.rules.automation.max_drafts_per_day * 3;
      const fetchLimit = limitArg ?? cfg.rules.automation.max_drafts_per_day;
      const processedLabels = processedGmailLabelNames(cfg.rules.filters.labels);
      const recruiterLookbackDays = cfg.rules.filters.recruiter_lookback_days ?? 14;

      const cleanupResult = await removeInboundLabelFromProcessedMessages(
        cfg.env,
        cfg.rules.filters.labels.inbound,
        processedLabels
      );
      logger.info(cleanupResult, "Processed recruiter-label cleanup completed.");

      // Step 1: auto-scan inbox and label recruiter emails
      const scanResult = await scanInboxForRecruiters(
        cfg.env,
        cfg.rules.filters.labels.inbound,
        scanLimit,
        processedLabels,
        recruiterLookbackDays
      );
      logger.info(scanResult, "Inbox scan complete.");

      // Step 2: process what was labeled
      const inbox = await listRecruiterInboundMessages(
      cfg.env,
      cfg.rules.filters.labels.inbound,
      fetchLimit,
      recruiterLookbackDays
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
      includeTnLine: cfg.instance.proactiveWorkAuthorization,
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

    const result = await sendApprovedDraftsViaGmail({
      db,
      cfg: cfg.env,
      maxSendsPerDay: cfg.rules.automation.max_sends_per_day,
      labels: cfg.rules.filters.labels
    });
    logger.info(result, "send:approved:gmail completed.");
    return;
  }

  if (command === "gmail:reconcile-sent") {
    if (!(await requireGmailAuth(command, cfg.env))) return;
    const result = await reconcileManuallySentDrafts({
      db,
      cfg: cfg.env,
      labels: cfg.rules.filters.labels
    });
    logger.info(result, "gmail:reconcile-sent completed.");
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
      includeTnLine: cfg.instance.proactiveWorkAuthorization
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
    if (!(await requireGmailAuth(command, cfg.env))) return;

    const reconciliation = await reconcileManuallySentDrafts({
      db,
      cfg: cfg.env,
      labels: cfg.rules.filters.labels
    });

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
      includeTnLine: cfg.instance.proactiveWorkAuthorization,
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
    const sendOutcome = await sendApprovedDraftsViaGmail({
      db,
      cfg: cfg.env,
      maxSendsPerDay: cfg.rules.automation.max_sends_per_day,
      labels: cfg.rules.filters.labels
    });

    logger.info(
      { reconciliation, processOutcome, sent: sendOutcome.sent, sendErrors: sendOutcome.errors },
      "run:gmail-cycle completed (only pre-approved drafts sent)."
    );
    return;
  }

  if (command === "gmail:status") {
    const status = await checkGmailAuthStatus(cfg.env);
    logger.info(status, "gmail:status completed.");
    if (!status.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "auth:doctor") {
    const gmail = await checkGmailAuthStatus(cfg.env);
    const dice = await runDicePreflight();
    const ok = gmail.ok && dice.ok;
    logger.info(
      {
        ok,
        gmail,
        dice,
        nextAction: ok
          ? "Auth is ready for cloud/laptop cycles."
          : "Complete the reported auth fix, then rerun npm run auth:doctor."
      },
      "auth:doctor completed."
    );
    if (!ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "run:cloud-cycle") {
    if (!cfg.rules.automation.enabled || cfg.rules.automation.mode === "disabled") {
      logger.warn("Automation disabled. Skipping run:cloud-cycle.");
      return;
    }
    if (!(await requireGmailAuth(command, cfg.env))) return;

    const reconciliation = await reconcileManuallySentDrafts({
      db,
      cfg: cfg.env,
      labels: cfg.rules.filters.labels
    });

    const inbox = await listRecruiterInboundMessages(
      cfg.env,
      cfg.rules.filters.labels.inbound,
      limitArg ?? cfg.rules.automation.max_drafts_per_day
    );
    const proof = syncApplicationProofFromMessages(db, inbox);

    const processOutcome = await processGmailInbox({
      db,
      profile: cfg.profile,
      rules: cfg.rules,
      resumeMap: cfg.resumeMap,
      messages: inbox,
      includeTnLine: cfg.instance.proactiveWorkAuthorization,
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

    const sendOutcome = await sendApprovedDraftsViaGmail({
      db,
      cfg: cfg.env,
      maxSendsPerDay: cfg.rules.automation.max_sends_per_day,
      labels: cfg.rules.filters.labels
    });

    logger.info(
      { reconciliation, proof, processOutcome, sent: sendOutcome.sent, sendErrors: sendOutcome.errors },
      "run:cloud-cycle completed."
    );
    return;
  }

  if (command === "run:laptop-cycle") {
    logger.info({ dbPath: resolveDbPath() }, "run:laptop-cycle started.");

    const preflight = await runDicePreflight();
    logger.info(preflight, "Dice preflight completed.");

    await runHuntCommand({ command: "hunt:scrape-dice", db, limitArg, dateArg, sourceArg: "dice", fileArg });
    await runHuntCommand({ command: "hunt:score", db, limitArg, dateArg, sourceArg, fileArg });
    await runHuntCommand({ command: "hunt:package", db, limitArg, dateArg, sourceArg, fileArg });
    await runHuntCommand({ command: "hunt:apply-assist", db, limitArg, dateArg, sourceArg, fileArg });

    if (!preflight.ok) {
      logger.warn({ preflight }, "Laptop Dice apply queue skipped because Dice preflight is not ready.");
      return;
    }

    const { summary, report } = await runAutoApplyQueueAndReport({
      db,
      cfg,
      sourceFilter: "dice",
      maxJobs: limitArg,
      requireDicePreflight: true
    });
    logger.info({ summary }, "Laptop Dice apply queue completed.");
    logger.info({ report }, "Laptop queue report snapshot.");
    return;
  }

  if (command === "run:production-cycle") {
    logger.info({ dbPath: resolveDbPath() }, "run:production-cycle started.");

    await runHuntCommand({ command: "hunt:scrape-all", db, limitArg, dateArg, sourceArg, fileArg });
    await runHuntCommand({ command: "hunt:score", db, limitArg, dateArg, sourceArg, fileArg });
    await runHuntCommand({ command: "hunt:package", db, limitArg, dateArg, sourceArg, fileArg });
    await runHuntCommand({ command: "hunt:apply-assist", db, limitArg, dateArg, sourceArg, fileArg });

    const { summary, report } = await runAutoApplyQueueAndReport({ db, cfg });
    logger.info({ summary }, "Auto-apply queue completed.");
    logger.info({ report }, "Queue report snapshot.");
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
    "No command supplied. Pass --instance=<id>. Use one of: instance:status, instance:onboarding-status, instance:ready, auth:doctor, gmail:auth:url, gmail:auth:local, gmail:auth:save --code=..., gmail:status, gmail:reconcile-sent, db:reset --confirm=RESET, seed:sample, process:mock, process:gmail, approve:all, send:approved, send:approved:gmail, run:mock-cycle, run:gmail-cycle, run:laptop-cycle, run:production-cycle, report:daily, hunt:ingest, hunt:status, hunt:scout, hunt:score, hunt:package, hunt:apply-assist, hunt:premium-queue, hunt:prepare-artifacts, hunt:apply-one --job-id=..., hunt:approve-submit, hunt:interview-prep, hunt:report, hunt:export, hunt:scrape-dice, hunt:scrape-indeed, hunt:scrape-linkedin, hunt:scrape-all."
  );
}

async function run(): Promise<void> {
  const parsed = parseCommandArgs(process.argv);
  await runCommand(parsed);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  run().catch((error) => {
    logger.error({ err: error }, "Fatal error in main.");
    process.exit(1);
  });
}
