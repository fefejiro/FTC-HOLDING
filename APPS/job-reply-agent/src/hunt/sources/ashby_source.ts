import type { SourceAdapter } from "./base_source.js";
import type { RawJob } from "../types.js";
import type { HuntConfig } from "../config_loader.js";

/**
 * Ashby public job board JSON feed.
 * Endpoint: https://api.ashbyhq.com/posting-api/job-board/{slug}
 *
 * Response shape:
 *   { jobs: [ { id, title, jobUrl, location, isRemote, employmentType,
 *               department, team, publishedAt, descriptionPlain } ] }
 */

interface AshbyJob {
  id: string;
  title: string;
  jobUrl?: string;
  location?: string;
  isRemote?: boolean;
  employmentType?: string;
  department?: string;
  team?: string;
  publishedAt?: string;
  descriptionPlain?: string;
}

interface AshbyResponse {
  jobs?: AshbyJob[];
}

async function fetchSlug(slug: string): Promise<RawJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "job-reply-agent" }
  });
  if (!res.ok) {
    throw new Error(`ashby ${slug} HTTP ${res.status}`);
  }
  const data = (await res.json()) as AshbyResponse;
  const jobs = data.jobs ?? [];
  return jobs.map<RawJob>((j) => ({
    source: "ashby",
    source_id: j.id,
    url: j.jobUrl ?? `https://jobs.ashbyhq.com/${slug}/${j.id}`,
    company: slug,
    title: j.title,
    location: j.location ?? null,
    remote: typeof j.isRemote === "boolean" ? j.isRemote : null,
    description: j.descriptionPlain ?? null,
    compensation: null,
    posted_at: j.publishedAt ?? null
  }));
}

export const ashbySource: SourceAdapter = {
  source: "ashby",
  name: "Ashby job boards",
  isEnabled(config: HuntConfig): boolean {
    return (config.searches.companies.ashby ?? []).length > 0;
  },
  async fetch(config: HuntConfig): Promise<RawJob[]> {
    const slugs = config.searches.companies.ashby ?? [];
    const all: RawJob[] = [];
    for (const slug of slugs) {
      try {
        const jobs = await fetchSlug(slug);
        all.push(...jobs);
      } catch (err) {
        console.warn(`[ashby] ${slug}:`, (err as Error).message);
      }
    }
    return all;
  }
};
