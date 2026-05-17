import fs from "node:fs";
import path from "node:path";
import { buildPackageForJob } from "../src/hunt/package_builder.js";
import { loadHuntConfig } from "../src/hunt/config_loader.js";
import { Job } from "../src/hunt/types.js";
import { describe, it, expect, beforeAll } from "vitest";

const TEST_TEMPLATE = path.resolve(__dirname, "../resumes/source/Fejiro_AI_Workflow.docx");
const OUTPUT_DIR = path.resolve(__dirname, "../resumes/");

describe("buildPackageForJob", () => {
  let config: ReturnType<typeof loadHuntConfig>;
  beforeAll(() => {
    config = loadHuntConfig();
  });

  it("should generate a tailored resume and pass quality gate", async () => {
    const job: Job = {
      id: 1,
      source: "greenhouse",
      source_id: "gh-123",
      url: "https://example.com/job/123",
      company: "OpenAI",
      title: "AI Research Scientist",
      location: "Remote",
      remote: true,
      description: "We are looking for an AI Research Scientist to join our team.",
      compensation: null,
      posted_at: null,
      discovered_at: new Date().toISOString(),
      status: "scored",
      score: 95,
      score_breakdown_json: null,
      red_flags_json: null,
      reason: null
    };
    const result = await buildPackageForJob(job, config, {
      templatePath: TEST_TEMPLATE,
      outputDir: OUTPUT_DIR
    });
    expect(result.passedQualityGate).toBe(true);
    expect(result.docxPath).toMatch(/\.docx$/);
    expect(fs.existsSync(result.docxPath)).toBe(true);
    expect(result.coverLetterPath).toMatch(/_Cover_Letter\.docx$/);
    expect(fs.existsSync(result.coverLetterPath)).toBe(true);
  });

  it("should fail quality gate for blocked terms", async () => {
    const job: Job = {
      id: 2,
      source: "greenhouse",
      source_id: "gh-456",
      url: "https://example.com/job/456",
      company: "OpenAI",
      title: "AI Research Scientist",
      location: "Remote",
      remote: true,
      description: "This job requires a forbidden_claims term.",
      compensation: null,
      posted_at: null,
      discovered_at: new Date().toISOString(),
      status: "scored",
      score: 95,
      score_breakdown_json: null,
      red_flags_json: null,
      reason: null
    };
    // Patch config for test
    config.blockedTerms.forbidden_claims = ["forbidden_claims term"];
    const result = await buildPackageForJob(job, config, {
      templatePath: TEST_TEMPLATE,
      outputDir: OUTPUT_DIR
    });
    expect(result.passedQualityGate).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
