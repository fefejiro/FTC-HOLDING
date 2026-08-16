# JobAgent RC0 Release Evidence - 2026-08-16

## Release Identity

- Code image SHA: `d3b3e804c57609e93789f2f860de51ac7ee70ee0`
- Branch: `agent/job-agent-continuous`
- Pull request: #192, draft
- Remote branch head: current branch tip contains the code image plus evidence-only documentation commits
- Schema version: `010_trust_first_pilot`
- Hosted deployment identifier: **pending**

## Completed In Repository

- Added `GET /api/v1/release`. It is unauthenticated, no-store, and returns
  only commit SHA, build timestamp, environment, and schema version.
- Docker runtime and immutable-image CI pass release SHA and build timestamp.
- Local customer smoke passed with mocked tenant-owned responses at `390x844`
  and `1440x1000`.
- Existing local checks passed: lint, TypeScript build, static production check,
  and the full test suite (`211 passed, 8 skipped`).
- GitHub JobAgent SaaS workflow `31973938950` passed both
  `standalone-and-security` and `immutable-image`; the browser smoke, strict
  production configuration, and secret scan passed within that workflow.

## Pending External Proof

- Hosted web/API/worker/migration/PostgreSQL/private-storage deployment at this
  exact SHA.
- Hosted release endpoint and `/readyz` response capture.
- Live authenticated customer smoke and redacted screenshots/traces.
- Hosted auth, invitation, export, pause/revoke, deletion, expiry, and
  unauthorized-access checks.
- Two-tenant RLS, signed-download, proof, and idempotency evidence.
- pg-boss retry/lease/dead-letter/replay evidence.
- Android `assetlinks.json` and Apple `apple-app-site-association` publication.

## Hosted Probe

On 2026-08-16, `https://jobagent.unalabs.cloud` returned `404` for `/healthz`,
`/readyz`, `/api/v1/release`, `/.well-known/assetlinks.json`, and
`/.well-known/apple-app-site-association`. This is evidence that the hosted RC0
surface is not currently available at the expected domain, not evidence of a
successful deployment.

## Honest Boundary

This is release-candidate preparation, not an RC0 production sign-off. No
connector, store, device, TestFlight, Play, or public-beta claim is made until
independent evidence is attached.
