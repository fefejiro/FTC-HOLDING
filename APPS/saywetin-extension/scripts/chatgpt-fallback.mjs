import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

function getArgValue(flag, defaultValue = '') {
  const idx = args.indexOf(flag);
  if (idx === -1) return defaultValue;
  const value = args[idx + 1];
  if (!value || value.startsWith('--')) return defaultValue;
  return value;
}

function hasFlag(flag) {
  return args.includes(flag);
}

const mode = getArgValue('--mode', 'g41').toLowerCase();
const openChat = hasFlag('--open');
const autoPaste = hasFlag('--paste');
const autoSend = hasFlag('--send');

const taskFromFlag = getArgValue('--task', '');
const positional = args.filter((a) => !a.startsWith('--'));
const taskFromPositional = positional.slice(1).join(' ').trim();
const task = (taskFromFlag || taskFromPositional || 'Task not provided').trim();

const promptFileByMode = {
  g41: '.github/prompts/chatgpt41-fallback.prompt.md',
  g41qa: '.github/prompts/chatgpt41-fallback-qa-e2e.prompt.md',
  g41audit: '.github/prompts/chatgpt41-fallback-audit.prompt.md',
};

if (!promptFileByMode[mode]) {
  console.error('Invalid mode. Use --mode g41, --mode g41qa, or --mode g41audit');
  process.exit(1);
}

if (autoSend && !autoPaste) {
  console.error('Invalid flags. --send requires --paste.');
  process.exit(1);
}

const repoRoot = process.cwd();
const promptPath = path.join(repoRoot, promptFileByMode[mode]);

if (!fs.existsSync(promptPath)) {
  console.error(`Prompt file not found: ${promptPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(promptPath, 'utf8');

function stripFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return text;
  return text.slice(end + 4).trimStart();
}

const promptBody = stripFrontmatter(raw).trim();

const payload = [
  promptBody,
  '',
  '## Active Task',
  '',
  `- Goal: ${task}`,
  '- Target area: UNKNOWN',
  '- Constraints: Preserve existing behavior outside requested scope',
  '- Acceptance criteria: Task is complete with evidence-backed verification',
  '- Available evidence: UNKNOWN',
  '- Blocked items: UNKNOWN',
].join('\n');

function copyToClipboardWindows(text) {
  const result = spawnSync(
    'powershell',
    ['-NoProfile', '-Command', '$input | Set-Clipboard'],
    { input: text, encoding: 'utf8' },
  );

  if (result.status !== 0) {
    const stderr = (result.stderr || '').toString().trim();
    throw new Error(stderr || 'Failed to copy to clipboard');
  }
}

try {
  copyToClipboardWindows(payload);
  console.log('Copied ChatGPT prompt to clipboard.');
  console.log(`Mode: ${mode}`);
  console.log(`Task: ${task}`);
} catch (error) {
  console.error('Clipboard copy failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (openChat) {
  spawnSync('powershell', ['-NoProfile', '-Command', 'Start-Process "https://chatgpt.com/?model=gpt-4.1"'], {
    encoding: 'utf8',
  });
  console.log('Opened ChatGPT 4.1 in browser.');
}

if (autoPaste) {
  const activateAndPaste = [
    '$wshell = New-Object -ComObject WScript.Shell',
    '$ok = $false',
    'for ($i = 0; $i -lt 20; $i++) {',
    '  if ($wshell.AppActivate("ChatGPT")) { $ok = $true; break }',
    '  if ($wshell.AppActivate("Google Chrome")) { $ok = $true; break }',
    '  if ($wshell.AppActivate("Microsoft Edge")) { $ok = $true; break }',
    '  if ($wshell.AppActivate("Mozilla Firefox")) { $ok = $true; break }',
    '  Start-Sleep -Milliseconds 300',
    '}',
    'if (-not $ok) { Write-Error "Could not focus ChatGPT browser window."; exit 1 }',
    'Start-Sleep -Milliseconds 350',
    '$wshell.SendKeys("^v")',
    autoSend ? 'Start-Sleep -Milliseconds 200; $wshell.SendKeys("~")' : '',
  ]
    .filter(Boolean)
    .join('; ');

  const pasteResult = spawnSync(
    'powershell',
    ['-NoProfile', '-Command', activateAndPaste],
    { encoding: 'utf8' },
  );

  if (pasteResult.status !== 0) {
    const err = (pasteResult.stderr || '').toString().trim() || 'Autopaste failed.';
    console.error(err);
    process.exit(1);
  }

  if (autoSend) {
    console.log('Auto-pasted and sent to ChatGPT.');
  } else {
    console.log('Auto-pasted into ChatGPT input.');
  }
}
