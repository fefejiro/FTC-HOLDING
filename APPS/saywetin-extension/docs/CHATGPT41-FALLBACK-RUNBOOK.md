# ChatGPT 4.1 Fallback Runbook

Use this when Copilot premium data is exhausted and you still need disciplined engineering execution.

## 60-Second Startup

1. Open ChatGPT 4.1.
2. Paste the master prompt from .github/prompts/chatgpt41-fallback.prompt.md.
3. Paste a context bootstrap block (template below).
4. Paste the exact task.
5. Require output in the prompt schema.

## IDE Chat Keywords (Fast Path)

Use these directly in the IDE chat box:

1. `/g41 <your task>`
- Generates a copy-ready ChatGPT 4.1 engineering prompt.

2. `/g41qa <your QA task>`
- Generates a copy-ready ChatGPT 4.1 Playwright QA prompt.

3. `/chatgpt41-fallback <your task>`
- Uses the full master fallback prompt file.

4. `/chatgpt41-fallback-qa-e2e <your QA task>`
- Uses the full QA fallback prompt file.

## Fully Automated Clipboard Flow

Use these in terminal from the repo root to avoid opening any prompt file:

1. `npm run g41:copy -- --task "<your task>"`
- Builds the master fallback prompt and copies it directly to clipboard.

2. `npm run g41qa:copy -- --task "<your QA task>"`
- Builds the Playwright QA prompt and copies it directly to clipboard.

3. `npm run g41:open -- --task "<your task>"`
- Copies prompt to clipboard and opens ChatGPT 4.1 in browser.

4. `npm run g41qa:open -- --task "<your QA task>"`
- Copies QA prompt to clipboard and opens ChatGPT 4.1 in browser.

After running any command above, press Ctrl+V in ChatGPT.

## True One-Shot (No Manual Paste)

If you want zero copy/paste:

1. `npm run g41:go -- --task "<your task>"`
- Opens ChatGPT 4.1 and auto-pastes into the input box.

2. `npm run g41qa:go -- --task "<your QA task>"`
- Opens ChatGPT 4.1 and auto-pastes QA prompt.

3. `npm run g41:send -- --task "<your task>"`
- Opens, auto-pastes, and auto-presses Enter to send.

4. `npm run g41qa:send -- --task "<your QA task>"`
- Opens, auto-pastes, and auto-sends QA prompt.

5. `npm run g41audit:go -- --task "<audit task>"`
- Opens ChatGPT 4.1 with an independent audit prompt and auto-pastes it.

6. `npm run g41audit:send -- --task "<audit task>"`
- Opens ChatGPT 4.1 with independent audit prompt, auto-pastes, and auto-sends.

Notes:
- Auto-paste relies on window focus (ChatGPT/Chrome/Edge/Firefox title activation).
- If the wrong window is focused, rerun the command once.
- Best practice: run implementation in one fresh chat, then run audit in a second fresh chat.

## Context Bootstrap Template

Copy, fill, and paste this before your task:

```text
Workspace root: C:/FTC HOLDING/APPS/saywetin-extension
Current branch: <branch-name>
OS/Shell: Windows PowerShell
Known scripts:
- npm run build
- npm run lint
- npm run docs:guard
Relevant files:
- <path1>
- <path2>
Recent errors/output:
- <paste exact error/output>
Task goal:
- <what success looks like>
Constraints:
- <what must not change>
```

## When to Use QA Variant

Use .github/prompts/chatgpt41-fallback-qa-e2e.prompt.md when the task is testing-heavy, especially Playwright or auth/routing validation.

## Anti-Delusion Checklist

Before accepting any ChatGPT output, verify:

1. Every referenced file path exists.
2. Every command is runnable in this repo.
3. Claimed results include actual evidence.
4. Unknown values are marked UNKNOWN.
5. Proposed edits are minimal and scoped.

## Escalation Rules

If ChatGPT drifts or invents context:

1. Re-send the bootstrap block.
2. Re-state constraints with "Do not assume missing files."
3. Ask for a revised plan with only verified paths.
4. If still drifting, break task into one-file increments.

## Recommended Maintenance

Update fallback prompts when any of these change:

- repo structure
- npm scripts
- build/test tooling
- deployment workflow
