# Una Labs JobAgent Product Runbook

## Product boundary

The product web service is separate from the local operator console. It uses
server-owned sessions, PostgreSQL tenant records, row-level security, versioned
APIs, consent records, and audit logs. A request cannot select another tenant.

## Required production services

- Node.js 22 container built from `Dockerfile`
- Managed PostgreSQL with backups and TLS
- HTTPS reverse proxy or platform ingress
- Secret manager for `DATABASE_URL` and `JOB_AGENT_INVITE_CODE`
- External monitoring for `/healthz` and `/readyz`

## Release

1. Rotate the Gmail OAuth client and token that were previously stored locally.
2. Configure the variables in `.env.production.example` through the deployment
   platform. Never commit their values.
3. Run `npm ci`, `npm run build`, `npm test`, and `npm run production:check`.
4. Run `npm run product:migrate` against the production database.
5. Run `npm run production:check:strict` in the production environment.
6. Start `npm run product:start`, then verify `/healthz` and `/readyz`.
7. Create an invited test account, complete onboarding, export its data, pause
   it, and confirm the old session no longer works.
8. Upload a PDF and DOCX resume, select a default, approve Career Truth Bank
   facts, and verify another invited user cannot list or download either file.
9. Verify connection preparation does not report a provider as connected until
   the provider identity has been authenticated and reconciled.

`AUTO_MIGRATE` remains `false` in production. Database migration is an explicit
release operation.

## Proof standard

Production is not declared live from a successful local build. Release proof
must include the deployment URL, immutable image or commit identifier,
successful strict gate, database migration output, health and readiness
responses, authenticated onboarding smoke test, and cross-tenant isolation
test. Missing infrastructure credentials are a deployment blocker, not a
verified production release.
