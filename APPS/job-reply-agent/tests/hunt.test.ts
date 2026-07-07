import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
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
import { buildPremiumQueueReport, preparePremiumQueueArtifacts } from "../src/hunt/premium_queue.js";
import { buildTrustReport } from "../src/hunt/trust_report.js";
import { extractVisibleDiceJobs } from "../scripts/ingest-visible-dice.js";
import { extractVisibleMonsterJobs } from "../scripts/ingest-visible-monster.js";
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
      "Title: Supply Chain Systems Project Manager",
      "Company: Northstar",
      "Location: Toronto Remote",
      "Apply URL: https://jobs.lever.co/northstar/workflow",
      "Description: Remote full-time role leading WMS, warehouse management, supply chain integration, ERP, UAT, vendor coordination, and implementation delivery.",
      "Required Skills:",
      "- WMS",
      "- ERP integration",
      "- UAT",
      "- Vendor coordination",
      "Preferred Skills:",
      "- Manhattan WMOS"
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

  it("normalizes Greenhouse, Lever, Ashby, and Monster sources into the same shape", () => {
    const greenhouse = normalizeSourceJob({ title: "Engineer", company: "A", apply_url: "https://boards.greenhouse.io/a/jobs/1", description: "Remote TypeScript" });
    const lever = normalizeSourceJob({ title: "Engineer", company: "B", apply_url: "https://jobs.lever.co/b/2", description: "Hybrid Node" });
    const ashby = normalizeSourceJob({ title: "Engineer", company: "C", apply_url: "https://jobs.ashbyhq.com/c/3", description: "Onsite CRM" });
    const monster = normalizeSourceJob({ title: "ERP Manager", company: "D", apply_url: "https://www.monster.com/job-openings/erp-manager-remote-123", description: "Remote ERP WMS POS" });

    expect(greenhouse.source).toBe("greenhouse");
    expect(lever.source).toBe("lever");
    expect(ashby.source).toBe("ashby");
    expect(monster.source).toBe("monster");
    expect(greenhouse.status).toBeUndefined();
    expect(greenhouse.required_skills).toBe("[]");
  });

  it("scoring blocks pure developer jobs before package generation", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "Software Engineer",
      company: "Acme",
      description: "Daily hands-on coding role requiring TypeScript, Node, and React development.",
      required_skills: ["TypeScript", "Node", "React"]
    }));

    scoreJobs(db);
    const row = db.prepare("SELECT status, score, next_action, tier_reason FROM hunt_jobs LIMIT 1").get() as any;

    expect(row.status).toBe("blocked");
    expect(row.score).toBe(0);
    expect(row.next_action).toBe("do_not_apply");
    expect(row.tier_reason).toContain("pure developer");
  });

  it("tier scoring prioritizes WMS and supply chain systems delivery roles", () => {
    const result = scoreHuntJob({
      title: "WMS Supply Chain Systems Project Manager",
      company: "RetailCo",
      description: "Lead Manhattan WMOS, warehouse management, supply chain integration, ERP, UAT, vendor delivery, and retail systems transformation.",
      required_skills: JSON.stringify(["ERP", "WMS", "Warehouse Management", "API integration"]),
      preferred_skills: "[]",
      needs_review: 0,
      red_flags: "[]"
    });

    expect(result.tier).toBe("tier_1");
    expect(result.status).toBe("scored");
    expect(result.next_action).toBe("generate_package");
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it("places senior BSA roles into prepare-only band unless fit is exceptional", () => {
    const result = scoreHuntJob({
      title: "Senior Business Systems Analyst",
      company: "SystemsCo",
      location: "Canada Remote",
      work_mode: "remote",
      description: "ERP, WMS, supply chain, SaaS integration, cloud workflow, stakeholder requirements, and UAT.",
      required_skills: JSON.stringify(["ERP", "WMS", "Integration", "UAT"]),
      preferred_skills: "[]",
      needs_review: 0,
      red_flags: "[]"
    });

    expect(result.tier).toBe("tier_2");
    expect(result.status).toBe("needs_review");
    expect(result.next_action).toBe("prepare_if_easy_apply_or_recruiter_match");
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.score).toBeLessThan(85);
  });

  it("routes QA and UAT enterprise validation roles into the quality engineering lane", () => {
    const result = scoreHuntJob({
      title: "UAT Lead",
      company: "ReleaseCo",
      location: "Remote Canada",
      work_mode: "remote",
      description: "Integration testing, API validation, SQL data checks, regression, end-to-end release validation, and UAT leadership.",
      required_skills: JSON.stringify(["API", "SQL", "Regression", "UAT"]),
      preferred_skills: "[]",
      needs_review: 0,
      red_flags: "[]"
    });

    expect(result.tier).toBe("tier_3");
    expect(result.status).toBe("needs_review");
    expect(result.next_action).toBe("prepare_if_easy_apply_or_recruiter_match");
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("hard rejects mandatory CPA, Kinaxis, PMP, and early-career roles", () => {
    const cpa = scoreHuntJob({ title: "Transformation Manager", description: "CPA or CA is mandatory for this role.", required_skills: "[]", preferred_skills: "[]", red_flags: "[]" });
    const kinaxis = scoreHuntJob({ title: "Supply Chain Consultant", description: "Must have Kinaxis certification.", required_skills: "[]", preferred_skills: "[]", red_flags: "[]" });
    const pmp = scoreHuntJob({ title: "Project Manager", description: "PMP certification is required.", required_skills: "[]", preferred_skills: "[]", red_flags: "[]" });
    const junior = scoreHuntJob({ title: "Business Analyst", description: "Entry-level role, 0-2 years of experience.", required_skills: "[]", preferred_skills: "[]", red_flags: "[]" });

    for (const result of [cpa, kinaxis, pmp, junior]) {
      expect(result.status).toBe("blocked");
      expect(result.next_action).toBe("do_not_apply");
      expect(result.score).toBe(0);
    }
  });

  it("does not mistake LinkedIn freshness or company-size text for a 0-2 years gate", () => {
    const result = scoreHuntJob({
      title: "Senior Information Technology Project Manager",
      company: "NEOGOV",
      location: "Canada (Remote)",
      work_mode: "remote",
      description: "Remote contract role posted 2 weeks ago at a 501-1,000 employee SaaS company. Requires 7+ years of PMO leadership, release readiness, QA coordination, Jira reporting, and portfolio delivery.",
      required_skills: JSON.stringify(["PMO", "SaaS", "Jira", "QA", "release readiness"]),
      preferred_skills: JSON.stringify(["SAFe", "AI-enabled reporting"]),
      needs_review: 0,
      red_flags: "[]"
    });

    expect(result.status).not.toBe("blocked");
    expect(result.next_action).not.toBe("do_not_apply");
    expect(result.score).toBeGreaterThan(0);
  });

  it("does not let evidence filenames or screenshot paths inflate fit scoring", () => {
    const result = scoreHuntJob({
      title: "Senior Information Technology Project Manager",
      company: "NEOGOV",
      location: "Canada (Remote)",
      work_mode: "remote",
      description: "[LinkedIn visible evidence] easy_apply=yes; screenshot=C:\\FTC HOLDING\\APPS\\job-reply-agent\\.local\\visible-linkedin\\linkedin-wms-search-20260619.png About the job Remote SaaS portfolio PMO role with release readiness, QA coordination, Jira reporting, and delivery governance.",
      required_skills: JSON.stringify(["PMO", "SaaS", "Jira", "QA", "release readiness"]),
      preferred_skills: JSON.stringify(["SAFe", "AI-enabled reporting"]),
      needs_review: 0,
      red_flags: "[]"
    });

    expect(result.tier).toBe("tier_4");
    expect(result.score).toBeLessThan(85);
    expect(result.next_action).toBe("prepare_if_easy_apply_or_recruiter_match");
  });

  it("adds extra priority for US and Canada remote or hybrid roles", () => {
    const remoteNorthAmerica = scoreHuntJob({
      title: "Operations Analyst",
      company: "Northstar",
      location: "Toronto, Canada Remote",
      work_mode: "remote",
      description: "Operations analysis and reporting with cross-functional coordination.",
      required_skills: JSON.stringify([]),
      preferred_skills: "[]",
      needs_review: 0,
      red_flags: "[]"
    });

    const genericOnsite = scoreHuntJob({
      title: "Operations Analyst",
      company: "Northstar",
      location: "Europe Onsite",
      work_mode: "onsite",
      description: "Operations analysis and reporting with cross-functional coordination.",
      required_skills: JSON.stringify([]),
      preferred_skills: "[]",
      needs_review: 0,
      red_flags: "[]"
    });

    expect(remoteNorthAmerica.score).toBeGreaterThan(genericOnsite.score);
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

  it("premium queue ranks safe Dice Easy Apply candidates without submitting", () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    const info = db.prepare(
      `INSERT INTO hunt_jobs (title, company, location, source, apply_url, description, status, score, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Business Systems Analyst",
      "Northstar",
      "Remote",
      "dice",
      "https://www.dice.com/job-detail/remote-bsa",
      `[Dice evidence] match_score=84; posted="2 hours ago"; updated="2 hours ago"; apply_button=visible; scraped_at=${now}\nNorthstar Easy Apply Business Systems Analyst Remote ERP POS WMS integration.`,
      "package_generated",
      82,
      "tier_2",
      now,
      now
    );
    db.prepare("INSERT INTO hunt_packages (job_id, resume_text, cover_letter_text, next_action, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(Number(info.lastInsertRowid), "resume", "cover", "review_apply_assist", now);
    const resumePath = path.resolve(".local", "generated-tests", "premium-queue-test.docx");
    fs.mkdirSync(path.dirname(resumePath), { recursive: true });
    fs.writeFileSync(resumePath, "test docx placeholder", "utf8");
    db.prepare(
      `INSERT INTO application_attempts (run_id, job_id, adapter, apply_url, status, required_fields_json, answered_fields_json, resume_artifact_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(1, Number(info.lastInsertRowid), "dice", "https://www.dice.com/job-detail/remote-bsa", "paused", "[]", "[]", resumePath, now, now);

    const report = buildPremiumQueueReport(db, { sourceFilter: "dice", limit: 10 });

    expect(report.rows[0].action).toBe("apply_candidate");
    expect(report.rows[0].reason).toContain("Easy Apply");
  });

  it("premium queue does not promote unresolved manual pauses as apply candidates", () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    const info = db.prepare(
      `INSERT INTO hunt_jobs (title, company, location, source, apply_url, description, status, score, tier, next_action, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Technical Solutions Specialist",
      "VersaFile",
      "Remote Canada",
      "indeed",
      "https://ca.indeed.com/viewjob?jk=versafile",
      "Indeed Easy Apply. Technical solutions, ERP, workflow, and document-management delivery.",
      "needs_review",
      74,
      "tier_3",
      "review_sensitive_fields_then_package",
      now,
      now
    );
    const resumePath = path.resolve(".local", "generated-tests", "versafile-tss.docx");
    fs.mkdirSync(path.dirname(resumePath), { recursive: true });
    fs.writeFileSync(resumePath, "test docx placeholder", "utf8");
    db.prepare(
      `INSERT INTO application_attempts (run_id, job_id, adapter, apply_url, status, required_fields_json, answered_fields_json, pause_reason, resume_artifact_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      1,
      Number(info.lastInsertRowid),
      "indeed_visible",
      "https://ca.indeed.com/viewjob?jk=versafile",
      "manual_open_pause",
      JSON.stringify(["desired_pay", "full_address", "postal_code"]),
      JSON.stringify([{ label: "address", answer: "missing_saved_truthful_full_address", source: "manual_pause" }]),
      "Paused at SmartApply screener. Required full Address and Postal/ZIP; do not invent address. No submit attempted.",
      resumePath,
      now,
      now
    );

    const report = buildPremiumQueueReport(db, { sourceFilter: "indeed", limit: 10 });

    expect(report.rows[0].action).toBe("needs_manual_review");
    expect(report.rows[0].reason).toContain("Previous live attempt paused");
  });

  it("premium queue demotes non-target Indeed sales and operations roles", () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO hunt_jobs (title, company, location, source, apply_url, description, status, score, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Hotel Sales Account Director",
      "Association Market",
      "Winnipeg, MB",
      "indeed",
      "https://ca.indeed.com/viewjob?jk=hotel-sales",
      "Sales account management for hotel and hospitality customers.",
      "package_generated",
      100,
      "tier_1",
      now,
      now
    );

    const report = buildPremiumQueueReport(db, { sourceFilter: "indeed", limit: 10 });

    expect(report.rows[0].action).toBe("skip_non_target");
    expect(report.rows[0].reason).toContain("outside the target");
  });

  it("extracts visible Dice jobs with match and Easy Apply evidence", () => {
    const jobs = extractVisibleDiceJobs({
      title: "Dice jobs",
      url: "https://www.dice.com/jobs?q=remote+business+systems",
      links: [
        {
          text: "Business Systems Manager - ERP Retail",
          href: "https://www.dice.com/job-detail/abc-123"
        }
      ],
      cards: [
        {
          href: "https://www.dice.com/job-detail/abc-123",
          text: "Business Systems Manager - ERP Retail Northstar Remote Dice Job Match Score 84% Posted today Easy Apply ERP WMS POS delivery."
        }
      ]
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0].source_url).toContain("dice.com/job-detail/abc-123");
    expect(jobs[0].dice_match_score).toBe(84);
    expect(jobs[0].dice_apply_button_status).toBe("easy_apply_visible");
    expect(jobs[0].description).toContain("[Dice evidence]");
  });

  it("extracts visible Monster jobs as scout-only opportunities", () => {
    const jobs = extractVisibleMonsterJobs({
      title: "Monster jobs",
      url: "https://www.monster.com/jobs/search?q=remote+business+systems+analyst&where=Remote",
      links: [
        {
          text: "Business Systems Analyst - ERP Retail",
          href: "https://www.monster.com/job-openings/business-systems-analyst-erp-retail-remote"
        },
        {
          text: "IBP / Ariba / SAP Supply Chain Program Manager",
          href: "https://www.monster.com/job-openings/ibp-ariba-sap-supply-chain-program-manager"
        }
      ],
      cards: [
        {
          href: "https://www.monster.com/job-openings/business-systems-analyst-erp-retail-remote",
          text: "Business Systems Analyst - ERP Retail Northstar Remote Quick Apply Posted today ERP WMS POS delivery."
        },
        {
          href: "https://www.monster.com/job-openings/ibp-ariba-sap-supply-chain-program-manager",
          text: "IBP / Ariba / SAP Supply Chain Program Manager Mindlance 10 days agoRemote"
        }
      ]
    });

    expect(jobs).toHaveLength(2);
    expect(jobs[0].source_url).toContain("monster.com/job-openings/business-systems-analyst");
    expect(jobs[0].company).toBe("Northstar");
    expect(jobs[0].description).toContain("[Monster visible evidence]");
    expect(jobs[1].company).toBe("Mindlance");
    expect(jobs[1].description).toContain("posted=\"10 days ago\"");
  });

  it("premium queue skips unrelated Monster roles before artifact generation", () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO hunt_jobs (title, company, location, source, apply_url, description, status, score, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Tax Director - Private Client Services (REMOTE)",
      "AccountingCo",
      "Remote",
      "monster",
      "https://www.monster.com/job-openings/tax-director-private-client-services-remote",
      `[Monster visible evidence] posted="today"; quick_apply=unknown; scraped_at=${now}\nTax Director - Private Client Services remote.`,
      "package_generated",
      90,
      "tier_1",
      now,
      now
    );

    const report = buildPremiumQueueReport(db, { sourceFilter: "monster", limit: 10 });

    expect(report.rows[0].action).toBe("skip_non_target");
  });

  it("premium queue holds local-only Dice roles for review", () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO hunt_jobs (title, company, location, source, apply_url, description, status, score, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Business Systems Analyst",
      "LocalCo",
      "Lansing, Michigan",
      "dice",
      "https://www.dice.com/job-detail/local-bsa",
      `[Dice evidence] match_score=91; posted="today"; updated="today"; apply_button=visible; scraped_at=${now}\nEasy Apply. Must live within 1 hour of Lansing at the time of application.`,
      "package_generated",
      85,
      "tier_2",
      now,
      now
    );

    const report = buildPremiumQueueReport(db, { sourceFilter: "dice", limit: 10 });

    expect(report.rows[0].action).toBe("review_location_or_auth");
    expect(report.rows[0].reason).toContain("local");
  });

  it("premium queue holds city-state Dice roles for review when remote is not explicit", () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO hunt_jobs (title, company, location, source, apply_url, description, status, score, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Finance Transformation Program Manager",
      "Irvine Technology Corporation",
      "Orlando, Florida",
      "dice",
      "https://www.dice.com/job-detail/orlando-program-manager",
      `[Dice evidence] match_score=78; posted="today"; updated="today"; apply_button=visible; scraped_at=${now}\nEasy Apply finance transformation ERP delivery.`,
      "package_generated",
      78,
      "tier_1",
      now,
      now
    );

    const report = buildPremiumQueueReport(db, { sourceFilter: "dice", limit: 10 });

    expect(report.rows[0].action).toBe("review_location_or_auth");
  });

  it("premium queue requires real Dice Easy Apply evidence", () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    const info = db.prepare(
      `INSERT INTO hunt_jobs (title, company, location, source, apply_url, description, status, score, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Senior ERP Analyst",
      "ApplyNowCo",
      "Remote",
      "dice",
      "https://www.dice.com/job-detail/apply-now-erp",
      `[Dice evidence] match_score=88; posted="today"; updated="today"; apply_button=apply_now_visible; scraped_at=${now}\nApply Now Senior ERP Analyst Remote.`,
      "package_generated",
      82,
      "tier_2",
      now,
      now
    );
    const resumePath = path.resolve(".local", "generated-tests", "apply-now-queue-test.docx");
    fs.mkdirSync(path.dirname(resumePath), { recursive: true });
    fs.writeFileSync(resumePath, "test docx placeholder", "utf8");
    db.prepare(
      `INSERT INTO application_attempts (run_id, job_id, adapter, apply_url, status, required_fields_json, answered_fields_json, resume_artifact_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(1, Number(info.lastInsertRowid), "dice", "https://www.dice.com/job-detail/apply-now-erp", "paused", "[]", "[]", resumePath, now, now);

    const report = buildPremiumQueueReport(db, { sourceFilter: "dice", limit: 10 });

    expect(report.rows[0].action).not.toBe("apply_candidate");
  });

  it("premium queue holds W2 or US-based Dice roles for review", () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO hunt_jobs (title, company, location, source, apply_url, description, status, score, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Business Systems Analyst - Remote",
      "PayrollGateCo",
      "Remote",
      "dice",
      "https://www.dice.com/job-detail/w2-bsa",
      `[Dice evidence] match_score=88; posted="today"; updated="today"; apply_button=easy_apply_visible; scraped_at=${now}\nEasy Apply. W2 only, no C2C or 1099. Candidate must be US-based.`,
      "package_generated",
      82,
      "tier_2",
      now,
      now
    );

    const report = buildPremiumQueueReport(db, { sourceFilter: "dice", limit: 10 });

    expect(report.rows[0].action).toBe("review_location_or_auth");
  });

  it("premium artifact prep records durable tailored resume without marking applied", async () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    const job = db.prepare(
      `INSERT INTO hunt_jobs (title, company, location, source, apply_url, description, status, score, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Business Systems Manager",
      "RemoteCo",
      "Remote",
      "dice",
      "https://www.dice.com/job-detail/remote-manager",
      `[Dice evidence] match_score=88; posted="today"; updated="today"; apply_button=visible; scraped_at=${now}\nEasy Apply ERP WMS POS API integration and retail systems delivery.`,
      "package_generated",
      88,
      "tier_1",
      now,
      now
    );
    db.prepare("INSERT INTO hunt_packages (job_id, resume_text, cover_letter_text, next_action, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(Number(job.lastInsertRowid), "resume", "cover letter", "review_apply_assist", now);

    const templatePath = path.resolve(
      ".local",
      "resume-references",
      "Fejiro_Efiuvwere_Canadian_Tire_Manager_Network_Analytics_Resume.docx"
    );
    const outputDir = path.resolve(".local", "generated-tests", "premium-artifacts");
    const result = await preparePremiumQueueArtifacts(db, {
      limit: 1,
      sourceFilter: "dice",
      templatePath,
      outputDir
    });
    const attempt = db.prepare("SELECT status, resume_artifact_path, cover_letter_artifact_path FROM application_attempts WHERE job_id=?")
      .get(Number(job.lastInsertRowid)) as any;
    const jobRow = db.prepare("SELECT status FROM hunt_jobs WHERE id=?").get(Number(job.lastInsertRowid)) as any;

    expect(result.prepared).toHaveLength(1);
    expect(fs.existsSync(attempt.resume_artifact_path)).toBe(true);
    expect(attempt.resume_artifact_path).toMatch(/\.docx$/);
    expect(fs.existsSync(attempt.cover_letter_artifact_path)).toBe(true);
    expect(attempt.status).toBe("paused");
    expect(jobRow.status).toBe("package_generated");
  });

  it("premium artifact prep can build durable artifacts when a high-fit row has no hunt package yet", async () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    const job = db.prepare(
      `INSERT INTO hunt_jobs (title, company, location, source, apply_url, description, status, score, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Business Product Manager",
      "Premium Retail Services",
      "Remote",
      "indeed",
      "https://ca.indeed.com/viewjob?jk=premium-product",
      "Easy Apply product delivery role covering retail systems, backlog refinement, stakeholder engagement, UAT, POS workflow, analytics, and enterprise process improvement.",
      "needs_review",
      96,
      "tier_1",
      now,
      now
    );

    const templatePath = path.resolve(
      ".local",
      "resume-references",
      "Fejiro_Efiuvwere_Canadian_Tire_Manager_Network_Analytics_Resume.docx"
    );
    const outputDir = path.resolve(".local", "generated-tests", "premium-artifacts-no-package");
    const result = await preparePremiumQueueArtifacts(db, {
      limit: 1,
      sourceFilter: "indeed",
      templatePath,
      outputDir
    });
    const attempt = db.prepare("SELECT status, resume_artifact_path, cover_letter_artifact_path FROM application_attempts WHERE job_id=?")
      .get(Number(job.lastInsertRowid)) as any;

    expect(result.skipped).toHaveLength(0);
    expect(result.prepared).toHaveLength(1);
    expect(fs.existsSync(attempt.resume_artifact_path)).toBe(true);
    expect(fs.existsSync(attempt.cover_letter_artifact_path)).toBe(true);
    expect(attempt.resume_artifact_path).toMatch(/\.docx$/);
    expect(attempt.cover_letter_artifact_path).toMatch(/\.docx$/);
    expect(attempt.status).toBe("paused");
  });

  it("premium artifact prep uses recruiter email instead of Unknown in generated artifact names", async () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    const job = db.prepare(
      `INSERT INTO hunt_jobs (title, company, location, source, apply_url, recruiter_email, description, status, score, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Business Analyst",
      "Unknown",
      "Remote",
      "gmail",
      "mailto:jobs@example-recruiter.com",
      "jobs@example-recruiter.com",
      "Remote Business Analyst role covering ERP, POS, WMS, UAT, requirements, process mapping, and enterprise systems delivery.",
      "package_generated",
      88,
      "tier_1",
      now,
      now
    );

    const templatePath = path.resolve(
      ".local",
      "resume-references",
      "Fejiro_Efiuvwere_Canadian_Tire_Manager_Network_Analytics_Resume.docx"
    );
    const outputDir = path.resolve(".local", "generated-tests", "premium-artifacts-email-fallback");
    const result = await preparePremiumQueueArtifacts(db, {
      limit: 1,
      sourceFilter: "gmail",
      templatePath,
      outputDir
    });

    const attempt = db.prepare("SELECT resume_artifact_path FROM application_attempts WHERE job_id=?")
      .get(Number(job.lastInsertRowid)) as any;

    expect(result.prepared).toHaveLength(1);
    expect(path.basename(attempt.resume_artifact_path)).toMatch(/Fejiro Efiuvwere Business Analyst - Jobs Example Recruiter Com Resume\.docx/);
    expect(path.basename(attempt.resume_artifact_path)).not.toContain("_");
    expect(attempt.resume_artifact_path).not.toMatch(/Unknown/i);
  });

  it("premium artifact prep treats company equal to title as an unusable company", async () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    const job = db.prepare(
      `INSERT INTO hunt_jobs (title, company, location, source, apply_url, source_url, description, status, score, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Senior Project Manager (ERP Transformation)",
      "Senior Project Manager (ERP Transformation)",
      "Remote",
      "dice",
      "https://www.dice.com/job-detail/noisy-company",
      "https://www.dice.com/job-detail/noisy-company",
      "Remote ERP transformation role covering enterprise systems delivery, governance, vendor coordination, UAT, release readiness, and stakeholder reporting.",
      "package_generated",
      88,
      "tier_1",
      now,
      now
    );

    const templatePath = path.resolve(
      ".local",
      "resume-references",
      "Fejiro_Efiuvwere_Canadian_Tire_Manager_Network_Analytics_Resume.docx"
    );
    const outputDir = path.resolve(".local", "generated-tests", "premium-artifacts-title-company-fallback");
    const result = await preparePremiumQueueArtifacts(db, {
      limit: 1,
      sourceFilter: "dice",
      templatePath,
      outputDir
    });

    const attempt = db.prepare("SELECT resume_artifact_path FROM application_attempts WHERE job_id=?")
      .get(Number(job.lastInsertRowid)) as any;

    expect(result.prepared).toHaveLength(1);
    expect(path.basename(attempt.resume_artifact_path)).toMatch(/Fejiro Efiuvwere Senior Project Manager ERP Transformation - Dice Com Job \d+ Resume\.docx/);
    expect(path.basename(attempt.resume_artifact_path)).not.toContain("_");
    expect(attempt.resume_artifact_path).not.toMatch(/Transformation_Senior_Project_Manager/);
  });

  it("trust report orders by latest application activity instead of attempt id", () => {
    const db = getDb(":memory:");
    const older = "2026-06-02T09:00:00.000Z";
    const newer = "2026-06-03T15:06:15.158Z";
    const staleJob = db.prepare(
      `INSERT INTO hunt_jobs (title, company, source, apply_url, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Stale Project Manager",
      "OldCo",
      "indeed",
      "https://example.com/stale",
      "Older application activity.",
      "manual_open_pause",
      older,
      older
    );
    const verifiedJob = db.prepare(
      `INSERT INTO hunt_jobs (title, company, source, apply_url, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Business Systems Analyst (REMOTE)",
      "NTT DATA",
      "indeed",
      "https://example.com/ntt",
      "Verified application updated today.",
      "applied_verified",
      older,
      newer
    );

    db.prepare(
      `INSERT INTO application_attempts (run_id, job_id, adapter, apply_url, status, required_fields_json, answered_fields_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(1, Number(verifiedJob.lastInsertRowid), "indeed", "https://example.com/ntt", "submitted_verified", "[]", "[]", older, newer);
    db.prepare(
      `INSERT INTO application_attempts (run_id, job_id, adapter, apply_url, status, required_fields_json, answered_fields_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(1, Number(staleJob.lastInsertRowid), "indeed", "https://example.com/stale", "manual_open_pause", "[]", "[]", older, older);

    const report = buildTrustReport(db, { limit: 1 });

    expect(report.rows[0].job_id).toBe(Number(verifiedJob.lastInsertRowid));
    expect(report.rows[0].company).toBe("NTT DATA");
  });

  it("premium queue does not promote previously blocked Dice rows as apply candidates", () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    const job = db.prepare(
      `INSERT INTO hunt_jobs (title, company, location, source, apply_url, description, status, score, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "SAP Program Manager",
      "BlockedCo",
      "Remote",
      "dice",
      "https://www.dice.com/job-detail/blocked-sap",
      `[Dice evidence] match_score=88; posted="today"; updated="today"; apply_button=visible; scraped_at=${now}\nEasy Apply SAP delivery.`,
      "blocked",
      88,
      "tier_1",
      now,
      now
    );
    db.prepare(
      `INSERT INTO application_attempts (run_id, job_id, adapter, apply_url, status, required_fields_json, answered_fields_json, pause_reason, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(1, Number(job.lastInsertRowid), "dice", "https://www.dice.com/job-detail/blocked-sap", "blocked", "[]", "[]", "Prior live detail failed.", now, now);

    const report = buildPremiumQueueReport(db, { sourceFilter: "dice", limit: 10 });

    expect(report.rows[0].action).toBe("review_previous_attempt");
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
      title: "WMS Technical Program Manager",
      company: "Acme",
      description: "WMS, warehouse management, ERP, API integration, UAT, vendor coordination, and supply chain program delivery.",
      required_skills: ["WMS", "ERP", "API integration", "UAT"]
    }));
    scoreJobs(db);

    const packaged = generatePackages(db);
    const drafts = generateOutreachDrafts(db);
    const pkg = db.prepare("SELECT resume_text, cover_letter_text FROM hunt_packages LIMIT 1").get() as any;
    const waiting = db.prepare("SELECT body, status FROM hunt_outreach_drafts").all() as any[];
    const sendable = db.prepare("SELECT COUNT(*) as c FROM drafts WHERE approved=1 OR sent=1").get() as any;

    expect(packaged).toBe(1);
    expect(pkg.resume_text).toContain("Target Title:");
    expect(pkg.resume_text).toContain("Subtitle:");
    expect(pkg.resume_text).toContain("Core Strengths");
    expect(pkg.resume_text).toContain("Selected Experience Bullets");
    expect(pkg.cover_letter_text).toContain("Dear Hiring Team");
    expect(pkg.cover_letter_text).toContain("WMS Technical Program Manager");
    expect(pkg.cover_letter_text).toContain("Acme");
    expect(pkg.cover_letter_text).not.toMatch(/U\.?S\.? citizen|Green Card|permanent resident|security clearance/i);
    expect(pkg.cover_letter_text).not.toMatch(/WMS Project Manager|Blue Yonder|North West Company/i);
    expect(drafts).toBe(4);
    expect(waiting.every((draft) => draft.status === "waiting")).toBe(true);
    expect(waiting.every((draft) => draft.body.split(/\s+/).length <= 120)).toBe(true);
    expect(waiting.every((draft) => !/[—<]/.test(draft.body))).toBe(true);
    expect(sendable.c).toBe(0);
  });

  it("packages 70-84 Easy Apply review-band jobs after fit-gate scoring", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "Product Quality Owner",
      company: "Flinks",
      location: "Toronto, ON (Remote)",
      source: "linkedin",
      apply_url: "https://www.linkedin.com/jobs/view/4424719503",
      description: "Easy Apply. Senior Product Quality Owner responsible for QA, release validation, risk management, product quality backlogs, test case repositories, SaaS delivery, and cross-functional release readiness.",
      required_skills: ["QA", "release validation", "risk management", "test cases", "SaaS"]
    }));

    scoreJobs(db);
    const row = db.prepare("SELECT status, score, tier, next_action FROM hunt_jobs LIMIT 1").get() as any;
    expect(row.status).toBe("needs_review");
    expect(row.next_action).toBe("prepare_if_easy_apply_or_recruiter_match");
    expect(row.score).toBeGreaterThanOrEqual(70);
    expect(row.score).toBeLessThan(85);

    expect(generatePackages(db)).toBe(1);
    const pkg = db.prepare("SELECT resume_text, cover_letter_text FROM hunt_packages LIMIT 1").get() as any;
    expect(pkg.resume_text).toContain("Product Quality Owner");
    expect(pkg.cover_letter_text).toContain("Flinks");
  });

  it("missing title or company moves scored job to needs_review instead of generic fallback", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "",
      company: "",
      apply_url: "https://jobs.lever.co/acme/role-123",
      description: "Cloud platform delivery and architecture governance"
    }));
    db.prepare("UPDATE hunt_jobs SET status='scored', score=80 WHERE id=1").run();

    const packaged = generatePackages(db);
    const job = db.prepare("SELECT status, needs_review, next_action FROM hunt_jobs WHERE id=1").get() as any;
    const packages = db.prepare("SELECT COUNT(*) as c FROM hunt_packages").get() as any;

    expect(packaged).toBe(0);
    expect(packages.c).toBe(0);
    expect(job.status).toBe("needs_review");
    expect(job.needs_review).toBe(1);
    expect(job.next_action).toBe("review_missing_role_or_company");
  });

  it("salary-sensitive jobs pause for review before packaging", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, parseManualJobText([
      "Title: Supply Chain Systems Project Manager",
      "Company: Northstar",
      "Description: Remote full-time role leading WMS, warehouse management, ERP integration, UAT, vendor coordination, and supply chain delivery with salary $130k.",
      "Required Skills:",
      "- WMS",
      "- ERP integration",
      "- UAT"
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
      title: "WMS Technical Program Manager",
      company: "Acme",
      apply_url: "https://jobs.lever.co/acme/typescript",
      description: "WMS, warehouse management, ERP, API integration, UAT, vendor coordination, and supply chain program delivery.",
      required_skills: ["WMS", "ERP", "API integration", "UAT"]
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
      title: "WMS Technical Program Manager",
      company: "BigCorp",
      apply_url: "https://bigcorp.myworkdayjobs.com/en-US/bigcorp/job/123",
      description: "WMS, warehouse management, ERP, API integration, UAT, vendor coordination, and supply chain program delivery.",
      required_skills: ["WMS", "ERP", "API integration", "UAT"]
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
      title: "WMS Technical Program Manager",
      company: "Acme",
      apply_url: "https://boards.greenhouse.io/acme/jobs/1",
      description: "WMS, warehouse management, ERP, API integration, UAT, vendor coordination, and supply chain program delivery.",
      required_skills: ["WMS", "ERP", "API integration", "UAT"]
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
      title: "WMS Technical Program Manager",
      company: "Acme",
      apply_url: "https://jobs.lever.co/acme/eng",
      description: "WMS, warehouse management, ERP, API integration, UAT, vendor coordination, and supply chain program delivery.",
      required_skills: ["WMS", "ERP", "API integration", "UAT"]
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
      title: "WMS Technical Program Manager",
      company: "Acme",
      description: "WMS, warehouse management, ERP, API integration, UAT, vendor coordination, and supply chain program delivery.",
      required_skills: ["WMS", "ERP", "API", "UAT"]
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
    expect(record.company_brief).toContain("WMS Technical Program Manager");
    
    const questions = JSON.parse(record.likely_questions_json);
    const stories = JSON.parse(record.star_stories_json);
    const talking = JSON.parse(record.technical_talking_points_json);
    
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.some((q: string) => /wms|warehouse|integration|api|system/i.test(q))).toBe(true);
    expect(stories.length).toBeGreaterThan(0);
    expect(stories.some((s: string) => /situation|task|action|result/i.test(s))).toBe(true);
    expect(talking.length).toBeGreaterThan(0);
  });

  it("interview prep includes questions for interviewer and no forbidden claims", () => {
    const db = getDb(":memory:");
    insertHuntJob(db, normalizeSourceJob({
      title: "WMS Technical Program Manager",
      company: "TechCo",
      description: "Remote WMS, warehouse management, ERP, API integration, UAT, and vendor delivery."
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
      title: "WMS Technical Program Manager",
      company: "Acme",
      apply_url: "https://jobs.lever.co/acme/mgr",
      description: "WMS, warehouse management, ERP, API integration, UAT, vendor coordination, and supply chain program delivery.",
      required_skills: ["WMS", "ERP", "API integration", "UAT"]
    }));
    insertHuntJob(db, normalizeSourceJob({
      title: "WMS Technical Program Manager",
      company: "TechCo",
      apply_url: "https://jobs.lever.co/techco/eng",
      description: "WMS, warehouse management, ERP, API integration, UAT, vendor coordination, and supply chain program delivery.",
      required_skills: ["WMS", "ERP", "API integration", "UAT"]
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
