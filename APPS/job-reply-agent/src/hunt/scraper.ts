import { chromium, Browser, BrowserContext, Page } from "playwright";
import type Database from "better-sqlite3";
import { logger } from "../logger.js";
import { insertHuntJob, normalizeSourceJob } from "../hunt.js";
import type { NormalizedHuntJob } from "../hunt.js";
import { resolveProjectPath } from "../db.js";
import fs from "node:fs";

export interface ScrapedJob {
  title: string;
  company: string;
  location?: string;
  description?: string;
  apply_url: string;
  source_url: string;
  salary_or_rate?: string;
  dice_match_score?: number | null;
  dice_posted_text?: string;
  dice_updated_text?: string;
  dice_apply_button_status?: string;
}

const SCRAPER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const SCRAPER_TIMEOUT_MS = Math.max(5000, Number(process.env.JOB_AGENT_SCRAPER_TIMEOUT_MS || 30000));
const DICE_MAX_PAGES = Math.max(1, Number(process.env.JOB_AGENT_DICE_MAX_PAGES || 1));

type SharedScraperSession = {
  context: BrowserContext;
  browser?: Browser;
  cdpAttached: boolean;
};

let sharedScraperSession: SharedScraperSession | null = null;

async function applyStealth(context: BrowserContext): Promise<void> {
  await context
    .addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    })
    .catch(() => undefined);
}

async function getSharedScraperSession(): Promise<SharedScraperSession> {
  if (sharedScraperSession) return sharedScraperSession;

  const cdpUrl = process.env.JOB_AGENT_CDP_URL;
  if (cdpUrl) {
    try {
      const browser = await chromium.connectOverCDP(cdpUrl);
      const contexts = browser.contexts();
      const context = contexts[0] || (await browser.newContext({ userAgent: SCRAPER_UA }));
      sharedScraperSession = { context, browser, cdpAttached: true };
      logger.info({ cdpUrl }, "Scraper attached to existing Chrome via CDP.");
      return sharedScraperSession;
    } catch (error) {
      logger.warn({ error, cdpUrl }, "Scraper CDP attach failed; falling back to launchPersistentContext.");
    }
  }

  // Strict mode: refuse to launch a new window when JOB_AGENT_REQUIRE_CDP=true.
  if (process.env.JOB_AGENT_REQUIRE_CDP === "true") {
    throw new Error(
      "JOB_AGENT_REQUIRE_CDP is set but no Chrome is attached. " +
      "Start Chrome with scripts/start-chrome-cdp.ps1 and set JOB_AGENT_CDP_URL=http://127.0.0.1:9333."
    );
  }

  const profileDir = process.env.JOB_AGENT_PROFILE_DIR || resolveProjectPath(".local", "pw-profile-job-reply");
  fs.mkdirSync(profileDir, { recursive: true });
  const browserChannel = process.env.JOB_AGENT_BROWSER_CHANNEL || "chrome";
  const headless =
    process.env.JOB_AGENT_HEADLESS === "true" || process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: browserChannel,
    headless,
    userAgent: SCRAPER_UA,
    args: ["--disable-blink-features=AutomationControlled", "--no-first-run"],
    ignoreDefaultArgs: ["--enable-automation"]
  });
  await applyStealth(context);
  sharedScraperSession = { context, cdpAttached: false };
  logger.info({ profileDir, headless }, "Scraper persistent context started.");
  return sharedScraperSession;
}

export async function closeSharedScraperSession(): Promise<void> {
  if (!sharedScraperSession) return;
  if (sharedScraperSession.cdpAttached) {
    await sharedScraperSession.browser?.close?.().catch(() => undefined);
    sharedScraperSession = null;
    return;
  }
  await sharedScraperSession.context.close().catch(() => undefined);
  sharedScraperSession = null;
}

