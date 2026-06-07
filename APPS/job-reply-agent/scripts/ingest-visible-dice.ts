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

function normalizeDiceUrl(href: string): string {
  const trimmed = clean(href);
  if (!trimmed) return "";
  if (trimmed.startsWith("http")) return trimmed.split("?")[0];
  return `https://www.dice.com${trimmed.startsWith("/") ? "" : "/"}${trimmed}`.split("?")[0];
}

function isDiceJobUrl(href: string): boolean {
  const url = normalizeDiceUrl(href);
  return /dice\.com\/job-detail\/[a-z0-9-]+/i.test(url);
}

function cleanTitle(text: string): string {
  return clean(text)
    .replace(/\b(?:easy apply|apply now|posted today|posted \d+ days? ago|new)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPlausibleTitle(title: string): boolean {
  if (title.length < 6 || title.length > 160) return false;
  if (/^(jobs|job search|profile|salary|post a job|career advice|notifications|messages|saved jobs|applied jobs)$/i.test(title)) return false;
  return /\b(manager|program|project|product|business|systems?|analyst|architect|implementation|delivery|operations|erp|sap|servicenow|pmo|qa|wms|pos|transformation|consultant|specialist|director|lead)\b/i.test(title);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bestCardForTitle(cards: DomDump["cards"], title: string, href: string): string {
  const normalizedHref = normalizeDiceUrl(href);
  const candidates = (cards || [])
    .map((card) => ({ text: clean(card.text), href: normalizeDiceUrl(card.href || "") }))
    .filter((card) => card.text.toLowerCase().includes(title.toLowerCase()))
    .filter((card) => !card.href || card.href === normalizedHref);

  if (!candidates.length) return "";
  candidates.sort((a, b) => a.text.length - b.text.length);
  return candidates[0].text;
}

function extractLocation(text: string): string {
  return clean(
    text.match(/\b(?:Remote|Hybrid|Onsite|United States|Canada|Toronto,\s*ON|Mississauga,\s*ON|Ottawa,\s*ON|Vancouver,\s*BC|Calgary,\s*AB|Montreal,\s*QC|[A-Z][A-Za-z .'-]+,\s*(?:ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU|CA|TX|NY|NJ|FL|IL|OH|MI|WA|GA|VA|MD|MA|PA|NC|SC|CO|AZ))\b/i)?.[0] || ""
  );
}

function extractSalary(text: string): string {
  return clean(text.match(/\$[\d,]+(?:\s*[-–]\s*\$?[\d,]+)?(?:\s*(?:a|per)\s*(?:year|hour|month)|\s*\/\s*(?:year|hour|month))?/i)?.[0] || "");
}

function extractMatchScore(text: string): number | null {
  const raw =
    text.match(/(?:Dice\s+Job\s+Match\s+Score|match\s+score|fitment)[^0-9]*(\d{1,3})%/i)?.[1] ||
    text.match(/\b(\d{1,3})%\s*(?:MEETS|match|fitment)/i)?.[1] ||
    "";
  if (!raw) return null;
  const score = Number(raw);
  return Number.isFinite(score) ? score : null;
}

function extractPosted(text: string): string {
  return clean(
    text.match(/\bPosted\s+[^.]*?(?:ago|today|yesterday)\b/i)?.[0] ||
    text.match(/(?:^|[\s•])(?:today|yesterday|\d+\s*d\s*ago|\d+\s*days?\s*ago|\d+\s*w\s*ago|\d+\s*weeks?\s*ago|\d+\s*months?\s*ago)\b/i)?.[0] ||
    ""
  );
}

function extractUpdated(text: string): string {
  return clean(text.match(/\bUpdated\s+[^.]*?(?:ago|today|yesterday)\b/i)?.[0] || "");
}

function companyFromCardText(text: string, title: string): string {
  let afterTitle = clean(text).replace(new RegExp(`^${escapeRegex(title)}\\b`, "i"), "").trim();
  afterTitle = afterTitle.replace(/^(?:easy apply|apply now|new)\b\s*/i, "").trim();
  const markers = [
    extractLocation(afterTitle),
    extractSalary(afterTitle),
    "Dice Job Match Score",
    "Posted",
    "Updated",
    "Easy Apply",
    "Apply Now"
  ]
    .filter(Boolean)
    .map((marker) => afterTitle.toLowerCase().indexOf(marker.toLowerCase()))
    .filter((index) => index > 0)
    .sort((a, b) => a - b);
  const company = clean(afterTitle.slice(0, markers.length ? markers[0] : undefined));
  if (!company || company.length > 90 || /^(remote|hybrid|onsite|easy apply|apply now)$/i.test(company)) return "Unknown";
  return company;
}

export function extractVisibleDiceJobs(dump: DomDump): ScrapedJob[] {
  const byUrl = new Map<string, ScrapedJob>();
  const links = dump.links || [];
  const cards = dump.cards || [];
  const capturedAt = new Date().toISOString();

  const jobLinks = links
    .map((link) => ({ text: clean(link.text), href: normalizeDiceUrl(link.href || "") }))
    .filter((link) => isDiceJobUrl(link.href));

  for (const link of jobLinks) {
    const href = normalizeDiceUrl(link.href);
    const title = cleanTitle(link.text || "");
    if (!href || byUrl.has(href) || !isPlausibleTitle(title)) continue;

    const cardText = bestCardForTitle(cards, title, href) || title;
    const company = companyFromCardText(cardText, title);
    const location = extractLocation(cardText);
    const salary = extractSalary(cardText);
    const matchScore = extractMatchScore(cardText);
    const posted = extractPosted(cardText);
    const updated = extractUpdated(cardText);
    const applyButton = /easy apply/i.test(cardText) ? "easy_apply_visible" : /apply now/i.test(cardText) ? "apply_now_visible" : "unknown";
    const evidence = [
      `[Dice evidence] match_score=${matchScore ?? "unknown"}; posted="${posted || "unknown"}"; updated="${updated || "unknown"}"; apply_button=${applyButton}; scraped_at=${capturedAt}; source_page="${clean(dump.title)}"; source_url="${clean(dump.url)}"`,
      cardText
    ].join("\n");

    byUrl.set(href, {
      title,
      company,
      location,
      apply_url: href,
      source_url: href,
      salary_or_rate: salary,
      description: evidence.slice(0, 1400),
      dice_match_score: matchScore,
      dice_posted_text: posted,
      dice_updated_text: updated,
      dice_apply_button_status: applyButton
    });
  }

  return [...byUrl.values()].slice(0, 25);
}

function main(): void {
  const fileArg = process.argv.find((arg) => arg.startsWith("--file="))?.slice("--file=".length) || process.argv[2];
  if (!fileArg) {
    throw new Error("Usage: tsx scripts/ingest-visible-dice.ts --file=.local/visible-dice/foo.json");
  }

  const fullPath = path.resolve(fileArg);
  const dump = JSON.parse(fs.readFileSync(fullPath, "utf8")) as DomDump;
  const jobs = extractVisibleDiceJobs(dump);
  const db = getDb();
  const ingested = ingestScrapedJobs(db, jobs, "dice");

  console.log(JSON.stringify({ file: fullPath, extracted: jobs.length, ingested, jobs: jobs.slice(0, 10) }, null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
