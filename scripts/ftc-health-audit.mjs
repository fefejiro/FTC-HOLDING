#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const APPS_DIR = path.join(ROOT, 'APPS');
const WORKERS_DIR = path.join(ROOT, 'workers');
const REPORT_DIR = path.join(ROOT, 'DOCS', 'health');

const STATUS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  WARN: 'WARN',
  BLOCKED_EXTERNAL: 'BLOCKED_EXTERNAL',
  EXPECTED_PRIVATE: 'EXPECTED_PRIVATE',
  BLOCKED_ENV: 'BLOCKED_ENV'
};

const args = new Set(process.argv.slice(2));
const getArg = (name, fallback) => {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
};

const options = {
  cloudOnly: args.has('--cloud-only'),
  skipLocal: args.has('--skip-local') || args.has('--cloud-only'),
  deepLocal: args.has('--deep-local'),
  noFail: args.has('--no-fail'),
  maxLinks: Number(getArg('--max-links', '80')),
  timeoutMs: Number(getArg('--timeout-ms', '15000'))
};

const results = [];
const recoveryActions = [];

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function tail(value, max = 2200) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, 400)}\n...\n${text.slice(-max + 405)}`;
}

function addResult(section, status, name, details = {}) {
  const item = {
    section,
    status,
    name,
    timestamp: new Date().toISOString(),
    ...details
  };
  results.push(item);
  return item;
}

function addRecovery(priority, owner, action, evidence = '') {
  recoveryActions.push({ priority, owner, action, evidence });
}

function quoteShellArg(arg) {
  const value = String(arg);
  if (!/[`\s&()^|<>"]/u.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, init = {}, timeoutMs = options.timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function endpointCheck(check) {
  const {
    name,
    url,
    section = 'Cloud endpoints',
    expectedStatuses = [200],
    expectedContentType,
    expectedPrivateStatuses,
    privateStatus = STATUS.EXPECTED_PRIVATE,
    redirect = 'manual',
    timeoutMs = options.timeoutMs,
    bodyIncludes,
    classifyFailure
  } = check;

  const started = Date.now();
  try {
    const response = await fetchWithTimeout(url, { method: 'GET', redirect }, timeoutMs);
    const contentType = response.headers.get('content-type') || '';
    let bodySnippet = '';

    if (bodyIncludes || contentType.includes('text/') || contentType.includes('json')) {
      const text = await response.text();
      bodySnippet = tail(text, 700);
    }

    const statusMatches = expectedStatuses.includes(response.status);
    const privateMatches = expectedPrivateStatuses?.includes(response.status);
    const typeMatches = privateMatches || !expectedContentType || contentType.toLowerCase().includes(expectedContentType.toLowerCase());
    const bodyMatches = privateMatches || !bodyIncludes || bodySnippet.includes(bodyIncludes);

    let status = STATUS.FAIL;
    let summary = `Expected HTTP ${expectedStatuses.join('/')}, got ${response.status}.`;

    if (privateMatches) {
      status = privateStatus;
      summary = `Expected protected/private response ${response.status}.`;
    } else if (statusMatches && typeMatches && bodyMatches) {
      status = STATUS.PASS;
      summary = `HTTP ${response.status}`;
    } else if (classifyFailure) {
      status = classifyFailure({ response, contentType, bodySnippet }) || STATUS.FAIL;
    }

    if (status === STATUS.PASS && expectedContentType) {
      summary += `, content-type ${contentType || '-'}`;
    }
    if (status !== STATUS.PASS && status !== STATUS.EXPECTED_PRIVATE && !typeMatches) {
      summary = `Content-Type expected ${expectedContentType}, got ${contentType || '-'}.`;
    }
    if (status !== STATUS.PASS && status !== STATUS.EXPECTED_PRIVATE && !bodyMatches) {
      summary = `Body did not include expected text: ${bodyIncludes}`;
    }

    return addResult(section, status, name, {
      url,
      httpStatus: response.status,
      contentType,
      durationMs: Date.now() - started,
      summary,
      bodySnippet: status === STATUS.FAIL ? bodySnippet : undefined
    });
  } catch (error) {
    return addResult(section, STATUS.FAIL, name, {
      url,
      durationMs: Date.now() - started,
      summary: error.name === 'AbortError' ? `Timed out after ${timeoutMs}ms.` : error.message
    });
  }
}

