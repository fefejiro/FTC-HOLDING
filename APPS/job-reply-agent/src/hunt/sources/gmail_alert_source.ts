import type { SourceAdapter } from "./base_source.js";
import type { RawJob } from "../types.js";
import type { HuntConfig } from "../config_loader.js";

/**
 * Gmail-alert source. Parses LinkedIn / Indeed / Glassdoor / Otta / Wellfound
 * job-alert digest emails into RawJob[].
 *
 * Reuses the existing Gmail OAuth wiring from src/gmail.ts. To keep this
 * adapter testable, the email-fetch step is injected via `fetchEmails`. The
 * default loader pulls from the inbox label configured by env
 * `GMAIL_ALERTS_LABEL` (defaults to "Job Alerts").
 */

export interface GmailAlertEmail {
  /** Provider message id (used as part of source_id) */
  messageId: string;
  /** Email subject */
  subject: string;
  /** Sender, e.g. "jobalerts-noreply@linkedin.com" */
  from: string;
  /** Plain-text body */
  body: string;
  /** ISO timestamp */
  receivedAt: string;
}

export interface ParsedAlertJob {
  title: string;
  company: string;
  location: string | null;
  url: string;
}

const LINKEDIN_FROM_RE = /linkedin\.com/i;
const INDEED_FROM_RE = /indeed\.com/i;
const GLASSDOOR_FROM_RE = /glassdoor\.com/i;
const WELLFOUND_FROM_RE = /wellfound\.com|angel\.co/i;

function detectProvider(from: string): "linkedin" | "indeed" | "glassdoor" | "wellfound" | "generic" {
  if (LINKEDIN_FROM_RE.test(from)) return "linkedin";
  if (INDEED_FROM_RE.test(from)) return "indeed";
  if (GLASSDOOR_FROM_RE.test(from)) return "glassdoor";
  if (WELLFOUND_FROM_RE.test(from)) return "wellfound";
  return "generic";
}

/**
 * Generic alert parser. Looks for blocks of the form:
 *   {Title}
 *   {Company} · {Location}
 *   {URL}
 * Tolerant of LinkedIn / Indeed digest variants. Returns one job per URL.
 */
export function parseAlertBody(body: string): ParsedAlertJob[] {
  if (!body) return [];

  // Pull every URL that looks like a job link; we use it as the anchor.
  const urlRe = /(https?:\/\/[^\s<>"'\)]+)/g;
  const lines = body
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const jobs: ParsedAlertJob[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const urlMatches = line.match(urlRe);
    if (!urlMatches) continue;
    for (const url of urlMatches) {
      if (!isLikelyJobUrl(url)) continue;
      const canonical = canonicalizeUrl(url);
      if (seen.has(canonical)) continue;
      seen.add(canonical);

      // walk back up to 4 lines for title + "Company · Location"
      const context = lines.slice(Math.max(0, i - 4), i);
      const { title, company, location } = extractTitleCompanyLocation(context);
      if (!title || !company) continue;
      jobs.push({ title, company, location, url: canonical });
    }
  }

  return jobs;
}

function isLikelyJobUrl(url: string): boolean {
  return /linkedin\.com\/jobs|linkedin\.com\/comm\/jobs|indeed\.com\/(viewjob|rc\/clk|job)|glassdoor\.com\/job|wellfound\.com\/jobs|angel\.co\/company/i.test(
    url
  );
}

function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Drop tracking query params
    const cleanParams = new URLSearchParams();
    for (const [k, v] of u.searchParams.entries()) {
      if (/^(utm_|trk|trackingId|refId|src|gclid|fbclid)/i.test(k)) continue;
      cleanParams.set(k, v);
    }
    u.search = cleanParams.toString();
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

function extractTitleCompanyLocation(context: string[]): {
  title: string | null;
  company: string | null;
  location: string | null;
} {
  // Strategy: walk context bottom-up. Last non-empty line before the URL is
  // typically "Company · Location" or "Company - Location". The line above
  // that is the role title.
  const cleaned = context.filter((l) => l && !/^https?:\/\//.test(l));
  if (cleaned.length === 0) return { title: null, company: null, location: null };

  const lastLine = cleaned[cleaned.length - 1] ?? "";
  const companyLocation = splitCompanyLocation(lastLine);

  const titleLine = cleaned.length >= 2 ? cleaned[cleaned.length - 2] : null;

  if (companyLocation && titleLine) {
    return {
      title: titleLine.trim(),
      company: companyLocation.company,
      location: companyLocation.location
    };
  }

  // Fallback: single-line "Title at Company in Location"
  const m = lastLine.match(/^(.+?)\s+at\s+(.+?)(?:\s+in\s+(.+))?$/i);
  if (m && m[1] && m[2]) {
    return {
      title: m[1].trim(),
      company: m[2].trim(),
      location: m[3]?.trim() ?? null
    };
  }

  return { title: null, company: null, location: null };
}

function splitCompanyLocation(line: string): { company: string; location: string | null } | null {
  // Split on middle-dot, en-dash, em-dash, or " - "
  const parts = line.split(/\s*[·•–—-]\s*/);
  if (parts.length >= 2) {
    const company = (parts[0] ?? "").trim();
    const location = parts.slice(1).join(" - ").trim() || null;
    if (company.length > 0 && company.length < 100) {
      return { company, location };
    }
  }
  return null;
}

function detectRemote(location: string | null): boolean | null {
  if (!location) return null;
  return /remote|anywhere|work from home/i.test(location);
}

export interface GmailAlertSourceOptions {
  /** Async loader that returns alert emails to parse. Allows tests to inject a fixture. */
  fetchEmails?: () => Promise<GmailAlertEmail[]>;
}

export function createGmailAlertSource(options: GmailAlertSourceOptions = {}): SourceAdapter {
  const fetchEmails = options.fetchEmails ?? defaultEmailLoader;
  return {
    source: "gmail_alert",
    name: "Gmail job alerts",
    isEnabled(_config: HuntConfig): boolean {
      // Enabled iff caller injected a loader OR Gmail OAuth env is present.
      if (options.fetchEmails) return true;
      return Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET);
    },
    async fetch(_config: HuntConfig): Promise<RawJob[]> {
      const emails = await fetchEmails();
      const out: RawJob[] = [];
      for (const email of emails) {
        const provider = detectProvider(email.from);
        const parsed = parseAlertBody(email.body);
        for (const job of parsed) {
          out.push({
            source: "gmail_alert",
            source_id: `${provider}:${hash(job.url)}`,
            url: job.url,
            company: job.company,
            title: job.title,
            location: job.location,
            remote: detectRemote(job.location),
            description: null,
            compensation: null,
            posted_at: email.receivedAt
          });
        }
      }
      return out;
    }
  };
}

/** Simple non-cryptographic hash for stable source_id without bringing crypto deps. */
function hash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * Default email loader. Returns [] unless Gmail OAuth is wired; the
 * production loader lives behind the same auth path as the existing inbox
 * scanner. Kept as a no-op fallback until Phase 2.5 wires the live label
 * pull. The scout command will log when this returns 0 so it's obvious.
 */
async function defaultEmailLoader(): Promise<GmailAlertEmail[]> {
  return [];
}

/** Convenience export for the static (default) adapter. */
export const gmailAlertSource = createGmailAlertSource();
