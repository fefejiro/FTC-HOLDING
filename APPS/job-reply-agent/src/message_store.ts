import type Database from "better-sqlite3";
import type { DecisionStatus, ParsedOpportunity, RecruiterMessage, ResumeSelection } from "./types.js";

export function hasMessage(db: Database.Database, messageId: string): boolean {
  const row = db.prepare("SELECT 1 AS ok FROM messages WHERE message_id = ? LIMIT 1").get(messageId) as
    | { ok: number }
    | undefined;
  return Boolean(row?.ok);
}

export function insertMessage(db: Database.Database, message: RecruiterMessage): void {
  db.prepare(
    `INSERT OR IGNORE INTO messages (message_id, thread_id, sender, subject, received_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    message.messageId,
    message.threadId,
    message.from,
    message.subject,
    message.receivedAt,
    new Date().toISOString()
  );
}

export function upsertOpportunity(
  db: Database.Database,
  message: RecruiterMessage,
  parsed: ParsedOpportunity,
  score: number
): void {
  db.prepare(
    `INSERT INTO opportunities
      (message_id, thread_id, company, role_title, location, employment_type, salary_or_rate, parser_confidence, match_score, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(message_id) DO UPDATE SET
       thread_id = excluded.thread_id,
       company = excluded.company,
       role_title = excluded.role_title,
       location = excluded.location,
       employment_type = excluded.employment_type,
       salary_or_rate = excluded.salary_or_rate,
       parser_confidence = excluded.parser_confidence,
       match_score = excluded.match_score`
  ).run(
    message.messageId,
    message.threadId,
    parsed.company,
    parsed.roleTitle,
    parsed.location,
    parsed.employmentType,
    parsed.salaryOrRate,
    parsed.parserConfidence,
    score,
    new Date().toISOString()
  );
}

export function insertDecision(
  db: Database.Database,
  messageId: string,
  status: DecisionStatus,
  reason?: string
): void {
  db.prepare(
    `INSERT INTO decisions (message_id, status, reason, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(messageId, status, reason ?? null, new Date().toISOString());
}

export function upsertDraft(
  db: Database.Database,
  message: RecruiterMessage,
  subject: string,
  body: string,
  resume: ResumeSelection,
  options?: {
    gmailDraftId?: string;
    recipientEmail?: string;
  }
): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO drafts (message_id, thread_id, subject, body, resume_path, gmail_draft_id, recipient_email, approved, sent, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
     ON CONFLICT(message_id) DO UPDATE SET
       subject = excluded.subject,
       body = excluded.body,
       resume_path = excluded.resume_path,
       gmail_draft_id = COALESCE(excluded.gmail_draft_id, drafts.gmail_draft_id),
       recipient_email = COALESCE(excluded.recipient_email, drafts.recipient_email),
       updated_at = excluded.updated_at`
  ).run(
    message.messageId,
    message.threadId,
    subject,
    body,
    resume.resumePath,
    options?.gmailDraftId || null,
    options?.recipientEmail || null,
    now,
    now
  );
}

export function approveDraft(db: Database.Database, messageId: string): boolean {
  const result = db
    .prepare("UPDATE drafts SET approved = 1, updated_at = ? WHERE message_id = ?")
    .run(new Date().toISOString(), messageId);
  return result.changes > 0;
}

export function markDraftSent(db: Database.Database, messageId: string): boolean {
  const result = db
    .prepare("UPDATE drafts SET sent = 1, updated_at = ? WHERE message_id = ? AND approved = 1")
    .run(new Date().toISOString(), messageId);
  return result.changes > 0;
}

export function getApprovedPendingDrafts(db: Database.Database): Array<{
  message_id: string;
  gmail_draft_id: string | null;
  recipient_email: string | null;
}> {
  return db
    .prepare(
      "SELECT message_id, gmail_draft_id, recipient_email FROM drafts WHERE approved = 1 AND sent = 0 ORDER BY id ASC"
    )
    .all() as Array<{
    message_id: string;
    gmail_draft_id: string | null;
    recipient_email: string | null;
  }>;
}
