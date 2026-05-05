# Agent Selector Guide

Use this to decide which agent to assign to a task in FTC-HOLDING.

---

## Agent Reference Table

| Agent | Best For | Not For |
|-------|---------|---------|
| **Copilot** | Feature implementation, bug fixes, writing tests, updating components | Recovery, repo hygiene, prompt management |
| **Copilot CLI** | Shell commands, scaffolding, batch file operations, running builds and tests | Writing application logic |
| **FTC Repo Optimization Finisher** | Documentation gaps, repo hygiene, testing notes, production readiness | Feature work, bug fixes, app redesign |
| **FTC Failure Recovery Agent** | Recovering failed sessions, triaging stuck PRs, diagnosing CI failures | New feature work |
| **FTC Prompt Librarian** | Updating this prompt library, retiring outdated prompts, adding new agent guidance | Any implementation work |

---

## Decision Flowchart

```
Is something broken or stuck?
  YES → Use FTC Failure Recovery Agent
        Prompts: mobile-failure-recovery.md, failed-pr-triage.md, stuck-draft-pr.md

Is this a documentation, hygiene, or readiness task?
  YES → Use FTC Repo Optimization Finisher
        Prompt: repo-optimization.md

Do you need to run a shell command, scaffold a file, or install a package?
  YES → Use Copilot CLI

Do you need to build a feature, fix a bug, or write code?
  YES → Use Copilot
        Prompt: copilot-implementation.md

Do you need to update the prompt library itself?
  YES → Use FTC Prompt Librarian
```

---

## Agent Profiles

### Copilot

**Role:** Default implementation agent.

**Use when:**
- Implementing a new feature
- Fixing a bug
- Writing or updating tests
- Updating a component or API endpoint

**Constraints:**
- Give it a narrow, well-defined task
- Watch for scope drift — use scope-narrowing comments if needed
- Does not automatically run tests — you must verify testing notes

**Prompt template:** [copilot-implementation.md](./copilot-implementation.md)

---

### Copilot CLI

**Role:** Terminal and file system operations.

**Use when:**
- Running `npm install`, `npm run build`, `npm run test`
- Scaffolding new files using a generator
- Batch renaming or moving files
- Running Playwright tests locally

**Constraints:**
- Not suitable for writing complex application logic
- Requires desktop environment — not available from GitHub Mobile alone

---

### FTC Repo Optimization Finisher

**Role:** Documentation and repo health specialist.

**Use when:**
- README files are outdated or missing
- Testing notes are absent from PRs
- Documentation references are broken
- Production readiness needs to be reviewed before a launch

**Constraints:**
- Must not touch app source code
- Must not modify .env files or deployment configs
- Must not add dependencies

**Prompt template:** [repo-optimization.md](./repo-optimization.md)

---

### FTC Failure Recovery Agent

**Role:** Session and PR recovery specialist.

**Use when:**
- A Copilot session failed partway through
- A PR has been stuck in draft for too long
- CI is failing and the root cause is unclear
- A previous agent made changes that broke something

**Constraints:**
- Diagnose before acting — do not start fixing until the failure is understood
- Fix only what is broken — do not expand scope during recovery

**Prompt templates:**
- [mobile-failure-recovery.md](./mobile-failure-recovery.md)
- [failed-pr-triage.md](./failed-pr-triage.md)
- [stuck-draft-pr.md](./stuck-draft-pr.md)

---

### FTC Prompt Librarian

**Role:** Maintains and improves this prompt library.

**Use when:**
- A prompt is outdated or no longer working
- A new workflow needs a prompt template
- The agent selector guide needs to be updated
- Prompt files need to be reorganized

**Constraints:**
- Changes must stay inside `docs/prompts/` and `.github/`
- Must not touch app source code or configuration files
