# FTC Delivery Metrics Standard

A repeatable, cross-project standard for tracking delivery, agent work, human review, blockers, QA, deployments, handoff, and velocity for all FTC/Una Labs projects.

---

## Project Intake Fields
- Project name
- Client/stakeholder
- Intake date
- Initial scope/goal
- Key contacts
- Initial constraints

## Work Session Fields
- Date/time
- Agent(s) involved
- Task/feature/bug
- Time spent (if tracked)
- Work lane (agent, human, QA, deploy, etc.)
- Files changed
- Commit hash (if applicable)

## Agent Lane Fields
- Agent name/type (AI, human, hybrid)
- Task type (code, doc, QA, deploy, review)
- Inputs/outputs
- Review required (Y/N)
- Escalation needed (Y/N)

## Human Effort Fields
- Reviewer name
- Review type (code, QA, doc, deploy)
- Time spent (if tracked)
- Manual follow-up required (Y/N)
- Notes

## Blocker Fields
- Blocker type (env, code, access, QA, client, etc.)
- Description
- Impacted lanes
- Date opened/closed
- Resolution/next action

## QA/Test Fields
- Test type (unit, E2E, manual, smoke)
- Status (pass/fail/partial)
- Coverage/notes
- QA owner
- Date

## Deployment Fields
- Deploy type (preview, staging, prod)
- Date/time
- Commit hash
- Status
- Rollback needed (Y/N)
- Notes

## Handoff Gate Fields
- Controlled walkthrough status
- Full handoff status
- Owner/client acceptance (Y/N)
- Security/QA gate status
- Docs delivered

## Velocity Calculation Rules
- Use commit timestamps, ledger entries, and QA cycles to estimate velocity
- Do not use fake precision (round to nearest day or half-day)
- Track blockers and human review as velocity drag
- Only estimate future work after blockers and review are visible

## GO/HOLD/NO-GO Definitions
- **GO:** All critical blockers cleared, QA passed, owner acceptance
- **HOLD:** Blockers remain, QA incomplete, or owner action needed
- **NO-GO:** Major blockers, failed QA, or security/critical handoff not met

## What Must Be Tracked Before Giving Time Estimates
- All known blockers
- Human review/QA effort
- Last successful deploy/commit
- Owner/client actions needed
- Any external dependencies

---

**This standard must be used for all FTC/Una Labs project delivery tracking.**
