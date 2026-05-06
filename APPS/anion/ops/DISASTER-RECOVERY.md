# Anion Class App — Disaster Recovery

Use for live incident response and rollback decisions.

## Incident Runbooks

- **DR-1: Auth or platform access outage**  
  Actions: freeze deploys, confirm scope, restore last known-good release/config.
- **DR-2: Billing/subscription incident**  
  Actions: disable new checkout path, preserve access for active subscribers where possible, investigate provider state.
- **DR-3: Lesson room/provider incident**  
  Actions: pause lesson starts if unstable, communicate workaround/reschedule plan.

## Rollback Decision Tree (If/Then)

1. **If** Sev-1 incident affects core journey for all users, **then** start immediate triage at once.
2. **If** Sev-1 is not stabilized within 15 minutes of triage start, **then** initiate rollback to last known-good state.
3. **If** rollback is initiated, **then** notify client owner immediately.
4. **If** billing events are incorrect or delayed and financial impact is possible, **then** execute DR-2 and block new subscriptions until validated.
5. **If** lesson delivery is unstable across active sessions, **then** execute DR-3 and switch to controlled restart/reschedule flow.
6. **If** issue resolves within target without data integrity risk, **then** continue forward fix and keep rollback on standby.

## Recovery Completion Criteria

- [ ] User-impacting error condition no longer reproducible
- [ ] Core user journey revalidated
- [ ] Incident summary captured with timestamp, owner, and root-cause note
- [ ] Go-forward approved by client owner (or delegated authority)