async function jsonValueCheck(spec) {
  const {
    name,
    url,
    section = 'Cloud endpoints',
    predicate,
    passSummary = 'JSON predicate passed.',
    failSummary = 'JSON predicate failed.',
    timeoutMs = options.timeoutMs
  } = spec;

  const started = Date.now();
  try {
    const response = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' }, timeoutMs);
    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      return addResult(section, STATUS.FAIL, name, {
        url,
        httpStatus: response.status,
        durationMs: Date.now() - started,
        summary: 'Response was not valid JSON.',
        bodySnippet: tail(text, 900)
      });
    }

    const passed = response.ok && predicate(payload);
    return addResult(section, passed ? STATUS.PASS : STATUS.FAIL, name, {
      url,
      httpStatus: response.status,
      durationMs: Date.now() - started,
      summary: passed ? passSummary : failSummary,
      payload: passed ? undefined : payload
    });
  } catch (error) {
    return addResult(section, STATUS.FAIL, name, {
      url,
      durationMs: Date.now() - started,
      summary: error.name === 'AbortError' ? `Timed out after ${timeoutMs}ms.` : error.message
    });
  }
}

async function runCommand(spec) {
  const {
    name,
    section,
    cwd = ROOT,
    command,
    args: cmdArgs = [],
    timeoutMs = 120000,
    okStatus = STATUS.PASS,
    failStatus = STATUS.FAIL,
    classify
  } = spec;

  const started = Date.now();
  const printable = [command, ...cmdArgs].join(' ');

  return await new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const useShell = process.platform === 'win32';
    const spawnCommand = useShell ? [command, ...cmdArgs].map(quoteShellArg).join(' ') : command;
    const spawnArgs = useShell ? [] : cmdArgs;

    const child = spawn(spawnCommand, spawnArgs, {
      cwd,
      shell: useShell,
      env: { ...process.env, CI: process.env.CI || '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      const status = classify?.({ error, stdout, stderr, timedOut, code: null }) || STATUS.BLOCKED_ENV;
      resolve(addResult(section, status, name, {
        command: printable,
        cwd: path.relative(ROOT, cwd) || '.',
        durationMs: Date.now() - started,
        summary: error.message,
        stdout: tail(stdout),
        stderr: tail(stderr)
      }));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const status = classify?.({ code, stdout, stderr, timedOut }) || (code === 0 ? okStatus : failStatus);
      const summary = timedOut
        ? `Timed out after ${timeoutMs}ms.`
        : code === 0
          ? 'Command completed.'
          : `Command exited ${code}.`;
      resolve(addResult(section, status, name, {
        command: printable,
        cwd: path.relative(ROOT, cwd) || '.',
        exitCode: code,
        durationMs: Date.now() - started,
        summary,
        stdout: tail(stdout),
        stderr: tail(stderr)
      }));
    });
  });
}

async function commandOutput(spec) {
  const item = await runCommand({ ...spec, failStatus: STATUS.WARN });
  return item;
}

async function inventoryApps() {
  const appEntries = [];
  const appDirs = await fs.readdir(APPS_DIR, { withFileTypes: true }).catch(() => []);

  for (const entry of appDirs.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const appPath = path.join(APPS_DIR, entry.name);
    const packagePath = path.join(appPath, 'package.json');
    const pkg = await readJsonIfExists(packagePath);
    const nestedPackages = [];

    if (!pkg) {
      const children = await fs.readdir(appPath, { withFileTypes: true }).catch(() => []);
      for (const child of children.filter((item) => item.isDirectory())) {
        const nestedPackagePath = path.join(appPath, child.name, 'package.json');
        if (await pathExists(nestedPackagePath)) nestedPackages.push(child.name);
      }
    }

    const scripts = pkg?.scripts ? Object.keys(pkg.scripts).sort() : [];
    const status = pkg || nestedPackages.length > 0 ? STATUS.PASS : STATUS.PASS;
    const summary = pkg
      ? `package.json found with ${scripts.length} scripts.`
      : nestedPackages.length > 0
        ? `No root package.json; nested packages: ${nestedPackages.join(', ')}.`
        : 'No package.json; static/manual app inventory only.';

    appEntries.push({
      name: entry.name,
      path: path.relative(ROOT, appPath),
      hasPackageJson: Boolean(pkg),
      packageName: pkg?.name || null,
      scripts,
      nestedPackages,
      summary
    });

    addResult('App inventory', status, `APPS/${entry.name}`, {
      path: path.relative(ROOT, appPath),
      packageName: pkg?.name,
      scripts,
      nestedPackages,
      summary
    });
  }

  const workerDirs = await fs.readdir(WORKERS_DIR, { withFileTypes: true }).catch(() => []);
  for (const entry of workerDirs.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const workerPath = path.join(WORKERS_DIR, entry.name);
    const pkg = await readJsonIfExists(path.join(workerPath, 'package.json'));
    addResult('App inventory', STATUS.PASS, `workers/${entry.name}`, {
      path: path.relative(ROOT, workerPath),
      packageName: pkg?.name,
      scripts: pkg?.scripts ? Object.keys(pkg.scripts).sort() : [],
      summary: pkg ? 'Worker package.json found.' : 'Worker folder inventory only.'
    });
  }

  return appEntries;
}

