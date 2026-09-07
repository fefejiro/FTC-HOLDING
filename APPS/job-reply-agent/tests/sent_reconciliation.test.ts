import { describe, expect, it } from "vitest";
import { getDb } from "../src/db.js";
import {
  getPendingDraftsForReconciliation,
  getSentDraftThreadsPendingLabelSync,
  markDraftSentWithProof,
  markSentDraftThreadLabelSynced
} from "../src/message_store.js";
import { matchSentDraftProofs } from "../src/sent_reconciliation.js";

describe("manual Gmail sent reconciliation", () => {
  it("matches only a sent reply in the same thread, to the same recipient, after draft creation", () => {
    const draft = {
      message_id: "inbound-1",
      thread_id: "thread-1",
      subject: "Re: Business Analyst",
      recipient_email: "recruiter@example.com",
      created_at: "2026-07-27T17:00:00.000Z"
    };

    const result = matchSentDraftProofs([draft], [
      {
        messageId: "too-old",
        threadId: "thread-1",
        recipientHeader: "recruiter@example.com",
        subject: "Re: Business Analyst",
        sentAt: "2026-07-27T16:00:00.000Z"
      },
      {
        messageId: "wrong-recipient",
        threadId: "thread-1",
        recipientHeader: "someone-else@example.com",
        subject: "Re: Business Analyst",
        sentAt: "2026-07-27T18:00:00.000Z"
      },
      {
        messageId: "manual-send-proof",
        threadId: "thread-1",
        recipientHeader: "Recruiter <recruiter@example.com>",
        subject: "Re: Business Analyst",
        sentAt: "2026-07-27T19:00:00.000Z"
      }
    ]);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].proof.messageId).toBe("manual-send-proof");
    expect(result.unmatched).toHaveLength(0);
  });

  it("records manual approval and immutable Gmail sent proof on the draft row", () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO drafts
        (message_id, thread_id, subject, body, resume_path, gmail_draft_id, recipient_email, approved, sent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`
    ).run(
      "inbound-2",
      "thread-2",
      "Re: IT Business Analyst",
      "Hello",
      "resume.docx",
      "draft-2",
      "recruiter@example.com",
      now,
      now
    );

    expect(getPendingDraftsForReconciliation(db)).toHaveLength(1);
    expect(markDraftSentWithProof(db, "inbound-2", {
      sentMessageId: "sent-2",
      sentAt: "2026-07-27T19:00:00.000Z",
      manual: true
    })).toBe(true);

    const row = db.prepare(
      "SELECT approved, sent, sent_message_id, sent_at FROM drafts WHERE message_id=?"
    ).get("inbound-2") as {
      approved: number;
      sent: number;
      sent_message_id: string;
      sent_at: string;
    };
    expect(row).toEqual({
      approved: 1,
      sent: 1,
      sent_message_id: "sent-2",
      sent_at: "2026-07-27T19:00:00.000Z"
    });
    expect(getPendingDraftsForReconciliation(db)).toHaveLength(0);
    expect(getSentDraftThreadsPendingLabelSync(db)).toEqual(["thread-2"]);
    expect(markSentDraftThreadLabelSynced(db, "thread-2")).toBe(true);
    expect(getSentDraftThreadsPendingLabelSync(db)).toHaveLength(0);
  });
});
