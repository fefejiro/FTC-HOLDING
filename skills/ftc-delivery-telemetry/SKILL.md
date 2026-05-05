---
name: ftc-delivery-telemetry
---

# FTC Delivery Telemetry Skill

A reusable skill for agents and humans to track, update, and report on project delivery status, blockers, QA, handoff, and velocity for all FTC/Una Labs projects.

## How to Use
- Update the delivery ledger (ops/delivery-ledger.jsonl) for every significant work session, commit, QA run, or blocker.
- Record human follow-up effort, manual review, and owner/client actions in the ledger.
- Use the project ledger (DOCS/FTC_PROJECT_LEDGER.md) for human-readable summaries.
- Update the machine-readable project status (ops/project-status.json) after major changes.
- Never overwrite unrelated project data or remove historical ledger entries.

## What to Track
- Project intake, work sessions, agent/human lanes, blockers, QA/tests, deployments, handoff, velocity.
- Use the standard fields from DOCS/FTC_DELIVERY_METRICS_STANDARD.md.

## Blocker Classification
- env: environment/config issues
- code: code/merge issues
- access: permissions, 403s, etc.
- QA: test failures, incomplete coverage
- client: waiting on owner/client
- doc: missing/unclear documentation

## Velocity Calculation
- Use commit timestamps, ledger entries, and QA cycles to estimate delivery velocity.
- Track blockers and human/manual review as velocity drag.
- Never use fake precision; round to nearest day or half-day.

## GO/HOLD/NO-GO Rules
- GO: All critical blockers cleared, QA passed, owner acceptance
- HOLD: Blockers remain, QA incomplete, or owner action needed
- NO-GO: Major blockers, failed QA, or security/critical handoff not met

## Status Reporting
- Use the project ledger and project-status.json to produce CTO-ready status reports.
- Always include blockers, human/manual review, and next actions.
- Never claim GO unless all handoff and QA gates are met.

## Best Practices
- Avoid fake precision in time/velocity estimates.
- Never overwrite or delete unrelated project data.
- Use append-only for delivery-ledger.jsonl.
- Do not expose secrets or sensitive data in any ledger or status file.