async function checkLocalPorts() {
  const ports = [3000, 3001, 3101, 3102, 4178, 5000, 5173, 8000, 8787];
  await Promise.all(ports.map((port) => new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port, timeout: 800 });
    let settled = false;
    const finish = (isOpen) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      addResult('Local runtime', isOpen ? STATUS.WARN : STATUS.PASS, `localhost:${port}`, {
        port,
        summary: isOpen ? 'A process is listening on this common FTC dev port.' : 'No listener on this common FTC dev port.'
      });
      resolve();
    };
    socket.on('connect', () => finish(true));
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
  })));
}

async function cloudEndpointChecks() {
  const endpointSpecs = [
    { name: 'Una Labs home', url: 'https://unalabs.cloud/', expectedContentType: 'text/html' },
    { name: 'Una Labs capabilities', url: 'https://unalabs.cloud/capabilities', expectedContentType: 'text/html' },
    { name: 'Una Labs Anion product page', url: 'https://unalabs.cloud/products/anion', expectedContentType: 'text/html' },
    { name: 'Anion app home', url: 'https://anion.unalabs.cloud/', expectedContentType: 'text/html' },
    { name: 'Anion API health', url: 'https://anion.unalabs.cloud/api/health', expectedContentType: 'application/json' },
    { name: 'Anion API status', url: 'https://anion.unalabs.cloud/api/status', expectedContentType: 'application/json' },
    { name: 'Garden home', url: 'https://gardencleaners.ca/', expectedContentType: 'text/html' },
    { name: 'Garden portal', url: 'https://gardencleaners.ca/portal', expectedContentType: 'text/html' },
    { name: 'Garden quote', url: 'https://gardencleaners.ca/quote', expectedContentType: 'text/html' },
    { name: 'Garden contact', url: 'https://gardencleaners.ca/contact', expectedContentType: 'text/html' },
    { name: 'Garden services', url: 'https://gardencleaners.ca/services', expectedContentType: 'text/html' },
    { name: 'Garden legacy portal redirect', url: 'https://gardencleaners.ca/garden-cleaners/portal', expectedStatuses: [200, 301, 302, 307, 308] },
    { name: 'CapSigma home', url: 'https://capsigma-growth-desk.pages.dev/', expectedContentType: 'text/html' },
    { name: 'CapSigma session API', url: 'https://capsigma-growth-desk.pages.dev/api/session', expectedContentType: 'application/json' },
    { name: 'PeacePad home', url: 'https://peacepad.ca/', expectedContentType: 'text/html' },
    { name: 'PeacePad API /health', url: 'https://api.peacepad.ca/health', expectedContentType: 'application/json' },
    { name: 'PeacePad API /api/health', url: 'https://api.peacepad.ca/api/health', expectedContentType: 'application/json' },
    { name: 'SayWetin home', url: 'https://saywetin.app/', expectedContentType: 'text/html' },
    { name: 'SayWetin www home', url: 'https://www.saywetin.app/', expectedContentType: 'text/html' },
    { name: 'SayWetin API /health', url: 'https://api.saywetin.app/health', expectedContentType: 'application/json' },
    { name: 'SayWetin API /api/status', url: 'https://api.saywetin.app/api/status', expectedContentType: 'application/json' },
    { name: 'Dispatch home', url: 'https://dispatch.unalabs.cloud/', expectedContentType: 'text/html' },
    { name: 'Dispatch health', url: 'https://dispatch.unalabs.cloud/health', expectedContentType: 'application/json' },
    {
      name: 'Ops private console',
      url: 'https://ops.unalabs.cloud/',
      expectedStatuses: [200],
      expectedPrivateStatuses: [302, 401, 403],
      expectedContentType: 'text/html'
    },
    {
      name: 'ATEAM public surface',
      url: 'https://ateam.unalabs.cloud/',
      expectedStatuses: [200],
      expectedPrivateStatuses: [302, 404, 401, 403],
      expectedContentType: 'text/html'
    }
  ];

  for (const spec of endpointSpecs) {
    await endpointCheck(spec);
  }

  await jsonValueCheck({
    name: 'SayWetin database connectivity',
    url: 'https://api.saywetin.app/api/status',
    predicate: (payload) => Boolean(payload?.database?.configured && payload?.database?.connected),
    passSummary: 'database.configured=true and database.connected=true.',
    failSummary: 'SayWetin API reports database.connected=false. Verify DATABASE_URL and Railway database reachability.'
  });
}

