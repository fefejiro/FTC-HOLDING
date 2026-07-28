# Una Labs JobAgent Product Runbook

## Product boundary

The cloud product is separate from the local operator runtime. The authenticated
session determines tenant ownership; request bodies and runner payloads cannot
select another user. Browser cookies remain on an enrolled Windows device.

## Railway topology

Use the dedicated `una-jobagent` project only:

- `jobagent-web`: `JOB_AGENT_PROCESS=web`, restricted RLS runtime role
- `jobagent-worker`: `JOB_AGENT_PROCESS=worker`, restricted RLS runtime role
  plus the queue-schema owner
- `jobagent-migrate`: one-shot `JOB_AGENT_PROCESS=migrate`, migration owner only
- `jobagent-backup`: daily one-shot `JOB_AGENT_PROCESS=backup`, PostgreSQL
  administrative backup connection, private bucket, and backup key only
- `Postgres`: dedicated product database, not shared with another Una Labs app
- `jobagent-private`: private S3-compatible bucket for resumes and proof

The same release commit and Dockerfile must build web, worker, and migration
images. Runtime services never receive the migration credential.

## Release sequence

1. Run `npm ci --workspaces=false`, `npm run lint --workspaces=false`,
   `npm test --workspaces=false`, and `npm audit --omit=dev --workspaces=false`.
2. Run `npm run production:check` and the strict check with production variables.
3. Build the Docker image from the release commit and record its digest.
4. Deploy `jobagent-migrate`; require a clean exit and the migration checksum log.
5. Deploy web and worker from the same commit. Require `/readyz` to report the
   database, RLS role, and private object storage ready.
   On `main`, publish `ghcr.io/<owner>/una-jobagent:<commit>` once and pin web,
   worker, and migration to that exact digest.
6. Verify the worker-ready log lists all queues and no restart loop exists.
7. Verify the branded HTTPS origin, security headers, PWA manifest, mobile and
   desktop layouts, offline shell, and private signed downloads.
8. Run PostgreSQL cross-tenant tests, OAuth replay/mismatch tests, queue
   idempotency tests, runner-signature tests, deletion tests, and resume audits.

`AUTO_MIGRATE` remains `false`. Schema changes run only in the one-shot service.

## Account activation

1. Bootstrap one admin with the one-use local bootstrap secret.
2. Sign in, enable MFA, and verify operator endpoints remain blocked without it.
3. Configure Resend, verify the sender and inbound webhook, then issue an
   expiring one-use invitation.
4. Require verified email, reviewed onboarding, approved facts, a default
   resume, an automation policy, and a verified email intake before activation.
5. Leave recruiter sends and controlled submissions disabled until the
   individual connector is `certified_live`.

## Fejiro migration and cutover

Run the importer without `--apply` first. It must report exact mailbox identity,
approved versus excluded facts, stored resume/proof availability, and excluded
secret classes. Apply only with both `--apply` and
`PILOT_IMPORT_APPLY=true`.

Never import `.env`, Gmail tokens, OAuth states, browser profiles, cookies,
job-board sessions, or raw mailbox bodies. Reconnect Gmail through hosted OAuth.
Run cloud decisions in shadow mode and disable one local scheduler channel only
after duplicate and proof reconciliation passes.

## Trusted runner

Create a one-use enrollment token from the authenticated candidate account, then
run `scripts/install-trusted-runner.ps1` on the candidate's Windows device. The
runner must verify candidate id, task signature, expiry, nonce, and local
handler availability before leasing work. CAPTCHA, authentication, legal,
sensitive, contradictory, or unknown screens return a manual gate.

## Backup and restore drill

The current Railway workspace is on Hobby and cannot use scheduled managed
volume backups. `jobagent-backup` provides the beta fallback without requiring
a plan upgrade:

1. Run `pg_dump` with the PostgreSQL 18 client over Railway private networking.
2. Encrypt the custom-format dump with AES-256-GCM before upload.
3. Upload to the private bucket, download it, and verify its SHA-256 digest.
4. Decrypt it and restore it into a temporary isolated database.
5. Compare every public table and row count, then drop the temporary database.
6. Retain verified backups for no more than 30 days.

The job runs daily at `06:00 UTC`, exits after completion, and never retries in
a loop. Its encryption key is separately escrowed with Windows DPAPI under the
operator account in ignored local recovery storage. A wider public launch still
requires a provider-independent restore drill on replacement infrastructure;
the same-cluster drill is sufficient for the invite-only beta.

## Branded domain

`jobagent.unalabs.cloud` is a Cloudflare Worker Custom Domain. The
`una-jobagent-edge` Worker owns DNS and TLS, proxies only to the fixed Railway
service origin, rewrites upstream redirects, and disables caching for account,
OAuth, API, session, and readiness routes. Railway's obsolete custom-domain
registration has been deleted.

Deploy with:

```powershell
wrangler deploy --config cloudflare/jobagent-edge/wrangler.jsonc
```

Require both `/edgez` and `/readyz` to return `200` before release. The Railway
origin remains available for operator diagnosis but is not the public product
address.

## Channel proof

- Gmail: hosted reconnect, exact mailbox, approved send, Sent-folder id
  reconciliation, and duplicate-free second scan.
- LinkedIn: existing visible Fejiro Chrome with attached CDP, confirmation plus
  Applied-history proof.
- Indeed and Dice: authenticated profile and authoritative Applied-history proof.
- Monster: discovery/package only until authoritative proof exists; otherwise
  remain `manual_only`.

Do not submit a poor-fit role merely to satisfy a smoke test.

## Incident controls

Pause the account, revoke Gmail and runner credentials, stop the worker, preserve
redacted audit metadata, and rotate affected secrets. Never place credentials,
cookies, raw messages, callback codes, or OAuth query strings in logs or queue
payloads.

## Proof standard

A build or deployed URL is not production proof. Record the release commit and
image digest, migration logs, health responses, worker status, strict gate,
tenant isolation, authenticated PWA QA, restore drill, channel confirmation,
and duplicate-retry behavior. Missing credentials or external verification is
a blocker, not a passed gate.