async function withScraperPage<T>(label: string, fn: (page: Page) => Promise<T>): Promise<T> {
  const session = await getSharedScraperSession();
  const page = await session.context.newPage();
  page.setDefaultTimeout(SCRAPER_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(SCRAPER_TIMEOUT_MS);
  try {
    return await fn(page);
  } finally {
    await page.close().catch(() => undefined);
  }
}

function normalizeLinkedInJobUrl(url: string): string {
  const cleaned = String(url || "").trim();
  if (!cleaned) return "";
  const withHost = cleaned.startsWith("http") ? cleaned : `https://www.linkedin.com${cleaned}`;
  return withHost.split("?")[0];
}

/**
 * Scrape Dice job listings for a given search query.
 * Returns array of parsed job objects ready for insertion.
 */
export async function scrapeDice(searchQuery: string, maxJobs: number = 50): Promise<ScrapedJob[]> {
  try {
    return await withScraperPage("dice", async (page) => {
      const searchUrl = `https://www.dice.com/jobs?q=${encodeURIComponent(searchQuery)}&pageSize=20&language=en`;
      logger.info({ searchUrl }, "Scraping Dice...");
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: SCRAPER_TIMEOUT_MS });
      await page.waitForTimeout(4000);

    // Dice uses a[href*="/job-detail/"] — the title link has text, overlay link is empty
    const jobs = await page.evaluate(() => {
      const seen = new Set<string>();
      const items: Array<{
        title: string; company: string; location: string;
        apply_url: string; source_url: string; description: string; salary_or_rate: string;
        dice_match_score: number | null; dice_posted_text: string; dice_updated_text: string; dice_apply_button_status: string;
      }> = [];

      const titleLinks = Array.from(document.querySelectorAll("a[href*='/job-detail/']")).filter(
        (a) => {
          const t = a.textContent?.trim() || "";
          return t.length > 3 && t !== "Easy Apply" && t !== "Apply Now";
        }
      );

      for (const link of titleLinks) {
        const href = (link as HTMLAnchorElement).href;
        if (seen.has(href)) continue;
        seen.add(href);

        const card = link.closest("div[class*='bg-surface-primary']") ||
                     link.closest("div[class*='rounded-lg']") ||
                     link.parentElement?.parentElement;

        const title = link.textContent?.trim() || "";
        const companyEl = card?.querySelector("[class*='company']") ||
                          card?.querySelector("[class*='employer']") ||
                          Array.from(card?.querySelectorAll("a") || []).find(
                            (a) => !(a as HTMLAnchorElement).href.includes("/job-detail/") && a.textContent?.trim()
                          );
        const locationEl = card?.querySelector("[class*='location']") ||
                           card?.querySelector("span[aria-label*='location']");
        const cardText = card?.textContent?.replace(/\s+/g, " ").trim() || "";
        const matchScore = Number(
          cardText.match(/(?:Dice\s+Job\s+Match\s+Score|match\s+score|fitment)[^0-9]*(\d{1,3})%/i)?.[1] ||
          cardText.match(/\b(\d{1,3})%\s*(?:MEETS|match|fitment)/i)?.[1] ||
          NaN
        );
        const postedText =
          cardText.match(/\bPosted\s+[^.]*?(?:ago|today|yesterday)\b/i)?.[0] ||
          cardText.match(/(?:^|[•\s])(?:today|yesterday|\d+\s*d\s*ago|\d+\s*days?\s*ago|\d+\s*w\s*ago|\d+\s*weeks?\s*ago|\d+\s*months?\s*ago)\b/i)?.[0]?.replace(/^[•\s]+/, "") ||
          "";
        const updatedText = cardText.match(/\bUpdated\s+[^.]*?(?:ago|today|yesterday)\b/i)?.[0] || "";
        const applyButtonStatus = /Easy Apply/i.test(cardText)
          ? "easy_apply_visible"
          : /Apply Now/i.test(cardText)
            ? "apply_now_visible"
            : "unknown";

        items.push({
          title,
          company: companyEl?.textContent?.trim() || "Unknown",
          location: locationEl?.textContent?.trim() || "",
          apply_url: href,
          source_url: href,
          salary_or_rate: card?.querySelector("[class*='salary'], [class*='pay']")?.textContent?.trim() || "",
          description: cardText.substring(0, 500),
          dice_match_score: Number.isFinite(matchScore) ? matchScore : null,
          dice_posted_text: postedText,
          dice_updated_text: updatedText,
          dice_apply_button_status: applyButtonStatus
        });
      }
      return items;
    });

    logger.info({ count: jobs.length, limit: maxJobs }, "Dice scrape completed");
      return jobs.slice(0, maxJobs).map((job) => ({
        ...job,
        description: [
          `[Dice evidence] match_score=${job.dice_match_score ?? "unknown"}; posted="${job.dice_posted_text || "unknown"}"; updated="${job.dice_updated_text || "unknown"}"; apply_button=${job.dice_apply_button_status || "unknown"}; scraped_at=${new Date().toISOString()}`,
          job.description || ""
        ].join("\n")
      }));
    });
  } catch (error) {
    logger.error({ error }, "Dice scrape failed");
    return [];
  }
}

