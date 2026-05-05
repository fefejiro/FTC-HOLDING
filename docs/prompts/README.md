# FTC Prompt Library

A permanent, copy-paste prompt library for FTC Holding / Una Labs.
Use this from GitHub Mobile to run Copilot, recover failed sessions, triage PRs, and hand work off to desktop.

---

## What This Library Is For

You are a solo founder. You do not have time to reconstruct prompts from memory or screenshots.
This library gives you working prompts for every common agent workflow in this repo.

---

## How to Use From GitHub Mobile

1. Open this repo on GitHub Mobile.
2. Navigate to `docs/prompts/`.
3. Open the file for your situation.
4. Copy the prompt from the fenced code block.
5. Paste it into GitHub Copilot or the relevant agent interface.
6. Adjust the bracketed placeholders to match your current task.

---

## Agent Selection Guide

For the full breakdown, see [agent-selector-guide.md](./agent-selector-guide.md).

| Situation | Agent to Use |
|-----------|-------------|
| Build a feature, fix a bug, write code | **Copilot** (default) |
| Run shell commands, scaffolding, batch ops | **Copilot CLI** |
| Improve docs, hygiene, testing notes, repo health | **FTC Repo Optimization Finisher** |
| Recover a failed or stuck Copilot session | **FTC Failure Recovery Agent** |
| Manage prompt templates and agent guidance | **FTC Prompt Librarian** |

---

## When to Use Each Agent

### Copilot
Use for all standard implementation tasks: writing code, fixing bugs, adding tests, updating components.
Start here. Switch to a specialist only if Copilot gets stuck or goes out of scope.

### Copilot CLI
Use when you need to run shell commands, scaffold files with a generator, or perform batch file operations.
Copilot CLI has direct terminal access.

### FTC Repo Optimization Finisher
Use when the repo has documentation gaps, dead code, missing test notes, or production-readiness issues.
Do not use for feature work.

Prompt file: [repo-optimization.md](./repo-optimization.md)

### FTC Failure Recovery Agent
Use when a Copilot session has failed, a PR is stuck in draft, CI checks are failing without a clear fix,
or a previous agent made changes that are now broken.

Prompt files:
- [mobile-failure-recovery.md](./mobile-failure-recovery.md)
- [failed-pr-triage.md](./failed-pr-triage.md)
- [stuck-draft-pr.md](./stuck-draft-pr.md)

### FTC Prompt Librarian
Use to update this library with new prompts, retire outdated ones, or reorganize agent guidance.

---

## When to Move to Desktop Testing

Move to desktop when:
- A Playwright E2E test needs to run locally
- You need to verify environment variables work in a real build
- A Railway deployment must be validated end-to-end
- Mobile preview is insufficient to confirm the fix works

Prompt file: [desktop-test-handoff.md](./desktop-test-handoff.md)

---

## Prompt File Index

| File | Purpose |
|------|---------|
| [mobile-failure-recovery.md](./mobile-failure-recovery.md) | Recover a failed Copilot session |
| [failed-pr-triage.md](./failed-pr-triage.md) | Triage a failed or broken PR |
| [stuck-draft-pr.md](./stuck-draft-pr.md) | Push a draft PR to ready-for-review |
| [repo-optimization.md](./repo-optimization.md) | Run repo hygiene and documentation pass |
| [copilot-implementation.md](./copilot-implementation.md) | Standard Copilot implementation task |
| [desktop-test-handoff.md](./desktop-test-handoff.md) | Create desktop test steps |
| [scope-narrowing-comments.md](./scope-narrowing-comments.md) | Quick PR comments to control scope |
| [agent-selector-guide.md](./agent-selector-guide.md) | Full agent selection reference |