async function vendorChecks() {
  await runCommand({
    section: 'Credentials and vendors',
    name: 'Cloudflare Wrangler identity',
    command: 'npx',
    args: ['wrangler', 'whoami'],
    timeoutMs: 60000,
    failStatus: STATUS.BLOCKED_EXTERNAL
  });

  await runCommand({
    section: 'Credentials and vendors',
    name: 'Railway API identity/projects',
    command: 'railway',
    args: ['status', '--json'],
    timeoutMs: 45000,
    classify: ({ code, stdout, stderr }) => {
      const text = `${stdout}\n${stderr}`;
      if (/Not Authorized|Unauthorized|invalid token|not logged in/i.test(text)) return STATUS.BLOCKED_EXTERNAL;
      return code === 0 ? STATUS.PASS : STATUS.BLOCKED_EXTERNAL;
    }
  });

  const envKeys = [
    'CLOUDFLARE_API_TOKEN',
    'RAILWAY_TOKEN',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DAILY_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_RESTRICTED_KEY',
    'GITHUB_TOKEN',
    'GH_TOKEN'
  ];

  for (const key of envKeys) {
    addResult('Credentials and vendors', process.env[key] ? STATUS.PASS : STATUS.WARN, `env:${key}`, {
      summary: process.env[key]
        ? 'Present in current shell; value not printed.'
        : 'Not present in current shell. Runtime or CLI config may still provide this credential.'
    });
  }
}

async function githubScheduleChecks() {
  const workflows = ['anion-scheduled-deploy.yml', 'ftc-site-deploy.yml'];

  for (const workflow of workflows) {
    const item = await commandOutput({
      section: 'Deploy schedules',
      name: `GitHub schedule ${workflow}`,
      command: 'gh',
      args: [
        'run',
        'list',
        '--workflow',
        workflow,
        '--limit',
        '5',
        '--json',
        'databaseId,status,conclusion,createdAt,event,displayTitle,headBranch'
      ],
      timeoutMs: 45000
    });

    if (item.status === STATUS.PASS || item.status === STATUS.WARN) {
      try {
        const runs = JSON.parse(item.stdout || '[]');
        const failed = runs.filter((run) => run.conclusion && run.conclusion !== 'success').length;
        item.status = failed > 0 ? STATUS.WARN : STATUS.PASS;
        item.summary = failed > 0
          ? `${failed}/${runs.length} recent runs were not successful. Bypass with direct local/cloud checks tonight.`
          : `${runs.length} recent runs are successful.`;
        item.runs = runs;
      } catch {
        item.status = STATUS.WARN;
        item.summary = 'Could not parse gh run list JSON output.';
      }
    }
  }
}

