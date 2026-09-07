import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateOnboardingReadiness, saveOnboardingSubmission } from "../src/onboarding.js";
import { loadUserInstance, type UserInstanceConfig } from "../src/instance.js";

describe("onboarding readiness", () => {
  it("reports the waiting friend instance as incomplete", () => {
    const readiness = evaluateOnboardingReadiness(loadUserInstance("chukwuma"));
    expect(readiness.ready).toBe(false);
    expect(readiness.completed).toBeLessThan(readiness.total);
    expect(readiness.checks.find((check) => check.key === "source_resumes")?.ready).toBe(true);
    expect(readiness.checks.find((check) => check.key === "work_authorization")?.ready).toBe(true);
    expect(readiness.checks.find((check) => check.key === "sponsorship")?.ready).toBe(true);
    expect(readiness.checks.find((check) => check.key === "consent")?.ready).toBe(false);
  });

  it("stores an uploaded resume inside the selected instance only", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "job-agent-onboarding-"));
    const instance: UserInstanceConfig = {
      ...loadUserInstance("chukwuma"),
      manifestPath: path.join(root, "instance.yaml"),
      paths: {
        ...loadUserInstance("chukwuma").paths,
        resumeRoot: path.join(root, "resumes")
      }
    };
    const record = {
      version: 1,
      identity: { full_name: "Test User", phone: "+1 555 0100", location: "Toronto, Canada", linkedin_url: "https://linkedin.com/in/test-user", portfolio_url: "", github_url: "" },
      preferences: { target_titles: ["Product Manager"], excluded_titles: [], locations: ["Remote"], work_modes: ["remote"], employment_types: ["contract"], salary_or_rate: "USD 25 per hour", relocation: "No", travel: "No", start_date: "2026-08-01" },
      eligibility: { work_authorization: "Authorized", sponsorship_required: "No" },
      resumes: { source_files: [], default_file: "" },
      job_platforms: ["linkedin"],
      consent: { profile_truth_confirmed: true, recruiter_drafts: true, recruiter_sends: false, assisted_applications: true, controlled_submissions: false, approved_at: "2026-07-23" }
    };
    const result = saveOnboardingSubmission(instance, {
      record,
      resume: { name: "Resume.pdf", mimeType: "application/pdf", base64: Buffer.from("test-pdf").toString("base64") }
    });
    expect(fs.existsSync(path.join(instance.paths.resumeRoot, "Resume.pdf"))).toBe(true);
    expect(result.savedResume).toBe(path.join(instance.paths.resumeRoot, "Resume.pdf"));
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("rejects invalid onboarding and upload payloads", () => {
    const instance = loadUserInstance("chukwuma");
    expect(() => saveOnboardingSubmission(instance, {
      record: {},
      resume: { name: "resume.exe", base64: Buffer.from("no").toString("base64") }
    })).toThrow();
  });
});
