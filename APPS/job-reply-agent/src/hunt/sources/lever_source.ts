import type { SourceAdapter } from "./base_source.js";
import type { RawJob } from "../types.js";
import type { HuntConfig } from "../config_loader.js";

/**
 * Lever public postings JSON feed.
 * Endpoint: https://api.lever.co/v0/postings/{slug}?mode=json
 *
 * Response: array of postings.
 *   { id, text, hostedUrl, categories: { location, team, commitment },
 *     workplaceType: "remote" | "on-site" | "hybrid",
 *     descriptionPlain, createdAt }
 */

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  categories?: {
    location?: string;
    team?: string;
    commitment?: string;
  };
  workplaceType?: string;
  descriptionPlain?: string;
  createdAt?: number;
}

async function fetchSlug(slug: string): Promise<RawJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "job-reply-agent" }
  });
  if (!res.ok) {
    throw new Error(`lever ${slug} HTTP ${res.status}`);
  }
  const data = (await res.json()) as LeverPosting[];
  return data.map<RawJob>((p) => ({
    source: "lever",
    source_id: p.id,
    url: p.hostedUrl,
    company: slug,
    title: p.text,
    location: p.categories?.location ?? null,
    remote: p.workplaceType
      ? /remote/i.test(p.workplaceType)
      : p.categories?.location
        ? /remote|anywhere/i.test(p.categories.location)
        : null,
    description: p.descriptionPlain ?? null,
    compensation: null,
    posted_at: p.createdAt ? new Date(p.createdAt).toISOString() : null
  }));
}

export const leverSource: SourceAdapter = {
  source: "lever",
  name: "Lever postings",
  isEnabled(config: HuntConfig): boolean {
    return (config.searches.companies.lever ?? []).length > 0;
  },
  async fetch(config: HuntConfig): Promise<RawJob[]> {
    const slugs = config.searches.companies.lever ?? [];
    const all: RawJob[] = [];
    for (const slug of slugs) {
      try {
        const jobs = await fetchSlug(slug);
        all.push(...jobs);
      } catch (err) {
        console.warn(`[lever] ${slug}:`, (err as Error).message);
      }
    }
    return all;
  }
};
