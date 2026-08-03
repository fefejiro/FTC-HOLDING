---
name: portfolio-continuous-improvement
description: Audit and improve apps in the FTC HOLDING monorepo through evidence-backed issues and small reviewable pull requests. Use for recurring portfolio health checks, repository hygiene, stale documentation, test gaps, low-risk maintenance, contribution attribution, branch cleanup planning, and cross-app continuous improvement. Never use it to deploy, merge to main, rotate secrets, change billing, alter legal text, migrate data, or trigger paid builds without explicit owner approval.
---

# Portfolio Continuous Improvement

Improve the portfolio continuously without turning scheduled automation into an unsupervised production operator.

## Workflow

1. Read the root `AGENTS.md`, `.github/copilot-instructions.md`, and the target app's instructions.
2. Inspect the real Git status, default branch, package scripts, deployment configuration, and recent failures.
3. Run the cheapest relevant read-only checks first. Prefer existing scripts such as `npm run health:audit`, app checks, and `npm run ci:seed:dry`.
4. Classify findings using `references/operating-policy.md`.
5. For discovery-only findings, create or update a deduplicated issue with exact evidence, scope, acceptance criteria, and verification commands.
6. Implement only tasks carrying both `continuous-improvement` and `agent-ready` when the task stays within the low-risk lane.
7. Use a dedicated branch, small commits, the repository's configured Git identity, and a pull request. Never commit directly to `main`.
8. Report exact files, commands, pass/fail results, risks, and remaining owner actions.

## Repository and contribution discipline

- Treat `fefejiro/FTC-HOLDING` as the canonical portfolio repository unless the owner records a different decision.
- Do not revive or copy from legacy repositories without a file-level comparison and a security review.
- Confirm commits are pushed and reach the default branch before calling them profile contributions.
- Preserve original commit authorship. Do not rewrite author email merely to manufacture contribution credit.
- Use an email already associated with the intended GitHub account; the FTC default is `fefejiro@users.noreply.github.com`.
- Keep unrelated app changes out of each branch and pull request.

## Stop conditions

Stop implementation and leave an owner-review issue when work touches secrets, credentials, auth policy, billing, legal/privacy claims, production data, database migrations, native signing/capabilities, destructive cleanup, broad architecture changes, or metered cloud builds.

Do not mark a task complete based only on generated documentation or a passing dashboard. Require evidence from the affected app.

## Zero-billing operation

Use `scripts/register-local-continuous-improvement-task.ps1` to register the weekly Windows task. It runs `scripts/run-local-continuous-improvement.ps1` on the owner's laptop and creates at most three `needs-triage` issues through `gh`. It does not use GitHub-hosted runners, Copilot, builds, deploys, or Xcode Cloud. Missed runs resume when the laptop is next available.

Keep both GitHub continuous-improvement workflows manual while billing is blocked. The local scanner is deterministic; invoke this skill interactively when human/agent judgment is needed.
