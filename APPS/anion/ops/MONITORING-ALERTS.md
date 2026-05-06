# Anion Class App — Monitoring & Alerts

Use this with `PRODUCTION-READINESS.md` and `DISASTER-RECOVERY.md`.

## Critical Journeys to Monitor

1. Authentication (login and callback)
2. Booking creation and tutor response
3. Subscription checkout and billing state update
4. Lesson room access/join flow
5. Admin dashboard access

## Alert Matrix

| Severity | Trigger example | Initial owner | Response target | Escalation |
|---|---|---|---|---|
| Sev-1 | Core journey unavailable for all users | On-call engineering lead | Immediate triage | Start `DISASTER-RECOVERY.md` |
| Sev-2 | Billing/booking degraded but partial service remains | Product + engineering ops | 30 minutes | Escalate to client owner |
| Sev-3 | Minor defect with workaround | Product owner | Next business day | Track in backlog |

## Minimum Alert Routing

- [ ] Engineering on-call contact documented
- [ ] Client owner escalation contact documented
- [ ] Billing owner contact documented `[PROVIDER CONFIRM]`
- [ ] Provider ops contact documented `[PROVIDER CONFIRM]`

If routing is not assigned, launch is **not ready**.
