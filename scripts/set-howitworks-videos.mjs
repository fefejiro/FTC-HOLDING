import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetPath = path.join(root, 'APPS', 'una-labs-site', 'components', 'sections', 'HowItWorksContent.tsx');

const FLAG_TO_LABEL = {
  forms: 'Forms & Intake',
  proposals: 'Proposals',
  contracts: 'Contracts & E-sign',
  billing: 'Billing & Payments',
  instantBill: 'Instant Bill',
  autocollect: 'AutoCollect',
};

function printUsage() {
  console.log('Usage:');
  console.log('  npm run howitworks:videos -- --forms <url> --proposals <url> --contracts <url> --billing <url> --instantBill <url> --autocollect <url>');
  console.log('');
  console.log('Optional flags:');
  console.log('  --clear            Clear all configured URLs for the managed demo set');
  console.log('  --dry-run          Show planned changes without writing file');
  console.log('  --help             Show usage');
}

function parseArgs(argv) {
  const args = { updates: {}, clear: false, dryRun: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    if (key === 'help') {
      args.help = true;
      continue;
    }
    if (key === 'clear') {
      args.clear = true;
      continue;
    }
    if (key === 'dry-run') {
      args.dryRun = true;
      continue;
    }

    if (Object.hasOwn(FLAG_TO_LABEL, key)) {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for --${key}`);
      }
      args.updates[FLAG_TO_LABEL[key]] = value;
      i += 1;
    }
  }

  return args;
}

function normalizeUrl(raw) {
  if (!raw) return '';
  const value = raw.trim();
  if (!value) return '';
  return value;
}

function upsertUrlBlock(source, updates, clear) {
  const startMarker = 'const ARCADE_DEMO_URLS: Partial<Record<string, string>> = {';
  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error('Could not find ARCADE_DEMO_URLS block in HowItWorksContent.tsx');
  }

  const end = source.indexOf('};', start);
  if (end === -1) {
    throw new Error('Could not find end of ARCADE_DEMO_URLS block in HowItWorksContent.tsx');
  }

  const entries = Object.values(FLAG_TO_LABEL)
    .map((label) => {
      if (clear) return `  ${JSON.stringify(label)}: '',`;
      if (Object.hasOwn(updates, label)) {
        return `  ${JSON.stringify(label)}: ${JSON.stringify(normalizeUrl(updates[label]))},`;
      }
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingLine = source.slice(start, end).match(new RegExp(`^\\s*["']${escapedLabel}["']\\s*:\\s*.*,$`, 'm'));
      return existingLine ? existingLine[0].replace(/^\s*/, '  ') : `  ${JSON.stringify(label)}: '',`;
    })
    .join('\n');

  const replacement = `${startMarker}\n${entries}\n`;
  return source.slice(0, start) + replacement + source.slice(end);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  if (!args.clear && Object.keys(args.updates).length === 0) {
    printUsage();
    throw new Error('No updates provided. Pass at least one demo URL flag or --clear.');
  }

  const source = fs.readFileSync(targetPath, 'utf8');
  const next = upsertUrlBlock(source, args.updates, args.clear);

  if (args.dryRun) {
    console.log('Dry run: ARCADE_DEMO_URLS would be updated in:');
    console.log(path.relative(root, targetPath));
    return;
  }

  fs.writeFileSync(targetPath, next, 'utf8');
  console.log('Updated How It Works video URLs in:');
  console.log(path.relative(root, targetPath));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}