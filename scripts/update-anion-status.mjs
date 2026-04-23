import fs from 'node:fs';
import path from 'node:path';

function findRepoRoot(startDir) {
  let current = startDir;

  while (true) {
    const hasRepoSignals = [
      path.join(current, 'FTC_MASTER.md'),
      path.join(current, 'APPS', 'anion', 'ops', 'status-summary.json'),
      path.join(current, 'DOCS', 'ANION', 'status', 'STATUS.md'),
    ].every((candidate) => fs.existsSync(candidate));

    if (hasRepoSignals) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('Unable to resolve FTC HOLDING repository root for Anion status sync.');
    }

    current = parent;
  }
}

const root = findRepoRoot(process.cwd());
const artifactPath = path.join(root, 'APPS', 'anion', 'ops', 'status-summary.json');
const statusDocPath = path.join(root, 'DOCS', 'ANION', 'status', 'STATUS.md');
const masterDocPath = path.join(root, 'FTC_MASTER.md');

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

function ensureMasterSection(masterText, summaryBlock) {
  const title = '## Anion Ops Snapshot (Auto)';
  const startMarker = '<!-- AUTO:ANION_MASTER:START -->';
  const endMarker = '<!-- AUTO:ANION_MASTER:END -->';

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

function main() {
  const artifact = JSON.parse(readText(artifactPath));

  const snapshotBlock = [
    `- Updated at: ${artifact.updatedAt}`,
    `- Overall: ${artifact.overall}`,
    `- Stage: ${artifact.stage}`,
    `- Summary: ${artifact.summary}`,
  ].join('\n');

  const metricsTable = [
    '| Metric | Value | Status | Detail |',
    '|---|---|---|---|',
    ...artifact.metrics.map((metric) => `| ${metric.label} | ${metric.value} | ${metric.status} | ${metric.detail} |`),
  ].join('\n');

  const checksTable = [
    '| Check | Status | Detail |',
    '|---|---|---|',
    ...artifact.checks.map((check) => `| ${check.name} | ${check.status} | ${check.detail} |`),
  ].join('\n');

  const connectionsTable = [
    '| Connection | Status | URL | Detail |',
    '|---|---|---|---|',
    ...artifact.connections.map((connection) => `| ${connection.name} | ${connection.status} | ${connection.url} | ${connection.detail} |`),
  ].join('\n');

  const logsBlock = [
    `- Weekly status: ${artifact.logs.weeklyStatus}`,
    `- Release log: ${artifact.logs.releaseLog}`,
    `- Test evidence: ${artifact.logs.testEvidence}`,
  ].join('\n');

  const nextActionsBlock = artifact.nextActions.map((item) => `- ${item}`).join('\n');

  let statusDoc = readText(statusDocPath);
  statusDoc = replaceBetweenMarkers(statusDoc, '<!-- AUTO:ANION_SNAPSHOT:START -->', '<!-- AUTO:ANION_SNAPSHOT:END -->', snapshotBlock);
  statusDoc = replaceBetweenMarkers(statusDoc, '<!-- AUTO:ANION_METRICS:START -->', '<!-- AUTO:ANION_METRICS:END -->', metricsTable);
  statusDoc = replaceBetweenMarkers(statusDoc, '<!-- AUTO:ANION_CHECKS:START -->', '<!-- AUTO:ANION_CHECKS:END -->', checksTable);
  statusDoc = replaceBetweenMarkers(statusDoc, '<!-- AUTO:ANION_CONNECTIONS:START -->', '<!-- AUTO:ANION_CONNECTIONS:END -->', connectionsTable);
  statusDoc = replaceBetweenMarkers(statusDoc, '<!-- AUTO:ANION_LOGS:START -->', '<!-- AUTO:ANION_LOGS:END -->', logsBlock);
  statusDoc = replaceBetweenMarkers(statusDoc, '<!-- AUTO:ANION_NEXT_ACTIONS:START -->', '<!-- AUTO:ANION_NEXT_ACTIONS:END -->', nextActionsBlock);
  writeText(statusDocPath, statusDoc);

  const masterSummary = [
    `- Updated at: ${artifact.updatedAt}`,
    `- Overall: ${artifact.overall}`,
    `- Stage: ${artifact.stage}`,
    `- Metrics tracked: ${artifact.metrics.length}`,
    `- Checks tracked: ${artifact.checks.length}`,
    '- Canonical status doc: DOCS/ANION/status/STATUS.md',
  ].join('\n');

  let masterDoc = readText(masterDocPath);
  masterDoc = ensureMasterSection(masterDoc, masterSummary);
  writeText(masterDocPath, masterDoc);

  console.log('Anion status documentation updated successfully.');
}

main();