import { execSync } from 'node:child_process';

const DOC_FILES = [
  'README.md',
  'RELEASE-NOTES.md',
  'TESTING.md',
  'WEBSTORE.md',
  '.github/copilot-instructions.md',
];

const CODE_PATH_PREFIXES = ['src/', 'public/', '.github/workflows/'];
const CODE_FILES = [
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'popup.html',
  'index.html',
  'eslint.config.js',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'public/manifest.json',
  'public/background.js',
];

function run(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function isGitRepo() {
  try {
    return run('git rev-parse --is-inside-work-tree') === 'true';
  } catch {
    return false;
  }
}

function getDiffRange() {
  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef) {
    try {
      run(`git fetch origin ${baseRef} --depth=1`);
    } catch {
      // Best effort. The comparison may still work if ref already exists locally.
    }
    return `origin/${baseRef}...HEAD`;
  }

  const explicitBase = process.env.DOCS_GUARD_BASE;
  const explicitHead = process.env.DOCS_GUARD_HEAD;
  if (explicitBase && explicitHead) {
    return `${explicitBase}...${explicitHead}`;
  }

  return 'HEAD~1...HEAD';
}

function getChangedFiles(range) {
  const output = run(`git diff --name-only ${range}`);
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function matchesCodePath(file) {
  if (CODE_FILES.includes(file)) return true;
  return CODE_PATH_PREFIXES.some((prefix) => file.startsWith(prefix));
}

function matchesDocPath(file) {
  if (DOC_FILES.includes(file)) return true;
  return file.startsWith('docs/');
}

function main() {
  if (!isGitRepo()) {
    console.log('docs-guard: no git repository detected; skipping check.');
    process.exit(0);
  }

  const range = getDiffRange();
  let changedFiles;

  try {
    changedFiles = getChangedFiles(range);
  } catch (error) {
    console.error(`docs-guard: unable to read changed files for range ${range}`);
    console.error(String(error.message || error));
    process.exit(1);
  }

  if (changedFiles.length === 0) {
    console.log(`docs-guard: no file changes found for range ${range}; passing.`);
    process.exit(0);
  }

  const codeChanges = changedFiles.filter(matchesCodePath);
  const docChanges = changedFiles.filter(matchesDocPath);

  console.log(`docs-guard: checked ${changedFiles.length} changed file(s) in ${range}`);

  if (codeChanges.length > 0 && docChanges.length === 0) {
    console.error('\ndocs-guard: blocked. Code/config changed but no docs were updated.');
    console.error('Update at least one of:');
    for (const docFile of DOC_FILES) {
      console.error(`- ${docFile}`);
    }
    console.error('- docs/**');
    console.error('\nFiles treated as code/config changes:');
    for (const file of codeChanges) {
      console.error(`- ${file}`);
    }
    process.exit(1);
  }

  console.log('docs-guard: pass. Documentation coverage present for this change set.');
  process.exit(0);
}

main();
