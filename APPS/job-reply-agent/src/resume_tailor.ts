import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { logger } from "./logger";
import {
  buildTailoredResumeContent,
  canPlaceExperienceBulletUnderEmployer,
  FORBIDDEN_VISIBLE_RESUME_PHRASES,
  isApprovedOrangeTemplatePath,
  sanitizeVisibleResumeText,
  type ResumeProvenanceStats,
  type TailoredExperienceBullet
} from "./resume_style.js";
import type { ParsedOpportunity } from "./types.js";

export interface TailorArgs {
  parsed: ParsedOpportunity;
  jdText: string;
  templatePath: string;
  outputDir: string;
}

export interface TailoringTemplateSelectionArgs {
  parsed: Pick<ParsedOpportunity, "roleTitle" | "cleanRoleTitle" | "company">;
  jdText: string;
  defaultTemplatePath: string;
  businessAnalysisTemplatePath?: string;
}

export interface TailorResult {
  docxPath: string;
  roleSlug: string;
  employerSlug: string;
  newTitle: string;
  subtitle: string;
  provenanceStats?: ResumeProvenanceStats;
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
    .map((part) => /^[A-Z0-9]{2,}$/.test(part) && /[A-Z]/.test(part)
      ? part
      : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("_");
}

function cropSlug(input: string, maxLen: number): string {
  const value = (input || "").slice(0, maxLen).replace(/^_+|_+$/g, "");
  return value || "Value";
}

function displayPartFromSlug(input: string): string {
  return (input || "")
    .replace(/_+/g, " ")
    .replace(/[<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Value";
}

function cropDisplayPart(input: string, maxLen: number): string {
  const value = displayPartFromSlug(input).slice(0, maxLen).replace(/[\s.-]+$/g, "").trim();
  return value || "Value";
}

function buildTailoredFileName(roleSlug: string, employerSlug: string): string {
  const candidate = "Fejiro Efiuvwere";
  const suffix = " Resume.docx";
  const separator = " - ";
  const roleName = displayPartFromSlug(roleSlug);
  const employerName = displayPartFromSlug(employerSlug);
  const base = `${roleName}${separator}${candidate}${separator}${employerName}${suffix}`;
  if (base.length <= MAX_FILE_BASENAME) {
    return base;
  }

  const extra = base.length - MAX_FILE_BASENAME;
  const targetRoleLen = Math.max(16, roleSlug.length - Math.ceil(extra / 2));
  const targetEmployerLen = Math.max(16, employerSlug.length - Math.floor(extra / 2));
  const shortRole = cropDisplayPart(roleSlug, targetRoleLen);
  const shortEmployer = cropDisplayPart(employerSlug, targetEmployerLen);
  return `${shortRole}${separator}${candidate}${separator}${shortEmployer}${suffix}`;
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
  const updated = paragraphXml.replace(/<w:t(\b[^>]*)>[\s\S]*?<\/w:t>/g, (_match, attrs: string) => {
    if (!replaced) {
      replaced = true;
      const attrOut = /\bxml:space=/.test(attrs) ? attrs : `${attrs} xml:space="preserve"`;
      return `<w:t${attrOut}>${safeText}</w:t>`;
    }
    return `<w:t${attrs}></w:t>`;
  });

  if (!replaced) {
    return updated.replace(/<\/w:p>$/, `<w:r><w:t xml:space="preserve">${safeText}</w:t></w:r></w:p>`);
  }

  return updated;
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

interface ExperiencePlacementResult {
  placed: TailoredExperienceBullet[];
  unplaced: TailoredExperienceBullet[];
  rejectedEmployerPlacementCount: number;
}

function isBulletParagraph(text: string): boolean {
  return text.startsWith("â€¢") || text.startsWith("•") || /^[-*]\s+/.test(text);
}

function extractEmployerHeading(text: string): string {
  const match = text.match(/^([^|]{2,90})\s+\|\s+.+$/);
  if (!match) return "";
  const employer = match[1].trim();
  if (/^(summary|experience|education|portfolio|selected achievements)$/i.test(employer)) {
    return "";
  }
  return employer;
}

function replaceEmployerSafeBulletLines(
  paragraphs: string[],
  start: number,
  end: number,
  records: TailoredExperienceBullet[]
): ExperiencePlacementResult {
  if (start < 0 || end < start) {
    return {
      placed: [],
      unplaced: [...records],
      rejectedEmployerPlacementCount: records.length
    };
  }

  const remaining = [...records];
  const placed: TailoredExperienceBullet[] = [];
  let currentEmployer = "";

  for (let index = start; index <= end; index += 1) {
    const text = paragraphText(paragraphs[index]);
    const employer = extractEmployerHeading(text);
    if (employer) {
      currentEmployer = employer;
      continue;
    }
    if (!isBulletParagraph(text) || !currentEmployer) {
      continue;
    }

    const replacementIndex = remaining.findIndex((record) =>
      canPlaceExperienceBulletUnderEmployer(record, currentEmployer)
    );
    if (replacementIndex < 0) {
      continue;
    }

    const [record] = remaining.splice(replacementIndex, 1);
    placed.push(record);
    paragraphs[index] = setParagraphText(paragraphs[index], `â€¢ ${record.text}`);
  }

  return {
    placed,
    unplaced: remaining,
    rejectedEmployerPlacementCount: records.length - placed.length
  };
}

function joinParagraphs(templateXml: string, updatedParagraphs: string[]): string {
  let cursor = 0;
  return templateXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, () => {
    const value = updatedParagraphs[cursor] || "";
    cursor += 1;
    return value;
  });
}

function stripLegacyBulletPrefixesFromXml(input: string): string {
  return input
    .replace(/\u00c3\u00a2\u00e2\u201a\u00ac\u00c2\u00a2\s*/g, "")
    .replace(/\u00e2\u20ac\u00a2\s*/g, "")
    .replace(/\u2022\s*/g, "");
}

function stripEmptyTableRowsAndTables(input: string): string {
  return input.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, (tableXml) => {
    const cleanedTable = tableXml.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g, (rowXml) => {
      return paragraphText(rowXml) ? rowXml : "";
    });
    return paragraphText(cleanedTable) ? cleanedTable : "";
  });
}

function isBusinessAnalysisTemplateMatch(parsed: Pick<ParsedOpportunity, "roleTitle" | "cleanRoleTitle" | "company">, jdText: string): boolean {
  const title = `${parsed.roleTitle || ""} ${parsed.cleanRoleTitle || ""}`;
  if (/\b(senior\s+)?(technical\s+)?business\s+(systems?\s+)?analyst\b/i.test(title)) return true;
  if (/\b(functional|systems)\s+analyst\b/i.test(title)) return true;

  const jdSignals = [
    /\brequirements?\s+(gathering|analysis|documentation)\b/i,
    /\bbusiness\s+process\s+(mapping|analysis)\b/i,
    /\buser stor(?:y|ies)\b/i,
    /\bacceptance criteria\b/i,
    /\bbacklog\b/i,
    /\bproduct owner\b/i,
    /\bUAT\b/i,
    /\btraceability matrix\b/i,
    /\bJira\b/i,
    /\bConfluence\b/i
  ];
  return jdSignals.filter((pattern) => pattern.test(jdText)).length >= 4;
}

export function selectTailoringTemplatePath(args: TailoringTemplateSelectionArgs): string {
  if (
    args.businessAnalysisTemplatePath
    && fs.existsSync(args.businessAnalysisTemplatePath)
    && isBusinessAnalysisTemplateMatch(args.parsed, args.jdText)
  ) {
    return args.businessAnalysisTemplatePath;
  }
  return args.defaultTemplatePath;
}

/**
 * Build a role-focused professional resume and prevent visible process language.
 */
export async function tailorResumeForJD(args: TailorArgs): Promise<TailorResult> {
  const { parsed, jdText, templatePath, outputDir } = args;

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Resume template not found: ${templatePath}`);
  }
  if (!isApprovedOrangeTemplatePath(templatePath)) {
    throw new Error(`needs_review:resume_template_must_be_approved_orange:${path.basename(templatePath)}`);
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const rawRole = parsed.roleTitle?.trim() || "";
  const rawEmployer = parsed.company?.trim() || "";

  if (!rawRole || !rawEmployer) {
    throw new Error("needs_review:missing_role_or_company");
  }

  const newTitle = normalizeTitle(rawRole);
  const visibleTitle = sanitizeVisibleResumeText(newTitle);
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

  const summaryHeadingIdx = findHeadingIndex(paragraphs, /^(SUMMARY|PROFESSIONAL SUMMARY)$/i);
  const coreHeadingIdx = findHeadingIndex(paragraphs, /^(CORE STRENGTHS|CORE SKILLS|SKILLS)$/i);
  const experienceHeadingIdx = findHeadingIndex(paragraphs, /^(EXPERIENCE|PROFESSIONAL EXPERIENCE)$/i);
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
    return text.includes("|") && !/^\s*(?:whitby|toronto|oshawa|ajax|pickering|canada)\b/i.test(text);
  }) ?? -1;

  const titleLimit = subtitleIdx >= 0 ? subtitleIdx : nameIdx >= 0 ? nameIdx : summaryHeadingIdx;
  const titleIndexes = preambleIndexes.filter((index) => index < titleLimit).slice(0, 4);
  const titleLines = splitTitleToLines(visibleTitle, Math.max(1, titleIndexes.length || 1));
  if (titleIndexes.length === 0) {
    paragraphs[0] = setParagraphText(paragraphs[0], visibleTitle);
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

  /*
  replaceSectionLines(paragraphs, summaryStart, summaryEnd, tailored.summaryBullets.map((item) => `• ${item}`));
  replaceSectionLines(paragraphs, coreStart, coreEnd, tailored.coreStrengths.map((item) => `• ${item}`));
  replaceFirstBulletLines(paragraphs, experienceStart, experienceEnd, tailored.experienceBullets.map((item) => `• ${item}`));
  if (portfolioStart >= 0) {
    replaceSectionLines(paragraphs, portfolioStart, portfolioEnd, tailored.portfolioBullets.map((item) => `• ${item}`));
  }

  */
  const bulletPrefix = "\u00e2\u20ac\u00a2 ";
  replaceSectionLines(paragraphs, summaryStart, summaryEnd, tailored.summaryBullets.map((item) => `${bulletPrefix}${item}`));
  replaceSectionLines(paragraphs, coreStart, coreEnd, tailored.coreStrengths.map((item) => `${bulletPrefix}${item}`));
  const placement = replaceEmployerSafeBulletLines(paragraphs, experienceStart, experienceEnd, tailored.experienceBulletRecords);
  const fallbackSpan = portfolioStart >= 0 && portfolioEnd >= portfolioStart ? portfolioEnd - portfolioStart + 1 : 0;
  const fallbackRecords = placement.unplaced.slice(0, fallbackSpan);
  if (portfolioStart >= 0) {
    if (fallbackRecords.length > 0 && portfolioHeadingIdx >= 0) {
      paragraphs[portfolioHeadingIdx] = setParagraphText(paragraphs[portfolioHeadingIdx], "SELECTED ACHIEVEMENTS");
      replaceSectionLines(paragraphs, portfolioStart, portfolioEnd, fallbackRecords.map((item) => `${bulletPrefix}${item.text}`));
    } else {
      replaceSectionLines(paragraphs, portfolioStart, portfolioEnd, tailored.portfolioBullets.map((item) => `${bulletPrefix}${item}`));
    }
  }

  const updatedXml = stripEmptyTableRowsAndTables(stripLegacyBulletPrefixesFromXml(joinParagraphs(xml, paragraphs)));
  zip.file("word/document.xml", sanitizeVisibleDocXml(updatedXml));

  const visibleXmlEntries = Object.keys(zip.files).filter((fileName) =>
    /^word\/(?:header|footer)\d*\.xml$/i.test(fileName)
  );
  await Promise.all(visibleXmlEntries.map(async (fileName) => {
    const entry = zip.file(fileName);
    if (!entry) return;
    zip.file(fileName, sanitizeVisibleDocXml(await entry.async("string")));
  }));

  const outName = buildTailoredFileName(roleSlug, employerSlug);
  const outPath = path.join(outputDir, outName);
  const outBuffer = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(outPath, outBuffer);

  logger.info(
    { templatePath, outPath, newTitle, employerSlug },
    "Role-focused resume DOCX generated."
  );

  return {
    docxPath: outPath,
    roleSlug,
    employerSlug,
    newTitle,
    subtitle: tailored.subtitle,
    provenanceStats: {
      ...tailored.provenanceStats,
      placedEmployerBulletCount: placement.placed.length,
      rejectedEmployerPlacementCount: placement.rejectedEmployerPlacementCount,
      fallbackBulletCount: fallbackRecords.length
    },
    needsReview: false,
    needsReviewReasons: []
  };
}

function sanitizeVisibleDocXml(xml: string): string {
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    const text = paragraphText(paragraphXml);
    if (!text) return paragraphXml;
    const hasForbiddenText = FORBIDDEN_VISIBLE_RESUME_PHRASES.some((phrase) =>
      new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)
    );
    if (!hasForbiddenText && !/\bRQ\d+\b/i.test(text)) {
      return paragraphXml;
    }
    return setParagraphText(paragraphXml, sanitizeVisibleResumeText(text));
  });
}
