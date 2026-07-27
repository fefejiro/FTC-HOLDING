import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/db.js";
import { ingestScrapedJobs, type ScrapedJob } from "../src/hunt/scraper.js";

type DomDump = {
  url?: string;
  title?: string;
  text?: string;
  links?: Array<{ text?: string; href?: string }>;
  cards?: Array<{ text?: string; href?: string }>;
};

function clean(value: unknown): string {
  return String(value || "")
    .replace(/ā€“|â€“/g, "-")
    .replace(/ā€™|â€™/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIndeedUrl(href: string): string {
  const trimmed = clean(href);
  if (!trimmed) return "";
  if (trimmed.startsWith("http")) return trimmed;
  return `https://ca.indeed.com${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

function isIndeedJobUrl(href: string): boolean {
  const url = normalizeIndeedUrl(href);
  if (!url) return false;
  if (/(?:123456789abcdef0|fedcba9876543210|cdef0123456789ab|a1b2c3d4e5f67890|f1e2d3c4b5a67890)/i.test(url)) return false;
  return /indeed\.com\/(?:rc\/clk|pagead|viewjob)|indeed\.com\/.*[?&]jk=/i.test(url);
}

function cleanTitle(text: string): string {
  return clean(text)
    .replace(/\b(?:new|easily apply|urgently hiring)\b/gi, " ")
    .replace(/\s+-\s+job post.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPlausibleTitle(title: string): boolean {
  if (title.length < 6 || title.length > 130) return false;
  if (/^(skip to|jobs|company reviews|find salaries|upload|sign in|post job|employers|privacy|terms|help|next|previous|page \d+)$/i.test(title)) {
    return false;
  }
  if (/search|feedback|welcome to indeed|let employers find you|create your profile/i.test(title)) return false;
  return /\b(manager|program|project|product|business|systems?|analyst|architect|implementation|delivery|operations|erp|sap|servicenow|pmo|qa|wms|pos|transformation|consultant|specialist|director)\b/i.test(title);
}

function isNoisyCompany(value: string): boolean {
  return !value
    || value.length > 90
    || /^(new|easily apply|remote|hybrid|full-time|permanent|contract|temporary|part-time|posted|active|employer|responded|hiring|view job)$/i.test(value)
    || /^\$/.test(value)
    || /^(terms|privacy|feedback)$/i.test(value)
    || /\b(?:easily apply|often replies|job description|select an option)\b/i.test(value)
    || /\b(?:toronto|ontario|canada|remote|hybrid work|mississauga|markham|north york|etobicoke|concord|oakville|brampton|ottawa|waterloo|vancouver|calgary|montreal)\b/i.test(value);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bestCardForTitle(cards: DomDump["cards"], title: string, href: string): string {
  const normalizedHref = normalizeIndeedUrl(href).split("&")[0];
  const allCandidates = (cards || [])
    .map((card) => ({ text: clean(card.text), href: normalizeIndeedUrl(card.href || "") }))
    .filter((card) => card.text && card.text.toLowerCase().includes(title.toLowerCase()))
    .filter((card) => !card.href || card.href.split("&")[0] === normalizedHref || card.href.includes("/cmp/"));

  const exact = allCandidates.filter((card) => card.href.split("&")[0] === normalizedHref);
  const candidates = exact.length ? exact : allCandidates;
  if (!candidates.length) return "";
  candidates.sort((a, b) => a.text.length - b.text.length);
  return candidates[0].text;
}

function companyFromFollowingLinks(links: DomDump["links"], jobIndex: number): string {
  for (let index = jobIndex + 1; index < Math.min((links || []).length, jobIndex + 6); index += 1) {
    const link = (links || [])[index];
    const text = clean(link?.text);
    const href = clean(link?.href);
    if (!text) continue;
    if (isIndeedJobUrl(href)) break;
    if (/\/cmp\//i.test(href) && !isNoisyCompany(text)) return text;
    if (!isNoisyCompany(text) && !isPlausibleTitle(text)) return text;
  }
  return "";
}

function stripLeadingJobNoise(value: string, title: string): string {
  let stripped = clean(value)
    .replace(new RegExp(`^${escapeRegex(title)}\\b`, "i"), "")
    .replace(/^\s*-\s*job\s*post\s*/i, "")
    .trim();

  for (let count = 0; count < 5; count += 1) {
    const next = stripped
      .replace(/^(?:new|easily apply|urgently hiring|active|often replies in \d+ days?|employer active \d+ days? ago|posted today|posted \d+ days? ago)\b\s*/i, "")
      .trim();
    if (next === stripped) break;
    stripped = next;
  }

  return stripped;
}

function extractLocation(text: string): string {
  return clean(
    text.match(/\b(?:Remote(?: in [A-Za-z .,'-]+)?|Hybrid work in [A-Za-z .,'-]+|(?:Toronto|Mississauga|Markham|Etobicoke|Concord|North York|Oakville|Brampton|Ottawa|Waterloo|Vaughan|Scarborough|Richmond Hill|Vancouver|Calgary|Montreal),\s*(?:ON|Ontario|Canada|QC|BC|AB|MB|SK|NS|NB)(?:\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d)?)\b/i)?.[0] || ""
  );
}

function extractSalary(text: string): string {
  return clean(text.match(/\$[\d,]+(?:\s*[-–]\s*\$?[\d,]+)?(?:\s*(?:a|per)\s*(?:year|hour|month)|\s*\/\s*(?:year|hour|month))?/i)?.[0] || "");
}

function extractEmployment(text: string): string {
  return clean(text.match(/\b(?:Full-time|Part-time|Contract|Temporary|Permanent|Fixed term|Internship)(?:\s*\+\s*\d+)?\b/i)?.[0] || "");
}

function companyFromCardText(text: string, title: string, fallback = ""): string {
  const afterTitle = stripLeadingJobNoise(text, title);
  const markers = [extractLocation(afterTitle), extractSalary(afterTitle), extractEmployment(afterTitle)]
    .filter(Boolean)
    .map((marker) => afterTitle.toLowerCase().indexOf(marker.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);

  const company = clean(afterTitle.slice(0, markers.length ? markers[0] : undefined));
  if (!isNoisyCompany(company)) return company;
  return !isNoisyCompany(fallback) ? fallback : "Unknown";
}

function extractJobs(dump: DomDump): ScrapedJob[] {
  const byUrl = new Map<string, ScrapedJob>();
  const cards = dump.cards || [];
  const links = dump.links || [];
  const capturedAt = new Date().toISOString();
  const jobLinks = links
    .map((link, index) => ({ ...link, index }))
    .filter((link) => isIndeedJobUrl(link.href || ""));

  for (const link of jobLinks) {
    const href = normalizeIndeedUrl(link.href || "");
    const title = cleanTitle(link.text || "");
    if (!href || byUrl.has(href) || !isPlausibleTitle(title)) continue;

    const cardText = bestCardForTitle(cards, title, href);
    const fallbackCompany = companyFromFollowingLinks(links, link.index);
    const company = companyFromCardText(cardText || title, title, fallbackCompany);
    const location = extractLocation(cardText);
    const salary = extractSalary(cardText);
    const employment = extractEmployment(cardText);
    const easyApply = /\beasily apply\b/i.test(cardText);
    const evidence = [
      `[Indeed visible evidence] title="${title}"; company="${company}"; location="${location || "unknown"}"; salary="${salary || "unknown"}"; employment="${employment || "unknown"}"; easy_apply=${easyApply ? "yes" : "unknown"}; scraped_at=${capturedAt}; source_page="${clean(dump.title)}"; source_url="${clean(dump.url)}"`,
      cardText || title
    ].join("\n");

    byUrl.set(href, {
      title,
      company,
      location,
      apply_url: href,
      source_url: href,
      salary_or_rate: salary,
      description: evidence.slice(0, 1400)
    });
  }

  return [...byUrl.values()].slice(0, 25);
}

const fileArg = process.argv.find((arg) => arg.startsWith("--file="))?.slice("--file=".length) || process.argv[2];
if (!fileArg) {
  throw new Error("Usage: tsx scripts/ingest-visible-indeed.ts --file=.local/visible-indeed/foo.json");
}

const fullPath = path.resolve(fileArg);
const dump = JSON.parse(fs.readFileSync(fullPath, "utf8")) as DomDump;
const jobs = extractJobs(dump);
const db = getDb();
const ingested = ingestScrapedJobs(db, jobs, "indeed");

console.log(JSON.stringify({ file: fullPath, extracted: jobs.length, ingested, jobs: jobs.slice(0, 10) }, null, 2));
