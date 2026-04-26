# Una Labs E2E Automation Handover

## Outcome
This handover establishes a repeatable and automated portfolio E2E pipeline with dashboard telemetry for:
- Una Labs (active now)
- Garden Cleaners (active now)
- OG Trades Academy (ready to enable)
- Any future website by adding one config block

## What Was Added
- Config registry: tests/e2e/portfolio-sites.json
- Automation runner: scripts/run-portfolio-e2e.mjs
- Dashboard metrics artifact: APPS/una-labs-site/public/ops/portfolio-e2e-status.json
- Dashboard telemetry UI: APPS/una-labs-site/app/dashboard/DashboardClient.tsx
- Package scripts: package.json

## How It Works
1. The runner reads tests/e2e/portfolio-sites.json.
2. For each enabled site, it executes HTTP checks (status + optional title assertions).
3. It calculates pass-rate and commit velocity (14d and 30d).
4. It writes JSON output to APPS/una-labs-site/public/ops/portfolio-e2e-status.json.
5. Admin dashboard auto-refreshes every 30 seconds and displays the feed.

## Commands
Run once manually:
```powershell
Set-Location "C:\FTC HOLDING\_restore_repo"
npm run qa:portfolio:e2e
```

Run test + status sync:
```powershell
Set-Location "C:\FTC HOLDING\_restore_repo"
npm run qa:portfolio:sync
```

## Enabling Garden Cleaners and OG Trades
Edit tests/e2e/portfolio-sites.json:
- Set enabled from false to true
- Confirm baseUrl for production domain
- Adjust route checks to the actual launch routes

## Add Any New Website (Future)
Add a new object under sites:
```json
{
  "id": "new-site-id",
  "label": "New Site Name",
  "enabled": true,
  "baseUrl": "https://newsite.example",
  "checks": [
    { "id": "home", "path": "/", "expectedStatuses": [200], "titleIncludes": "Brand" }
  ]
}
```

## Suggested CI Cadence For Realtime Dashboard
Recommended schedule:
- Every 15 minutes for production monitoring
- On push to main for release validation

Workflow now included:
- .github/workflows/portfolio-e2e-telemetry-sync.yml

Recommended CI step:
```bash
npm ci
npm run qa:portfolio:e2e || true
```

Then commit/publish APPS/una-labs-site/public/ops/portfolio-e2e-status.json in the deploy artifact.

## Notes
- Dashboard telemetry is near-realtime based on artifact refresh cadence.
- Pending suites do not fail the run; only enabled suites impact pass/fail.
- Current config keeps OG Trades in pending state until canonical URLs are confirmed.
- Telemetry publish strategy is Git-backed: workflow commits APPS/una-labs-site/public/ops/portfolio-e2e-status.json when values change.
