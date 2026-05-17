import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { logger } from "./logger.js";
import type { ParsedOpportunity } from "./types.js";

export interface TailorArgs {
  parsed: ParsedOpportunity;
  jdText: string;
  templatePath: string;
  outputDir: string;
}

export interface TailorResult {
  docxPath: string;
  roleSlug: string;
  employerSlug: string;
  newTitle: string;
}

function titleCaseSlug(input: string): string {
  if (!input) return "";
  return input
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("_");
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeTitle(raw: string): string {
  return raw
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Replace the first <w:t> text run in document.xml with `newTitle`, and clear
 * the second <w:t> run (the template has its role title split across two runs:
 * "WMS Project" + "Manager"). Other rows are left untouched.
 */
function swapDocumentTitle(documentXml: string, newTitle: string): string {
  const safeTitle = escapeXml(newTitle);
  let replacedFirst = false;
  let clearedSecond = false;

  // Match <w:t ...>inner</w:t> (handles xml:space attr, self-closing not expected for non-empty)
  const wtRegex = /<w:t(\b[^>]*)>([\s\S]*?)<\/w:t>/g;

  const result = documentXml.replace(wtRegex, (match, attrs: string) => {
    if (!replacedFirst) {
      replacedFirst = true;
      const attrOut = /\bxml:space=/.test(attrs) ? attrs : `${attrs} xml:space="preserve"`;
      return `<w:t${attrOut}>${safeTitle}</w:t>`;
    }
    if (!clearedSecond) {
      clearedSecond = true;
      const attrOut = /\bxml:space=/.test(attrs) ? attrs : `${attrs} xml:space="preserve"`;
      return `<w:t${attrOut}></w:t>`;
    }
    return match;
  });

  return result;
}

export async function tailorResumeForJD(args: TailorArgs): Promise<TailorResult> {
  const { parsed, templatePath, outputDir } = args;

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Resume template not found: ${templatePath}`);
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const rawRole = parsed.roleTitle && parsed.roleTitle.trim().length > 0
    ? parsed.roleTitle
    : "Project Manager";
  const rawEmployer = parsed.company && parsed.company.trim().length > 0
    ? parsed.company
    : "Recruiter";

  const newTitle = normalizeTitle(rawRole);
  const roleSlug = titleCaseSlug(newTitle) || "Project_Manager";
  const employerSlug = titleCaseSlug(rawEmployer) || "Employer";

  const buffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(buffer);
  const docEntry = zip.file("word/document.xml");
  if (!docEntry) {
    throw new Error("Invalid DOCX template: word/document.xml missing");
  }
  const xml = await docEntry.async("string");
  const updatedXml = swapDocumentTitle(xml, newTitle);
  zip.file("word/document.xml", updatedXml);

  const outName = `Fejiro_Efiuvwere_${roleSlug}_${employerSlug}_Tailored.docx`;
  const outPath = path.join(outputDir, outName);
  const outBuffer = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(outPath, outBuffer);

  logger.info(
    { templatePath, outPath, newTitle, employerSlug },
    "Tailored resume DOCX generated."
  );

  return {
    docxPath: outPath,
    roleSlug,
    employerSlug,
    newTitle
  };
}
