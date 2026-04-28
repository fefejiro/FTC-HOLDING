/**
 * E2E layer (Maestro)
 *
 * Maestro is cross-platform RN UI testing via simple YAML flows.
 *  https://maestro.mobile.dev/
 *
 * Setup once on Windows:
 *   iwr -useb https://get.maestro.mobile.dev/install.ps1 | iex
 *
 * Then ensure either a USB device OR a started emulator is connected:
 *   adb devices
 *
 * This runner discovers every flow under ./flows and runs them in order.
 */
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.resolve(here, '..', '_report');
mkdirSync(REPORT_DIR, { recursive: true });

function which(cmd) {
  try { return execSync(`where ${cmd}`, { stdio: 'pipe' }).toString().trim().split(/\r?\n/)[0]; }
  catch { return null; }
}

const maestro = which('maestro') || which('maestro.cmd');
const flowsDir = path.join(here, 'flows');
const summary = { layer: 'e2e', startedAt: new Date().toISOString(), runs: [], ok: false, skipped: false, reason: '' };

if (!maestro) {
  summary.skipped = true;
  summary.reason = 'maestro CLI not installed (see qa/e2e/run.mjs header)';
} else if (!existsSync(flowsDir)) {
  summary.skipped = true;
  summary.reason = 'no flows/ directory';
} else {
  const flows = readdirSync(flowsDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  if (flows.length === 0) {
    summary.skipped = true;
    summary.reason = 'no flow files';
  } else {
    for (const f of flows) {
      const flowPath = path.join(flowsDir, f);
      const env = { ...process.env, MAESTRO_DRIVER_STARTUP_TIMEOUT: '60000' };
      const args = ['test', flowPath];
      if (config.e2e.device) args.push('--device', config.e2e.device);
      const r = spawnSync(maestro, args, { encoding: 'utf8', env });
      summary.runs.push({
        flow: f,
        ok: r.status === 0,
        stdoutTail: (r.stdout || '').split(/\r?\n/).slice(-12).join('\n'),
        stderrTail: (r.stderr || '').split(/\r?\n/).slice(-12).join('\n'),
        code: r.status,
      });
      console.log(`  ${r.status === 0 ? 'PASS' : 'FAIL'} e2e ${f}`);
    }
    summary.ok = summary.runs.every((x) => x.ok);
  }
}

writeFileSync(path.join(REPORT_DIR, 'e2e.json'), JSON.stringify(summary, null, 2));
process.exit(summary.skipped ? 0 : summary.ok ? 0 : 1);
