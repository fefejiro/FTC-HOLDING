import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const statusDocPath = path.join(root, 'DOCS', 'UNALABS_STATUS.md');
const masterDocPath = path.join(root, 'FTC_MASTER.md');
const rolloutDocPath = path.join(root, 'DOCS', 'ROLLOUT_PLAN_UNALABS.md');

const BASE_URL = String(process.env.UNALABS_SMOKE_BASE_URL || 'https://unalabs.cloud').trim().replace(/\/$/, '');
const WORKER_URL = String(process.env.UNALABS_SMOKE_WORKER_URL || process.env.NEXT_PUBLIC_STRIPE_API_URL || 'https://una-stripe-api.fejiro-efiuvwere.workers.dev').trim().replace(/\/$/, '');
const ADMIN_BEARER_TOKEN = String(process.env.UNALABS_SMOKE_BEARER_TOKEN || '').trim();

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function replaceBetweenMarkers(text, startMarker, endMarker, replacement) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Markers not found or malformed: ${startMarker} ... ${endMarker}`);
  }

  const before = text.slice(0, start + startMarker.length);
  const after = text.slice(end);
  return `${before}\n${replacement}\n${after}`;
}

function ensureSectionWithMarkers(docText, sectionTitle, startMarker, endMarker) {
  if (!docText.includes(sectionTitle)) {
    return `${docText.trimEnd()}\n\n## ${sectionTitle}\n\n${startMarker}\n${endMarker}\n`;
  }

  if (docText.includes(startMarker) && docText.includes(endMarker)) {
    return docText;
  }

  return docText.replace(`## ${sectionTitle}`, `## ${sectionTitle}\n\n${startMarker}\n${endMarker}`);
}

function updateLastUpdated(masterText, today) {
  return masterText.replace(/^Last updated:\s.*$/m, `Last updated: ${today}`);
}

function ensureMasterSection(masterText, summaryBlock) {
  const title = '## Una Labs Ops Snapshot (Auto)';
  const startMarker = '<!-- AUTO:UNALABS_MASTER:START -->';
  const endMarker = '<!-- AUTO:UNALABS_MASTER:END -->';

  if (!masterText.includes(title)) {
    const anchor = '\n---\n\n## Quick Commands';
    const block = `\n${title}\n\n${startMarker}\n${summaryBlock}\n${endMarker}\n`;
    if (masterText.includes(anchor)) {
      return masterText.replace(anchor, `${block}${anchor}`);
    }
    return `${masterText.trimEnd()}\n\n${block}`;
  }

  const textWithMarkers = masterText.includes(startMarker) && masterText.includes(endMarker)
    ? masterText
    : masterText.replace(title, `${title}\n\n${startMarker}\n${endMarker}`);

  return replaceBetweenMarkers(textWithMarkers, startMarker, endMarker, summaryBlock);
}

function extractSprintSection(masterText) {
  const marker = '## Una Labs Sprint — Ignition Parity Tracker';
  const start = masterText.indexOf(marker);
  if (start === -1) return 'Sprint section not found.';
  const nextBreak = masterText.indexOf('\n---', start);
  return masterText.slice(start, nextBreak === -1 ? undefined : nextBreak).trim();
}

function parseRolloutSnapshotFromMaster(masterText) {
  const tableHeader = '| Phase | What | Ignition Module | Status |';
  const tableStart = masterText.indexOf(tableHeader);
  if (tableStart === -1) {
    throw new Error('Could not find phase tracker table header in FTC_MASTER.md.');
  }

  const nextRegex = /^Next:\s*/m;
  const tableTail = masterText.slice(tableStart);
  const nextMatch = tableTail.match(nextRegex);
  if (!nextMatch || typeof nextMatch.index !== 'number') {
    throw new Error('Could not find phase tracker table end in FTC_MASTER.md.');
  }
  const tableEnd = tableStart + nextMatch.index;

  const tableBlock = masterText.slice(tableStart, tableEnd).trim();
  const lines = tableBlock.split(/\r?\n/);
  const phaseRows = lines.filter((line) => {
    if (!/^\|\s*Phase\s+/i.test(line)) return false;
    if (/^\|\s*Phase\s*\|\s*What\s*\|\s*Ignition Module\s*\|\s*Status\s*\|\s*$/i.test(line)) return false;
    return true;
  });

  if (phaseRows.length === 0) {
    throw new Error('No phase rows found in FTC_MASTER.md phase tracker table.');
  }

  const done = [];
  const inProgress = [];
  const blocked = [];

  for (const row of phaseRows) {
    const cols = row.split('|').map((col) => col.trim()).filter(Boolean);
    if (cols.length < 4) {
      throw new Error(`Malformed phase row in FTC_MASTER.md: ${row}`);
    }

    const phaseLabel = cols[0];
    const whatLabel = cols[1];
    const status = cols[3];
    const label = `${phaseLabel}: ${whatLabel}`;

    if (/blocked|❌/i.test(status)) {
      blocked.push(label);
      continue;
    }

    if (/build done|in progress|pending|🟡/i.test(status)) {
      inProgress.push(label);
      continue;
    }

    if (/✅/i.test(status) || /verified done/i.test(status) || /done/i.test(status)) {
      done.push(label);
      continue;
    }

    inProgress.push(label);
  }

  const nextLineMatch = masterText.match(/^Next:\s*(.+)$/m);
  const next = nextLineMatch ? nextLineMatch[1].trim() : 'No explicit Next line found in FTC_MASTER.md.';

  return {
    done,
    inProgress,
    blocked,
    next,
  };
}

