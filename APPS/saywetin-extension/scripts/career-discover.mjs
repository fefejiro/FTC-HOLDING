/**
 * career-discover.mjs
 *
 * Fetches live job listings from LinkedIn, Indeed, Glassdoor, ZipRecruiter,
 * and more via SerpAPI's Google Jobs endpoint (free tier: 100 searches/month).
 *
 * When SERPAPI_KEY is not set, falls back to Remotive (remote roles only).
 *
 * Usage:
 *   node scripts/career-discover.mjs [output-path]
 *   Defaults output to: career/inputs/jobs.live.json
 *
 * Setup (one-time, 2 minutes):
 *   1. Sign up free at https://serpapi.com
 *   2. Copy your API key from the dashboard
 *   3. Set env var: $env:SERPAPI_KEY = "your-key-here"
 *   4. Run: npm run career:daily:live
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CAREER_DIR = path.join(ROOT, 'career');
const PROFILE_PATH = path.join(CAREER_DIR, 'profile.json');
const OUTPUT_DEFAULT = path.join(CAREER_DIR, 'inputs', 'jobs.live.json');

const outputArg = process.argv[2] ? path.join(ROOT, process.argv[2]) : OUTPUT_DEFAULT;

// ─────────────────────────────────────────────
// Search queries — one per role family + variant
// ─────────────────────────────────────────────

const SERPAPI_QUERIES = [
  { q: 'Agile Project Coordinator contract remote Canada', chips: 'employment_type:CONTRACTOR' },
  { q: 'Scrum Master contract remote Canada OR USA', chips: 'employment_type:CONTRACTOR' },
  { q: 'IT Project Coordinator ERP remote Canada', chips: '' },
  { q: 'Business Systems Analyst WMS supply chain remote', chips: 'employment_type:CONTRACTOR' },
  { q: 'ERP Implementation Business Analyst remote Canada', chips: 'employment_type:CONTRACTOR' },
  { q: 'Supply Chain Systems Analyst remote Canada OR USA', chips: '' },
  { q: 'Program Coordinator delivery lead Azure DevOps remote', chips: '' },
  { q: 'LinkedIn Business Systems Analyst remote Canada contract', chips: 'employment_type:CONTRACTOR' },
  { q: 'Indeed Agile Project Coordinator remote Canada contract', chips: 'employment_type:CONTRACTOR' },
];

const FALLBACK_LINKEDIN_QUERIES = [
  { q: 'site:linkedin.com/jobs ERP Business Analyst remote Canada', chips: 'employment_type:CONTRACTOR' },
  { q: 'site:linkedin.com/jobs Scrum Master contract remote Canada', chips: 'employment_type:CONTRACTOR' },
];

const FALLBACK_INDEED_QUERIES = [
  { q: 'site:indeed.com Project Coordinator ERP remote contract', chips: 'employment_type:CONTRACTOR' },
  { q: 'site:indeed.ca Business Systems Analyst WMS remote', chips: 'employment_type:CONTRACTOR' },
];

const REMOTIVE_SEARCHES = [
  'agile project coordinator',
  'scrum master',
  'supply chain analyst',
  'erp business analyst',
  'systems analyst contract',
];

const DEDUP_CAP = 60;
const GEO_WHITELIST = [
  'canada', 'ontario', 'toronto', 'usa', 'united states', 'remote',
  'anywhere', 'north america', 'us or canada', 'worldwide',
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function readProfile() {
  return JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));
}

function normalize(s) {
  return String(s || '').toLowerCase();
}

function dedupKey(job) {
  return `${normalize(job.title)}::${normalize(job.company)}`;
}

function safeText(val, maxLen = 1500) {
  const s = String(val || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > maxLen ? s.slice(0, maxLen) + '...' : s;
}

async function safeFetch(url, label) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'career-discover/2.0 (personal job search tool)' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.warn(`[${label}] HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[${label}] ${err.message}`);
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function geoAllowed(locationStr) {
  if (!locationStr) return true;
  const loc = normalize(locationStr);
  return GEO_WHITELIST.some((g) => loc.includes(g));
}

function detectEmploymentType(title, desc) {
  const hay = normalize(title + ' ' + desc);
  if (hay.includes('contract')) return 'Contract';
  if (hay.includes('part-time') || hay.includes('part time')) return 'Part-time';
  return 'Full-time';
}

// ─────────────────────────────────────────────
// SerpAPI — Google Jobs aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter
// ─────────────────────────────────────────────

async function fetchSerpApi(queries, apiKey) {
  const jobs = [];

  for (const { q, chips } of queries) {
    const params = new URLSearchParams({
      engine: 'google_jobs',
      q,
      location: 'Canada',
      hl: 'en',
      api_key: apiKey,
    });
    if (chips) params.set('chips', chips);

    const url = `https://serpapi.com/search.json?${params}`;
    const data = await safeFetch(url, 'SerpAPI');

    if (!data?.jobs_results?.length) {
      console.log(`[SerpAPI] "${q}" → 0 results`);
      await delay(600);
      continue;
    }

    let added = 0;
    for (const j of data.jobs_results) {
      if (!geoAllowed(j.location)) continue;

      const highlights = j.job_highlights?.flatMap((h) => h.items || []).join(' ') || '';
      const desc = safeText((j.description || '') + ' ' + highlights);

      // SerpAPI returns "via Indeed", "via LinkedIn" etc. in the `via` field
      const source = j.via ? j.via.replace(/^via\s*/i, '') : 'Google Jobs';

      const link =
        j.job_apply_link ||
        j.related_links?.[0]?.link ||
        `https://www.google.com/search?q=${encodeURIComponent(j.title + ' ' + j.company_name + ' job')}`;

      jobs.push({
        title: j.title || '',
        company: j.company_name || '',
        location: j.location || 'Remote',
        employmentType: detectEmploymentType(j.title, desc),
        salary: j.salary || '',
        source,
        link,
        description: desc,
        _discoveredAt: new Date().toISOString(),
      });
      added++;
    }

    console.log(`[SerpAPI] "${q}" → ${data.jobs_results.length} results (${added} geo-matched)`);
    await delay(600);
  }

  return jobs;
}

