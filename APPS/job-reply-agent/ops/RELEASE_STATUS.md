# JobAgent RC0 Release Status

Updated: 2026-08-16
Release target: `64953ce5f09e638d24facd80340fc8f9d576d35f`
Branch: `agent/job-agent-continuous`
PR: `https://github.com/fefejiro/FTC-HOLDING/pull/192`

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
