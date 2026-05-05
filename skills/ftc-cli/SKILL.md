---
name: ftc-cli
description: Use when working inside the FTC HOLDING monorepo and you need to inspect repo state, run diagnostics, execute scripts under scripts/, run tests, validate docs, check deploy readiness, recover from a failed prior agent session, or decide which other FTC skill to load next. Load this before guessing repo structure, before running git operations that could touch the embedded Git/ portable install, and before merging or un-drafting PRs.
---

# FTC CLI

Operational skill for repo-level work in `C:\FTC HOLDING`. Keeps the agent honest: inspect first, act second, never bypass safety checks.

## Use When

- Request mentions: repo status, scan, doctor, lint, test, deploy check, docs guard, recover, PR cleanup, merge conflicts, draft PR, branch hygiene
- Workspace folder is a sub-app (e.g. `APPS/saywetin-extension`) but the task spans the monorepo
- A prior agent run failed mid-flight and current state is unknown
- You are about to invent a command — stop and read this first

## Repo Layout (anchors)

- Root: `C:\FTC HOLDING\`
- Apps: `C:\FTC HOLDING\APPS\<app-name>\`
- Shared scripts: `C:\FTC HOLDING\scripts\`
- Skills (this file lives here): `C:\FTC HOLDING\skills\` and `C:\FTC HOLDING\.github\skills\`
- Stripe worker: `C:\FTC HOLDING\workers\stripe-api\`
- Embedded portable Git binary: `C:\FTC HOLDING\Git\` — never `git add`, `git checkout`, or `rm` paths under here. It is gitignored for a reason; touching it triggers unlink prompts on the running git.exe.

## Core Commands

Use absolute paths from PowerShell 5.1. Workspace folder may be a sub-app, so do not assume `cd`.

### Inspect

```powershell
# repo state
git -C "C:\FTC HOLDING" status --short --branch
git -C "C:\FTC HOLDING" log --oneline -n 10

# find skills, instructions, agent files
Get-ChildItem -Path "C:\FTC HOLDING" -Recurse -Include SKILL.md,copilot-instructions.md,AGENTS.md `
  -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'node_modules|\\Git\\' }

# find package.json roots
Get-ChildItem -Path "C:\FTC HOLDING" -Recurse -Filter package.json `
  -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'node_modules|\\Git\\' }
```

### Scripts under `scripts/`

Inspect `C:\FTC HOLDING\scripts\` and individual app `scripts/` folders before invoking. Common patterns seen in this repo:

- `docs-guard.mjs` — fail-fast doc consistency check; run before committing doc-touching changes
- `career-*.mjs` / `job-hunt-pipeline.mjs` — career automation pipeline (see saywetin-extension)
- App-specific scripts live in `APPS/<app>/scripts/`

Always `node <script>.mjs --help` first if available, otherwise read the file head before executing.

### Test / Build

Run from the specific app folder, not the monorepo root:

```powershell
Set-Location "C:\FTC HOLDING\APPS\<app>"
npm run build
npm test
```

### Deploy check

Before claiming a deploy will work:
- `npm run build` passes
- env vars present (do not print them)
- output directory matches host config (Cloudflare Pages, Railway, EAS)
- For Stripe worker: load `.agents/skills/stripe-best-practices/SKILL.md`

### PR / GitHub operations

- For merging: prefer the GitHub REST API (`gh api -X PUT /repos/.../pulls/{n}/merge`) over `gh pr merge` — `gh pr merge` has bitten this repo with stale-ref errors.
- For un-drafting a PR: GraphQL `markPullRequestReadyForReview`, not `gh pr ready`.
- Stash before `git checkout`. If you see "would be overwritten by checkout", stash, do not force.
- Never run `git checkout -f` over a path that contains `Git/` — answer `n` to every interactive prompt about unlinking running binaries.

## Cross-Skill Routing

Do not duplicate work — load the right skill instead.

| Situation | Load |
|---|---|
| New project scaffolding, Jira/Confluence mirror, portfolio status | `.github/skills/ftc-project-governance/SKILL.md` |
| Production deploy failing (Cloudflare/Railway/Supabase/EAS) | `skills/ftc-deployment-recovery/SKILL.md` |
| Multi-agent task routing | `skills/ftc-multi-agent-orchestration/SKILL.md` |
| Client handoff / delivery | `skills/ftc-client-handoff/SKILL.md` or `.github/skills/ftc-client-workflow/SKILL.md` |
| Live QA pass | `skills/ftc-live-qa/SKILL.md` |
| Portal QA audit | `.github/skills/ftc-portal-qa-audit/SKILL.md` |
| SayWetin three-surface release | `.github/skills/saywetin-three-surface-ship/SKILL.md` |
| SayWetin Android device matrix | `skills/ftc-saywetin-android-qa/SKILL.md` |
| Auth wiring | `skills/ftc-auth-foundation/SKILL.md` |
| Telemetry / status feeds | `skills/ftc-delivery-telemetry/SKILL.md` |
| Stripe (anywhere) | `.agents/skills/stripe-best-practices/SKILL.md`, `stripe-projects/SKILL.md`, `upgrade-stripe/SKILL.md` |
| Startup/venture strategy framing | `.github/skills/ftc-startup-strategy-skill/SKILL.md` |

## Rules

- Inspect before editing. Read the file before claiming to know what is in it.
- Do not bypass safety checks (`--no-verify`, `--force`, `git reset --hard`) without explicit user approval.
- Do not introduce new dependencies without justification.
- Do not edit secrets, env vars, billing, or deploy configs unless explicitly told.
- Do not claim tests passed unless they actually ran.
- Keep PRs small. Include Summary / Files / Testing / Risks / Follow-up.
- Do not create markdown documentation files to record changes unless asked.

## Failure Recovery

If a prior session left the repo dirty:

1. `git -C "C:\FTC HOLDING" status` — read, do not act yet
2. If lock file: check no `git`/`node` process is running, then remove `.git/index.lock` only after confirming
3. If interactive prompts about unlinking files: always `n` to anything under `Git/`
4. Stash unknown work-in-progress changes; never discard
5. Resume the original task only after state is clean

## Output Discipline

- Short answers. 1-3 sentences for simple confirmations.
- Convert file references to clickable markdown links with workspace-relative paths.
- No emojis unless requested.
- No fabricated command output. If you did not run it, say so.
