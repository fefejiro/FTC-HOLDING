# Anion Class App — Day-0 / Day-1 / Week-1 Operations Checklist

Use this after go-live approval in `OWNER-SIGNOFF-TEMPLATE.md`.

## Day-0 (Launch Day)

- [ ] Confirm deploy version and timestamp
- [ ] Smoke test: login, booking, subscribe, lesson join, admin
- [ ] Confirm alert routing is active (`MONITORING-ALERTS.md`)
- [ ] Confirm rollback owner is reachable (`DISASTER-RECOVERY.md`)
- [ ] Publish launch status to client owner

## Day-1

- [ ] Review first 24h incidents and response times
- [ ] Confirm no unresolved Sev-1/Sev-2 issues
- [ ] Validate billing events and subscription state consistency
- [ ] Validate lesson/session completion flow and support inbox
- [ ] Send Day-1 ops summary to client owner

## Week-1

- [ ] Review incident trends and top root causes
- [ ] Confirm alert thresholds and escalation contacts are still valid
- [ ] Confirm legal copy in production matches the already approved launch text (no drift)
- [ ] Confirm billing/provider ownership is still accurate and contacts are current
- [ ] Hold week-1 stabilization review and approve steady-state operations
