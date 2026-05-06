# Anion Agent Routing Matrix

| Work type | Primary agent | Reviewer |
|---|---|---|
| milestone planning | Program Director | QA and Release |
| ADR or roadmap changes | Program Director | QA and Release |
| auth and dashboards | Web Builder | QA and Release |
| tutor directory and booking UI | Web Builder | QA and Release |
| Stripe billing and access | Billing and Access | QA and Release |
| Daily room and session UX | Live Classroom | QA and Release |
| release checklists and regression passes | QA and Release | Program Director |

## Routing rule

One issue gets one primary owner. Review is separate.

## Escalation rule

If an issue crosses lanes:
1. Program Director reframes the task
2. primary agent owns implementation
3. secondary changes are minimized or split into follow up issues

## Never do

- multiple builders editing the same feature lane without a clear owner
- free form parallel work with no acceptance criteria
- milestone jumping