async function runCheck(name, url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
    redirect: 'manual',
  });

  const expectedStatus = options.expectedStatus || [200];
  const statusOk = expectedStatus.includes(response.status);
  const location = response.headers.get('location');
  const locationOk = options.locationIncludes ? String(location || '').includes(options.locationIncludes) : true;
  return {
    name,
    url,
    ok: statusOk && locationOk,
    status: response.status,
    location: location || '',
    detail: statusOk && locationOk
      ? (location ? `${response.status} | ${location}` : String(response.status))
      : `expected ${expectedStatus.join('/')} got ${response.status}${location ? ` | ${location}` : ''}`,
  };
}

async function main() {
  const today = new Date().toISOString();
  const masterSource = readText(masterDocPath);
  const rolloutSnapshot = parseRolloutSnapshotFromMaster(masterSource);
  const publicChecks = [
    { name: 'Homepage', url: `${BASE_URL}/`, expectedStatus: [200] },
    { name: 'Start flow', url: `${BASE_URL}/start`, expectedStatus: [200, 308], locationIncludes: '/start/' },
    { name: 'Summary page', url: `${BASE_URL}/start/summary`, expectedStatus: [200, 308], locationIncludes: '/start/summary/' },
    { name: 'Confirmation page', url: `${BASE_URL}/confirmation`, expectedStatus: [200, 308], locationIncludes: '/confirmation/' },
    { name: 'Status page', url: `${BASE_URL}/status`, expectedStatus: [200, 308], locationIncludes: '/status/' },
    { name: 'Realtor route', url: `${BASE_URL}/realtor`, expectedStatus: [200, 308], locationIncludes: '/realtor/' },
    { name: 'Portal page', url: `${BASE_URL}/portal`, expectedStatus: [200, 308], locationIncludes: '/portal/' },
    { name: 'Proposal page', url: `${BASE_URL}/dashboard/proposal`, expectedStatus: [200, 308], locationIncludes: '/dashboard/proposal/' },
    { name: 'Report page', url: `${BASE_URL}/dashboard/report`, expectedStatus: [200, 308], locationIncludes: '/dashboard/report/' },
    { name: 'Admin page', url: `${BASE_URL}/admin`, expectedStatus: [200, 308], locationIncludes: '/admin/' },
    { name: 'Public status summary endpoint', url: `${WORKER_URL}/api/public/status-summary`, expectedStatus: [200] },
  ];

  const unauthAdminChecks = [
    {
      name: 'AutoCollect list auth guard',
      url: `${WORKER_URL}/api/admin/autocollect?limit=1`,
      expectedStatus: [401, 403],
    },
    {
      name: 'AutoCollect health auth guard',
      url: `${WORKER_URL}/api/admin/autocollect/health`,
      expectedStatus: [401, 403],
    },
    {
      name: 'AutoCollect sync auth guard',
      url: `${WORKER_URL}/api/admin/autocollect/sync`,
      method: 'POST',
      expectedStatus: [401, 403],
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overdue_only: true, limit: 1 }),
    },
    {
      name: 'AutoCollect invite auth guard',
      url: `${WORKER_URL}/api/admin/autocollect/send-invite`,
      method: 'POST',
      expectedStatus: [401, 403],
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'smoke-test' }),
    },
  ];

  const authChecks = ADMIN_BEARER_TOKEN
    ? [
        {
          name: 'AutoCollect list authenticated',
          url: `${WORKER_URL}/api/admin/autocollect?limit=1`,
          expectedStatus: [200],
          headers: { Authorization: `Bearer ${ADMIN_BEARER_TOKEN}` },
        },
        {
          name: 'AutoCollect health authenticated',
          url: `${WORKER_URL}/api/admin/autocollect/health`,
          expectedStatus: [200],
          headers: { Authorization: `Bearer ${ADMIN_BEARER_TOKEN}` },
        },
        {
          name: 'AutoCollect send-invite validation',
          url: `${WORKER_URL}/api/admin/autocollect/send-invite`,
          method: 'POST',
          expectedStatus: [400],
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ADMIN_BEARER_TOKEN}`,
          },
          body: JSON.stringify({}),
        },
        {
          name: 'AutoCollect sync authenticated',
          url: `${WORKER_URL}/api/admin/autocollect/sync`,
          method: 'POST',
          expectedStatus: [200],
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ADMIN_BEARER_TOKEN}`,
          },
          body: JSON.stringify({ overdue_only: true, limit: 1 }),
        },
      ]
    : [];

  const checks = [];
  for (const check of [...publicChecks, ...unauthAdminChecks, ...authChecks]) {
    checks.push(await runCheck(check.name, check.url, check));
  }

  const passed = checks.filter((check) => check.ok).length;
  const failed = checks.length - passed;
  const authMode = ADMIN_BEARER_TOKEN ? 'authenticated admin smoke enabled' : 'unauthenticated admin guard smoke only';
  const sprintSection = extractSprintSection(masterSource);

  const snapshotBlock = [
    `- Generated at: ${today}`,
    `- Site origin: ${BASE_URL}`,
    `- Worker origin: ${WORKER_URL}`,
    `- Smoke status: ${passed}/${checks.length} checks passed`,
    `- Admin smoke mode: ${authMode}`,
    `- Phase 9 focus: AutoCollect automation and health observability are live; scheduled run verification and paid-invoice reconciliation are the close-out steps.`,
    `- Sprint source: FTC_MASTER.md`,
  ].join('\n');

  const smokeTable = [
    '| Check | Result | Detail |',
    '|-------|--------|--------|',
    ...checks.map((check) => `| ${check.name} | ${check.ok ? 'PASS' : 'FAIL'} | ${check.detail.replace(/\|/g, '\\|')} |`),
  ].join('\n');

  let statusDoc = readText(statusDocPath);
  statusDoc = replaceBetweenMarkers(statusDoc, '<!-- AUTO:UNALABS_SNAPSHOT:START -->', '<!-- AUTO:UNALABS_SNAPSHOT:END -->', snapshotBlock);
  statusDoc = replaceBetweenMarkers(statusDoc, '<!-- AUTO:UNALABS_SMOKE:START -->', '<!-- AUTO:UNALABS_SMOKE:END -->', smokeTable);
  writeText(statusDocPath, statusDoc);

  const masterSummary = [
    `- Updated at: ${today}`,
    `- Smoke checks: ${passed}/${checks.length} passing`,
    `- Admin verification: ${authMode}`,
    `- Canonical status doc: DOCS/UNALABS_STATUS.md`,
  ].join('\n');

  let masterDoc = masterSource;
  masterDoc = ensureMasterSection(masterDoc, masterSummary);
  masterDoc = updateLastUpdated(masterDoc, today.slice(0, 10));
  writeText(masterDocPath, masterDoc);

  const rolloutStartMarker = '<!-- AUTO:UNALABS_ROLLOUT:START -->';
  const rolloutEndMarker = '<!-- AUTO:UNALABS_ROLLOUT:END -->';
  let rolloutDoc = readText(rolloutDocPath);
  rolloutDoc = ensureSectionWithMarkers(
    rolloutDoc,
    'Una Labs Rollout Ops Snapshot (Auto)',
    rolloutStartMarker,
    rolloutEndMarker,
  );

  const rolloutBlock = [
    `- Updated at: ${today}`,
    `- Done count: ${rolloutSnapshot.done.length}`,
    `- In progress count: ${rolloutSnapshot.inProgress.length}`,
    `- Blocked count: ${rolloutSnapshot.blocked.length}`,
    '- Done:',
    ...(rolloutSnapshot.done.length ? rolloutSnapshot.done.map((item) => `  - ${item}`) : ['  - None']),
    '- In progress:',
    ...(rolloutSnapshot.inProgress.length ? rolloutSnapshot.inProgress.map((item) => `  - ${item}`) : ['  - None']),
    '- Blocked:',
    ...(rolloutSnapshot.blocked.length ? rolloutSnapshot.blocked.map((item) => `  - ${item}`) : ['  - None']),
    `- Next: ${rolloutSnapshot.next}`,
  ].join('\n');

  rolloutDoc = replaceBetweenMarkers(rolloutDoc, rolloutStartMarker, rolloutEndMarker, rolloutBlock);
  writeText(rolloutDocPath, rolloutDoc);

  if (failed > 0) {
    console.error('Una Labs status sync finished with smoke failures.');
    console.error(sprintSection);
    process.exit(1);
  }

  console.log('Una Labs status documentation updated successfully.');
  console.log(`- Updated: ${path.relative(root, statusDocPath)}`);
  console.log(`- Updated: ${path.relative(root, masterDocPath)}`);
  console.log(`- Updated: ${path.relative(root, rolloutDocPath)}`);
  console.log(`- Smoke: ${passed}/${checks.length} passed (${authMode})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});