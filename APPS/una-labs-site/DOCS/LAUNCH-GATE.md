# Una Labs Launch Gate

This checklist defines the minimum criteria to mark a client project as launch-ready.

Use this file as a launch standard, not as a live per-project task tracker.
Create project-specific launch records elsewhere when an actual launch review is being run.

## 1. Milestones

- All milestones are in `complete` or `approved` state
- No milestone is in `blocked` state
- Each completed milestone has at least one proof item (URL or note)

## 2. Contract and Commercial

- Contract exists for the project
- Contract status is signed or accepted
- Commercial tier (Standard, Pro, Premium) is confirmed in project record

## 3. Billing

- No overdue invoices
- Outstanding balance is 0
- Any instant bills are marked paid

## 4. Client Readiness

- Briefing packet has been generated (`/dashboard/briefing?id=...`)
- Client has been sent briefing, report, and proposal links
- No open blockers remain in portal action center
- Decision list has no unresolved critical decision

## 5. Technical Readiness

- Portal route loads successfully (`/portal?id=...`)
- Briefing route loads successfully (`/dashboard/briefing?id=...`)
- Report route loads successfully (`/dashboard/report?id=...`)
- Proposal route loads successfully (`/dashboard/proposal?id=...`)
- At least one artifact exists in `project_artifacts`

## 6. Handover Readiness

- Live URL is set in the project record if applicable
- Handover notes are complete and shared
- Support contact path is documented for the client

## 7. Build Gate (Engineering)

- `npx tsc --noEmit` passes
- `npm run build` passes
- Static export includes required routes
- No new TypeScript warnings or errors are introduced by launch changes

## 8. Release Decision

A project is launch-ready only when all sections above are fully checked.

If any checkbox is unmet, status remains `pre-launch` and must include a blocker note with owner + ETA.
