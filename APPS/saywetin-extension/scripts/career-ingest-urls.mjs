import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function stripHtml(input) {
  return String(input || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeta(html, key, attr = 'property') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<meta[^>]*${attr}=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripHtml(m[1]) : '';
}

function parseJsonLd(html) {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    .filter(Boolean);

  const docs = [];
  for (const raw of scripts) {
    try {
      const parsed = JSON.parse(raw.trim());
      docs.push(parsed);
    } catch {
      // ignore malformed blocks
    }
  }

  return docs;
}

function flattenJsonLd(nodes) {
  const out = [];
  for (const node of nodes) {
    if (!node) continue;
    if (Array.isArray(node)) {
      out.push(...flattenJsonLd(node));
      continue;
    }
    if (typeof node === 'object' && Array.isArray(node['@graph'])) {
      out.push(...flattenJsonLd(node['@graph']));
    }
    out.push(node);
  }
  return out;
}

function pickJobPosting(nodes) {
  const flat = flattenJsonLd(nodes);
  return flat.find((n) => {
    const t = n?.['@type'];
    if (Array.isArray(t)) {
      return t.map((x) => String(x).toLowerCase()).includes('jobposting');
    }
    return String(t || '').toLowerCase() === 'jobposting';
  });
}

function mapEmploymentType(value) {
  if (Array.isArray(value)) return value.join(', ');
  return value ? String(value) : '';
}

function inferCompany(jobLd, html, hostname) {
  const fromLd = jobLd?.hiringOrganization?.name;
  if (fromLd) return String(fromLd);
  const ogSite = extractMeta(html, 'og:site_name');
  if (ogSite) return ogSite;
  return hostname;
}

function inferLocation(jobLd, html) {
  if (jobLd?.jobLocation) {
    const list = Array.isArray(jobLd.jobLocation) ? jobLd.jobLocation : [jobLd.jobLocation];
    const chunks = list.map((loc) => {
      const addr = loc?.address || {};
      const bits = [
        addr.addressLocality,
        addr.addressRegion,
        addr.addressCountry,
      ].filter(Boolean);
      return bits.join(', ');
    }).filter(Boolean);
    if (chunks.length > 0) return chunks.join(' | ');
  }

  const og = extractMeta(html, 'og:locale', 'property');
  return og || '';
}

function inferSalary(jobLd) {
  const s = jobLd?.baseSalary;
  if (!s) return '';

  if (typeof s === 'string') return s;

  const currency = s?.currency || '';
  const v = s?.value || {};
  const min = v?.minValue;
  const max = v?.maxValue;
  const unit = v?.unitText;

  if (min != null && max != null) {
    return `${currency} ${min}-${max}${unit ? ` ${unit}` : ''}`.trim();
  }
  if (min != null) {
    return `${currency} ${min}${unit ? ` ${unit}` : ''}`.trim();
  }

  return '';
}

async function fetchOne(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, url };
    }

    const html = await res.text();
    const hostname = new URL(url).hostname;
    const ldNodes = parseJsonLd(html);
    const jobLd = pickJobPosting(ldNodes);

    const title = jobLd?.title || extractMeta(html, 'og:title') || extractTitle(html) || '';
    const company = inferCompany(jobLd, html, hostname);
    const location = inferLocation(jobLd, html);
    const description = stripHtml(jobLd?.description || extractMeta(html, 'description', 'name') || '');
    const employmentType = mapEmploymentType(jobLd?.employmentType);
    const salary = inferSalary(jobLd);

    const row = {
      title: title || 'Unknown title',
      company: company || 'Unknown company',
      location,
      employmentType,
      salary,
      source: hostname,
      link: url,
      description: description.slice(0, 6000),
    };

    return { ok: true, row };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), url };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const inputArg = process.argv[2] || 'career/inputs/job-urls.txt';
  const outputArg = process.argv[3] || 'career/inputs/jobs.live.json';

  const inputPath = path.isAbsolute(inputArg) ? inputArg : path.join(ROOT, inputArg);
  const outputPath = path.isAbsolute(outputArg) ? outputArg : path.join(ROOT, outputArg);

  if (!fs.existsSync(inputPath)) {
    console.error(`URL input file not found: ${inputPath}`);
    process.exit(1);
  }

  const urls = fs.readFileSync(inputPath, 'utf8')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter((x) => x && !x.startsWith('#'));

  if (urls.length === 0) {
    console.error('No URLs found in input file.');
    process.exit(1);
  }

  const rows = [];
  const failures = [];

  for (const url of urls) {
    // Sequential fetch is safer for job boards that rate limit aggressively.
    const res = await fetchOne(url);
    if (res.ok) {
      rows.push(res.row);
    } else {
      failures.push({ url: res.url, error: res.error });
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2), 'utf8');

  const failPath = outputPath.replace(/\.json$/i, '.failures.json');
  fs.writeFileSync(failPath, JSON.stringify(failures, null, 2), 'utf8');

  console.log('Ingestion complete.');
  console.log(`Jobs parsed: ${rows.length}`);
  console.log(`Failures: ${failures.length}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Failures log: ${failPath}`);

  if (rows.length === 0) {
    process.exit(2);
  }
}

main();
