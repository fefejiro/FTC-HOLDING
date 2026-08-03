# Operations Runbook

## Objective

Run Job Reply Agent with minimal operator overhead.

## Daily Runtime

1. Intake and decision jobs run on schedule.
2. End-of-day report is emailed to operator.
3. Operator reviews only exception queues in the browser UI:
   - `JOBS/NeedsReview`
   - `JOBS/Drafted`
4. Desktop and phone use the same responsive control surface.

## Mode Policy

- Default production mode: `approval_required`
- Temporary safety mode: `draft_only`
- Emergency stop: `enabled: false`
- Optional future mode: `trusted_auto_send` (narrow whitelist only)

## End-of-Day Report

Subject:

`Job Reply Agent Daily Report - YYYY-MM-DD`

Report always includes:

- Processed
- Drafted
- Needs Review
- Approved and Sent
- Skipped
- Blocked
- Errors
- Top Opportunities
- Blocked / Risk Items
- Suggested Tomorrow Actions

## Failure Handling

1. If SMTP fails, report preview remains in logs.
2. If Gmail intake fails, run marked as error and retried on next schedule.
3. If parse confidence is low, route to `NeedsReview` not send path.
4. If sensitive request detected, route to `Blocked` with reason.
5. If the web token is enabled, require `JOB_AGENT_WEB_TOKEN` on all remote API calls.

## Ownership Cadence

1. Weekly: tune rules and resume mappings.
2. Bi-weekly: review blocked reasons for policy updates.
3. Monthly: role-family scoring calibration from response outcomes.

## Product Database Roles

Run `npm run product:migrate` with:

- `MIGRATION_DATABASE_URL`: schema owner used only for migrations and grants
- `DATABASE_URL`: restricted `NOSUPERUSER NOBYPASSRLS` application role

The production server refuses to start with a superuser or `BYPASSRLS` role.
This is required because privileged PostgreSQL roles bypass tenant row-level
security. Never use the migration credential in the web server or workers.

## Private Resume Storage

Production requires `OBJECT_STORAGE_DRIVER=s3`, a private bucket, and its
region. S3-compatible endpoints are supported. Resume keys are derived from
the authenticated user UUID and content digest; filenames are never used as
object paths.

After deploying migration `006_private_object_storage.sql`, run:

`npm run product:storage:migrate`

This copies legacy PostgreSQL resume blobs into object storage and clears the
database content only after each object upload succeeds. Resume deletions are
recorded in `product_object_deletions` so failed object cleanup remains
traceable and retryable.

Run `npm run product:storage:cleanup` from the worker or operations environment
to retry pending and failed deletions. The command fails its process status if
any object still cannot be removed. Account deletion purges all private resume
objects before deleting the database account and fails closed if storage is
unavailable.

## Product Gmail OAuth

Create a Google OAuth web client with the exact redirect URI:

`https://<product-host>/api/v1/oauth/gmail/callback`

Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and either
`OAUTH_TOKEN_ENCRYPTION_KEYS` or the single-key
`OAUTH_TOKEN_ENCRYPTION_KEY`. Encryption keys must be base64-encoded 32-byte
values. Set `OAUTH_TOKEN_ACTIVE_KEY_VERSION` when using the key ring.

The connection flow uses a one-use, ten-minute state and PKCE. The Gmail
profile address must exactly match the signed-in JobAgent account email.
Refresh tokens are encrypted with AES-256-GCM and authenticated metadata binds
the ciphertext to the user and provider.

Keep old key versions configured during rotation. New connections use the
active version. Removing an old key before its stored tokens are rotated makes
those connections unreadable.

Disconnect attempts Google token revocation and always removes the local
encrypted secret. Account deletion also attempts provider revocation before
destroying local data. Provider revocation failure must be surfaced in the
audit/status result, but it must not prevent a user from deleting their local
account.
