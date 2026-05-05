/**
 * Scenario runner (UAT + BAT)
 *
 * Reads JSON scenarios under scenarios/<kind>/*.json and executes each
 * step against config.apiBase. Records pass/fail and writes a JSON report.
 *
 * Usage:  node scenarios/run.mjs uat
 *         node scenarios/run.mjs bat
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.resolve(here, '..', '_report');
mkdirSync(REPORT_DIR, { recursive: true });

const kind = (process.argv[2] || 'uat').toLowerCase();
if (!['uat', 'bat'].includes(kind)) {
  console.error('Usage: node scenarios/run.mjs <uat|bat>');
  process.exit(2);
}

const dir = path.join(here, kind);
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

function getPath(obj, dotted) {
  return dotted.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

async function execStep(step) {
  const url = config.apiBase + step.request.url;
  const init = {
    method: step.request.method || 'GET',
    headers: step.request.headers || undefined,
  };
  if (step.request.body !== undefined) init.body = JSON.stringify(step.request.body);

  const r = await fetch(url, init);
  const body = await r.json().catch(() => ({}));
  const e = step.expect || {};
  const failures = [];

  // Gated-skip: if a step matches `skipIf` (e.g. errorCode for an intentionally
  // disabled feature), record as skipped/passed instead of failing.
  if (step.skipIf) {
    const sIf = step.skipIf;
    const statusMatch = sIf.status == null || r.status === sIf.status;
    const codeMatch = sIf.errorCode == null || body?.errorCode === sIf.errorCode;
    const pathMatch = !sIf.jsonPath || Object.entries(sIf.jsonPath).every(([k, v]) => getPath(body, k) === v);
    if (statusMatch && codeMatch && pathMatch) {
      return { id: step.id, title: step.title, ok: true, skipped: true, status: r.status, failures: [], body, skipReason: sIf.reason || `gated by ${sIf.errorCode || sIf.status}` };
    }
  }

  if (e.status != null && r.status !== e.status) failures.push(`status ${r.status} != ${e.status}`);
  if (Array.isArray(e.statusIn) && !e.statusIn.includes(r.status)) failures.push(`status ${r.status} not in ${e.statusIn.join(',')}`);
  if (e.isArray && !Array.isArray(body)) failures.push('body is not array');
  if (e.json) {
    for (const [k, v] of Object.entries(e.json)) {
      if (body?.[k] !== v) failures.push(`json.${k} ${JSON.stringify(body?.[k])} != ${JSON.stringify(v)}`);
    }
  }
  if (e.jsonPath) {
    for (const [pathExpr, expected] of Object.entries(e.jsonPath)) {
      const actual = getPath(body, pathExpr);
      if (expected === 'string') {
        if (typeof actual !== 'string' || !actual.length) failures.push(`jsonPath ${pathExpr} not non-empty string (got ${JSON.stringify(actual)})`);
      } else if (actual !== expected) {
        failures.push(`jsonPath ${pathExpr} ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
      }
    }
  }
  return { id: step.id, title: step.title, ok: failures.length === 0, status: r.status, failures, body };
}

const out = { layer: kind, startedAt: new Date().toISOString(), scenarios: [], ok: true };

for (const f of files) {
  const scenario = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
  const stepResults = [];
  for (const step of scenario.steps) {
    try {
      const res = await execStep(step);
      stepResults.push(res);
      const tag = res.skipped ? 'SKIP' : (res.ok ? 'PASS' : 'FAIL');
      const note = res.skipped ? ` — ${res.skipReason}` : (res.ok ? '' : ' — ' + res.failures.join('; '));
      console.log(`  ${tag} ${kind} ${scenario.name} :: ${step.id} ${step.title}${note}`);
    } catch (err) {
      stepResults.push({ id: step.id, title: step.title, ok: false, error: err.message });
      console.log(`  FAIL ${kind} ${scenario.name} :: ${step.id} ERROR ${err.message}`);
    }
  }
  const ok = stepResults.every((s) => s.ok);
  out.scenarios.push({ file: f, name: scenario.name, ok, steps: stepResults });
  if (!ok) out.ok = false;
}

writeFileSync(path.join(REPORT_DIR, `${kind}.json`), JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
