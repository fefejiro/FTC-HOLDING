# Billing-Hold Local Ops

GitHub hosted runners are temporarily unavailable while billing is on hold. During this period, critical FTC operations run from the local Windows machine instead of GitHub Actions.

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

- `\FTC Holding\FTC Billing Hold Health`: every 30 minutes.
- `\FTC Holding\FTC Billing Hold Status Sync`: every 2 hours.

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
