# Una Labs JobAgent Product Release Evidence

Date: 2026-07-23

## Verified

- Pilot/multi-instance foundation commit: `e21b9d7e`
- TypeScript build: passed
- Test suite: 14 files, 109 tests passed
- Static production security gate: passed
- Tracked Gmail token removed from the Git index
- Isolated production install from `package-lock.json`: passed
- Isolated production TypeScript build: passed
- Isolated production dependency audit: 0 vulnerabilities
- Password hashing, hardened cookie, constant-time invite comparison, and RLS
  migration assertions: passed
- Tenant-owned PostgreSQL tables use both `ENABLE ROW LEVEL SECURITY` and
  `FORCE ROW LEVEL SECURITY`
- Registration establishes tenant context before writing RLS-protected records

## Not Yet Verifiable

- Live PostgreSQL migration and cross-tenant integration test
- Container build, because Docker is not installed on this workstation
- HTTPS production deployment, because no product deployment target,
  `DATABASE_URL`, or platform credentials are configured
- Live readiness response and authenticated onboarding smoke test

These are release blockers, not successful production outcomes. The strict
deployment gate intentionally fails when the required runtime values are absent.

## Credential Response

`data/gmail_tokens.json` is no longer tracked. The previously used Gmail OAuth
token and OAuth client secret must be rotated before reconnecting a mailbox.
Removing the current file does not erase a secret from prior Git history.

## Production Proof Still Required

1. Provision managed PostgreSQL and an HTTPS container host.
2. Rotate Gmail OAuth credentials.
3. Configure production secrets in the host secret manager.
4. Run migration and `npm run production:check:strict`.
5. Verify two invited users cannot read or mutate each other's onboarding,
   connection, or audit records.
6. Capture the immutable deployment identifier, live `/healthz` and `/readyz`
   responses, onboarding save/export/pause flow, and monitoring status.