async function productionScriptChecks() {
  const specs = [
    {
      section: 'Cloud command checks',
      name: 'Anion production smoke',
      cwd: path.join(APPS_DIR, 'anion'),
      command: 'npm',
      args: ['run', 'verify:prod', '--', '--base-url', 'https://anion.unalabs.cloud', '--check-daily-room'],
      timeoutMs: 120000
    },
    {
      section: 'Cloud command checks',
      name: 'Anion production doctor',
      cwd: path.join(APPS_DIR, 'anion'),
      command: 'npm',
      args: ['run', 'prod:doctor'],
      timeoutMs: 120000,
      classify: ({ code, stdout, stderr }) => {
        const text = `${stdout}\n${stderr}`;
        if (/video|stripe|service[_ -]?role|blocker/i.test(text)) return code === 0 ? STATUS.PASS : STATUS.WARN;
        return code === 0 ? STATUS.PASS : STATUS.FAIL;
      }
    },
    {
      section: 'Cloud command checks',
      name: 'CapSigma production doctor',
      cwd: path.join(APPS_DIR, 'capsigma-growth-desk'),
      command: 'npm',
      args: ['run', 'prod:doctor'],
      timeoutMs: 120000
    },
    {
      section: 'Cloud command checks',
      name: 'PeacePad production verifier',
      command: 'powershell',
      args: ['-ExecutionPolicy', 'Bypass', '-File', 'scripts\\verify-peacepad-prod.ps1', '-TimeoutSec', '20'],
      timeoutMs: 90000
    },
    {
      section: 'Cloud command checks',
      name: 'PeacePad deployment ownership',
      command: 'npm',
      args: ['run', 'verify:peacepad:ownership'],
      timeoutMs: 120000,
      classify: ({ code, stdout, stderr }) => {
        const text = `${stdout}\n${stderr}`;
        if (code === 0 && /\[Ownership\]\s+PASS/i.test(text)) return STATUS.PASS;
        if (/should be|does not reference|got server=|got \d{3}/i.test(text)) return STATUS.FAIL;
        return code === 0 ? STATUS.PASS : STATUS.FAIL;
      }
    },
    {
      section: 'Cloud command checks',
      name: 'SayWetin production verifier',
      command: 'powershell',
      args: ['-ExecutionPolicy', 'Bypass', '-File', 'scripts\\verify-saywetin-prod.ps1', '-TimeoutSec', '20'],
      timeoutMs: 90000
    }
  ];

  for (const spec of specs) {
    await runCommand(spec);
  }
}

function normalizeHref(pageUrl, href) {
  const raw = href.trim();
  if (!raw || raw.startsWith('#')) return null;
  if (/^(mailto|tel|sms|javascript|data):/i.test(raw)) return null;
  try {
    const url = new URL(raw, pageUrl);
    const source = new URL(pageUrl);
    if (url.origin !== source.origin) return null;
    url.hash = '';
    if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|mjs|map|pdf|zip|mp4|webm|woff2?|ttf)$/i.test(url.pathname)) return null;
    if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/assets/')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function crawlLinks() {
  const pages = [
    'https://unalabs.cloud/',
    'https://unalabs.cloud/capabilities',
    'https://unalabs.cloud/products/anion',
    'https://gardencleaners.ca/',
    'https://gardencleaners.ca/portal',
    'https://peacepad.ca/',
    'https://saywetin.app/',
    'https://dispatch.unalabs.cloud/',
    'https://capsigma-growth-desk.pages.dev/'
  ];

  const queue = [];
  const seen = new Set();

  for (const pageUrl of pages) {
    try {
      const response = await fetchWithTimeout(pageUrl, { redirect: 'follow' }, options.timeoutMs);
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('text/html')) {
        addResult('Broken links', STATUS.WARN, `crawl source ${pageUrl}`, {
          url: pageUrl,
          httpStatus: response.status,
          contentType,
          summary: 'Source page was not crawlable HTML.'
        });
        continue;
      }
      const html = await response.text();
      const matches = html.matchAll(/href\s*=\s*["']([^"']+)["']/gi);
      let count = 0;
      for (const match of matches) {
        const href = normalizeHref(pageUrl, match[1]);
        if (!href || seen.has(href)) continue;
        seen.add(href);
        queue.push({ source: pageUrl, url: href });
        count += 1;
        if (queue.length >= options.maxLinks) break;
      }
      addResult('Broken links', STATUS.PASS, `crawl source ${pageUrl}`, {
        url: pageUrl,
        summary: `Queued ${count} same-origin links.`
      });
      if (queue.length >= options.maxLinks) break;
    } catch (error) {
      addResult('Broken links', STATUS.WARN, `crawl source ${pageUrl}`, {
        url: pageUrl,
        summary: error.message
      });
    }
  }

  for (const link of queue.slice(0, options.maxLinks)) {
    try {
      const response = await fetchWithTimeout(link.url, { method: 'GET', redirect: 'follow' }, options.timeoutMs);
      const status = response.status >= 400 ? STATUS.FAIL : STATUS.PASS;
      addResult('Broken links', status, `link ${new URL(link.url).pathname || '/'}`, {
        source: link.source,
        url: link.url,
        httpStatus: response.status,
        summary: status === STATUS.PASS ? `HTTP ${response.status}` : `Unexpected HTTP ${response.status}`
      });
    } catch (error) {
      addResult('Broken links', STATUS.FAIL, `link ${link.url}`, {
        source: link.source,
        url: link.url,
        summary: error.message
      });
    }
  }
}

