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

  it("skips low-scoring recruiter email without creating a reply draft", async () => {
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

      expect(outcome.skipped).toBe(1);
      expect(outcome.needsReview).toBe(0);
      expect(statuses).toContain("skipped");
      const draft = db.prepare("SELECT resume_path, recipient_email FROM drafts WHERE message_id=?").get("low-score-1") as any;
      expect(draft).toBeUndefined();
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

  it("creates at most one reply package for messages in the same Gmail thread", async () => {
    const tmpDb = path.join(os.tmpdir(), `job-reply-agent-thread-dedupe-${Date.now()}.sqlite`);
    try {
      const cfg = loadConfig();
      const db = getDb(tmpDb);
      let draftCalls = 0;

      const outcome = await processGmailInbox({
        db,
        profile: cfg.profile,
        resumeMap: cfg.resumeMap,
        rules: {
          ...cfg.rules,
          resume_tailoring: { ...cfg.rules.resume_tailoring!, enabled: false }
        },
        messages: [
          {
            messageId: "thread-message-1",
            threadId: "shared-recruiter-thread",
            from: "Recruiter <jobs@example-recruiter.test>",
            subject: "Senior Business Systems Analyst",
            body: "Senior Business Systems Analyst role in Toronto with requirements gathering, Jira, SQL, UAT, and stakeholder management.",
            receivedAt: new Date().toISOString()
          },
          {
            messageId: "thread-message-2",
            threadId: "shared-recruiter-thread",
            from: "Recruiter <jobs@example-recruiter.test>",
            subject: "Re: Senior Business Systems Analyst",
            body: "Following up on the Senior Business Systems Analyst role in Toronto.",
            receivedAt: new Date().toISOString()
          }
        ],
        createDraft: async () => {
          draftCalls += 1;
          return { draftId: "one-draft", recipientEmail: "jobs@example-recruiter.test" };
        }
      });

      expect(outcome.processed).toBe(1);
      expect(draftCalls).toBe(1);
      const count = db
        .prepare("SELECT COUNT(*) AS count FROM drafts WHERE thread_id=?")
        .get("shared-recruiter-thread") as { count: number };
      expect(count.count).toBe(1);
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

  it("does not create a Gmail draft when tailored resume generation fails", async () => {
    const tmpDb = path.join(os.tmpdir(), `job-reply-agent-tailor-fail-${Date.now()}.sqlite`);
    try {
      const cfg = loadConfig();
      const db = getDb(tmpDb);
      const statuses: string[] = [];
      let draftCalls = 0;

      const outcome = await processGmailInbox({
        db,
        profile: cfg.profile,
        resumeMap: cfg.resumeMap,
        rules: {
          ...cfg.rules,
          resume_tailoring: {
            ...cfg.rules.resume_tailoring!,
            enabled: true,
            template_path: path.join(os.tmpdir(), "missing-approved-template.docx"),
            business_analysis_template_path: path.join(os.tmpdir(), "missing-approved-ba-template.docx")
          }
        },
        messages: [
          {
            messageId: "tailor-fail-1",
            threadId: "tailor-fail-thread-1",
            from: "Recruiter <jobs@example-recruiter.test>",
            subject: "Senior Business Systems Analyst",
            body: "Senior Business Systems Analyst in Toronto requiring requirements gathering, stakeholder management, SQL, Jira, UAT coordination, and API integrations.",
            receivedAt: new Date().toISOString()
          }
        ],
        createDraft: async () => {
          draftCalls += 1;
          return { draftId: "must-not-exist", recipientEmail: "jobs@example-recruiter.test" };
        },
        onStatusChange: async (_messageId, status) => {
          statuses.push(status);
        }
      });

      expect(outcome.needsReview).toBe(1);
      expect(outcome.errors).toBe(0);
      expect(draftCalls).toBe(0);
      expect(statuses).toContain("needs_review");
      const draft = db.prepare("SELECT id FROM drafts WHERE message_id=?").get("tailor-fail-1");
      expect(draft).toBeUndefined();
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

  it("skips automated job alerts without creating resume drafts", async () => {
    const tmpDb = path.join(os.tmpdir(), `job-reply-agent-alert-skip-${Date.now()}.sqlite`);
    try {
      const cfg = loadConfig();
      const db = getDb(tmpDb);
      const statuses: string[] = [];
      let draftCalls = 0;

      const outcome = await processGmailInbox({
        db,
        profile: cfg.profile,
        resumeMap: cfg.resumeMap,
        rules: {
          ...cfg.rules,
          resume_tailoring: { ...cfg.rules.resume_tailoring!, enabled: false }
        },
        messages: [
          {
            messageId: "linkedin-alert-1",
            threadId: "thread-linkedin-alert-1",
            from: "LinkedIn Job Alerts <jobalerts-noreply@linkedin.com>",
            subject: "Senior Business Systems Analyst at ExampleCo: new jobs in Canada",
            body: "Manage job alerts. Created with the new AI-powered job search.",
            receivedAt: new Date().toISOString()
          }
        ],
        createDraft: async () => {
          draftCalls += 1;
          return { draftId: "should-not-exist", recipientEmail: "jobalerts-noreply@linkedin.com" };
        },
        onStatusChange: async (_messageId, status) => {
          statuses.push(status);
        }
      });

      expect(outcome.processed).toBe(1);
      expect(outcome.skipped).toBe(1);
      expect(outcome.drafted).toBe(0);
      expect(outcome.needsReview).toBe(0);
      expect(draftCalls).toBe(0);
      expect(statuses).toEqual(["skipped"]);
      const draft = db.prepare("SELECT id FROM drafts WHERE message_id=?").get("linkedin-alert-1") as any;
      expect(draft).toBeUndefined();
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

  it("does not skip direct recruiter hiring emails that use templated subjects", async () => {
    const tmpDb = path.join(os.tmpdir(), `job-reply-agent-direct-recruiter-${Date.now()}.sqlite`);
    try {
      const cfg = loadConfig();
      const db = getDb(tmpDb);
      let draftCalls = 0;

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
              draft_min: 70,
              needs_review_min: 50
            }
          }
        },
        messages: [
          {
            messageId: "direct-recruiter-1",
            threadId: "thread-direct-recruiter-1",
            from: "Sumit Goyal <sumit.goyal@synchronycorp.com>",
            subject: "Urgent Fulltime Hire - Program manager - Remote",
            body:
              "Hello Fejiro,\n\nWe have a remote Program Manager role for enterprise implementation, stakeholder management, UAT, release readiness, and vendor coordination. Please share your resume if interested.\n\nYou can update your email preferences.",
            receivedAt: new Date().toISOString()
          }
        ],
        createDraft: async () => {
          draftCalls += 1;
          return { draftId: "draft-direct-recruiter-1", recipientEmail: "sumit.goyal@synchronycorp.com" };
        }
      });

      expect(outcome.processed).toBe(1);
      expect(outcome.skipped).toBe(0);
      expect(outcome.drafted + outcome.needsReview).toBe(1);
      expect(draftCalls).toBe(1);
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
