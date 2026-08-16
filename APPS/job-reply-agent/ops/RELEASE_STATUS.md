# JobAgent RC0 Release Status

Updated: 2026-08-16
Release target (code image): `d3b3e804c57609e93789f2f860de51ac7ee70ee0`
Branch: `agent/job-agent-continuous`
PR: `https://github.com/fefejiro/FTC-HOLDING/pull/192` (documentation head follows the code image)

## State

- **Completed:** release commit pushed; PR head matches the release SHA; JobAgent
  CI was triggered; safe `/api/v1/release` endpoint added; Docker and CI carry
  commit/build metadata; local customer smoke passes at mobile and desktop.
- **Deployed:** not yet independently verified for the RC0 SHA.
- **Externally verified:** none for this RC0 release yet.
- **Paused:** live customer smoke, connector proof, and device/store work await
  hosted credentials and an authenticated candidate session.
- **Blocked:** asset links need the production Android signing fingerprint and
  Apple Team ID; hosted deployment needs a usable release environment and
  database/storage credentials.
- Hosted probe on 2026-08-16 returned `404` for the expected health, release,
  and app-link paths.

## Queue Audit

- **Implemented locally:** pg-boss queues use tenant/user operation grouping,
  singleton idempotency keys, five retries with exponential backoff, 30-minute
  expiry, 14-day successful-job retention, and a 30-day dead-letter queue.
- **Live evidence pending:** expired-lease recovery, retry execution,
  dead-letter inspection, operator replay, and preservation of proof artifacts
  require the hosted queue database and worker.

## Required Evidence Before RC0 Green

1. Hosted `/api/v1/release` returns the exact SHA, build timestamp, environment,
   and schema version.
2. `/readyz` proves the runtime role, PostgreSQL, and private storage together.
3. Live customer smoke passes at `390x844` and `1440x1000` with redacted trace
   and screenshot artifacts.
4. Auth, invitation, export, pause/revoke, deletion initiation, expiry, and
   unauthorized-access checks pass against the hosted environment.
5. Two isolated tenants pass profile, resume, application, approval, proof,
   signed-download, and idempotency checks.
6. Queue retry, lease recovery, dead-letter visibility, replay, and evidence
   preservation are recorded.
7. Android and Apple association files are published and verified for the exact
   domain using real signing identifiers.

No store readiness, connector certification, TestFlight, Play testing, or
public-beta claim is made by this file.
