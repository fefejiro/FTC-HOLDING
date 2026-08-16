import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
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
    .replace(/Äâ‚¬â€œ|Ã¢â‚¬â€œ/g, "-")
    .replace(/Äâ‚¬â„¢|Ã¢â‚¬â„¢/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMonsterUrl(href: string): string {
  const trimmed = clean(href);
  if (!trimmed) return "";
  const withHost = trimmed.startsWith("http")
    ? trimmed
    : `https://www.monster.com${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
  return withHost.split("#")[0].split("?")[0];
}

function isMonsterJobUrl(href: string): boolean {
  const url = normalizeMonsterUrl(href);
  if (!url) return false;
  return /monster\.(?:com|ca)\/(?:job-openings|job|jobs\/search\/jobdetails)/i.test(url);
}

function cleanTitle(text: string): string {
  return clean(text)
    .replace(/\b(?:quick apply|apply now|easily apply|new|posted today|posted \d+ days? ago)\b/gi, " ")
    .replace(/\s+-\s+monster job.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPlausibleTitle(title: string): boolean {
  if (title.length < 6 || title.length > 160) return false;
  if (/^(jobs|job search|profile|saved jobs|applied jobs|salary|career advice|sign in|post a job|privacy|terms|help)$/i.test(title)) {
    return false;
  }
  return /\b(manager|program|project|product|business|systems?|analyst|architect|implementation|delivery|operations|erp|sap|servicenow|pmo|qa|wms|pos|transformation|consultant|specialist|director|lead|owner)\b/i.test(title);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractLocation(text: string): string {
  return clean(
    text.match(/\b(?:Remote(?: in [A-Za-z .,'-]+)?|Hybrid work in [A-Za-z .,'-]+|(?:Toronto|Mississauga|Markham|Etobicoke|Concord|North York|Oakville|Brampton|Ottawa|Waterloo|Vaughan|Scarborough|Richmond Hill|Vancouver|Calgary|Montreal|Winnipeg|Edmonton),\s*(?:ON|Ontario|Canada|QC|BC|AB|MB|SK|NS|NB)(?:\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d)?)\b/i)?.[0] || ""
  );
}

function extractSalary(text: string): string {
  return clean(text.match(/\$[\d,]+(?:\s*[-â€“]\s*\$?[\d,]+)?(?:\s*(?:a|per)\s*(?:year|hour|month)|\s*\/\s*(?:year|hour|month))?/i)?.[0] || "");
}

function extractPosted(text: string): string {
  return clean(
    text.match(/\bPosted\s+[^.]*?(?:ago|today|yesterday)\b/i)?.[0] ||
    text.match(/\b(?:today|yesterday)\b|\d+\+?\s*d\s*ago|\d+\+?\s*days?\s*ago|\d+\+?\s*w\s*ago|\d+\+?\s*weeks?\s*ago/i)?.[0] ||
    ""
  );
}

function bestCardForTitle(cards: DomDump["cards"], title: string, href: string): string {
  const normalizedHref = normalizeMonsterUrl(href).split("?")[0];
  const candidates = (cards || [])
    .map((card) => ({ text: clean(card.text), href: normalizeMonsterUrl(card.href || "") }))
    .filter((card) => card.text.toLowerCase().includes(title.toLowerCase()))
    .filter((card) => !card.href || card.href.split("?")[0] === normalizedHref);

  if (!candidates.length) return "";
  candidates.sort((a, b) => a.text.length - b.text.length);
  return candidates[0].text;
}

function isNoisyCompany(value: string): boolean {
  return !value
    || value.length > 90
    || /^(new|quick apply|apply now|remote|hybrid|full-time|permanent|contract|temporary|part-time|posted|active|view job|monster)$/i.test(value)
    || /^\$/.test(value)
    || /\b[A-Z][A-Za-z .'-]+,\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|IL|IN|MA|MD|MI|MN|NC|NJ|NY|OH|PA|RI|TN|TX|VA|WA)\b/i.test(value)
    || /\b(?:job description|quick apply|apply now|terms|privacy)\b/i.test(value);
}

function stripCompanySuffix(value: string): string {
  return clean(value)
    .replace(/\b\d+\+?\s*(?:d|day|days|w|week|weeks|hour|hours)\s*ago.*$/i, "")
    .replace(/\b[A-Z][A-Za-z .'-]+,\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|IL|IN|MA|MD|MI|MN|NC|NJ|NY|OH|PA|RI|TN|TX|VA|WA)\b.*$/i, "")
    .replace(/\b(?:Remote|Hybrid|Onsite)\b\s*$/i, "")
    .trim();
}

function companyFromCardText(text: string, title: string): string {
  let afterTitle = clean(text).replace(new RegExp(`^${escapeRegex(title)}(?:\\s+|$)`, "i"), "").trim();
  afterTitle = afterTitle.replace(/^(?:quick apply|apply now|new)\b\s*/i, "").trim();
  const markers = [
    extractLocation(afterTitle),
    extractSalary(afterTitle),
    extractPosted(afterTitle),
    "Quick Apply",
    "Apply Now",
    "Full Time",
    "Full-time",
    "Contract"
  ]
    .filter(Boolean)
    .map((marker) => afterTitle.toLowerCase().indexOf(marker.toLowerCase()))
    .filter((index) => index > 0)
    .sort((a, b) => a - b);

  const company = stripCompanySuffix(afterTitle.slice(0, markers.length ? markers[0] : undefined));
  if (company && title.toLowerCase().includes(company.toLowerCase())) return "Unknown";
  return isNoisyCompany(company) ? "Unknown" : company;
}

export function extractVisibleMonsterJobs(dump: DomDump): ScrapedJob[] {
  const byUrl = new Map<string, ScrapedJob>();
  const links = dump.links || [];
  const cards = dump.cards || [];
  const capturedAt = new Date().toISOString();
  const jobLinks = links
    .map((link) => ({ text: clean(link.text), href: normalizeMonsterUrl(link.href || "") }))
    .filter((link) => isMonsterJobUrl(link.href));

  for (const link of jobLinks) {
    const href = normalizeMonsterUrl(link.href);
    const title = cleanTitle(link.text || "");
    if (!href || byUrl.has(href) || !isPlausibleTitle(title)) continue;

    const cardText = bestCardForTitle(cards, title, href) || title;
    const company = companyFromCardText(cardText, title);
    const location = extractLocation(cardText);
    const salary = extractSalary(cardText);
    const posted = extractPosted(cardText);
    const quickApply = /\bquick apply\b|\beasy apply\b/i.test(cardText);
    const evidence = [
      `[Monster visible evidence] posted="${posted || "unknown"}"; quick_apply=${quickApply ? "yes" : "unknown"}; scraped_at=${capturedAt}; source_page="${clean(dump.title)}"; source_url="${clean(dump.url)}"`,
      cardText
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

function main(): void {
  const fileArg = process.argv.find((arg) => arg.startsWith("--file="))?.slice("--file=".length) || process.argv[2];
  if (!fileArg) {
    throw new Error("Usage: tsx scripts/ingest-visible-monster.ts --file=.local/visible-monster/foo.json");
  }

  const fullPath = path.resolve(fileArg);
  const dump = JSON.parse(fs.readFileSync(fullPath, "utf8")) as DomDump;
  const jobs = extractVisibleMonsterJobs(dump);
  const db = getDb();
  const ingested = ingestScrapedJobs(db, jobs, "monster");

  console.log(JSON.stringify({ file: fullPath, extracted: jobs.length, ingested, jobs: jobs.slice(0, 10) }, null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
