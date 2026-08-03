import { afterEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../src/db.js";
import { automationDeps, buildApplicationPlan, buildRecruiterAutoReply, classifyVisibleDicePreflightCapture, matchesIndeedAppliedHistoryText, runAutoApplyQueue, runDailyHuntAutomation, syncApplicationProofFromMessages } from "../src/automation.js";
import { parseRecruiterEmail } from "../src/job_parser.js";
import type { RecruiterMessage } from "../src/types.js";

function baseConfig() {
  return {
    profile: {
      name: "Mike Builder",
      location: "Toronto, ON",
      target_titles: ["Senior Software Engineer"],
      core_strengths: ["TypeScript", "Node", "automation"],
      work_authorization_note: "Authorized to work in Canada and TN-eligible for the United States.",
      contact: {
        email: "mike@example.com",
        phone: "416-555-0100",
        linkedin: "https://linkedin.com/in/mike",
        github: "https://github.com/mike"
      }
    },
    rules: {
      automation: {
        enabled: true,
        mode: "draft_only",
        timezone: "UTC",
        max_drafts_per_day: 5,
        max_sends_per_day: 5
      },
      filters: {
        min_match_score: 60,
        labels: {
          inbound: "inbound",
          drafted: "drafted",
          needs_review: "needs-review",
          approve_send: "approve-send",
          sent: "sent",
          skipped: "skipped",
          blocked: "blocked",
          approved: "approved"
        }
      },
      risk_controls: {
        block_keywords: [],
        require_review_keywords: []
      },
      trusted_recruiter_domains: []
    },
    resumeMap: {
      default_resume: "resume.docx",
      mappings: []
    },
    applicationAnswers: {
      full_name: "Mike Builder",
      email: "mike@example.com",
      phone: "416-555-0100",
      linkedin_url: "https://linkedin.com/in/mike",
      github_url: "https://github.com/mike",
      portfolio_url: "https://mike.example.com",
      city: "Toronto",
      location: "Toronto, ON",
      work_authorization_text: "Authorized to work in Canada and TN-eligible for the United States.",
      salary_expectation: "CAD 130k",
      preferred_role_types: ["full-time"]
    },
    env: {
      gmailClientId: "client-id",
      gmailClientSecret: "client-secret",
      gmailRedirectUri: "http://localhost/callback",
      gmailTokensPath: "tokens.json",
      gmailAccountEmail: "mike@example.com"
    }
  } as any;
}

function recruiterMessage(overrides: Partial<RecruiterMessage> = {}): RecruiterMessage {
  return {
    messageId: "msg-1",
    threadId: "thread-1",
    from: "Jane Recruiter <jane@example.com>",
    subject: "Role at Acme with salary and work authorization details",
    body: "Title: Senior TypeScript Engineer\nCompany: Acme\nLocation: Toronto Remote\nSalary: $130k\nWe need work authorization confirmation.",
    receivedAt: new Date().toISOString(),
    ...overrides
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("automation layer", () => {
  it("builds a truthful recruiter reply with work authorization and salary when requested", () => {
    const parsed = parseRecruiterEmail(recruiterMessage());
    const body = buildRecruiterAutoReply({
      message: recruiterMessage(),
      parsed,
      profile: baseConfig().profile,
      answers: baseConfig().applicationAnswers,
      score: 88
    });

    expect(body).toContain("Hi Jane");
    expect(body).toContain("Authorized to work in Canada");
    expect(body).toContain("My compensation target is");
    expect(body).not.toMatch(/U\.?S\.? citizen|Green Card|permanent resident|security clearance/i);
    expect(body.split(/\s+/).length).toBeLessThanOrEqual(120);
  });

  it("maps a Dice application form and pauses on unknown required fields", () => {
    const plan = buildApplicationPlan({
      url: "https://jobs.dice.com/apply/123",
      html: [
        '<form action="/apply">',
        '<label for="full_name">Full name</label><input id="full_name" name="full_name" required />',
        '<label for="email">Email</label><input id="email" name="email" required />',
        '<label for="phone">Phone</label><input id="phone" name="phone" required />',
        '<label for="ssn">SSN</label><input id="ssn" name="ssn" required />',
        "</form>"
      ].join(""),
      profile: baseConfig().profile,
      answers: baseConfig().applicationAnswers,
      job: {
        title: "Senior TypeScript Engineer",
        company: "Acme",
        description: "Remote TypeScript role",
        apply_url: "https://jobs.dice.com/apply/123",
        source: "dice"
      },
      packageRow: null
    });

    expect(plan.adapter).toBe("dice");
    expect(plan.submitLabel).toBe("Submit Application");
    expect(plan.entries.map((entry) => entry.descriptor.name)).toEqual(expect.arrayContaining(["full_name", "email", "phone"]));
    expect(plan.pauseReasons.some((reason) => /ssn/i.test(reason.reason))).toBe(true);
  });

  it("runs the daily orchestration with mocked inbox and queue hooks", async () => {
    const db = getDb(":memory:");
    const cfg = baseConfig();
    const inbox = [recruiterMessage(), recruiterMessage({ messageId: "msg-2", threadId: "thread-2", subject: "Job alert: another role" })];

    const inboxSpy = vi.spyOn(automationDeps, "listRecruiterInboundMessages").mockResolvedValue(inbox);
    const jobAlertSpy = vi.spyOn(automationDeps, "ingestGmailJobAlerts").mockReturnValue({ messages: 1, jobs: 1 });
    const recruiterSpy = vi.spyOn(automationDeps, "ingestRecruiterOpportunityEmails").mockReturnValue({ linked: 1, paused: 0 });
    vi.spyOn(automationDeps, "scoreJobs").mockReturnValue(3);
    vi.spyOn(automationDeps, "generatePackages").mockReturnValue(2);
    vi.spyOn(automationDeps, "generateOutreachDrafts").mockReturnValue(4);
    vi.spyOn(automationDeps, "generateFollowups").mockReturnValue(1);
    vi.spyOn(automationDeps, "generateApplyAssist").mockReturnValue(1);
    vi.spyOn(automationDeps, "generateInterviewPrep").mockReturnValue(1);
    vi.spyOn(automationDeps, "runAutoApplyQueue").mockResolvedValue({ ready: 2, submitted: 1, submittedUnverified: 0, paused: 0, blocked: 1 });
    vi.spyOn(automationDeps, "runAutoEmailQueue").mockResolvedValue({ sent: 1, waitingReview: 1, blocked: 0 });

    const summary = await runDailyHuntAutomation({ db, cfg, limit: 10 });
    const runRow = db.prepare("SELECT run_type, status FROM application_runs LIMIT 1").get() as any;

    expect(inboxSpy).toHaveBeenCalledWith(cfg.env, cfg.rules.filters.labels.inbound, 10);
    expect(jobAlertSpy).toHaveBeenCalled();
    expect(recruiterSpy).toHaveBeenCalled();
    expect(summary.applySubmitted).toBe(1);
    expect(summary.applySubmittedUnverified).toBe(0);
    expect(summary.recruiterDraftsWaiting).toBe(1);
    expect(runRow.run_type).toBe("daily");
    expect(runRow.status).toBe("completed");
  });

  it("cloud-safe proof sync upgrades an unverified application when Gmail evidence matches", () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO hunt_jobs (id,title,company,location,source,source_url,apply_url,description,created_at,updated_at,status,tier)
      VALUES (1,'Technical Program Manager','Acme Staffing','','dice','https://dice.test/job','https://dice.test/job','',?,?, 'applied_unverified','tier_2')`).run(now, now);
    db.prepare(`INSERT INTO application_runs (id,run_type,status,summary_json,created_at,updated_at) VALUES (1,'test','completed','{}',?,?)`).run(now, now);
    db.prepare(`INSERT INTO application_attempts (run_id,job_id,adapter,apply_url,status,required_fields_json,answered_fields_json,created_at,updated_at)
      VALUES (1,1,'dice','https://dice.test/job','submitted_unverified','[]','[]',?,?)`).run(now, now);

    const result = syncApplicationProofFromMessages(db, [
      recruiterMessage({
        messageId: "ack-1",
        subject: "Application received for Technical Program Manager",
        body: "Thanks for applying to Acme Staffing for the Technical Program Manager role."
      })
    ]);
    const job = db.prepare("SELECT status FROM hunt_jobs WHERE id=1").get() as any;
    const attempt = db.prepare("SELECT status, pause_reason FROM application_attempts WHERE job_id=1").get() as any;

    expect(result.verified).toBe(1);
    expect(job.status).toBe("applied_verified");
    expect(attempt.status).toBe("submitted_verified");
    expect(attempt.pause_reason).toContain("Verified from Gmail message");
  });

  it("auto apply blocks Dice jobs when required preflight fails", async () => {
    const db = getDb(":memory:");
    const cfg = baseConfig();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO hunt_jobs (id,title,company,location,source,source_url,apply_url,description,created_at,updated_at,status,tier)
      VALUES (1,'Technical Program Manager','Acme','','dice','https://dice.test/job','https://dice.test/job','',?,?, 'apply_ready','tier_2')`).run(now, now);
    vi.spyOn(automationDeps, "runDicePreflight").mockResolvedValue({ ok: false, reason: "Dice preflight failed: signed-in Dice session was not detected." });

    const result = await runAutoApplyQueue({ db, cfg, sourceFilter: "dice", requireDicePreflight: true });
    const job = db.prepare("SELECT status, next_action FROM hunt_jobs WHERE id=1").get() as any;
    const attempt = db.prepare("SELECT status, pause_reason FROM application_attempts WHERE job_id=1").get() as any;

    expect(result.blocked).toBe(1);
    expect(job.status).toBe("blocked_needs_auth");
    expect(job.next_action).toBe("restore_authenticated_browser");
    expect(attempt.status).toBe("blocked_needs_auth");
  });

  it("classifies visible Dice Profile page as an authenticated preflight fallback", () => {
    const result = classifyVisibleDicePreflightCapture({
      requestedUrl: "https://www.dice.com/dashboard",
      finalUrl: "https://www.dice.com/dashboard/profiles",
      visibleChromeTitleAfterNavigation: "Profile | Dice.com - Google Chrome",
      screenshotPath: ".local/dice-debug/dice-visible-preflight.png"
    });

    expect(result.ok).toBe(true);
    expect(result.reason).toContain("authenticated");
    expect(result.screenshotPath).toContain("dice-visible-preflight.png");
  });

  it("classifies visible Dice login page as signed out", () => {
    const result = classifyVisibleDicePreflightCapture({
      requestedUrl: "https://www.dice.com/dashboard",
      finalUrl: "https://www.dice.com/dashboard/login?redirectURL=/dashboard/profiles",
      visibleChromeTitleAfterNavigation: "Login to Your Dice Account or Register Today for an Account | Dice.com - Google Chrome"
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("signed-in Dice session was not detected");
  });

  it("auto apply blocks low Dice match jobs before submit automation", async () => {
    const db = getDb(":memory:");
    const cfg = baseConfig();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO hunt_jobs (id,title,company,location,source,source_url,apply_url,description,created_at,updated_at,status,tier,score)
      VALUES (1,'Technical Program Manager','Acme','','dice','https://www.dice.com/job-detail/1','https://www.dice.com/job-detail/1',?,?,?, 'apply_ready','tier_2',72)`)
      .run(
        `[Dice evidence] match_score=13; posted="Posted 1 day ago"; updated="Updated today"; apply_button=visible; scraped_at=${now}\nFresh-looking but poor Dice fit.`,
        now,
        now
      );
    vi.spyOn(automationDeps, "runDicePreflight").mockResolvedValue({ ok: true, reason: "Dice preflight passed." });

    const result = await runAutoApplyQueue({ db, cfg, sourceFilter: "dice", requireDicePreflight: true });
    const attempt = db.prepare("SELECT status, pause_reason FROM application_attempts WHERE job_id=1").get() as any;

    expect(result.blocked).toBe(1);
    expect(attempt.status).toBe("blocked");
    expect(attempt.pause_reason).toContain("match score 13%");
  });

  it("matches Indeed Applied history only when role and company evidence are present", () => {
    expect(matchesIndeedAppliedHistoryText({
      title: "Program Manager ServiceNow",
      company: "Dacaro Software Services Inc",
      text: "Applied today Program Manager ServiceNow Dacaro Software Services Inc Toronto, ON"
    })).toBe(true);

    expect(matchesIndeedAppliedHistoryText({
      title: "Program Manager ServiceNow",
      company: "Dacaro Software Services Inc",
      text: "Applied today Senior Product Manager Other Company Toronto, ON"
    })).toBe(false);
  });
});
