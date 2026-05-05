/**
 * Orchestrator: runs every QA layer in sequence, captures pass/fail,
 * and emits a single JSON + HTML report under qa/_report/.
 *
 * Layers (in order):
 *   smoke -> unit -> api -> contract -> security -> perf -> uat -> bat -> e2e
 *
 * Each layer is shelled out so a crash in one doesn't kill the others.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.resolve(here, '_report');
mkdirSync(REPORT_DIR, { recursive: true });

const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

const layers = [
  { name: 'smoke', cmd: ['node', '../tools/agent-test/smoke-api.mjs'] },
  { name: 'unit', cmd: [npm, 'run', '-s', 'qa:unit'] },
  { name: 'api', cmd: [npm, 'run', '-s', 'qa:api'] },
  { name: 'contract', cmd: [npm, 'run', '-s', 'qa:contract'] },
  { name: 'security', cmd: [npm, 'run', '-s', 'qa:security'] },
  { name: 'perf', cmd: [npm, 'run', '-s', 'qa:perf'] },
  { name: 'uat', cmd: [npm, 'run', '-s', 'qa:uat'] },
  { name: 'bat', cmd: [npm, 'run', '-s', 'qa:bat'] },
  { name: 'e2e', cmd: [npm, 'run', '-s', 'qa:e2e'] },
];

function run(name, cmd) {
  console.log(`\n=== ${name.toUpperCase()} ===`);
  const start = Date.now();
  const r = spawnSync(cmd[0], cmd.slice(1), {
    cwd: here,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: isWin, // npm.cmd needs a shell on Windows
  });
  const out = (r.stdout || '') + (r.stderr || '');
  process.stdout.write(out);
  return {
    name,
    ok: r.status === 0,
    code: r.status,
    durationMs: Date.now() - start,
    tail: out.split(/\r?\n/).slice(-25).join('\n'),
  };
}

const results = layers.map((l) => run(l.name, l.cmd));

// Pull layer-specific JSON if present.
function readJsonSafe(p) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } }
const detail = {
  perf: readJsonSafe(path.join(REPORT_DIR, 'perf.json')),
  security: readJsonSafe(path.join(REPORT_DIR, 'security.json')),
  uat: readJsonSafe(path.join(REPORT_DIR, 'uat.json')),
  bat: readJsonSafe(path.join(REPORT_DIR, 'bat.json')),
  e2e: readJsonSafe(path.join(REPORT_DIR, 'e2e.json')),
  vitest: readJsonSafe(path.join(REPORT_DIR, 'vitest.json')),
};

const summary = {
  startedAt: new Date().toISOString(),
  ok: results.every((r) => r.ok),
  layers: results,
  detail,
};
writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

// Render HTML
const rows = results.map((r) => `
  <tr class="${r.ok ? 'ok' : 'fail'}">
    <td>${r.name}</td>
    <td>${r.ok ? 'PASS' : 'FAIL'}</td>
    <td>${(r.durationMs / 1000).toFixed(1)}s</td>
    <td>exit ${r.code ?? 'n/a'}</td>
    <td><pre>${(r.tail || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</pre></td>
  </tr>`).join('');

const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>SayWetin QA Report</title>
<style>
  body{font:14px/1.4 system-ui,Segoe UI,sans-serif;margin:24px;color:#111}
  h1{margin:0 0 4px}
  .meta{color:#555;margin-bottom:18px}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #ddd;padding:8px;vertical-align:top;text-align:left}
  th{background:#f4f4f4}
  tr.ok td:nth-child(2){color:#0a7d2c;font-weight:600}
  tr.fail td:nth-child(2){color:#b00020;font-weight:600}
  pre{margin:0;white-space:pre-wrap;font:12px/1.3 Consolas,monospace;max-height:200px;overflow:auto;background:#fafafa;padding:6px}
  .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-weight:600}
  .badge.ok{background:#e6f4ea;color:#0a7d2c}
  .badge.fail{background:#fce8e6;color:#b00020}
</style></head><body>
<h1>SayWetin QA Report <span class="badge ${summary.ok ? 'ok' : 'fail'}">${summary.ok ? 'GREEN' : 'RED'}</span></h1>
<div class="meta">Generated ${summary.startedAt}</div>
<table><thead><tr><th>Layer</th><th>Result</th><th>Duration</th><th>Exit</th><th>Tail</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;

writeFileSync(path.join(REPORT_DIR, 'index.html'), html);

console.log('\n=== SUMMARY ===');
for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'} ${r.name} (${(r.durationMs / 1000).toFixed(1)}s)`);
console.log(`\nReport: ${path.join(REPORT_DIR, 'index.html')}`);
process.exit(summary.ok ? 0 : 1);
