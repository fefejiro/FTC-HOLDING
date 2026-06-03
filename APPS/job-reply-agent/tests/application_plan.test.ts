import { describe, expect, it } from "vitest";
import { buildApplicationPlan } from "../src/automation.js";
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

describe("application plan sensitive answer resolution", () => {
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
});
