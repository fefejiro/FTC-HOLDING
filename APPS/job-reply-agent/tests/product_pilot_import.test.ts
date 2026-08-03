import { describe, expect, it } from "vitest";
import { mapLegacyApplication } from "../src/product_pilot_import.js";

const row = {
  attempt_id: 8,
  job_id: 42,
  adapter: "linkedin",
  status: "submitted_verified",
  final_url: "https://www.linkedin.com/jobs/view/42",
  screenshot_path: "proof.png",
  submitted_at: "2026-07-20T12:00:00.000Z",
  attempt_created_at: "2026-07-20T11:00:00.000Z",
  attempt_updated_at: "2026-07-20T12:00:00.000Z",
  resume_artifact_path: "resume.docx",
  answered_fields_json: "[{\"question\":\"Work authorization\",\"answer\":\"Yes\"}]",
  title: "Business Systems Analyst",
  company: "Example Company",
  location: "Toronto, ON",
  source: "linkedin",
  source_url: "https://www.linkedin.com/jobs/view/42",
  apply_url: "https://www.linkedin.com/jobs/view/42",
  score: 88,
  job_created_at: "2026-07-20T10:00:00.000Z"
};

const resume = {
  path: "resume.docx",
  filename: "resume.docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  byteSize: 200,
  sha256: "a".repeat(64)
};

const evidence = {
  path: "proof.png",
  filename: "proof.png",
  mimeType: "image/png",
  byteSize: 300,
  sha256: "b".repeat(64)
};

describe("pilot migration mapping", () => {
  it("keeps verified status only when an evidence artifact exists", () => {
    expect(mapLegacyApplication(row, resume, evidence)?.status).toBe("submitted_verified");
    expect(mapLegacyApplication(row, resume, null)?.status).toBe("submitted_unverified");
  });

  it("rejects history without a stored resume or authoritative final URL", () => {
    expect(mapLegacyApplication(row, null, evidence)).toBeNull();
    expect(mapLegacyApplication({ ...row, final_url: null }, resume, evidence)).toBeNull();
  });

  it("preserves imported answers without treating them as new approval", () => {
    const mapped = mapLegacyApplication(row, resume, evidence);
    expect(mapped?.answers).toEqual({
      fields: [{ question: "Work authorization", answer: "Yes" }]
    });
    expect(mapped?.source).toBe("linkedin");
  });
});
