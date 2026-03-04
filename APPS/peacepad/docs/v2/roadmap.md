# PeacePad v2 Roadmap

Status fields:
- `planned`: defined, not started
- `in_progress`: currently executing
- `done`: acceptance criteria met
- `blocked`: cannot proceed due external dependency

## Batch Tracker
| Batch | Goal | Status | Owner | PR | Deploy | Smoke | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Batch 0 | Merge and stabilize v2 pipeline | `in_progress` | Engineering | pending | pending | local `done`, prod pending | Local v2 smoke passes; production merge/deploy still required. |
| Batch 1 | Data and observability | `in_progress` | Engineering | pending | pending | pending | Correlation IDs and observability docs are in this batch. |
| Batch 2 | Capability catalog and acceptance gates | `planned` | Product + Engineering | n/a | n/a | n/a | Backlog only in this release window. |
| Batch 3 | ChatGPT app distribution foundation | `planned` | Engineering | n/a | n/a | n/a | Backlog only in this release window. |
| Batch 4 | Narration intake module | `planned` | Engineering | n/a | n/a | n/a | Backlog only in this release window. |
| Batch 5 | Child-first reasoning layer | `planned` | Engineering | n/a | n/a | n/a | Backlog only in this release window. |
| Batch 6 | Parenting plan and agreement generation | `planned` | Engineering | n/a | n/a | n/a | Backlog only in this release window. |
| Batch 7 | Support discovery expansion | `planned` | Engineering | n/a | n/a | n/a | Backlog only in this release window. |
| Batch 8 | Web/mobile UI touchpoints | `planned` | Engineering | n/a | n/a | n/a | Backlog only in this release window. |

## Active Batch Checklists
### Batch 0 Checklist
- [x] Confirm branch preflight: `main=f768f4a`, v2 branch ahead by 5 commits.
- [x] Merge `feat/pp-v2-module-engine` into rollout branch.
- [x] Run v2 unit tests.
- [x] Run local smoke for `/v2/*` and `/api/version`.
- [ ] Re-run remote PR checks.
- [ ] Merge to `main` on GitHub.
- [ ] Deploy production from `main`.
- [ ] Run production smoke on `https://api.peacepad.ca`.
- [ ] Confirm no v1 regressions in production logs.

### Batch 1 Checklist
- [ ] Apply production migration `server/migrations/20260304_pp_v2_module_engine.sql`.
- [ ] Verify `pp_v2_module_runs` and `pp_v2_launcher_state` tables exist in production.
- [ ] Verify one successful and one error module run update expected tracker fields.
- [x] Add `x-request-id` middleware to all `/v2/*` responses.
- [x] Include request ID in v2 error logs and tracker warnings.
- [x] Add observability SQL queries.
- [x] Add observability runbook.
- [ ] Validate “top module” and “failure hotspot” can be answered in under 5 minutes.

## Out of Scope for Current Execution Window
- Batches 2 through 8 stay in backlog state.
- No BI/dashboard product build in this batch; SQL + runbook only.