// ─────────────────────────────────────────────
// Remotive — free fallback when no SERPAPI_KEY
// ─────────────────────────────────────────────

async function fetchRemotive(searches) {
  const jobs = [];

  for (const query of searches) {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=15`;
    const data = await safeFetch(url, 'Remotive');

    if (!data?.jobs?.length) {
      console.log(`[Remotive] "${query}" → 0 results`);
      await delay(300);
      continue;
    }

    let added = 0;
    for (const j of data.jobs) {
      const loc = normalize(j.candidate_required_location || '');
      if (loc && !GEO_WHITELIST.some((g) => loc.includes(g))) continue;

      jobs.push({
        title: j.title || '',
        company: j.company_name || '',
        location: j.candidate_required_location || 'Remote',
        employmentType: detectEmploymentType(j.title, j.description || ''),
        salary: j.salary || '',
        source: 'Remotive',
        link: j.url || '',
        description: safeText(j.description || ''),
        _discoveredAt: new Date().toISOString(),
      });
      added++;
    }

    console.log(`[Remotive] "${query}" → ${data.jobs.length} results (${added} geo-matched)`);
    await delay(300);
  }

  return jobs;
}

// ─────────────────────────────────────────────
// Relevance filter
// ─────────────────────────────────────────────

const ROLE_TITLE_SIGNALS = [
  'project coordinator', 'scrum master', 'delivery lead', 'program coordinator',
  'systems analyst', 'business analyst', 'supply chain', 'wms', 'erp',
  'agile', 'kanban', 'it coordinator', 'implementation consultant',
  'it manager', 'digital transformation', 'enterprise systems',
];

const TITLE_BLOCKLIST = [
  'writer', 'editor', 'designer', 'graphic', 'marketing', 'recruiter',
  'sales', 'accountant', 'hr ', 'human resources', 'software developer',
  'software engineer', 'devops', 'data scientist', 'machine learning',
  'seo', 'content creator', 'full stack', 'frontend', 'backend',
];

function isRelevant(job, profile) {
  const titleLow = normalize(job.title);
  const blob = normalize([job.title, job.description].join(' '));

  if (TITLE_BLOCKLIST.some((t) => titleLow.includes(t))) return false;
  if (ROLE_TITLE_SIGNALS.some((t) => titleLow.includes(t))) return true;

  const hitCount = profile.coreKeywords.filter((k) => blob.includes(normalize(k))).length;
  return hitCount >= 1;
}

function sourceCount(jobs, sourceName) {
  const needle = normalize(sourceName);
  return jobs.filter((j) => normalize(j.source).includes(needle)).length;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  const profile = readProfile();
  const serpApiKey = process.env.SERPAPI_KEY || '';

  console.log('\n=== Career Discover — fetching live jobs ===\n');

  let raw = [];

  if (serpApiKey) {
    console.log('Mode: SerpAPI — Google Jobs (aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter)\n');
    raw = await fetchSerpApi(SERPAPI_QUERIES, serpApiKey);

    // Ensure at least 1 LinkedIn and 1 Indeed result when possible.
    const linkedinHits = sourceCount(raw, 'linkedin');
    const indeedHits = sourceCount(raw, 'indeed');

    if (linkedinHits < 1) {
      console.log('[SerpAPI] No LinkedIn results yet. Running LinkedIn fallback pass...');
      const extra = await fetchSerpApi(FALLBACK_LINKEDIN_QUERIES, serpApiKey);
      raw = raw.concat(extra);
    }

    if (indeedHits < 1) {
      console.log('[SerpAPI] No Indeed results yet. Running Indeed fallback pass...');
      const extra = await fetchSerpApi(FALLBACK_INDEED_QUERIES, serpApiKey);
      raw = raw.concat(extra);
    }
  } else {
    console.log('Mode: Remotive fallback (no SERPAPI_KEY set)');
    console.log('  → For LinkedIn + Indeed results, sign up free at: https://serpapi.com\n');
    raw = await fetchRemotive(REMOTIVE_SEARCHES);
  }

  console.log(`\nRaw results: ${raw.length} jobs`);

  const relevant = raw.filter((j) => isRelevant(j, profile));
  console.log(`After relevance filter: ${relevant.length} jobs`);

  const seen = new Set();
  const deduped = [];
  for (const j of relevant) {
    const key = dedupKey(j);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(j);
    }
  }
  console.log(`After dedup: ${deduped.length} unique jobs`);

  const final = deduped.slice(0, DEDUP_CAP);
  ensureDir(outputArg);
  fs.writeFileSync(outputArg, JSON.stringify(final, null, 2), 'utf8');
  console.log(`\n✓ Wrote ${final.length} jobs to: ${outputArg}`);

  if (final.length === 0) {
    console.warn('\nNo relevant jobs found.');
    if (!serpApiKey) {
      console.warn('Set SERPAPI_KEY for LinkedIn + Indeed results: https://serpapi.com');
    }
    console.warn('Fallback: npm run career:batch:sample');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('career-discover error:', err.message);
  process.exit(1);
});
