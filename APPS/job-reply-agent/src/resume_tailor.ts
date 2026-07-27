import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { logger } from "./logger";
import { loadUserInstance } from "./instance.js";
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
  candidateName?: string;
}

export interface TailoringTemplateSelectionArgs {
  parsed: Pick<ParsedOpportunity, "roleTitle" | "cleanRoleTitle" | "company">;
  jdText: string;
  defaultTemplatePath: string;
  businessAnalysisTemplatePath?: string;
  itManagementTemplatePath?: string;
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

function buildTailoredFileName(roleSlug: string, employerSlug: string, candidate: string): string {
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

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanVisibleRoleTitle(raw: string): string {
  let value = normalizeTitle(raw)
    .replace(/\b(?:urgent\s+)?opening\s+for\b/gi, "")
    .replace(/\burgent\s+opening\b/gi, "")
    .replace(/\bimmediate\s+opening\b/gi, "")
    .replace(/\brequirement\b/gi, "")
    .replace(/\breq(?:uisition)?\s*(?:id|#)?\s*[:#-]?\s*[A-Z0-9-]+\b/gi, "")
    .replace(/\b(?:job\s*)?(?:id|ref)\s*[:#-]\s*[A-Z0-9-]+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (value.includes("//")) {
    value = value.split(/\s*\/\/\s*/)[0] || value;
  }

  value = value
    .replace(/\s+-\s+Fejiro\b.*$/i, "")
    .replace(/\s+\b(?:Toronto|Scarborough|Mississauga|Brampton|Markham|Whitby|Oshawa|Ajax|Pickering|Ontario|ON|Canada|Remote|Hybrid|Onsite)\b.*$/i, "")
    .replace(/\s+\b(?:TCS|Infosys|HCL|Cognizant|Deloitte|Accenture)\b.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*-\s*BA\b/i, " - BA")
    .replace(/^[\s:,-]+|[\s:,-]+$/g, "")
    .trim();

  return value || normalizeTitle(raw);
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
  const open = paragraphXml.match(/^<w:p\b[^>]*>/)?.[0] || "<w:p>";
  const pPr = paragraphXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/)?.[0] || "";
  const firstTextRun = paragraphXml.match(/<w:r\b(?:(?!<w:drawing\b)[\s\S])*?<w:t\b[\s\S]*?<\/w:t>[\s\S]*?<\/w:r>/)?.[0] || "";
  const rPr = firstTextRun.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/)?.[0] || "";

  return `${open}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${safeText}</w:t></w:r></w:p>`;
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
  const cleanLines = lines.map((line) => cleanResumeLine(line)).filter(Boolean);
  for (let index = 0; index < span; index += 1) {
    const line = cleanLines[index] || "";
    paragraphs[start + index] = line ? setParagraphText(paragraphs[start + index], line) : "";
  }
}

function replaceFirstBulletLines(paragraphs: string[], start: number, end: number, lines: string[]): void {
  if (start < 0 || end < start) return;
  const cleanLines = lines.map((line) => cleanResumeLine(line)).filter(Boolean);
  const bulletIndexes: number[] = [];
  for (let index = start; index <= end; index += 1) {
    const text = paragraphText(paragraphs[index]);
    if (text.startsWith("•")) {
      bulletIndexes.push(index);
    }
  }
  for (let i = 0; i < bulletIndexes.length; i += 1) {
    const line = cleanLines[i] || "";
    paragraphs[bulletIndexes[i]] = line ? setParagraphText(paragraphs[bulletIndexes[i]], line) : "";
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
    paragraphs[index] = setParagraphText(paragraphs[index], record.text);
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

function cleanResumeLine(input: string): string {
  return input
    .replace(/\u00c3\u00a2\u00e2\u201a\u00ac\u00c2\u00a2\s*/g, "")
    .replace(/\u00e2\u20ac\u00a2\s*/g, "")
    .replace(/\u2022\s*/g, "")
    .replace(/^[-*]\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeVisibleResumePunctuation(input: string): string {
  return input
    .replace(/\.{2,}/g, ".")
    .replace(/\.([A-Z][a-z])/g, ". $1");
}

function normalizeVisibleTextNodes(input: string): string {
  const normalizedNodes = input.replace(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g, (_match, open, text, close) =>
    `${open}${normalizeVisibleResumePunctuation(text)}${close}`
  );
  return normalizedNodes.replace(
    /(\.<\/w:t>(?:(?!<w:t\b|<\/w:p>)[\s\S])*?<w:t\b[^>]*>)([A-Z][a-z])/g,
    "$1 $2"
  );
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

function stripEmptyListParagraphs(input: string): string {
  return input.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    if (paragraphText(paragraphXml)) return paragraphXml;
    const looksLikeListParagraph = /<w:numPr\b|<w:pStyle\b[^>]*w:val="[^"]*(?:List|Bullet)[^"]*"/i.test(paragraphXml);
    return looksLikeListParagraph ? "" : paragraphXml;
  });
}

function stripTrailingEmptyBodyParagraphs(input: string): string {
  let output = input;
  while (true) {
    const sectionStart = output.lastIndexOf("<w:sectPr");
    if (sectionStart < 0) return output;
    const paragraphEnd = output.lastIndexOf("</w:p>", sectionStart);
    if (paragraphEnd < 0 || output.slice(paragraphEnd + 6, sectionStart).trim()) return output;
    const paragraphStarts = [...output.slice(0, paragraphEnd).matchAll(/<w:p(?:\s|>)/g)];
    const paragraphStart = paragraphStarts.at(-1)?.index ?? -1;
    if (paragraphStart < 0) return output;

    const paragraphXml = output.slice(paragraphStart, paragraphEnd + 6);
    const hasVisibleContent =
      Boolean(paragraphText(paragraphXml)) ||
      /<w:(?:drawing|object|pict|tab|br|fldChar|instrText|footnoteReference|endnoteReference)\b/.test(paragraphXml);
    if (hasVisibleContent) return output;
    output = output.slice(0, paragraphStart) + output.slice(paragraphEnd + 6);
  }
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

function isItManagementTemplateMatch(parsed: Pick<ParsedOpportunity, "roleTitle" | "cleanRoleTitle" | "company">, jdText: string): boolean {
  const title = `${parsed.roleTitle || ""} ${parsed.cleanRoleTitle || ""}`;
  if (/\b(information\s+technology|it)\s+(lead|manager|operations\s+manager|business\s+systems\s+manager|systems\s+manager|support\s+manager)\b/i.test(title)) return true;
  if (/\b(it|technology)\s+business\s+(systems?\s+)?manager\b/i.test(title)) return true;
  if (/\b(manager|lead|director)\b.*\b(enterprise\s+applications?|business\s+systems?|retail\s+systems?|it\s+operations|technology\s+operations|service\s+delivery|digital\s+transformation)\b/i.test(title)) return true;
  if (/\b(enterprise\s+applications?|business\s+systems?|retail\s+systems?|it\s+operations|technology\s+operations|service\s+delivery|digital\s+transformation)\b.*\b(manager|lead|director)\b/i.test(title)) return true;

  const jdSignals = [
    /\bIT\s+(operations|leadership|support|service delivery)\b/i,
    /\benterprise\s+applications?\b/i,
    /\bbusiness\s+systems?\b/i,
    /\bretail\s+systems?\b/i,
    /\bERP\b/i,
    /\bPOS\b/i,
    /\bWMS\b/i,
    /\bvendor\s+(coordination|management|oversight)\b/i,
    /\brelease\s+(readiness|management|coordination)\b/i,
    /\bincident\s+(escalation|management|response)\b/i,
    /\bstakeholder\s+(management|communication|alignment)\b/i,
    /\bteam\s+(leadership|management|coordination)\b/i
  ];
  return /\b(manager|lead|director)\b/i.test(title) && jdSignals.filter((pattern) => pattern.test(jdText)).length >= 3;
}

export function selectTailoringTemplatePath(args: TailoringTemplateSelectionArgs): string {
  if (
    args.businessAnalysisTemplatePath
    && fs.existsSync(args.businessAnalysisTemplatePath)
    && isBusinessAnalysisTemplateMatch(args.parsed, args.jdText)
  ) {
    return args.businessAnalysisTemplatePath;
  }
  if (
    args.itManagementTemplatePath
    && fs.existsSync(args.itManagementTemplatePath)
    && isItManagementTemplateMatch(args.parsed, args.jdText)
  ) {
    return args.itManagementTemplatePath;
  }
  return args.defaultTemplatePath;
}

/**
 * Build a role-focused professional resume and prevent visible process language.
 */
export async function tailorResumeForJD(args: TailorArgs): Promise<TailorResult> {
  const { parsed, jdText, templatePath, outputDir } = args;
  const candidateName = args.candidateName || loadUserInstance().candidateName;

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

  const newTitle = cleanVisibleRoleTitle(rawRole);
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
  const candidatePattern = new RegExp(candidateName.trim().split(/\s+/).map(escapeRegex).join("\\s+"), "i");
  const nameIdx = preambleIndexes.find((index) => candidatePattern.test(paragraphText(paragraphs[index]))) ?? -1;
  const isContactLine = (text: string): boolean =>
    /(?:@|linkedin\.com|github\.com|\b\d{3}[.\-\s]\d{3}[.\-\s]\d{4}\b|\bwhitby\b|\btoronto\b|\boshawa\b|\bajax\b|\bpickering\b|\bcanada\b)/i.test(text);
  const subtitleCandidates = preambleIndexes.filter((index) => {
    const text = paragraphText(paragraphs[index]);
    return index > nameIdx && text.includes("|") && !isContactLine(text);
  });
  const subtitleIdx = subtitleCandidates.length > 0 ? subtitleCandidates[subtitleCandidates.length - 1] : -1;

  const titleLimit = nameIdx >= 0 ? nameIdx : (subtitleIdx >= 0 ? subtitleIdx : summaryHeadingIdx);
  const titleIndexes = preambleIndexes
    .filter((index) => {
      const text = paragraphText(paragraphs[index]);
      return index < titleLimit && !isContactLine(text);
    })
    .slice(0, 4);
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
  replaceSectionLines(paragraphs, summaryStart, summaryEnd, tailored.summaryBullets);
  replaceSectionLines(paragraphs, coreStart, coreEnd, tailored.coreStrengths);
  const placement = replaceEmployerSafeBulletLines(paragraphs, experienceStart, experienceEnd, tailored.experienceBulletRecords);
  const fallbackSpan = portfolioStart >= 0 && portfolioEnd >= portfolioStart ? portfolioEnd - portfolioStart + 1 : 0;
  const fallbackRecords = placement.unplaced.slice(0, fallbackSpan);
  if (portfolioStart >= 0) {
    if (fallbackRecords.length > 0 && portfolioHeadingIdx >= 0) {
      paragraphs[portfolioHeadingIdx] = setParagraphText(paragraphs[portfolioHeadingIdx], "SELECTED ACHIEVEMENTS");
      replaceSectionLines(paragraphs, portfolioStart, portfolioEnd, fallbackRecords.map((item) => item.text));
    } else {
      replaceSectionLines(paragraphs, portfolioStart, portfolioEnd, tailored.portfolioBullets);
    }
  }

  const updatedXml = stripTrailingEmptyBodyParagraphs(
    stripEmptyTableRowsAndTables(
      stripEmptyListParagraphs(stripLegacyBulletPrefixesFromXml(joinParagraphs(xml, paragraphs)))
    )
  );
  zip.file("word/document.xml", sanitizeVisibleDocXml(updatedXml));

  const visibleXmlEntries = Object.keys(zip.files).filter((fileName) =>
    /^word\/(?:header|footer)\d*\.xml$/i.test(fileName)
  );
  await Promise.all(visibleXmlEntries.map(async (fileName) => {
    const entry = zip.file(fileName);
    if (!entry) return;
    zip.file(fileName, sanitizeVisibleDocXml(await entry.async("string")));
  }));

  const outName = buildTailoredFileName(roleSlug, employerSlug, candidateName);
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
  return normalizeVisibleTextNodes(xml).replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraphXml) => {
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
