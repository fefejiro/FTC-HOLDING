import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { getDb } from "../src/db.js";
import { approveAllDrafts, processGmailInbox, processMockInbox, sendApprovedDrafts } from "../src/processor.js";

describe("mock processing pipeline", () => {
  it("processes inbox, creates decisions, and sends approved drafts", () => {
    const tmpDb = path.join(os.tmpdir(), `job-reply-agent-test-${Date.now()}.sqlite`);
    try {
      const cfg = loadConfig();
      const db = getDb(tmpDb);

      const outcome = processMockInbox({
        db,
        profile: cfg.profile,
        rules: cfg.rules,
        resumeMap: cfg.resumeMap,
        includeTnLine: true
      });

      expect(outcome.processed).toBeGreaterThan(0);
      expect(outcome.drafted + outcome.needsReview + outcome.skipped + outcome.blocked).toBeGreaterThan(0);

      const approved = approveAllDrafts(db);
      expect(approved).toBeGreaterThan(0);

      const sent = sendApprovedDrafts({ db, rules: cfg.rules });
      expect(sent.sent).toBeGreaterThan(0);
    } finally {
      if (fs.existsSync(tmpDb)) {
        try {
          fs.rmSync(tmpDb, { force: true });
        } catch {
          // no-op for test cleanup
        }
      }
    }
  });

  it("creates a needs-review draft for low-scoring recruiter email instead of skipping it", async () => {
    const tmpDb = path.join(os.tmpdir(), `job-reply-agent-low-score-${Date.now()}.sqlite`);
    try {
      const cfg = loadConfig();
      const db = getDb(tmpDb);
      const statuses: string[] = [];

      const outcome = await processGmailInbox({
        db,
        profile: cfg.profile,
        resumeMap: cfg.resumeMap,
        rules: {
          ...cfg.rules,
          resume_tailoring: { ...cfg.rules.resume_tailoring!, enabled: false },
          filters: {
            ...cfg.rules.filters,
            score_bands: {
              auto_send_min: 95,
              draft_min: 90,
              needs_review_min: 80
            }
          }
        },
        messages: [
          {
            messageId: "low-score-1",
            threadId: "thread-low-score-1",
            from: "Recruiter Team <jobs@example-recruiter.test>",
            subject: "Office admin support",
            body: "Hello Fejiro,\n\nWe have an office admin opening. Please let us know if you are interested.",
            receivedAt: new Date().toISOString()
          }
        ],
        createDraft: async () => ({ draftId: "draft-low-score-1", recipientEmail: "jobs@example-recruiter.test" }),
        onStatusChange: async (_messageId, status) => {
          statuses.push(status);
        }
      });

      expect(outcome.skipped).toBe(0);
      expect(outcome.needsReview).toBe(1);
      expect(statuses).toContain("needs_review");
      const draft = db.prepare("SELECT resume_path, recipient_email FROM drafts WHERE message_id=?").get("low-score-1") as any;
      expect(draft?.resume_path).toBeTruthy();
      expect(draft?.recipient_email).toBe("jobs@example-recruiter.test");
    } finally {
      if (fs.existsSync(tmpDb)) {
        try {
          fs.rmSync(tmpDb, { force: true });
        } catch {
          // no-op for test cleanup
        }
      }
    }
  });
});
