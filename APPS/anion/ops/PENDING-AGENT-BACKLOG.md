# Anion Premium Trust Backlog (Agent Queue)

## A1. Monorepo CI isolation
Goal: prevent unrelated app checks from blocking Anion PR merges.
Deliverables:
- Path-filtered workflows for app-specific checks.
- Required-check policy recommendation per path.

## A2. Observability baseline
Goal: production troubleshooting readiness.
Deliverables:
- Structured request logging with request IDs.
- Standard error envelope and correlation IDs for critical APIs.
- Minimal monitoring setup notes + alert routing references.

## A3. Resilience lane
Goal: reduce transient-failure impact.
Deliverables:
- Retry/backoff for Daily room creation.
- Stripe webhook retry queue or replay script with clear runbook.

## A4. Security hardening follow-up
Goal: complete remaining security checklist gaps.
Deliverables:
- CORS/CSRF review and explicit protections where needed.
- Security headers verification and doc updates.