export async function scrapeDiceFresh(searchQuery: string, maxJobs: number = 50): Promise<ScrapedJob[]> {
  try {
    return await withScraperPage("dice", async (page) => {
      const seenUrls = new Set<string>();
      const collected: ScrapedJob[] = [];

      for (let pageNumber = 1; pageNumber <= DICE_MAX_PAGES && collected.length < maxJobs; pageNumber += 1) {
        const searchUrl = `https://www.dice.com/jobs?q=${encodeURIComponent(searchQuery)}&page=${pageNumber}&pageSize=20&language=en`;
        logger.info({ searchUrl, pageNumber, maxPages: DICE_MAX_PAGES }, "Scraping Dice fresh page...");
        await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: SCRAPER_TIMEOUT_MS });
        await page.waitForTimeout(4000);

        const jobs = await page.evaluate(() => {
          const seen = new Set<string>();
          const items: Array<{
            title: string; company: string; location: string;
            apply_url: string; source_url: string; description: string; salary_or_rate: string;
            dice_match_score: number | null; dice_posted_text: string; dice_updated_text: string; dice_apply_button_status: string;
          }> = [];

          const titleLinks = Array.from(document.querySelectorAll("a[href*='/job-detail/']")).filter((a) => {
            const text = a.textContent?.trim() || "";
            return text.length > 3 && text !== "Easy Apply" && text !== "Apply Now";
          });

          for (const link of titleLinks) {
            const href = (link as HTMLAnchorElement).href;
            if (seen.has(href)) continue;
            seen.add(href);

            const card =
              link.closest("div[class*='bg-surface-primary']") ||
              link.closest("div[class*='rounded-lg']") ||
              link.parentElement?.parentElement;
            const cardText = card?.textContent?.replace(/\s+/g, " ").trim() || "";
            const title = link.textContent?.trim() || "";
            const companyEl =
              card?.querySelector("[class*='company']") ||
              card?.querySelector("[class*='employer']") ||
              Array.from(card?.querySelectorAll("a") || []).find(
                (a) => !(a as HTMLAnchorElement).href.includes("/job-detail/") && a.textContent?.trim()
              );
            const locationEl = card?.querySelector("[class*='location']") || card?.querySelector("span[aria-label*='location']");
            const matchScore = Number(
              cardText.match(/(?:Dice\s+Job\s+Match\s+Score|match\s+score|fitment)[^0-9]*(\d{1,3})%/i)?.[1] ||
              cardText.match(/\b(\d{1,3})%\s*(?:MEETS|match|fitment)/i)?.[1] ||
              NaN
            );
            const postedText =
              cardText.match(/\bPosted\s+[^.]*?(?:ago|today|yesterday)\b/i)?.[0] ||
              cardText.match(/(?:^|[\s])(?:today|yesterday|\d+\s*d\s*ago|\d+\s*days?\s*ago|\d+\s*w\s*ago|\d+\s*weeks?\s*ago|\d+\s*months?\s*ago)\b/i)?.[0]?.trim() ||
              "";
            const updatedText = cardText.match(/\bUpdated\s+[^.]*?(?:ago|today|yesterday)\b/i)?.[0] || "";
            const applyButtonStatus = /Easy Apply/i.test(cardText)
              ? "easy_apply_visible"
              : /Apply Now/i.test(cardText)
                ? "apply_now_visible"
                : "unknown";

            items.push({
              title,
              company: companyEl?.textContent?.trim() || "Unknown",
              location: locationEl?.textContent?.trim() || "",
              apply_url: href,
              source_url: href,
              salary_or_rate: card?.querySelector("[class*='salary'], [class*='pay']")?.textContent?.trim() || "",
              description: cardText.substring(0, 500),
              dice_match_score: Number.isFinite(matchScore) ? matchScore : null,
              dice_posted_text: postedText,
              dice_updated_text: updatedText,
              dice_apply_button_status: applyButtonStatus
            });
          }

          return items;
        });

        if (jobs.length === 0) break;
        for (const job of jobs) {
          if (seenUrls.has(job.apply_url)) continue;
          seenUrls.add(job.apply_url);
          collected.push(job);
          if (collected.length >= maxJobs) break;
        }
      }

      logger.info({ count: collected.length, limit: maxJobs, pages: DICE_MAX_PAGES }, "Dice fresh scrape completed");
      return collected.slice(0, maxJobs).map((job) => ({
        ...job,
        description: [
          `[Dice evidence] match_score=${job.dice_match_score ?? "unknown"}; posted="${job.dice_posted_text || "unknown"}"; updated="${job.dice_updated_text || "unknown"}"; apply_button=${job.dice_apply_button_status || "unknown"}; scraped_at=${new Date().toISOString()}`,
          job.description || ""
        ].join("\n")
      }));
    });
  } catch (error) {
    logger.error({ error }, "Dice fresh scrape failed");
    return [];
  }
}

