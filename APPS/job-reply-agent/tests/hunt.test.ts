import { describe, it, expect } from "vitest";
import { getDb } from "../src/db.js";
import {
  generateOutreachDrafts,
  generatePackages,
  ingestGmailJobAlerts,
  insertHuntJob,
  isJobAlertEmail,
  normalizeSourceJob,
  parseGmailJobAlert,
  parseManualJobText,
  scoreJobs
} from "../src/hunt.js";
import type { RecruiterMessage } from "../src/types.js";

function gmailMessage(overrides: Partial<RecruiterMessage> = {}): RecruiterMessage {
  return {
    messageId: "gmail-1",
    threadId: "thread-1",
    from: "LinkedIn Job Alerts <jobs-noreply@linkedin.com>",
    subject: "New jobs for Senior TypeScript Engineer",
    body: [
      "Title: Senior TypeScript Engineer",
      "Company: Acme",
      "Location: Toronto Remote",
      "Required Skills:",
      "- TypeScript",
      "- Node",
      "Apply: https://boards.greenhouse.io/acme/jobs/123"
    ].join("\n"),
    receivedAt: new Date().toISOString(),
    ...overrides
  };
}

describe("hunt flow", () => {
  it("manual job ingestion parser extracts core fields and review flags", () => {
    const parsed = parseManualJobText([
      "Title: Senior TypeScript Engineer",
      "Company: Acme",
      "Location: Toronto",
      "Source URL: https://example.com/jobs/1",
      "Apply URL: https://jobs.lever.co/acme/123",
      "Description: remote full-time role with salary $130k",
      "Required Skills:",
      "- TypeScript",
      "- Node",
      "Preferred Skills:",
      "- React"
    ].join("\n"));

    expect(parsed.title).toContain("TypeScript");
    expect(parsed.company).toBe("Acme");
    expect(parsed.source).toBe("lever");
    expect(parsed.work_mode).toBe("remote");
    expect(parsed.employment_type).toBe("full-time");
    expect(JSON.parse(parsed.required_skills)).toContain("TypeScript");
    expect(JSON.parse(parsed.preferred_skills)).toContain("React");
    expect(parsed.salary_or_rate).toContain("130k");
    expect(parsed.needs_review).toBe(1);
  });

  it("identifies and parses Gmail job alerts without sending anything", () => {
    const message = gmailMessage();

    expect(isJobAlertEmail(message)).toBe(true);
    const jobs = parseGmailJobAlert(message);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].source).toBe("greenhouse");
    expect(jobs[0].gmail_message_id).toBe("gmail-1");
    expect(jobs[0].apply_url).toContain("greenhouse");
  });

  it("ingests Gmail alerts into hunt_jobs and does not create sendable drafts", () => {
    const db = getDb(":memory:");

    const result = ingestGmailJobAlerts(db, [gmailMessage()]);
    const job = db.prepare("SELECT title, source, gmail_message_id FROM hunt_jobs LIMIT 1").get() as any;
    const drafts = db.prepare("SELECT COUNT(*) as c FROM drafts").get() as any;

    expect(result).toEqual({ messages: 1, jobs: 1 });
    expect(job.title).toContain("TypeScript");
    expect(job.source).toBe("greenhouse");
    expect(job.gmail_message_id).toBe("gmail-1");
    expect(drafts.c).toBe(0);
  });

  it("normalizes Greenhouse, Lever, and Ashby sources into the same shape", () => {
    const greenhouse = normalizeSourceJob({ title: "Engineer", company: "A", apply_url: "https://boards.greenhouse.io/a/jobs/1", description: "Remote TypeScript" });
    const lever = normalizeSourceJob({ title: "Engineer", company: "B", apply_url: "https://jobs.lever.co/b/2", description: "Hybrid Node" });
    const ashby = normalizeSourceJob({ title: "Engineer", company: "C", apply_url: "https://jobs.ashbyhq.com/c/3", description: "Onsite CRM" });

    expect(greenhouse.source).toBe("greenhouse");
    expect(lever.source).toBe("lever");
    expect(ashby.source).toBe("ashby");
    expect(greenhouse.status).toBeUndefined();
    expect(greenhouse.required_skills).toBe("[]");
  });

  it("scoring status transition moves discovered jobs forward", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "Engineer",
      company: "Acme",
      description: "TypeScript Node React automation",
      required_skills: ["TypeScript", "Node", "React"]
    }));

    scoreJobs(db);
    const row = db.prepare("SELECT status, score FROM hunt_jobs LIMIT 1").get() as any;

    expect(row.status).toBe("scored");
    expect(row.score).toBeGreaterThanOrEqual(60);
  });

  it("package generation path and outreach drafts are draft-only", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "Engineer",
      company: "Acme",
      description: "TypeScript Node",
      required_skills: ["TypeScript", "Node"]
    }));
    scoreJobs(db);

    const packaged = generatePackages(db);
    const drafts = generateOutreachDrafts(db);
    const waiting = db.prepare("SELECT body, status FROM hunt_outreach_drafts").all() as any[];
    const sendable = db.prepare("SELECT COUNT(*) as c FROM drafts WHERE approved=1 OR sent=1").get() as any;

    expect(packaged).toBe(1);
    expect(drafts).toBe(4);
    expect(waiting.every((draft) => draft.status === "waiting")).toBe(true);
    expect(waiting.every((draft) => draft.body.split(/\s+/).length <= 120)).toBe(true);
    expect(waiting.every((draft) => !/[—<]/.test(draft.body))).toBe(true);
    expect(sendable.c).toBe(0);
  });

  it("forbidden work authorization claims are blocked and sensitive fields need review", () => {
    const parsed = parseManualJobText("Title: Eng\nCompany: A\nDescription: US citizen required and provide passport");
    const flags = JSON.parse(parsed.red_flags);

    expect(parsed.needs_review).toBe(1);
    expect(flags).toContain("forbidden_auth_claim_present");
    expect(flags).toContain("sensitive_fields_present");
  });
});
