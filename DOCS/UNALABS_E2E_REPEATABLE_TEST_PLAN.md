# Una Labs Repeatable E2E Test Plan

## Goal
Provide a repeatable, automated, and extensible E2E plan for:
- Garden Cleaners
- OG Trades Academy
- Any future FTC/Una Labs website

## Test Layers
1. Availability checks
2. Critical journey checks
3. Trust and quality checks
4. Release gate summary

## Automation Source Of Truth
All suites live in tests/e2e/portfolio-sites.json.

## Suite Matrix
| Suite | State | Blocking Dependency |
|---|---|---|
| Una Labs | Active | None |
| Garden Cleaners | Active | None |
| OG Trades Academy | Pending | Complete domain cutover |
| Future website template | Ready | Add config block |

## Standard Journey Pattern (Per Website)
1. Home route returns expected status and title.
2. Primary CTA route returns expected status.
3. Contact/lead route returns expected status.
4. Client portal or dashboard route returns expected status (if applicable).
5. Optional protected route check verifies redirect/auth boundary.

## Release Gate Rules
- Green: 100% pass-rate for enabled suites.
- Yellow: any pending suites, but all enabled suites pass.
- Red: one or more enabled checks fail.

## Velocity And Metrics
Collected automatically by scripts/run-portfolio-e2e.mjs:
- Commit velocity 14d
- Commit velocity 30d
- Checks total / passed / failed
- Pass-rate
- Cycle duration

Published artifact:
- APPS/una-labs-site/public/ops/portfolio-e2e-status.json

Displayed in admin dashboard:
- APPS/una-labs-site/app/dashboard/DashboardClient.tsx

## Execution Commands
```powershell
Set-Location "C:\FTC HOLDING\_restore_repo"
npm run qa:portfolio:e2e
```

## Automation Mode
- Workflow: .github/workflows/portfolio-e2e-telemetry-sync.yml
- Trigger cadence: every 15 minutes, on push to main, and manual dispatch
- Output path published to dashboard: APPS/una-labs-site/public/ops/portfolio-e2e-status.json

## Operator Checklist (Per Run)
1. Run the command.
2. Confirm JSON artifact timestamp updated.
3. Open /dashboard as admin and verify telemetry card updates.
4. Review failing checks and assign owner.
5. If all enabled suites pass, mark release gate green.

## Expansion Pattern For New Websites
1. Add site block to tests/e2e/portfolio-sites.json.
2. Start with enabled=false while domain is being prepared.
3. Switch to enabled=true at soft launch.
4. Add or tighten checks after first successful production cycle.

## Ownership
- Operator: Una Labs admin (Manchi)
- Automation script owner: repo scripts maintainers
- Dashboard visibility owner: una-labs-site frontend
