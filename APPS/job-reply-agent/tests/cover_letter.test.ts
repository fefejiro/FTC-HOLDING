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
});
