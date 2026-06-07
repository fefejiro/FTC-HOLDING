import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { writeCoverLetterArtifacts } from "../src/cover_letter.js";

describe("cover letter artifacts", () => {
  it("creates non-empty txt and valid docx when package cover text is empty", async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-agent-cover-"));
    const resumeDocxPath = path.join(outputDir, "Fejiro_Efiuvwere_Project_Manager_Entergrade_Solutions_Resume.docx");
    fs.writeFileSync(resumeDocxPath, "placeholder");

    const artifacts = await writeCoverLetterArtifacts({
      outputDir,
      resumeDocxPath,
      coverText: "",
      fallback: {
        roleTitle: "Project Manager",
        company: "Entergrade Solutions",
        location: "Remote",
        jobDescription: "Project manager for enterprise software, SaaS, ERP, and delivery governance."
      }
    });

    const text = fs.readFileSync(artifacts.textPath, "utf8");
    expect(text).toContain("Project Manager");
    expect(text).toContain("Entergrade Solutions");
    expect(text.length).toBeGreaterThan(500);
    expect(artifacts.docxPath.endsWith(".docx")).toBe(true);

    const zip = await JSZip.loadAsync(fs.readFileSync(artifacts.docxPath));
    const documentXml = await zip.file("word/document.xml")?.async("string");
    expect(documentXml).toContain("Project Manager");
    expect(documentXml).toContain("Entergrade Solutions");
  });

  it("regenerates the artifact when saved cover text contains scraped Indeed noise", async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-agent-cover-noise-"));
    const resumeDocxPath = path.join(outputDir, "Fejiro_Efiuvwere_Program_Manager_Servicenow_Dacaro_Resume.docx");
    fs.writeFileSync(resumeDocxPath, "placeholder");

    const artifacts = await writeCoverLetterArtifacts({
      outputDir,
      resumeDocxPath,
      coverText: [
        "Dear Hiring Team,",
        "",
        "I am applying for Program Manager ServiceNow Easily apply Dacaro Software Services Inc Toronto, ON $125-$150 an hour Contract +1 at Unknown.",
        "",
        "Sincerely,",
        "Fejiro Efiuvwere"
      ].join("\n"),
      fallback: {
        roleTitle: "Program Manager ServiceNow",
        company: "Dacaro Software Services Inc",
        location: "Toronto, ON",
        jobDescription: "ServiceNow program manager for enterprise delivery, API integration, and delivery governance."
      }
    });

    const text = fs.readFileSync(artifacts.textPath, "utf8");
    expect(text).toContain("Program Manager ServiceNow");
    expect(text).toContain("Dacaro Software Services Inc");
    expect(text).not.toMatch(/Easily apply|at Unknown/i);
    expect(text).toContain("+1 416 473 2732");
  });

  it("includes Salesforce and CRM focus when the job description requires Salesforce", async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-agent-cover-salesforce-"));
    const resumeDocxPath = path.join(outputDir, "Fejiro_Efiuvwere_Business_Systems_Project_Manager_Addepar_Resume.docx");
    fs.writeFileSync(resumeDocxPath, "placeholder");

    const artifacts = await writeCoverLetterArtifacts({
      outputDir,
      resumeDocxPath,
      coverText: "",
      fallback: {
        roleTitle: "Business Systems - Project Manager",
        company: "Addepar",
        location: "Calgary, AB / Remote",
        jobDescription: "Experience with Salesforce required. Service Cloud, Salesforce CPQ, Jira, Confluence, software implementations, and business systems delivery."
      }
    });

    const text = fs.readFileSync(artifacts.textPath, "utf8");
    expect(text).toContain("Addepar");
    expect(text).toMatch(/Salesforce/i);
    expect(text).toMatch(/CRM-adjacent/i);
    expect(text).not.toMatch(/tailored/i);
  });
});
