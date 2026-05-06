# Anion Class App — Production Readiness

Purpose: confirm launch readiness with explicit owner accountability.

## Preflight Checklist

### Platform + app controls

- [ ] Production domain + auth callback configured
- [ ] Required environment variables set in production
- [ ] Production deployment command succeeds
- [ ] Critical user paths validated (auth, booking, subscription, lesson join, admin)

### Operational controls

- [ ] Monitoring ownership assigned (see `MONITORING-ALERTS.md`)
- [ ] Incident and rollback owner assigned (see `DISASTER-RECOVERY.md`)
- [ ] Day-0 / Day-1 / Week-1 operator assigned (see `OPERATIONS-CHECKLIST-D0-D1-W1.md`)

### Commercial + legal controls

- [ ] Billing provider access confirmed by billing owner
- [ ] Privacy placeholder text confirmed by client and counsel `[CLIENT CONFIRM] [COUNSEL REVIEW]`
- [ ] Terms placeholder text confirmed by client and counsel `[CLIENT CONFIRM] [COUNSEL REVIEW]`

## Launch Decision Inputs

Launch only if all boxes above are complete and recorded in `OWNER-SIGNOFF-TEMPLATE.md`.

If any Sev-1 risk remains unresolved, set decision to **NO-GO** and follow `DISASTER-RECOVERY.md`.
