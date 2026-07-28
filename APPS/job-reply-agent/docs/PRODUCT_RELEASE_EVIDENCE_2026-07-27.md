# JobAgent Safe Public Beta Evidence - 2026-07-27

## Hosted foundation

- Railway project: `una-jobagent`
- Public beta origin: `https://jobagent.unalabs.cloud`
- Railway diagnostic origin: `https://jobagent-web-production.up.railway.app`
- Cloudflare Worker `una-jobagent-edge` owns the branded hostname, DNS, TLS,
  fixed-origin proxying, redirect rewriting, and no-store enforcement for
  account/API routes. Version: `6494e25c-443a-4826-8ade-cf7d7ffb144e`.
- Web, worker, one-shot migration, daily backup, PostgreSQL, and private bucket
  are separate resources.
- Migration deployment completed and granted table access only to
  `jobagent_app`.
- `/readyz` returned database connected, tenant isolation role enforced, and
  S3 object storage ready.
- The live web deployment manifest now requires `/readyz` within 120 seconds
  before Railway promotes a deployment.
- Worker startup registered Gmail sync, discovery, scoring, package generation,
  approved send, proof reconciliation, digest, and retention queues.
- GitHub health and release workflows are committed, but GitHub currently
  refuses to start any runner because the account is billing-locked. This is an
  external CI gate, not a passing check.

## Hobby backup fallback - 2026-07-28

- Railway managed volume backup scheduling remains unavailable on Hobby.
- `jobagent-backup` performs a PostgreSQL 18 custom-format dump, AES-256-GCM
  client-side encryption, private-bucket upload/download, hash verification,
  temporary-database restoration, and complete public-table count comparison.
- Two live runs passed. The second bound the dump and count manifest to one
  exported PostgreSQL snapshot and completed in `6.856s`: `69` tables matched,
  no expired object was removed, and the temporary database was dropped.
- Verified object:
  `system/backups/jobagent-2026-07-28T12-44-01-296Z.dump.enc`
- Encrypted-object SHA-256:
  `a3184ba13368b437f36247761717a3ab4e25b8b4a09bfe67fcb2424b7884f2c4`
- Daily schedule: `06:00 UTC`; restart policy: `NEVER`; retention: `30` days.
- The encryption key is separately DPAPI-escrowed in ignored local recovery
  storage for the operator Windows account.

## Database and isolation

- Distinct migration, runtime, and queue roles were provisioned.
- Production runtime rejects superuser and `BYPASSRLS` roles.
- Forced RLS is enabled on every tenant-owned public-beta table.
- Live Railway PostgreSQL integration tests passed all eight cross-tenant,
  idempotency, restricted-role, and encrypted OAuth checks.
- Schema migrations are advisory-locked and checksum protected.
- A clean standalone install contains 207 packages with zero production audit
  findings. Build, lint, static release checks, 24 test files, and 186 tests
  passed; one file and eight database tests are skipped only in the no-database
  local pass, then all eight passed against live Railway PostgreSQL.

## Fejiro migration

- Exact source and target mailbox identity matched.
- Dry run and apply both completed from the same content inventory.
- Approved facts imported: `12`
- Unverified facts excluded: `3`
- Content-deduplicated private resumes imported: `68`
- Historical applications imported: `96`
- Applications with present private proof retained as verified: `65`
- Missing-proof records downgraded to submitted-unverified: `31`
- Imported OAuth tokens, browser cookies, platform sessions, and raw mailbox
  bodies: `0`
- Hosted onboarding remains incomplete until Fejiro reviews current preferences
  and public-beta consent.

## PWA smoke

- Authenticated login passed on the Railway origin.
- Desktop `1440x1000` and mobile `390x844` had no horizontal page overflow.
- The mobile navigation is intentionally horizontally scrollable.
- Dashboard API returned all 96 applications, 65 evidence links, 68 resumes,
  and 12 approved facts.
- Operator health returned `403` until MFA is enabled, as designed.
- The service worker controlled the page and reloaded the complete application
  shell offline at `390x844`, with no horizontal overflow.
- Both 192px and 512px PWA icons return `200`. Text-encoded byte-matching
  fallbacks protect Railway CLI deployments that exclude binary PNGs.
- Screenshots are retained privately under `.local/qa-public-beta` because they
  contain candidate application history.

## Fejiro connector certification

- The local OAuth status and connected Gmail profile independently resolve to
  `fejiro.efiuvwere@gmail.com`.
- All four Fejiro scheduled tasks are ready and their latest result is `0`.
- The visible Chrome profile is `Fejiro`; no browser was launched or navigated.
- Chrome CDP is not listening on ports 9333 or 9222, so no fresh LinkedIn,
  Indeed, or Dice authentication/application proof run was attempted.
- Historical evidence files remain present for 30 LinkedIn, 23 Indeed, and 12
  Dice verified-attempt records. Monster has 223 generated packages and no
  verified submission history.
- Gmail Approved Send is empty. Sent reconciliation considered four eligible
  local records, matched none, and made no external change.
- Hosted Fejiro has no reconnected connector. Activation correctly remains
  blocked on onboarding/consent and verified email intake, and operator health
  remains MFA-gated.

## Release blockers

- Resend API and inbound-webhook secrets are not provisioned.
- Google production OAuth callback/verification is not complete.
- Operator MFA is enforced but has not been enrolled by Fejiro.
- Railway remains on `HOBBY`. The encrypted logical backup and same-cluster
  restore drill now pass; provider snapshots and a replacement-infrastructure
  restore remain unavailable but do not block the two-user invite-only beta.
- GitHub Actions jobs cannot start because GitHub reports the account is locked
  for a billing issue. The same checks pass locally, but CI remains red.
- The CI release now builds one commit-addressed GHCR image on `main`. Current
  CLI-built services are source-identical but remain on separate image digests
  until that artifact is published and pinned.
- Hosted Gmail is not reconnected; LinkedIn, Indeed, and Dice require fresh
  authenticated proof runs. Monster remains `manual_only`.
- The 14-day Chukwuma isolated-tenant pilot has not started.

No external recruiter message or job application was sent during this release
foundation work.
