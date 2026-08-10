# Copilot Portfolio Maintenance

The public FTC repository uses a review-gated maintenance loop for four lanes: security, language/accessibility, documentation, and general maintenance.

## Execution model

1. `.github/workflows/copilot-portfolio-maintenance.yml` runs Monday through Thursday at 05:20 UTC.
2. `scripts/seed-copilot-maintenance.mjs` selects the weekday lane, creates at most one issue per lane per ISO week, and assigns it to GitHub Copilot.
3. The issue routes Copilot to `.github/agents/ftc-portfolio-maintainer.agent.md` and its lane-specific prompt.
4. Copilot may prepare a small pull request. A human still reviews and merges it.

Monday is security, Tuesday language/accessibility, Wednesday documentation, and Thursday general maintenance. `workflow_dispatch` can run any lane manually.

## Safety boundaries

- No automatic merge or deployment.
- No production data, credentials, subscriptions, pricing, or provider changes.
- No weakening of security controls or tests.
- One small evidence-backed change per issue.
- Open-issue deduplication prevents repeated weekly work.
- A failed Copilot assignment fails the workflow visibly; the existing nightly continuous-improvement queue may retry unassigned work.

## Local validation

```powershell
npm run maintenance:copilot:dry
$env:MAINTENANCE_LANE='documentation'; npm run maintenance:copilot:dry
```

The prompt pack is also available in VS Code Copilot after reloading the workspace window.
