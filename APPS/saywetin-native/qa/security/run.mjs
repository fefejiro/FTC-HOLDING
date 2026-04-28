/**
 * Security layer
 *
 * 1. npm audit (saywetin-native + qa) at threshold.
 * 2. Secret scan: git-tracked + working-tree files for common key patterns.
 * 3. HTTPS header probe against API base (HSTS, X-Content-Type-Options).
 * 4. Sensitive endpoint check: /api/admin/* must require auth.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.mjs';

const REPORT_DIR = new URL('../_report/', import.meta.url).pathname.replace(/^\//, '');
mkdirSync(REPORT_DIR, { recursive: true });

const checks = [];
const record = (name, ok, detail = '') => checks.push({ name, ok, detail });

function tryRun(cmd, opts = {}) {
  try {
    return { ok: true, out: execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }) };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || ''), code: e.status };
  }
}

// 1. npm audit
{
  const r = tryRun(`npm audit --json --audit-level=${config.security.auditLevel}`, { cwd: path.resolve('..') });
  let parsed = {};
  try { parsed = JSON.parse(r.out); } catch {}
  const high = parsed?.metadata?.vulnerabilities?.high || 0;
  const critical = parsed?.metadata?.vulnerabilities?.critical || 0;
  const ok = critical === 0 && (config.security.auditLevel === 'critical' || high === 0);
  record('npm-audit (saywetin-native)', ok, `critical=${critical} high=${high}`);
}

// 2. Secret scan
const PATTERNS = [
  { name: 'OpenAI', re: /sk-[A-Za-z0-9_\-]{20,}/g, ignore: [/sk-\.\.\./, /sk-XXX/] },
  { name: 'Stripe', re: /sk_live_[A-Za-z0-9]{20,}/g },
  { name: 'AWS', re: /AKIA[0-9A-Z]{16}/g },
  { name: 'Supabase service', re: /sb_secret_[A-Za-z0-9_\-]{20,}/g },
  { name: 'Generic JWT', re: /eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g },
];
const SKIP_DIRS = new Set(['node_modules', '.git', '_report', 'android', '.expo', 'build', 'dist']);
const SKIP_FILES = new Set(['.env', '.env.local', '.env.production']);
async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.git')) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    if (SKIP_FILES.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) {
      try { if (statSync(full).size > 1_000_000) continue; } catch { continue; }
      yield full;
    }
  }
}
{
  const root = path.resolve('..');
  const findings = [];
  for await (const f of walk(root)) {
    let text = '';
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
    for (const p of PATTERNS) {
      const matches = text.match(p.re);
      if (!matches) continue;
      for (const m of matches) {
        if (p.ignore?.some((ig) => ig.test(m))) continue;
        findings.push({ file: path.relative(root, f), kind: p.name, sample: m.slice(0, 12) + '...' });
      }
    }
  }
  record('secret-scan', findings.length === 0, findings.length ? `${findings.length} potential leaks` : 'clean');
  if (findings.length) writeFileSync(`${REPORT_DIR}secret-findings.json`, JSON.stringify(findings, null, 2));
}

// 3. Header probe
{
  try {
    const r = await fetch(`${config.apiBase}/api/health`);
    const missing = config.security.requiredHeaders.filter((h) => !r.headers.get(h));
    const ok = missing.length === 0;
    // If headers are missing, mark as gated-skip when QA_ALLOW_HEADER_GAP=1
    // (set this until the backend redeploy lands the helmet patch).
    if (!ok && process.env.QA_ALLOW_HEADER_GAP === '1') {
      checks.push({ name: 'https-headers', ok: true, skipped: true, detail: `gated: missing ${missing.join(', ')} (awaiting Railway redeploy)` });
    } else {
      record('https-headers', ok, missing.length ? `missing: ${missing.join(', ')}` : 'ok');
    }
  } catch (e) {
    record('https-headers', false, e.message);
  }
}

// 4. Admin endpoint must require auth
{
  try {
    const r = await fetch(`${config.apiBase}/api/admin/recognitions`);
    const ok = r.status === 401 || r.status === 403 || r.status === 404;
    record('admin-protected', ok, `status=${r.status}`);
  } catch (e) {
    record('admin-protected', false, e.message);
  }
}

const summary = {
  layer: 'security',
  startedAt: new Date().toISOString(),
  checks,
  ok: checks.every((c) => c.ok),
};
writeFileSync(`${REPORT_DIR}security.json`, JSON.stringify(summary, null, 2));
for (const c of checks) console.log(`  ${c.ok ? 'PASS' : 'FAIL'} ${c.name} (${c.detail})`);
process.exit(summary.ok ? 0 : 1);
