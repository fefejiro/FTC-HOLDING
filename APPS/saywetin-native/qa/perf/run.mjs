/**
 * Performance layer
 *
 * Drives short load tests with autocannon. Pass/fail vs budgets in config.
 */
import autocannon from 'autocannon';
import { writeFileSync, mkdirSync } from 'node:fs';
import { config } from '../config.mjs';

const REPORT_DIR = new URL('../_report/', import.meta.url).pathname.replace(/^\//, '');
mkdirSync(REPORT_DIR, { recursive: true });

const targets = [
  { name: 'health', url: `${config.apiBase}/api/health`, method: 'GET' },
  { name: 'status', url: `${config.apiBase}/api/status`, method: 'GET' },
];

async function runOne(t) {
  console.log(`[perf] ${t.name} -> ${t.method} ${t.url}`);
  const result = await autocannon({
    url: t.url,
    method: t.method,
    duration: config.perf.durationSec,
    connections: config.perf.connections,
    pipelining: config.perf.pipelining,
  });
  const p99 = result.latency.p99;
  const rps = result.requests.average;
  const errors = result.errors + result.timeouts + result.non2xx;
  const ok =
    p99 <= config.perf.p99BudgetMs &&
    rps >= config.perf.minRps &&
    errors === 0;
  return {
    name: t.name,
    method: t.method,
    url: t.url,
    durationSec: config.perf.durationSec,
    connections: config.perf.connections,
    p50: result.latency.p50,
    p99,
    rps,
    errors,
    ok,
    budget: { p99Ms: config.perf.p99BudgetMs, minRps: config.perf.minRps },
  };
}

const results = [];
for (const t of targets) results.push(await runOne(t));

const summary = {
  layer: 'perf',
  startedAt: new Date().toISOString(),
  results,
  ok: results.every((r) => r.ok),
};

writeFileSync(`${REPORT_DIR}perf.json`, JSON.stringify(summary, null, 2));
for (const r of results) {
  console.log(
    `  ${r.ok ? 'PASS' : 'FAIL'} ${r.name}: p99=${r.p99}ms rps=${r.rps.toFixed(1)} err=${r.errors}`
  );
}
process.exit(summary.ok ? 0 : 1);
