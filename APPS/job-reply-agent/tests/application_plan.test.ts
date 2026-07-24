import { afterEach, describe, expect, it } from "vitest";
import { automationDeps, buildApplicationPlan, runAutoApplyOneJob } from "../src/automation.js";
import { getDb } from "../src/db.js";
import type { ApplicationAnswersConfig, ProfileConfig } from "../src/types.js";

const profile: ProfileConfig = {
  name: "Fejiro Efiuvwere",
  location: "Toronto, Ontario, Canada",
  target_titles: ["Business Analyst"],
  core_strengths: ["enterprise systems", "ERP", "WMS"],
  work_authorization_note: "Canadian citizen, eligible for TN status under USMCA for qualifying roles.",
  contact: {
    email: "fejiro.efiuvwere@gmail.com",
    phone: "+1-416-473-2732",
    linkedin: "https://www.linkedin.com/in/fejiro-efiuvwere",
    github: "https://github.com/fefejiro"
  }
};

const answers: ApplicationAnswersConfig = {
  work_authorization_text: "Canadian citizen, eligible for TN status under USMCA for qualifying roles."
};

const originalRunDicePreflight = automationDeps.runDicePreflight;

describe("application plan sensitive answer resolution", () => {
  afterEach(() => {
    automationDeps.runDicePreflight = originalRunDicePreflight;
  });

  it("answers Canadian citizen and Canada sponsorship yes/no fields from saved candidate truth", () => {
    const plan = buildApplicationPlan({
      url: "https://smartapply.indeed.com/example",
      html: `
        <label for="citizen">Are you a Canadian citizen or permanent resident?</label>
        <select id="citizen" name="citizen" required>
          <option></option><option>Yes</option><option>No</option>
        </select>
        <label for="sponsor">Do you currently require sponsorship to work in Canada?</label>
        <select id="sponsor" name="sponsor" required>
          <option></option><option>No</option><option>Yes</option>
        </select>
      `,
      profile,
      answers,
      job: {
        title: "Business Analyst",
        company: "Moveware",
        description: "Remote Business Analyst role in Canada.",
        apply_url: "https://example.com/apply",
        source: "indeed"
      },
      packageRow: null
    });

    expect(plan.pauseReasons).toEqual([]);
    expect(plan.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ answer: "Yes", source: "saved_canadian_citizenship" }),
        expect.objectContaining({ answer: "No", source: "saved_canada_work_authorization" })
      ])
    );
  });

  it("does not invent a yes/no work authorization answer when Canadian citizenship is not saved", () => {
    const plan = buildApplicationPlan({
      url: "https://smartapply.indeed.com/example",
      html: `
        <label for="sponsor">Do you currently require sponsorship to work in Canada?</label>
        <select id="sponsor" name="sponsor" required>
          <option></option><option>No</option><option>Yes</option>
        </select>
      `,
      profile: { ...profile, work_authorization_note: "" },
      answers: {},
      job: {
        title: "Business Analyst",
        company: "Moveware",
        description: "Remote Business Analyst role in Canada.",
        apply_url: "https://example.com/apply",
        source: "indeed"
      },
      packageRow: null
    });

    expect(plan.entries).toEqual([]);
    expect(plan.pauseReasons[0]?.reason).toMatch(/Missing answer/);
  });

  it("uses a separately approved sponsorship answer for the friend instance", () => {
    const plan = buildApplicationPlan({
      url: "https://smartapply.indeed.com/example",
      html: `
        <label for="sponsor">Will you now or in the future require employer sponsorship?</label>
        <select id="sponsor" name="sponsor" required>
          <option></option><option>No</option><option>Yes</option>
        </select>
      `,
      profile: {
        ...profile,
        name: "Chukwuma Mezie-Okoye",
        work_authorization_note: "Currently based in Nigeria and available for remote roles."
      },
      answers: {
        work_authorization_text: "Currently based in Nigeria and available for remote roles.",
        sponsorship_required: "Yes"
      },
      job: {
        title: "Product Manager",
        company: "Example",
        description: "Remote product role.",
        apply_url: "https://example.com/apply",
        source: "indeed"
      },
      packageRow: null
    });

    expect(plan.pauseReasons).toEqual([]);
    expect(plan.entries).toContainEqual(
      expect.objectContaining({ answer: "Yes", source: "saved_sponsorship_requirement" })
    );
  });

  it("pauses Dice apply-one when auth is only available through visible fallback without CDP", async () => {
    const db = getDb(":memory:");
    const now = new Date().toISOString();
    const inserted = db.prepare(
      `INSERT INTO hunt_jobs (title, company, source, apply_url, description, status, score, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "IT Director",
      "Robert Half",
      "dice",
      "https://www.dice.com/job-detail/test-it-director",
      "[Dice evidence] match_score=90; posted=\"today\"; apply_button=easy_apply_visible",
      "package_generated",
      99,
      "tier_1",
      now,
      now
    );
    automationDeps.runDicePreflight = async () => ({
      ok: true,
      reason: "Dice preflight passed: visible Fejiro Chrome session is authenticated. Visible fallback used because CDP is unavailable.",
      screenshotPath: "proof.png"
    });

    const result = await runAutoApplyOneJob({ db, cfg: { profile, applicationAnswers: answers } as any, jobId: Number(inserted.lastInsertRowid) });
    const attempt = db.prepare("SELECT status, pause_reason, screenshot_path FROM application_attempts WHERE job_id=?").get(Number(inserted.lastInsertRowid)) as any;

    expect(result.status).toBe("paused");
    expect(attempt.status).toBe("manual_open_pause");
    expect(attempt.pause_reason).toContain("will not open or submit from another browser profile");
    expect(attempt.screenshot_path).toBe("proof.png");
  });
});
