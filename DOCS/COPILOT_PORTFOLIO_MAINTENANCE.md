# Copilot Portfolio Maintenance

The public FTC repository uses a review-gated maintenance loop for four lanes: security, language/accessibility, documentation, and general maintenance.

## Execution model

1. `.github/workflows/copilot-portfolio-maintenance.yml` runs Monday through Thursday at 05:20 UTC.
2. `scripts/seed-copilot-maintenance.mjs` selects the weekday lane and creates at most one issue per lane per ISO week.
3. When `COPILOT_ASSIGN_TOKEN` is configured and its owner has GitHub Copilot coding-agent access, the script uses GitHub's agent-assignment API to assign `copilot-swe-agent[bot]`, select the `ftc-portfolio-maintainer` cloud profile, and target `main`. Without it, the issue is marked `blocked` with the exact setup requirement.
4. The issue routes Copilot to `.github/agents/ftc-portfolio-maintainer.agent.md` and its lane-specific prompt.
5. Copilot may prepare a small pull request. A human still reviews and merges it.

Monday is security, Tuesday language/accessibility, Wednesday documentation, and Thursday general maintenance. `workflow_dispatch` can run any lane manually.

## Safety boundaries

- No automatic merge or deployment.
- No production data, credentials, subscriptions, pricing, or provider changes.
- No weakening of security controls or tests.
- One small evidence-backed change per issue.
- Open-issue deduplication prevents repeated weekly work.
- GitHub's built-in `GITHUB_TOKEN` is an installation token and cannot assign coding agents. Do not copy a broad personal token into the repository. Create a narrowly scoped user token only after confirming the token owner has coding-agent access, save it as the Actions secret `COPILOT_ASSIGN_TOKEN`, and rotate it according to the repository credential policy.
- A missing or rejected assignment token marks the issue `blocked` and records the reason; issue seeding still completes honestly.

## Local validation

```powershell
npm run maintenance:copilot:dry
$env:MAINTENANCE_LANE='documentation'; npm run maintenance:copilot:dry
```

The prompt pack is also available in VS Code Copilot after reloading the workspace window.

The canonical detailed profile uses `.agent.md` for VS Code discovery. The companion `.github/agents/ftc-portfolio-maintainer.md` exposes the same contract to Copilot cloud agent, which currently uses the plain `.md` repository profile convention.
