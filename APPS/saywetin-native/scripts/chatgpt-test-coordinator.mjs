import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

function hasFlag(flag) {
  return args.includes(flag);
}

function getArgValue(flag, fallback = '') {
  const idx = args.indexOf(flag);
  if (idx === -1) return fallback;
  const value = args[idx + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

const mode = getArgValue('--mode', 'implement').toLowerCase();
const task = getArgValue('--task', 'Validate SayWetin native recognition flow end-to-end and fix defects.');
const open = hasFlag('--open');
const paste = hasFlag('--paste');
const send = hasFlag('--send');

if (!['implement', 'audit'].includes(mode)) {
  console.error('Invalid mode. Use --mode implement or --mode audit.');
  process.exit(1);
}

if (send && !paste) {
  console.error('Invalid flags. --send requires --paste.');
  process.exit(1);
}

const implementPrompt = `You are ChatGPT 4.1 acting as a senior mobile QA + React Native engineer for SayWetin Native.

Workspace root: C:/FTC HOLDING/APPS/saywetin-native
OS/Shell: Windows PowerShell
Connected device: Android phone via WiFi (adb)

Mission:
${task}

Non-negotiable rules:
1) Never invent files, test results, logs, or command outputs.
2) Discover first, then act. Confirm paths and scripts before edits.
3) Mark unknowns as UNKNOWN.
4) Do not claim pass/fix without command evidence.
5) Keep edits minimal and scoped.

Execution requirements:
1) Run baseline checks: npm install (if needed), npx tsc --noEmit.
2) Validate runtime flow on device logs: listen -> uploading -> matching -> result.
3) Validate slow-network behavior and user messaging progression.
4) Fix defects found, then rerun checks.
5) Summarize risks and remaining gaps.

Output format (required):
- Assumptions
- Plan
- Commands Run
- Evidence
- Files Changed
- Findings (P0/P1/P2)
- Residual Risks
- Go/No-Go Recommendation`;

const auditPrompt = `You are ChatGPT 4.1 acting as an INDEPENDENT auditor. You must distrust previous implementation claims and re-verify from scratch.

Workspace root: C:/FTC HOLDING/APPS/saywetin-native
OS/Shell: Windows PowerShell
Connected device: Android phone via WiFi (adb)

Audit objective:
${task}

Rules:
1) Do not trust prior summaries without proof.
2) Re-run critical checks and tests yourself.
3) Do not invent outputs, files, or results.
4) Missing evidence must be BLOCKED.

Required audit checks:
1) npx tsc --noEmit
2) Verify device/app process state via adb where relevant
3) Re-test recognition flow assertions and slow-network messaging claims
4) Inspect changed files for regression risk

Report format:
- Audit Verdict (Pass / Conditional Pass / Fail)
- Evidence Reviewed
- Mismatches vs claimed results
- Findings (P0/P1/P2)
- Required Fixes
- Residual Risks
- Release Recommendation`;

const payload = mode === 'audit' ? auditPrompt : implementPrompt;

function copyToClipboard(text) {
  const result = spawnSync('powershell', ['-NoProfile', '-Command', '$input | Set-Clipboard'], {
    input: text,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || '').toString().trim() || 'Failed to copy prompt to clipboard.');
  }
}

function focusAndPaste(doSend) {
  const script = [
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
    doSend ? 'Start-Sleep -Milliseconds 200; $wshell.SendKeys("~")' : '',
  ]
    .filter(Boolean)
    .join('; ');

  const result = spawnSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error((result.stderr || '').toString().trim() || 'Autopaste failed.');
  }
}

try {
  copyToClipboard(payload);
  console.log(`Copied ${mode} prompt to clipboard.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (open) {
  spawnSync('powershell', ['-NoProfile', '-Command', 'Start-Process "https://chatgpt.com/?model=gpt-4.1"'], {
    encoding: 'utf8',
  });
  console.log('Opened ChatGPT 4.1.');
}

if (paste) {
  try {
    focusAndPaste(send);
    console.log(send ? 'Auto-pasted and sent.' : 'Auto-pasted.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
