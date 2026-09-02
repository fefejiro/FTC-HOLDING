import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const catalogPath = path.join(root, 'ops', 'architecture', 'service-catalog.json');
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const findings = [];

function record(level, service, message) {
  findings.push({ level, service, message });
}

for (const service of catalog.services) {
  const servicePath = path.join(root, service.path);
  try {
    await access(servicePath);
  } catch {
    record('error', service.id, `catalog path does not exist: ${service.path}`);
    continue;
  }

  let sources = '';
  for (const relative of [
    'server/index.ts',
    'app/api/health/route.ts',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
    'railway.json',
    'wrangler.toml',
    'wrangler.jsonc',
  ]) {
    try {
      sources += `\n${await readFile(path.join(servicePath, relative), 'utf8')}`;
      if (relative === 'app/api/health/route.ts') sources += '\n/api/health';
    } catch {
      // A service only needs the files appropriate for its runtime.
    }
  }

  if (service.healthPath && !sources.includes(service.healthPath)) {
    record('error', service.id, `declared health path is not visible in deployment sources: ${service.healthPath}`);
  }
  if (service.readinessPath && !sources.includes(service.readinessPath)) {
    record('error', service.id, `declared readiness path is not visible in deployment sources: ${service.readinessPath}`);
  }
  if (service.kind.includes('api') && !sources.match(/X-Content-Type-Options|Content-Security-Policy|setHeader\s*\(|headers\s*:/i)) {
    record('warning', service.id, 'API security-header baseline is not visible in the primary deployment sources');
  }
}

try {
  await access(path.join(root, 'APPS', 'saywetin', 'APPS', 'dispatch'));
  record('error', 'dispatch', 'duplicate nested APPS/saywetin/APPS/dispatch deployment tree exists; APPS/dispatch is the only source of truth');
} catch {
  // Desired state: no nested duplicate.
}

for (const finding of findings) {
  console.log(`${finding.level.toUpperCase()} [${finding.service}] ${finding.message}`);
}

const errors = findings.filter((finding) => finding.level === 'error').length;
const warnings = findings.filter((finding) => finding.level === 'warning').length;
console.log(`Architecture audit: ${catalog.services.length} services, ${errors} errors, ${warnings} warnings.`);

if (errors > 0 || (strict && warnings > 0)) {
  process.exitCode = 1;
}