async function deepLocalChecks() {
  if (options.skipLocal) return;

  const standardNotice = options.deepLocal
    ? 'Deep local build/test gates enabled.'
    : 'Deep local build/test gates skipped; run npm run health:audit -- --deep-local --no-fail to execute them.';
  addResult('Local gates', STATUS.PASS, 'local gate mode', { summary: standardNotice });

  if (!options.deepLocal) return;

  const specs = [
    { app: 'anion', scripts: ['check', 'test', 'build'], timeoutMs: 240000 },
    { app: 'ftc-site', scripts: ['build'], timeoutMs: 240000 },
    { app: 'gardencleaners-site', scripts: ['build'], timeoutMs: 180000 },
    { app: 'capsigma-growth-desk', scripts: ['check'], timeoutMs: 180000 },
    { app: 'peacepad', scripts: ['check', 'build:frontend', 'build:api'], timeoutMs: 300000 },
    { app: 'saywetin', scripts: ['check', 'build:prod'], timeoutMs: 300000 },
    { app: 'dispatch', scripts: ['check', 'build'], timeoutMs: 240000 }
  ];

  for (const spec of specs) {
    const appPath = path.join(APPS_DIR, spec.app);
    const pkg = await readJsonIfExists(path.join(appPath, 'package.json'));
    if (!pkg) {
      addResult('Local gates', STATUS.BLOCKED_ENV, `${spec.app} package`, {
        path: path.relative(ROOT, appPath),
        summary: 'package.json not found.'
      });
      continue;
    }
    for (const script of spec.scripts) {
      if (!pkg.scripts?.[script]) {
        addResult('Local gates', STATUS.WARN, `${spec.app} npm run ${script}`, {
          path: path.relative(ROOT, appPath),
          summary: 'Script not defined.'
        });
        continue;
      }
      await runCommand({
        section: 'Local gates',
        name: `${spec.app} npm run ${script}`,
        cwd: appPath,
        command: 'npm',
        args: ['run', script],
        timeoutMs: spec.timeoutMs
      });
    }
  }
}

function deriveRecoveryActions() {
  const peacepadFailures = results.filter((item) => item.name.includes('PeacePad') && item.status === STATUS.FAIL);
  if (peacepadFailures.length > 0) {
    addRecovery(
      'P0',
      'Railway/PeacePad',
      'Restore Railway access, then confirm api.peacepad.ca points to the PeacePad API service and that the deployed service exposes /health and /api/health.',
      peacepadFailures.map((item) => `${item.name}: ${item.summary}`).join(' | ')
    );
  }

  const railwayBlocked = results.find((item) => item.name === 'Railway API identity/projects' && item.status === STATUS.BLOCKED_EXTERNAL);
  if (railwayBlocked) {
    addRecovery(
      'P0',
      'Railway account',
      'Fix Railway account billing/token authorization before attempting Railway service or domain changes.',
      railwayBlocked.stdout || railwayBlocked.stderr || railwayBlocked.summary
    );
  }

  const saywetinDbFailure = results.find((item) => item.name === 'SayWetin database connectivity' && item.status === STATUS.FAIL);
  if (saywetinDbFailure) {
    addRecovery(
      'P0',
      'Railway/SayWetin',
      'Verify SayWetin DATABASE_URL and database network reachability from the deployed API service.',
      saywetinDbFailure.summary
    );
  }

  const scheduleWarns = results.filter((item) => item.section === 'Deploy schedules' && item.status === STATUS.WARN);
  if (scheduleWarns.length > 0) {
    addRecovery(
      'P1',
      'GitHub Actions',
      'Repair GitHub hosted runner entitlement or billing after production routes are stable; manual dispatch also fails before checkout when no runner is assigned.',
      scheduleWarns.map((item) => item.name).join(', ')
    );
  }

  const failedLinks = results.filter((item) => item.section === 'Broken links' && item.status === STATUS.FAIL);
  if (failedLinks.length > 0) {
    addRecovery(
      'P1',
      'Public web',
      'Fix unexpected broken internal links on critical public surfaces.',
      failedLinks.slice(0, 5).map((item) => `${item.url}: ${item.httpStatus || item.summary}`).join(' | ')
    );
  }

  const localFailures = results.filter((item) => item.section === 'Local gates' && item.status === STATUS.FAIL);
  if (localFailures.length > 0) {
    addRecovery(
      'P1',
      'Local app owners',
      'Resolve failing local build/test gates before calling the corresponding app locally healthy.',
      localFailures.slice(0, 6).map((item) => `${item.name}: ${item.summary}`).join(' | ')
    );
  }
}

