import type { SourceAdapter } from "./base_source.js";
import type { RawJob } from "../types.js";
import type { HuntConfig } from "../config_loader.js";

/**
 * Greenhouse public job board JSON feed.
 * Endpoint: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
 *
 * Response shape (relevant fields):
 *   { jobs: [ { id, title, absolute_url, location: { name }, updated_at,
 *               content (HTML, when content=true), departments: [...],
 *               offices: [...], metadata: [...] } ] }
 */

interface GreenhouseLocation {
  name?: string;
}
interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: GreenhouseLocation;
  updated_at?: string;
  content?: string;
}
interface GreenhouseResponse {
  jobs?: GreenhouseJob[];
}

function stripHtml(html: string | undefined | null): string | null {
  if (!html) return null;
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function detectRemote(locationName: string | undefined | null): boolean | null {
  if (!locationName) return null;
  return /remote|anywhere|distributed/i.test(locationName);
}

async function fetchSlug(slug: string): Promise<RawJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "job-reply-agent" }
  });
  if (!res.ok) {
    throw new Error(`greenhouse ${slug} HTTP ${res.status}`);
  }
  const data = (await res.json()) as GreenhouseResponse;
  const jobs = data.jobs ?? [];
  return jobs.map<RawJob>((j) => ({
    source: "greenhouse",
    source_id: String(j.id),
    url: j.absolute_url,
    company: slug,
    title: j.title,
    location: j.location?.name ?? null,
    remote: detectRemote(j.location?.name),
    description: stripHtml(j.content),
    compensation: null,
    posted_at: j.updated_at ?? null
  }));
}

export const greenhouseSource: SourceAdapter = {
  source: "greenhouse",
  name: "Greenhouse boards",
  isEnabled(config: HuntConfig): boolean {
    return (config.searches.companies.greenhouse ?? []).length > 0;
  },
  async fetch(config: HuntConfig): Promise<RawJob[]> {
    const slugs = config.searches.companies.greenhouse ?? [];
    const all: RawJob[] = [];
    for (const slug of slugs) {
      try {
        const jobs = await fetchSlug(slug);
        all.push(...jobs);
      } catch (err) {
        // swallow per-slug errors so one bad board doesn't kill the run
        console.warn(`[greenhouse] ${slug}:`, (err as Error).message);
      }
    }
    return all;
  }
};
