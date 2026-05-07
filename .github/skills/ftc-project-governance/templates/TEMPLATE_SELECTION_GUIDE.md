# FTC Governance Template Selection Guide

Use this guide before creating new governance artifacts so each project gets one primary document per purpose.

## Start Here

- Use `PROJECT_BRIEF.md` for the product purpose, users, scope, and strategic value
- Use `ARCHITECTURE_OVERVIEW.md` for stack, system boundaries, deployment targets, and observability contract
- Use `ADR.md` for decisions that need durable rationale
- Use `ROADMAP.md` for phase sequencing only
- Use `RISK_LOG.md` for ongoing risk tracking only
- Use `RELEASE_LOG.md` for shipped changes and validation history only
- Use `WEEKLY_STATUS.md` for operator-facing status summaries only
- Use `STATUS_SUMMARY.json` for machine-readable reduction output only

## Avoid Duplication

- Do not restate architecture decisions inside `PROJECT_BRIEF.md`
- Do not turn `ROADMAP.md` into a backlog or delivery log
- Do not use `WEEKLY_STATUS.md` as a permanent decision record
- Do not copy release history into `WEEKLY_STATUS.md` when it belongs in `RELEASE_LOG.md`
- Do not duplicate machine-readable state in markdown when `STATUS_SUMMARY.json` is the canonical reduced artifact

## Lean Mode Minimum

- `PROJECT_BRIEF.md`
- `ARCHITECTURE_OVERVIEW.md`
- first `ADR.md`
- `ROADMAP.md`
- `WEEKLY_STATUS.md`
- `STATUS_SUMMARY.json`

## Full Mode Additions

- `RISK_LOG.md`
- `RELEASE_LOG.md`
- any project-specific execution or test-evidence artifacts required by the work

## Recommended Creation Order

1. `PROJECT_BRIEF.md`
2. `ARCHITECTURE_OVERVIEW.md`
3. first `ADR.md`
4. `ROADMAP.md`
5. `WEEKLY_STATUS.md`
6. `STATUS_SUMMARY.json`
7. `RISK_LOG.md`
8. `RELEASE_LOG.md`