function countsByStatus() {
  return results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
}

function sectionRows(section) {
  return results.filter((item) => item.section === section);
}

function markdownTable(rows) {
  if (rows.length === 0) return '_No entries._\n';
  const lines = ['| Status | Check | Summary |', '|---|---|---|'];
  for (const row of rows) {
    const summary = row.summary || row.url || row.command || '-';
    lines.push(`| ${row.status} | ${escapeMd(row.name)} | ${escapeMd(summary)} |`);
  }
  return `${lines.join('\n')}\n`;
}

function escapeMd(value) {
  return String(value || '-').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

async function writeReports(startedAt, finishedAt) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const stamp = nowStamp();
  const jsonPath = path.join(REPORT_DIR, `FTC-HEALTH-AUDIT-${stamp}.json`);
  const mdPath = path.join(REPORT_DIR, `FTC-HEALTH-AUDIT-${stamp}.md`);
  const latestJsonPath = path.join(REPORT_DIR, 'FTC-HEALTH-AUDIT-LATEST.json');
  const latestMdPath = path.join(REPORT_DIR, 'FTC-HEALTH-AUDIT-LATEST.md');
  const counts = countsByStatus();
  const sections = [...new Set(results.map((item) => item.section))];

  const report = {
    generatedAt: finishedAt,
    startedAt,
    root: ROOT,
    options,
    counts,
    results,
    recoveryActions
  };

  const md = [
    '# FTC Health Audit',
    '',
    `Generated: ${finishedAt}`,
    `Root: \`${ROOT}\``,
    '',
    '## Summary',
    '',
    Object.values(STATUS).map((status) => `- ${status}: ${counts[status] || 0}`).join('\n'),
    '',
    '## Recovery Actions',
    '',
    recoveryActions.length
      ? recoveryActions.map((item) => `- ${item.priority} ${item.owner}: ${item.action}${item.evidence ? ` Evidence: ${escapeMd(item.evidence)}` : ''}`).join('\n')
      : '- No recovery actions derived.',
    '',
    ...sections.flatMap((section) => [
      `## ${section}`,
      '',
      markdownTable(sectionRows(section)),
      ''
    ])
  ].join('\n');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(mdPath, `${md.trimEnd()}\n`, 'utf8');
  await fs.writeFile(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(latestMdPath, `${md.trimEnd()}\n`, 'utf8');
  return { jsonPath, mdPath, counts };
}

async function main() {
  const startedAt = new Date().toISOString();

  addResult('Audit metadata', STATUS.PASS, 'audit scope', {
    summary: 'Every APPS folder plus workers inventory; cloud endpoints; credentials; deploy schedules; link crawl; optional deep local gates.'
  });

  await inventoryApps();
  await cloudEndpointChecks();
  await vendorChecks();
  await githubScheduleChecks();
  await productionScriptChecks();
  await crawlLinks();

  if (!options.cloudOnly) {
    await checkLocalPorts();
    await deepLocalChecks();
  }

  deriveRecoveryActions();
  const finishedAt = new Date().toISOString();
  const { jsonPath, mdPath, counts } = await writeReports(startedAt, finishedAt);

  console.log('FTC health audit complete.');
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${mdPath}`);
  console.log(`Counts: ${JSON.stringify(counts)}`);

  const hasFail = results.some((item) => item.status === STATUS.FAIL);
  if (hasFail && !options.noFail) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  addResult('Audit metadata', STATUS.FAIL, 'audit runner fatal error', {
    summary: error.stack || error.message
  });
  console.error(error);
  process.exitCode = 1;
});