/**
 * Scrape Indeed job listings for a given search query.
 */
export async function scrapeIndeed(searchQuery: string, maxJobs: number = 50): Promise<ScrapedJob[]> {
  try {
    return await withScraperPage("indeed", async (page) => {
      const host = process.env.JOB_AGENT_INDEED_HOST || "ca.indeed.com";
      const location = process.env.JOB_AGENT_INDEED_LOCATION || "Toronto, Ontario";
      const remoteFilter = process.env.JOB_AGENT_INDEED_REMOTE_FILTER ?? "0kf%3Aattr%28DSQF7%29%3B";
      const locationQuery = encodeURIComponent(location);
      const filterQuery = remoteFilter ? `&sc=${remoteFilter}` : "";
      const searchUrl = `https://${host}/jobs?q=${encodeURIComponent(searchQuery)}&l=${locationQuery}${filterQuery}&sort=date`;
      logger.info({ searchUrl, location, host }, "Scraping Indeed...");
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: SCRAPER_TIMEOUT_MS });
      await page.waitForTimeout(4000);

    const jobs = await page.evaluate(() => {
      const items: Array<{
        title: string; company: string; location: string;
        apply_url: string; source_url: string; description: string; salary_or_rate: string;
      }> = [];

      // Indeed job cards: li elements or divs with data-jk attribute
      const cards = Array.from(
        document.querySelectorAll("li[class*='job'], div[class*='job_seen_beacon'], div[class*='slider_item'], [data-jk]")
      );

      // Fallback: any a with /rc/clk or /pagead in href (Indeed canonical links)
      const linkCards = cards.length > 0 ? cards :
        Array.from(document.querySelectorAll("a[href*='/rc/clk'], a[href*='/pagead']")).map(
          (a) => a.closest("div") || a
        ).filter(Boolean);

      (linkCards as Element[]).forEach((card) => {
        const titleEl = card.querySelector("h2.jobTitle span, h2[class*='jobTitle'] span, .jobTitle a span, [class*='jcs-JobTitle'] span");
        const linkEl = card.querySelector("a[href*='/rc/clk'], a[href*='/pagead'], a[data-jk], h2 a") as HTMLAnchorElement | null;
        const companyEl = card.querySelector("[data-testid='company-name'], [class*='companyName'], span[class*='company']");
        const locationEl = card.querySelector("[data-testid='text-location'], [class*='companyLocation']");
        const salaryEl = card.querySelector("[class*='salary-snippet'], [class*='salaryText'], [data-testid='attribute_snippet_testid']");

        const title = titleEl?.textContent?.trim() || linkEl?.textContent?.trim() || "";
        const href = linkEl?.href || "";

        if (title && href) {
          items.push({
            title,
            company: companyEl?.textContent?.trim() || "Unknown",
            location: locationEl?.textContent?.trim() || "",
            apply_url: href.startsWith("http") ? href : `https://ca.indeed.com${href}`,
            source_url: href,
            salary_or_rate: salaryEl?.textContent?.trim() || "",
            description: card.textContent?.substring(0, 300) || ""
          });
        }
      });

      return items;
    });

    logger.info({ count: jobs.length, limit: maxJobs }, "Indeed scrape completed");
      return jobs.slice(0, maxJobs);
    });
  } catch (error) {
    logger.error({ error }, "Indeed scrape failed");
    return [];
  }
}

