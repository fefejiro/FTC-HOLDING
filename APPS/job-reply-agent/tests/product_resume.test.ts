import { describe, expect, it } from "vitest";
import { validateResumeUpload } from "../src/product_resume.js";

describe("product resume vault validation", () => {
  it("accepts a real PDF signature and returns a stable digest", () => {
    const resume = validateResumeUpload({
      filename: "Candidate Resume.pdf",
      mimeType: "application/pdf",
      base64: Buffer.from("%PDF-1.7\nresume").toString("base64")
    });
    expect(resume.filename).toBe("Candidate Resume.pdf");
    expect(resume.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("accepts a DOCX zip signature", () => {
    const resume = validateResumeUpload({
      filename: "Candidate Resume.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      base64: Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]).toString("base64")
    });
    expect(resume.content.length).toBe(7);
  });

  it("rejects extension and content spoofing", () => {
    expect(() => validateResumeUpload({
      filename: "malware.pdf",
      mimeType: "application/pdf",
      base64: Buffer.from("not a pdf").toString("base64")
    })).toThrow(/does not match a PDF/);
    expect(() => validateResumeUpload({
      filename: "resume.exe",
      mimeType: "application/pdf",
      base64: Buffer.from("%PDF-1.7").toString("base64")
    })).toThrow(/extension/);
  });
});
