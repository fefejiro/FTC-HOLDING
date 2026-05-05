import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const metricsDocPath = path.join(root, 'DOCS', 'PEACEPAD_WEEKLY_METRICS.md');
const masterDocPath = path.join(root, 'FTC_MASTER.md');
const velocityDocPath = path.join(root, 'DOCS', 'VELOCITY_LOG.md');

const REQUIRED_FIELDS = [
  'weekStart',
  'weekEnd',
  'totalUsers',
  'newUsers',
  'activeUsers',
  'partnerships',
  'messagesSent',
  'feedbackSubmitted',
  'p1Errors',
  'p2Errors',
];

function getArg(name) {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

function requireArg(name) {
  const value = getArg(name);
  if (!value) {
    throw new Error(`Missing required argument: --${name}`);
  }
  return value;
}

function toInt(name, value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || Number.isNaN(n) || n < 0) {
    throw new Error(`Invalid non-negative integer for --${name}: ${value}`);
  }
  return n;
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function readJsonInput(fileArg) {
  const inputPath = path.isAbsolute(fileArg) ? fileArg : path.join(root, fileArg);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in input file: ${inputPath}`);
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in parsed)) {
      throw new Error(`Missing required field in input file: ${field}`);
    }
  }

  return parsed;
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

function upsertWeeklyLogRow(docText, row) {
  const lines = docText.split(/\r?\n/);
  const header = '| Week Start | Week End | Total Users | New Users | Active Users | Partnerships | Messages Sent | Feedback Submitted | P1 Errors | P2 Errors | Source |';
  const separator = '|------------|----------|-------------|-----------|--------------|--------------|---------------|--------------------|-----------|-----------|--------|';
  const tableStart = lines.findIndex((line) => line.trim() === header);

  if (tableStart === -1) {
    throw new Error('Weekly log table header not found in DOCS/PEACEPAD_WEEKLY_METRICS.md');
  }

  const firstDataRowIndex = tableStart + 2;
  if (lines[firstDataRowIndex]?.trim() !== separator) {
    // In case spacing changes, tolerate existing separator and continue.
  }

  const weekKey = `| ${row.weekStart} | ${row.weekEnd} |`;
  const existingIndex = lines.findIndex((line) => line.startsWith(weekKey));

  const newRow = `| ${row.weekStart} | ${row.weekEnd} | ${row.totalUsers} | ${row.newUsers} | ${row.activeUsers} | ${row.partnerships} | ${row.messagesSent} | ${row.feedbackSubmitted} | ${row.p1Errors} | ${row.p2Errors} | ${row.source} |`;

  if (existingIndex !== -1) {
    lines[existingIndex] = newRow;
    return lines.join('\n');
  }

  lines.splice(firstDataRowIndex + 1, 0, newRow);
  return lines.join('\n');
}

function updateMasterDoc(masterText, summaryBlock) {
  const sectionTitle = '## PeacePad Weekly Metrics (Auto)';
  const startMarker = '<!-- AUTO:PEACEPAD_MASTER:START -->';
  const endMarker = '<!-- AUTO:PEACEPAD_MASTER:END -->';

  if (!masterText.includes(sectionTitle)) {
    const appendBlock = [
      '',
      '---',
      '',
      sectionTitle,
      '',
      startMarker,
      summaryBlock,
      endMarker,
      '',
    ].join('\n');

    return `${masterText.trimEnd()}\n${appendBlock}`;
  }

  const textWithMarkers = masterText.includes(startMarker) && masterText.includes(endMarker)
    ? masterText
    : masterText.replace(sectionTitle, `${sectionTitle}\n\n${startMarker}\n${endMarker}`);

  return replaceBetweenMarkers(textWithMarkers, startMarker, endMarker, summaryBlock);
}

function updateVelocityLog(velocityText, velocityRowPrefix, velocityRow) {
  const lines = velocityText.split(/\r?\n/);

  if (lines.some((line) => line.startsWith(velocityRowPrefix))) {
    return velocityText;
  }

  const nextEntryIdx = lines.findIndex((line) => line.includes('| [next entry] |'));
  if (nextEntryIdx === -1) {
    lines.push(velocityRow);
  } else {
    lines.splice(nextEntryIdx, 0, velocityRow);
  }
  return lines.join('\n');
}

function updateLastUpdated(masterText, today) {
  return masterText.replace(/^Last updated:\s.*$/m, `Last updated: ${today}`);
}

try {
  const fromFile = getArg('fromFile');
  const fileInput = fromFile ? readJsonInput(fromFile) : null;

  const weekStart = fileInput ? String(fileInput.weekStart) : requireArg('weekStart');
  const weekEnd = fileInput ? String(fileInput.weekEnd) : requireArg('weekEnd');
  const source = fileInput
    ? String(fileInput.source || 'PeacePad Weekly Report email')
    : (getArg('source') || 'PeacePad Weekly Report email');

  const totalUsers = toInt('totalUsers', fileInput ? String(fileInput.totalUsers) : requireArg('totalUsers'));
  const newUsers = toInt('newUsers', fileInput ? String(fileInput.newUsers) : requireArg('newUsers'));
  const activeUsers = toInt('activeUsers', fileInput ? String(fileInput.activeUsers) : requireArg('activeUsers'));
  const partnerships = toInt('partnerships', fileInput ? String(fileInput.partnerships) : requireArg('partnerships'));
  const messagesSent = toInt('messagesSent', fileInput ? String(fileInput.messagesSent) : requireArg('messagesSent'));
  const feedbackSubmitted = toInt('feedbackSubmitted', fileInput ? String(fileInput.feedbackSubmitted) : requireArg('feedbackSubmitted'));
  const p1Errors = toInt('p1Errors', fileInput ? String(fileInput.p1Errors) : requireArg('p1Errors'));
  const p2Errors = toInt('p2Errors', fileInput ? String(fileInput.p2Errors) : requireArg('p2Errors'));

  const today = new Date().toISOString().slice(0, 10);

  const latestBlock = [
    `- Week: ${weekStart} to ${weekEnd}`,
    `- Total users: ${totalUsers}`,
    `- New users: ${newUsers}`,
    `- Active users: ${activeUsers}`,
    `- Partnerships: ${partnerships}`,
    `- Messages sent: ${messagesSent}`,
    `- Feedback submitted: ${feedbackSubmitted}`,
    `- P1 errors: ${p1Errors}`,
    `- P2 errors: ${p2Errors}`,
    `- Source: ${source}`,
    `- Updated at: ${today}`,
  ].join('\n');

  const masterSummaryBlock = [
    `- Reporting week: ${weekStart} to ${weekEnd}`,
    `- Users: ${totalUsers} total, ${newUsers} new, ${activeUsers} active`,
    `- Engagement: ${messagesSent} messages, ${feedbackSubmitted} feedback items`,
    `- System health: P1=${p1Errors}, P2=${p2Errors}`,
    `- Partnerships: ${partnerships}`,
    `- Source: ${source}`,
    `- Canonical log: DOCS/PEACEPAD_WEEKLY_METRICS.md`,
  ].join('\n');

  const row = {
    weekStart,
    weekEnd,
    totalUsers,
    newUsers,
    activeUsers,
    partnerships,
    messagesSent,
    feedbackSubmitted,
    p1Errors,
    p2Errors,
    source,
  };

  const metricsDocText = readText(metricsDocPath);
  if (!metricsDocText) {
    throw new Error('DOCS/PEACEPAD_WEEKLY_METRICS.md is missing. Create it before running this script.');
  }

  const metricsWithLatest = replaceBetweenMarkers(
    metricsDocText,
    '<!-- AUTO:PEACEPAD_LATEST:START -->',
    '<!-- AUTO:PEACEPAD_LATEST:END -->',
    latestBlock,
  );
  const metricsUpdated = upsertWeeklyLogRow(metricsWithLatest, row);
  writeText(metricsDocPath, metricsUpdated);

  const masterDocText = readText(masterDocPath);
  const masterWithSection = updateMasterDoc(masterDocText, masterSummaryBlock);
  const masterUpdated = updateLastUpdated(masterWithSection, today);
  writeText(masterDocPath, masterUpdated);

  const velocityDocText = readText(velocityDocPath);
  const velocityPrefix = `| ${today} | PeacePad | Weekly metrics sync (${weekStart} to ${weekEnd})`;
  const velocityRow = `${velocityPrefix} | 10 min | Metrics docs updated via automation script | Source data from weekly report email |`;
  const velocityUpdated = updateVelocityLog(velocityDocText, velocityPrefix, velocityRow);
  writeText(velocityDocPath, velocityUpdated);

  console.log('PeacePad weekly metrics documentation updated successfully.');
  console.log(`- Updated: ${path.relative(root, metricsDocPath)}`);
  console.log(`- Updated: ${path.relative(root, masterDocPath)}`);
  console.log(`- Updated: ${path.relative(root, velocityDocPath)}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
