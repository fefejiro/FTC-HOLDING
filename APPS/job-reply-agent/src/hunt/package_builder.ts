import type { Job } from "./types.js";
import type { HuntConfig } from "./config_loader.js";
import { tailorResumeForJD } from "../resume_tailor";
import JSZip from "jszip";
import path from "node:path";
import fs from "node:fs/promises";

export interface PackageBuilderResult {
  jobId: number;
  docxPath: string;
  coverLetterPath: string;
  passedQualityGate: boolean;
  errors: string[];
}

export async function buildPackageForJob(
  job: Job,
  config: HuntConfig,
  opts: { templatePath: string; outputDir: string }
): Promise<PackageBuilderResult> {
  // Quality gate: check for blocked terms, forbidden claims/artifacts
  const errors: string[] = [];
  const desc = (job.description ?? "").toLowerCase();
  for (const term of config.blockedTerms.generic_ai_phrases ?? []) {
    if (desc.includes(term.toLowerCase())) errors.push(`Blocked phrase: ${term}`);
  }
  for (const term of config.blockedTerms.forbidden_claims ?? []) {
    if (desc.includes(term.toLowerCase())) errors.push(`Forbidden claim: ${term}`);
  }
  for (const term of config.blockedTerms.forbidden_artifacts ?? []) {
    if (desc.includes(term.toLowerCase())) errors.push(`Forbidden artifact: ${term}`);
  }
  // TODO: check resume content as well

  let docxPath = "";
  let coverLetterPath = "";
  let coverLetterContent = "";
  if (errors.length === 0) {
    const parsed = {
      roleTitle: job.title,
      cleanRoleTitle: job.title.replace(/[^A-Za-z0-9]+/g, " ").trim(),
      company: job.company,
      alignmentKeywords: [],
      location: job.location ?? "",
      employmentType: "",
      minYears: 0,
      maxYears: 0,
      skills: [],
      compensation: job.compensation ?? "",
      postedAt: job.posted_at ?? "",
      url: job.url,
      salaryOrRate: "",
      summary: job.description ?? "",
      recruiterName: "",
      parserConfidence: 1,
      parserWarnings: [],
      parserSource: "package_builder",
      cleanBody: job.description ?? "",
      isUsRole: false
    };
    const result = await tailorResumeForJD({
      parsed,
      jdText: job.description ?? "",
      templatePath: opts.templatePath,
      outputDir: opts.outputDir
    });
    docxPath = result.docxPath;

    // Generate cover letter content
    coverLetterContent = `Dear Hiring Manager,\n\nI am excited to apply for the ${job.title} position at ${job.company}. My experience and skills make me a strong fit for this role.\n\nThank you for your consideration.\n\nSincerely,\n[Your Name]`;

    // Quality gate for cover letter
    const coverLower = coverLetterContent.toLowerCase();
    for (const term of config.blockedTerms.generic_ai_phrases ?? []) {
      if (coverLower.includes(term.toLowerCase())) errors.push(`Blocked phrase in cover letter: ${term}`);
    }
    for (const term of config.blockedTerms.forbidden_claims ?? []) {
      if (coverLower.includes(term.toLowerCase())) errors.push(`Forbidden claim in cover letter: ${term}`);
    }
    for (const term of config.blockedTerms.forbidden_artifacts ?? []) {
      if (coverLower.includes(term.toLowerCase())) errors.push(`Forbidden artifact in cover letter: ${term}`);
    }

    // Only write DOCX if still passing
    if (errors.length === 0) {
      // Minimal DOCX: wrap text in a single <w:t> in document.xml
      const docx = new JSZip();
      const cleanRole = job.title.replace(/[^A-Za-z0-9]+/g, "_");
      const cleanCompany = job.company.replace(/[^A-Za-z0-9]+/g, "_");
      const fileName = `Fejiro_Efiuvwere_${cleanRole}_${cleanCompany}_Cover_Letter.docx`;
      coverLetterPath = path.join(opts.outputDir, fileName);
      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>${coverLetterContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "</w:t></w:r></w:p><w:p><w:r><w:t>")}</w:t></w:r></w:p></w:body></w:document>`;
      docx.file("[Content_Types].xml", `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/></Types>`);
      const wordFolder = docx.folder("word") || docx.folder("word");
      if (wordFolder) {
        wordFolder.file("document.xml", documentXml);
      }
      const buf = await docx.generateAsync({ type: "nodebuffer" });
      await fs.writeFile(coverLetterPath, buf);
    }
  }
  return {
    jobId: job.id!,
    docxPath,
    coverLetterPath,
    passedQualityGate: errors.length === 0,
    errors
  };
}
