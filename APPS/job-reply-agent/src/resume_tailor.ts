import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { logger } from "./logger";
import { buildTailoredResumeContent } from "./resume_style.js";
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
  subtitle: string;
  needsReview?: boolean;
  needsReviewReasons?: string[];
}

const MAX_SLUG_PART = 48;
const MAX_FILE_BASENAME = 140;

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

function cropSlug(input: string, maxLen: number): string {
  const value = (input || "").slice(0, maxLen).replace(/^_+|_+$/g, "");
  return value || "Value";
}

function buildTailoredFileName(roleSlug: string, employerSlug: string): string {
  const prefix = "Fejiro_Efiuvwere_";
  const suffix = "_Tailored.docx";
  const base = `${prefix}${roleSlug}_${employerSlug}${suffix}`;
  if (base.length <= MAX_FILE_BASENAME) {
    return base;
  }

  const extra = base.length - MAX_FILE_BASENAME;
  const targetRoleLen = Math.max(16, roleSlug.length - Math.ceil(extra / 2));
  const targetEmployerLen = Math.max(16, employerSlug.length - Math.floor(extra / 2));
  const shortRole = cropSlug(roleSlug, targetRoleLen);
  const shortEmployer = cropSlug(employerSlug, targetEmployerLen);
  return `${prefix}${shortRole}_${shortEmployer}${suffix}`;
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

function paragraphText(paragraphXml: string): string {
  return paragraphXml
    .replace(/<w:tab\/?\s*>/g, "\t")
    .replace(/<w:br\/?\s*>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function setParagraphText(paragraphXml: string, text: string): string {
  const safeText = escapeXml(text);
  let replaced = false;
  return paragraphXml.replace(/<w:t(\b[^>]*)>[\s\S]*?<\/w:t>/g, (_match, attrs: string) => {
    if (!replaced) {
      replaced = true;
      const attrOut = /\bxml:space=/.test(attrs) ? attrs : `${attrs} xml:space="preserve"`;
      return `<w:t${attrOut}>${safeText}</w:t>`;
    }
    return `<w:t${attrs}></w:t>`;
  });
}

function splitTitleToLines(title: string, slots: number): string[] {
  if (slots <= 1) return [title];
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return [title, ...new Array(Math.max(0, slots - 1)).fill("")];
  }
  const perLine = Math.max(1, Math.ceil(words.length / slots));
  const lines: string[] = [];
  for (let index = 0; index < words.length; index += perLine) {
    lines.push(words.slice(index, index + perLine).join(" "));
  }
  while (lines.length < slots) lines.push("");
  return lines.slice(0, slots);
}

function findHeadingIndex(paragraphs: string[], headingPattern: RegExp): number {
  for (let index = 0; index < paragraphs.length; index += 1) {
    if (headingPattern.test(paragraphText(paragraphs[index]))) {
      return index;
    }
  }
  return -1;
}

function replaceSectionLines(paragraphs: string[], start: number, end: number, lines: string[]): void {
  if (start < 0 || end < start) return;
  const span = end - start + 1;
  for (let index = 0; index < span; index += 1) {
    paragraphs[start + index] = setParagraphText(paragraphs[start + index], lines[index] || "");
  }
}

function replaceFirstBulletLines(paragraphs: string[], start: number, end: number, lines: string[]): void {
  if (start < 0 || end < start) return;
  const bulletIndexes: number[] = [];
  for (let index = start; index <= end; index += 1) {
    const text = paragraphText(paragraphs[index]);
    if (text.startsWith("•")) {
      bulletIndexes.push(index);
    }
  }
  for (let i = 0; i < bulletIndexes.length; i += 1) {
    const line = lines[i] || paragraphText(paragraphs[bulletIndexes[i]]);
    paragraphs[bulletIndexes[i]] = setParagraphText(paragraphs[bulletIndexes[i]], line);
  }
}

function joinParagraphs(templateXml: string, updatedParagraphs: string[]): string {
  let cursor = 0;
  return templateXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, () => {
    const value = updatedParagraphs[cursor] || "";
    cursor += 1;
    return value;
  });
}

/**
 * Tailor the resume to align with the job description and prevent contamination.
 */
export async function tailorResumeForJD(args: TailorArgs): Promise<TailorResult> {
  const { parsed, jdText, templatePath, outputDir } = args;

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Resume template not found: ${templatePath}`);
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const rawRole = parsed.roleTitle?.trim() || "";
  const rawEmployer = parsed.company?.trim() || "";

  if (!rawRole || !rawEmployer) {
    throw new Error("needs_review:missing_role_or_company");
  }

  const newTitle = normalizeTitle(rawRole);
  const roleSlug = cropSlug(titleCaseSlug(newTitle) || "Project_Manager", MAX_SLUG_PART);
  const employerSlug = cropSlug(titleCaseSlug(rawEmployer) || "Employer", MAX_SLUG_PART);

  const tailored = buildTailoredResumeContent({
    roleTitle: newTitle,
    company: rawEmployer,
    jdText
  });

  if (tailored.needsReview) {
    throw new Error(`needs_review:${tailored.needsReviewReasons.join(";")}`);
  }

  const buffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(buffer);
  const docEntry = zip.file("word/document.xml");
  if (!docEntry) {
    throw new Error("Invalid DOCX template: word/document.xml missing");
  }
  const xml = await docEntry.async("string");
  const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((match) => match[0]);

  const summaryHeadingIdx = findHeadingIndex(paragraphs, /^SUMMARY$/i);
  const coreHeadingIdx = findHeadingIndex(paragraphs, /^CORE STRENGTHS$/i);
  const experienceHeadingIdx = findHeadingIndex(paragraphs, /^EXPERIENCE$/i);
  const educationHeadingIdx = findHeadingIndex(paragraphs, /^(EDUCATION|EDUCATION\s*&\s*CERTIFICATIONS)/i);
  const portfolioHeadingIdx = findHeadingIndex(paragraphs, /^PORTFOLIO$/i);

  if (summaryHeadingIdx < 0 || coreHeadingIdx < 0 || experienceHeadingIdx < 0) {
    throw new Error("Invalid DOCX template: required resume headings missing");
  }

  const preambleIndexes = paragraphs
    .map((paragraph, index) => ({ text: paragraphText(paragraph), index }))
    .filter((entry) => entry.index < summaryHeadingIdx && entry.text.length > 0)
    .map((entry) => entry.index);
  const nameIdx = preambleIndexes.find((index) => /fejiro\s+efiuvwere/i.test(paragraphText(paragraphs[index]))) ?? -1;
  const subtitleIdx = preambleIndexes.find((index) => {
    const text = paragraphText(paragraphs[index]);
    return text.includes("|") && (nameIdx < 0 || index < nameIdx);
  }) ?? -1;

  const titleLimit = subtitleIdx >= 0 ? subtitleIdx : nameIdx >= 0 ? nameIdx : summaryHeadingIdx;
  const titleIndexes = preambleIndexes.filter((index) => index < titleLimit).slice(0, 4);
  const titleLines = splitTitleToLines(newTitle, Math.max(1, titleIndexes.length || 1));
  if (titleIndexes.length === 0) {
    paragraphs[0] = setParagraphText(paragraphs[0], newTitle);
  } else {
    titleIndexes.forEach((index, i) => {
      paragraphs[index] = setParagraphText(paragraphs[index], titleLines[i] || "");
    });
  }

  if (subtitleIdx >= 0) {
    paragraphs[subtitleIdx] = setParagraphText(paragraphs[subtitleIdx], tailored.subtitle);
  }

  const summaryStart = summaryHeadingIdx + 1;
  const summaryEnd = coreHeadingIdx - 1;
  const coreStart = coreHeadingIdx + 1;
  const coreEnd = experienceHeadingIdx - 1;
  const experienceStart = experienceHeadingIdx + 1;
  const experienceEnd = (educationHeadingIdx > experienceHeadingIdx ? educationHeadingIdx : (portfolioHeadingIdx > experienceHeadingIdx ? portfolioHeadingIdx : paragraphs.length)) - 1;
  const portfolioStart = portfolioHeadingIdx >= 0 ? portfolioHeadingIdx + 1 : -1;
  const portfolioEnd = portfolioStart >= 0 ? paragraphs.length - 1 : -1;

  replaceSectionLines(paragraphs, summaryStart, summaryEnd, tailored.summaryBullets.map((item) => `• ${item}`));
  replaceSectionLines(paragraphs, coreStart, coreEnd, tailored.coreStrengths.map((item) => `• ${item}`));
  replaceFirstBulletLines(paragraphs, experienceStart, experienceEnd, tailored.experienceBullets.map((item) => `• ${item}`));
  if (portfolioStart >= 0) {
    replaceSectionLines(paragraphs, portfolioStart, portfolioEnd, tailored.portfolioBullets.map((item) => `• ${item}`));
  }

  const updatedXml = joinParagraphs(xml, paragraphs);
  zip.file("word/document.xml", updatedXml);

  const outName = buildTailoredFileName(roleSlug, employerSlug);
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
    newTitle,
    subtitle: tailored.subtitle,
    needsReview: false,
    needsReviewReasons: []
  };
}
