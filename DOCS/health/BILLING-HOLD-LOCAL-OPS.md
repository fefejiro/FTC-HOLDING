# Local Product-Health Ops

GitHub hosted runners are temporarily unavailable while billing is on hold. During this period, product health checks run from the local Windows machine instead of GitHub Actions.

## Disabled Hosted Schedules

- `anion-scheduled-deploy`
- `ftc-site Deploy`
- `Una Labs Status Sync`
- `Portfolio E2E Telemetry Sync`
- `Continuous Improvement - Nightly Auto-Assign`
- `PeacePad Weekly Metrics Sync`
- `Seed Continuous Improvement Queue`
- `fefejiro/fefejiro` `Generate Contribution Snake`

## Local Replacement

Registered Windows tasks:

- `\FTC Holding\FTC Product Health`: every 2 hours.
- `\FTC Holding\FTC Product Status Sync`: every 6 hours.

The health task is intentionally product-first. It checks cloud endpoints, Una Labs/Anion/SayWetin/PeacePad/Garden/Dispatch/CapSigma surfaces, production verification scripts, and a wider internal-link crawl. Billing is only the reason these checks are running locally right now.

Logs and latest state:

- `DOCS/health/local-ops/`
- `DOCS/health/LOCAL-BILLING-HOLD-OPS-LATEST.md`
- `DOCS/health/FTC-HEALTH-AUDIT-LATEST.md`

Manual commands:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\local-billing-hold-ops-cycle.ps1 -Mode Health
powershell -ExecutionPolicy Bypass -File scripts\local-billing-hold-ops-cycle.ps1 -Mode StatusSync
```

Manual deploy bypasses, only when an actual deploy is needed:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\local-billing-hold-ops-cycle.ps1 -Mode AnionDeploy
powershell -ExecutionPolicy Bypass -File scripts\local-billing-hold-ops-cycle.ps1 -Mode FtcSiteDeploy
```

When GitHub billing/runners are restored, re-enable the hosted workflows and unregister the local schedule:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\register-local-billing-hold-scheduler.ps1 -Unregister
```