/**
 * Scrape LinkedIn jobs for a given search query.
 * If LinkedIn returns a challenge/sign-in wall, returns an empty list and logs guidance.
 */
export async function scrapeLinkedIn(searchQuery: string, maxJobs: number = 50): Promise<ScrapedJob[]> {
  try {
    return await withScraperPage("linkedin", async (page) => {
      const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchQuery)}&location=Canada&f_WT=2`;
      logger.info({ searchUrl }, "Scraping LinkedIn jobs...");
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: SCRAPER_TIMEOUT_MS });
      await page.waitForTimeout(4000);

      const html = await page.content();
      if (/captcha|challenge|security verification|sign in|checkpoint/i.test(html)) {
        logger.warn(
          { cdp: Boolean(process.env.JOB_AGENT_CDP_URL) },
          "LinkedIn returned a bot/sign-in challenge. Start Chrome with scripts/start-chrome-cdp.ps1, sign in manually, then set JOB_AGENT_CDP_URL=http://127.0.0.1:9333 and rerun."
        );
        return [];
      }

    const jobs = await page.evaluate(() => {
      const items: Array<{
        title: string; company: string; location: string;
        apply_url: string; source_url: string; description: string; salary_or_rate: string;
      }> = [];
      const seen = new Set<string>();

      const cards = Array.from(document.querySelectorAll("li div.base-search-card, li.jobs-search__results-list li, .base-card"));

      for (const card of cards) {
        const link = card.querySelector("a.base-card__full-link, a[href*='/jobs/view/']") as HTMLAnchorElement | null;
        const titleEl = card.querySelector("h3.base-search-card__title, h3") as HTMLElement | null;
        const companyEl = card.querySelector("h4.base-search-card__subtitle, a.hidden-nested-link, .base-search-card__subtitle") as HTMLElement | null;
        const locationEl = card.querySelector("span.job-search-card__location, .job-search-card__location") as HTMLElement | null;

        const href = link?.getAttribute("href") || "";
        const title = titleEl?.textContent?.trim() || "";
        if (!href || !title) continue;
        if (seen.has(href)) continue;
        seen.add(href);

        items.push({
          title,
          company: companyEl?.textContent?.trim() || "Unknown",
          location: locationEl?.textContent?.trim() || "",
          apply_url: href,
          source_url: href,
          salary_or_rate: "",
          description: card.textContent?.replace(/\s+/g, " ").trim().slice(0, 300) || ""
        });
      }

      return items;
    });

    const normalized = jobs
      .map((job) => {
        const applyUrl = normalizeLinkedInJobUrl(job.apply_url);
        return {
          ...job,
          apply_url: applyUrl,
          source_url: applyUrl || job.source_url
        };
      })
      .filter((job) => Boolean(job.apply_url));

      logger.info({ count: normalized.length, limit: maxJobs }, "LinkedIn scrape completed");
      return normalized.slice(0, maxJobs);
    });
  } catch (error) {
    const errorDetails =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { error };
    logger.error(errorDetails, "LinkedIn scrape failed");
    if (process.env.JOB_AGENT_REQUIRE_CDP === "true") {
      throw error;
    }
    return [];
  }
}


/**
 * Ingest scraped jobs into hunt_jobs table.
 * Deduplicates by apply_url and title+company.
 */
export function ingestScrapedJobs(db: Database.Database, jobs: ScrapedJob[], source: "dice" | "indeed" | "linkedin" | "monster" | "robert_half" | "workopolis" | "mercor"): number {
  let ingested = 0;

  for (const job of jobs) {
    // Check for existing job by URL or title+company combo
    const byUrl = db.prepare("SELECT id, title, company FROM hunt_jobs WHERE apply_url = ? LIMIT 1").get(job.apply_url);
    const byTitleCompany = db.prepare("SELECT id, title, company FROM hunt_jobs WHERE title = ? AND company = ? AND source = ? LIMIT 1").get(job.title, job.company, source);

    const existing = (byUrl || byTitleCompany) as { id?: number; title?: string; company?: string } | undefined;
    if (existing?.id) {
      const nextTitle = shouldRefreshExistingTitle(existing.title || "", job.title) ? job.title : "";
      const nextCompany = shouldRefreshExistingCompany(existing.company || "", job.company) ? job.company : "";
      db.prepare(
        `UPDATE hunt_jobs
         SET title=COALESCE(NULLIF(?, ''), title),
             company=COALESCE(NULLIF(?, ''), company),
             location=COALESCE(NULLIF(?, ''), location),
             source_url=COALESCE(NULLIF(?, ''), source_url),
             description=COALESCE(NULLIF(?, ''), description),
             salary_or_rate=COALESCE(NULLIF(?, ''), salary_or_rate),
             updated_at=?
         WHERE id=?`
      ).run(
        nextTitle,
        nextCompany,
        job.location || "",
        job.source_url || "",
        job.description || "",
        job.salary_or_rate || "",
        new Date().toISOString(),
        existing.id
      );
      logger.debug({ title: job.title, source }, "Job already exists, skipping");
      continue;
    }

    try {
      const normalized = normalizeSourceJob({
        title: job.title,
        company: job.company,
        location: job.location,
        source,
        source_url: job.source_url,
        apply_url: job.apply_url,
        description: job.description,
        salary_or_rate: job.salary_or_rate
      });

      insertHuntJob(db, normalized);
      ingested += 1;
    } catch (error) {
      logger.warn({
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
        job
      }, "Failed to ingest scraped job");
    }
  }

  logger.info({ source, ingested }, "Scraped jobs ingested");
  return ingested;
}

function shouldRefreshExistingTitle(current: string, next: string): boolean {
  const oldValue = String(current || "").trim();
  const newValue = String(next || "").trim();
  if (!newValue) return false;
  if (!oldValue) return true;
  if (/easily apply|often replies|view similar jobs|employee assistance|dental care|\$[\d,]/i.test(oldValue)) return true;
  if (oldValue.length > 120 && newValue.length < oldValue.length) return true;
  return false;
}

function shouldRefreshExistingCompany(current: string, next: string): boolean {
  const oldValue = String(current || "").trim();
  const newValue = String(next || "").trim();
  if (!newValue || /^unknown$/i.test(newValue)) return false;
  if (!oldValue || /^unknown$/i.test(oldValue)) return true;
  if (/easily apply|often replies|terms|job post|remote|\$[\d,]/i.test(oldValue)) return true;
  if (oldValue.length > 90 && newValue.length < oldValue.length) return true;
  return false;
}
