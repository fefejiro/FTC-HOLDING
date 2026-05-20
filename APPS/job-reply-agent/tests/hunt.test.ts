import { describe, it, expect } from "vitest";
import { getDb } from "../src/db.js";
import {
  buildHuntReport,
  generateApplyAssist,
  generateFollowups,
  generateInterviewPrep,
  generateOutreachDrafts,
  generatePackages,
  getDueFollowups,
  getHuntContacts,
  ingestGmailJobAlerts,
  insertHuntJob,
  isJobAlertEmail,
  normalizeSourceJob,
  parseGmailJobAlert,
  parseManualJobText,
  scoreHuntJob,
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
      "\uFEFFTitle: Senior TypeScript Engineer",
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
    expect(parsed.title).not.toContain("Title:");
    expect(parsed.company).toBe("Acme");
    expect(parsed.source).toBe("lever");
    expect(parsed.work_mode).toBe("remote");
    expect(parsed.employment_type).toBe("full-time");
    expect(JSON.parse(parsed.required_skills)).toContain("TypeScript");
    expect(JSON.parse(parsed.preferred_skills)).toContain("React");
    expect(parsed.salary_or_rate).toContain("130k");
    expect(parsed.needs_review).toBe(1);
  });

  it("manual happy path can score, package, draft outreach, and report next action", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, parseManualJobText([
      "Title: Senior Workflow Engineer",
      "Company: Northstar",
      "Location: Toronto Remote",
      "Apply URL: https://jobs.lever.co/northstar/workflow",
      "Description: Remote full-time role building TypeScript, Node, React, CRM automation, and AI workflow tools.",
      "Required Skills:",
      "- TypeScript",
      "- Node",
      "- React",
      "- CRM automation",
      "Preferred Skills:",
      "- Salesforce"
    ].join("\n")));

    expect(scoreJobs(db)).toBe(1);
    expect(generatePackages(db)).toBe(1);
    expect(generateOutreachDrafts(db)).toBe(4);

    const report = JSON.parse(buildHuntReport(db));
    expect(report.package_generated).toBe(1);
    expect(report.outreach_drafts_waiting).toBe(4);
    expect(report.recommended_next_action).toBe("review_outreach_drafts");
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

  it("tier scoring prioritizes business systems and program/product roles with systems signals", () => {
    const result = scoreHuntJob({
      title: "Business Systems Manager",
      company: "RetailCo",
      description: "Lead ERP, WMS, POS, API integration, UAT, vendor delivery, and retail systems transformation.",
      required_skills: JSON.stringify(["ERP", "WMS", "POS", "API integration"]),
      preferred_skills: "[]",
      needs_review: 0,
      red_flags: "[]"
    });

    expect(result.tier).toBe("tier_1");
    expect(result.status).toBe("scored");
    expect(result.next_action).toBe("generate_package");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("does not promote generic project manager roles without systems signal", () => {
    const result = scoreHuntJob({
      title: "Project Manager",
      description: "Coordinate meetings, timelines, status reports, and general project administration.",
      required_skills: JSON.stringify(["Communication"]),
      preferred_skills: "[]",
      needs_review: 0,
      red_flags: "[]"
    });

    expect(result.tier).toBe("tier_3");
    expect(result.status).toBe("blocked");
    expect(result.next_action).toBe("skip_generic_pm");
  });

  it("creates CRM contacts from Gmail alerts and idempotent follow-up schedules", () => {
    const db = getDb(":memory:");
    const oldDate = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString();

    const result = ingestGmailJobAlerts(db, [
      gmailMessage({
        from: "Jane Recruiter <jane@example.com>",
        subject: "Job alert: Business Systems Manager",
        body: [
          "Title: Business Systems Manager",
          "Company: RetailCo",
          "Location: Toronto Hybrid",
          "Description: ERP WMS POS API integration and platform delivery.",
          "Apply: https://jobs.lever.co/retailco/bsm"
        ].join("\n")
      })
    ]);
    db.prepare("UPDATE hunt_jobs SET status='package_generated', created_at=?").run(oldDate);

    expect(result.jobs).toBe(1);
    expect(getHuntContacts(db)).toHaveLength(1);
    expect(generateFollowups(db, new Date())).toBe(3);
    expect(generateFollowups(db, new Date())).toBe(0);
    expect(getDueFollowups(db, new Date())).toHaveLength(3);

    const report = JSON.parse(buildHuntReport(db));
    expect(report.contacts).toBe(1);
    expect(report.followups_due).toBe(3);
    expect(report.recommended_next_action).toBe("review_due_followups");
  });

  it("package generation path and outreach drafts are draft-only", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "Technical Program Manager",
      company: "Acme",
      description: "ERP API integration program delivery with TypeScript and Node implementation partners.",
      required_skills: ["ERP", "API integration", "TypeScript", "Node"]
    }));
    scoreJobs(db);

    const packaged = generatePackages(db);
    const drafts = generateOutreachDrafts(db);
    const pkg = db.prepare("SELECT resume_text, cover_letter_text FROM hunt_packages LIMIT 1").get() as any;
    const waiting = db.prepare("SELECT body, status FROM hunt_outreach_drafts").all() as any[];
    const sendable = db.prepare("SELECT COUNT(*) as c FROM drafts WHERE approved=1 OR sent=1").get() as any;

    expect(packaged).toBe(1);
    expect(pkg.resume_text).toContain("Selected truthful experience bullets");
    expect(pkg.resume_text).toContain("Aligned skills");
    expect(pkg.cover_letter_text).toContain("Dear Hiring Team");
    expect(pkg.cover_letter_text).not.toMatch(/U\.?S\.? citizen|Green Card|permanent resident|security clearance/i);
    expect(drafts).toBe(4);
    expect(waiting.every((draft) => draft.status === "waiting")).toBe(true);
    expect(waiting.every((draft) => draft.body.split(/\s+/).length <= 120)).toBe(true);
    expect(waiting.every((draft) => !/[—<]/.test(draft.body))).toBe(true);
    expect(sendable.c).toBe(0);
  });

  it("salary-sensitive jobs pause for review before packaging", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, parseManualJobText([
      "Title: Senior Workflow Engineer",
      "Company: Northstar",
      "Description: Remote full-time role building TypeScript, Node, React, CRM automation, and AI workflow tools with salary $130k.",
      "Required Skills:",
      "- TypeScript",
      "- Node",
      "- React"
    ].join("\n")));

    expect(scoreJobs(db)).toBe(1);
    expect(generatePackages(db)).toBe(0);

    const row = db.prepare("SELECT status, needs_review, next_action FROM hunt_jobs LIMIT 1").get() as any;
    expect(row.status).toBe("needs_review");
    expect(row.needs_review).toBe(1);
    expect(row.next_action).toBe("review_sensitive_fields_then_package");
  });

  it("forbidden work authorization claims are blocked and sensitive fields need review", () => {
    const parsed = parseManualJobText("Title: Eng\nCompany: A\nDescription: US citizen required and provide passport");
    const flags = JSON.parse(parsed.red_flags);

    expect(parsed.needs_review).toBe(1);
    expect(flags).toContain("forbidden_auth_claim_present");
    expect(flags).toContain("sensitive_fields_present");
  });

  it("apply assist generates sessions with safe and pause fields idempotently", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "Technical Program Manager",
      company: "Acme",
      apply_url: "https://jobs.lever.co/acme/typescript",
      description: "ERP API integration program delivery with TypeScript and Node implementation partners.",
      required_skills: ["ERP", "API integration", "TypeScript", "Node"]
    }));
    scoreJobs(db);
    generatePackages(db);

    const sessions1 = generateApplyAssist(db);
    const sessions2 = generateApplyAssist(db);

    expect(sessions1).toBe(1);
    expect(sessions2).toBe(0);

    const session = db.prepare("SELECT status, safe_fields_json, pause_fields_json FROM hunt_apply_sessions LIMIT 1").get() as any;
    expect(session.status).toBe("assist_ready");
    
    const safeFields = JSON.parse(session.safe_fields_json);
    const pauseFields = JSON.parse(session.pause_fields_json);
    
    expect(safeFields).toContain("name");
    expect(safeFields).toContain("email");
    expect(safeFields).toContain("resume_upload");
    expect(pauseFields).toContain("work_authorization");
    expect(pauseFields).not.toContain("email");
  });

  it("apply assist detects Workday and sets manual_open_pause status", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "Technical Program Manager",
      company: "BigCorp",
      apply_url: "https://bigcorp.myworkdayjobs.com/en-US/bigcorp/job/123",
      description: "ERP API integration program delivery with TypeScript and Node implementation partners.",
      required_skills: ["ERP", "API integration", "TypeScript", "Node"]
    }));
    scoreJobs(db);
    generatePackages(db);
    generateApplyAssist(db);

    const session = db.prepare("SELECT status FROM hunt_apply_sessions LIMIT 1").get() as any;
    expect(session.status).toBe("manual_open_pause");
  });

  it("apply assist detects Greenhouse/Lever/Ashby and sets assist_ready status", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "Technical Program Manager",
      company: "Acme",
      apply_url: "https://boards.greenhouse.io/acme/jobs/1",
      description: "ERP API integration program delivery with TypeScript and Node implementation partners.",
      required_skills: ["ERP", "API integration", "TypeScript", "Node"]
    }));
    scoreJobs(db);
    generatePackages(db);
    generateApplyAssist(db);

    const session = db.prepare("SELECT status FROM hunt_apply_sessions LIMIT 1").get() as any;
    expect(session.status).toBe("assist_ready");
  });

  it("no auto-submit happens—apply assist is browser-assist only", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "Technical Program Manager",
      company: "Acme",
      apply_url: "https://jobs.lever.co/acme/eng",
      description: "ERP API integration program delivery with TypeScript and Node implementation partners.",
      required_skills: ["ERP", "API integration", "TypeScript", "Node"]
    }));
    scoreJobs(db);
    generatePackages(db);
    generateApplyAssist(db);

    const session = db.prepare("SELECT id FROM hunt_apply_sessions WHERE status='assist_ready' LIMIT 1").get() as any;
    const submitLike = db.prepare("SELECT COUNT(*) as c FROM drafts WHERE approved=1").get() as any;

    expect(session).toBeDefined();
    expect(submitLike.c).toBe(0);
  });

  it("interview prep generates prep records with likely questions and STAR prompts from interview status jobs", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "Technical Program Manager",
      company: "Acme",
      description: "Node TypeScript React integration and automation platform delivery",
      required_skills: ["TypeScript", "Node", "React", "API", "automation"]
    }));
    
    scoreJobs(db);
    generatePackages(db);
    
    db.prepare("UPDATE hunt_jobs SET status='interview' WHERE id=?").run(1);
    
    const prep1 = generateInterviewPrep(db);
    const prep2 = generateInterviewPrep(db);

    expect(prep1).toBe(1);
    expect(prep2).toBe(0);

    const record = db.prepare("SELECT company_brief, likely_questions_json, star_stories_json, technical_talking_points_json FROM hunt_interview_prep LIMIT 1").get() as any;
    
    expect(record.company_brief).toContain("Acme");
    expect(record.company_brief).toContain("Technical Program Manager");
    
    const questions = JSON.parse(record.likely_questions_json);
    const stories = JSON.parse(record.star_stories_json);
    const talking = JSON.parse(record.technical_talking_points_json);
    
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.some((q: string) => /typescript|node|react|integration|automation/i.test(q))).toBe(true);
    expect(stories.length).toBeGreaterThan(0);
    expect(stories.some((s: string) => /situation|task|action|result/i.test(s))).toBe(true);
    expect(talking.length).toBeGreaterThan(0);
  });

  it("interview prep includes questions for interviewer and no forbidden claims", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "Engineer",
      company: "TechCo",
      description: "Remote Node TypeScript engineering"
    }));
    scoreJobs(db);
    generatePackages(db);
    db.prepare("UPDATE hunt_jobs SET status='interview'").run();
    
    generateInterviewPrep(db);
    
    const record = db.prepare("SELECT questions_for_interviewer_json FROM hunt_interview_prep LIMIT 1").get() as any;
    const questions = JSON.parse(record.questions_for_interviewer_json);
    
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.some((q: string) => /TechCo|success|challenges|measure/i.test(q))).toBe(true);
    expect(questions.join(" ")).not.toMatch(/U\.?S\.? citizen|Green Card|permanent resident|security clearance/i);
  });

  it("report includes apply assist and interview prep counts", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "Technical Program Manager",
      company: "Acme",
      apply_url: "https://jobs.lever.co/acme/mgr",
      description: "ERP API integration program delivery with TypeScript and Node implementation partners.",
      required_skills: ["ERP", "API integration", "TypeScript", "Node"]
    }));
    insertHuntJob(db, normalizeSourceJob({
      title: "Technical Program Manager",
      company: "TechCo",
      apply_url: "https://jobs.lever.co/techco/eng",
      description: "ERP API integration program delivery with TypeScript and Node implementation partners.",
      required_skills: ["ERP", "API integration", "TypeScript", "Node"]
    }));
    scoreJobs(db);
    generatePackages(db);
    db.prepare("UPDATE hunt_jobs SET status='interview' WHERE id=?").run(2);
    generateApplyAssist(db);
    generateInterviewPrep(db);
    
    const report = JSON.parse(buildHuntReport(db));
    
    expect(report.apply_assist_ready).toBe(1);
    expect(report.interview_prep_ready).toBe(1);
    expect(report.package_generated).toBe(1);
  });
});
