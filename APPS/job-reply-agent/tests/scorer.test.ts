import { describe, it, expect } from "vitest";
import { scoreJob } from "../src/hunt/scorer.js";
import type { HuntConfig } from "../src/hunt/config_loader.js";
import type { RawJob } from "../src/hunt/types.js";

const baseConfig: HuntConfig = {
  scoring: {
    weights: {
      title_match: 20,
      skills_match: 25,
      industry_match: 15,
      location_fit: 10,
      compensation_fit: 10,
      work_authorization_fit: 10,
      seniority_fit: 5,
      application_effort: 5
    },
    bands: {
      package_ready: 85,
      needs_review: 70,
      save_only: 55
    },
    hard_red_flags: ["must be a u.s. citizen", "pay to apply"],
    soft_red_flags: ["no visa sponsorship"],
    seniority_floor: { blocked: [], needs_review: [] }
  },
  searches: {
    companies: { greenhouse: [], lever: [], ashby: [] },
    searches: {
      default: {
        titles: ["Engineer"],
        keywords: ["TypeScript", "React"],
        locations: ["Remote", "Toronto"],
        minimum_rate: undefined,
        minimum_salary: undefined
      }
    },
    excluded_keywords: [],
    industries: ["Software"]
  },
  truthBank: {} as any,
  blockedTerms: {} as any,
  applicationAnswers: {} as any,
  siteRules: {} as any
};

describe("scoreJob", () => {
  it("scores a perfect match as package_ready", () => {
    const job: RawJob = {
      source: "greenhouse",
      source_id: "1",
      url: "u",
      company: "Acme Software",
      title: "Staff Engineer",
      location: "Remote",
      remote: true,
      description: "Looking for a TypeScript/React engineer in software industry.",
      compensation: null,
      posted_at: null
    };
    const result = scoreJob(job, baseConfig);
    expect(result.total).toBe(100);
    expect(result.bands.package_ready).toBe(true);
    expect(result.hard_red_flag).toBeNull();
    expect(result.soft_red_flags).toHaveLength(0);
  });

  it("detects hard red flag and blocks", () => {
    const job: RawJob = {
      ...baseConfig.searches.searches.default,
      source: "greenhouse",
      source_id: "2",
      url: "u",
      company: "Acme",
      title: "Engineer",
      location: "Remote",
      remote: true,
      description: "Must be a U.S. citizen to apply.",
      compensation: null,
      posted_at: null
    };
    const result = scoreJob(job, baseConfig);
    expect(result.total).toBe(0);
    expect(result.hard_red_flag).toContain("must be a u.s. citizen");
    expect(result.bands.package_ready).toBe(false);
  });

  it("detects soft red flag", () => {
    const job: RawJob = {
      ...baseConfig.searches.searches.default,
      source: "greenhouse",
      source_id: "3",
      url: "u",
      company: "Acme",
      title: "Engineer",
      location: "Remote",
      remote: true,
      description: "No visa sponsorship available.",
      compensation: null,
      posted_at: null
    };
    const result = scoreJob(job, baseConfig);
    expect(result.soft_red_flags).toContain("no visa sponsorship");
    expect(result.hard_red_flag).toBeNull();
  });

  it("scores partial match as needs_review or save_only", () => {
    const job: RawJob = {
      source: "greenhouse",
      source_id: "4",
      url: "u",
      company: "Acme",
      title: "Engineer",
      location: "Toronto",
      remote: false,
      description: "No relevant skills.",
      compensation: null,
      posted_at: null
    };
    const result = scoreJob(job, baseConfig);
    expect(result.total).toBeGreaterThan(0);
    expect(result.bands.needs_review || result.bands.save_only).toBe(true);
  });
});
