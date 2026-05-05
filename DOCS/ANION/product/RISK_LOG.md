# Anion Risk Log

| ID | Risk | Impact | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-001 | Auth and role model drift between tutor, student, parent, and operator journeys could stall Phase 1 implementation. | High | Medium | Lock Supabase auth and role assumptions before feature expansion and validate against the product brief before wiring flows. | FTC | Open |
| R-002 | Tutor discovery and booking flows may sprawl if UI is built before the booking state model is agreed. | High | Medium | Keep Phase 1 centered on booking states, required fields, and approval logic before adding extra surfaces. | FTC | Open |
| R-003 | Daily lesson-room integration may create downstream coupling before Phase 1 foundation is stable. | Medium | Medium | Treat Daily integration as Phase 2 work and keep only shell-level placeholders in the foundation stage. | FTC | Open |
| R-004 | Stripe subscription assumptions may leak into the booking flow too early and complicate core onboarding work. | Medium | Medium | Defer billing lifecycle implementation to Phase 3 and isolate subscription placeholders from Phase 1 scope. | FTC | Open |
| R-005 | Dashboard scope may become scattered if panels are added before there are live artifacts, metrics, and operator actions to show. | High | Medium | Restrict the dashboard to current state, next action, key artifacts, blockers, and proof of movement until runtime data exists. | FTC | Open |
| R-006 | Foundation scaffold may look "ready" while core routes remain TODO-backed, causing premature implementation branching. | Medium | High | Treat scaffold completion as governance readiness only, not feature completeness; gate build work on explicit Phase 1 flow decisions. | FTC | Open |
