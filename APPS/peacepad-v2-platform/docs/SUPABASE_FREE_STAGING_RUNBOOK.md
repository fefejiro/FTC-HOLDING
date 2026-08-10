# Supabase Free staging runbook

## Fixed staging topology

| Data plane | Project | Database region | Edge invocation region |
| --- | --- | --- | --- |
| Canada | `peacepad-v2-staging-ca` (`ftdqnhlesqrkstnqgfxr`) | `ca-central-1` | `ca-central-1` |
| United States | `peacepad-v2-staging-us` (`kgechdqdtryktfahyqez`) | `us-east-2` | `us-east-1` |

The U.S. execution location is the nearest supported Edge Function invocation
region. It is not a data-residency certification. Both projects contain only
fictional staging identities and records.

## Local verification

```powershell
./scripts/validate-supabase-free-staging.ps1
./scripts/validate-supabase-edge-function.ps1
./scripts/deploy-supabase-free-staging.ps1 -Region ca -ProjectRef ftdqnhlesqrkstnqgfxr -FunctionRegion ca-central-1 -SkipDeploy
./scripts/deploy-supabase-free-staging.ps1 -Region us -ProjectRef kgechdqdtryktfahyqez -FunctionRegion us-east-1 -SkipDeploy
```

## Database migration

Apply every file under `supabase/migrations` independently to each empty
project. Use an IPv4 pooler connection and a password supplied through the
operator's secret store; never place a database password in the repository,
shell history, Expo configuration, screenshots, or logs.

Run migration dry-run and apply through the Supabase CLI:

```powershell
supabase db push --db-url $env:PEACEPAD_STAGING_DATABASE_URL --dry-run --agent no --workdir .
supabase db push --db-url $env:PEACEPAD_STAGING_DATABASE_URL --yes --agent no --workdir .
```

## Edge Function deployment

The deployment operator needs permission to read the project, update Function
secrets, and deploy Functions. Run the deployment script once for each project.
The function deliberately disables gateway JWT enforcement so `/health` and
`/readyz` can be checked without a user session; `/api/v2/session` validates the
Bearer token itself with Supabase Auth.

Before deployment, create a distinct high-entropy maintenance secret for each
regional project and set it through the operator's secret store as
`PEACEPAD_MAINTENANCE_SECRET`. Never place it in Expo configuration, source,
shell history, screenshots, or logs. The secret protects only the bounded
server-to-server Auth cleanup runner; it is not a user session credential.

Create a second, independent high-entropy secret for request-bound write
receipts and expose it to the Function as `PEACEPAD_IDEMPOTENCY_SECRET`. This
secret derives opaque client-key hashes, canonical request fingerprints, and
deterministic invitation retries. It must not equal the maintenance secret and
must never be exposed to Expo, clients, chat, source, screenshots, or logs.

After a fictional account-deletion test, process any retryable Auth cleanup
requests with environment-backed function URLs and secrets:

```powershell
$env:PEACEPAD_V2_CA_FUNCTION_URL = 'https://<ca-project>.supabase.co/functions/v1/peacepad-v2-api'
$env:PEACEPAD_V2_US_FUNCTION_URL = 'https://<us-project>.supabase.co/functions/v1/peacepad-v2-api'
# Set PEACEPAD_V2_CA_MAINTENANCE_SECRET and PEACEPAD_V2_US_MAINTENANCE_SECRET
# through the operator secret store, then run:
./scripts/run-auth-cleanup.ps1 -Region all
```

The outbox stores only the Auth UUID and regional retry metadata. Successful
rows are deleted immediately. It never stores email addresses, family data,
tokens, or provider error text.

### GitHub environment deployment

The manual `PeacePad V2 Supabase Staging Deploy` workflow is registered on
`main` and is the preferred non-interactive operator path. It is
`workflow_dispatch` only, deploys exactly one region per run, and defaults to
a non-mutating dry run. The control checkout is bound to the exact dispatch
commit and the V2 source is materialized as a detached worktree only after its
full reviewed SHA is verified. Both `peacepad-v2-staging-ca` and
`peacepad-v2-staging-us` are restricted to `main` and require the `fefejiro`
reviewer. Configure the following generic secret names independently in those
environments without placing their values in chat, source, workflow inputs,
or screenshots:

- `SUPABASE_ACCESS_TOKEN`
- `DATABASE_URL`
- `MAINTENANCE_SECRET`
- `IDEMPOTENCY_SECRET`

Distinct `MAINTENANCE_SECRET` values are already configured. The remaining
required slots are `SUPABASE_ACCESS_TOKEN`, `DATABASE_URL`, and a distinct
`IDEMPOTENCY_SECRET` in each region. The access token must be able to see the
approved project ref for that one region. Dispatch from `main` and enter the
exact reviewed V2 target commit SHA.
A real deployment additionally requires the exact confirmation `DEPLOY
FICTIONAL STAGING`. The workflow dry-runs migrations before any apply, deploys
only the staging Edge Function, and then verifies health, readiness,
unauthenticated session denial, and wrong-region denial. It cannot target
production identifiers or App Store assets.

## Live acceptance

Invoke Canada with `x-region: ca-central-1` and
`x-peacepad-region: ca`. Invoke the U.S. adapter with `x-region: us-east-1` and
`x-peacepad-region: us`.

Required evidence:

1. `/health` returns `200` and `fictional-staging`.
2. `/readyz` returns `200` only after migrations exist.
3. `/api/v2/session` without a token returns the standard `401` envelope.
4. A wrong `x-peacepad-region` returns `409`.
5. A valid fictional user returns only its JWT-derived identity and immutable
   regional binding.
6. Account deletion immediately removes application authorization, deletes the
   Auth principal or queues a leased retry, and old JWTs cannot restore a
   session.
7. The maintenance runner clears the retry outbox without exposing identity
   IDs or provider details in its response.
8. Identical write retries replay the same semantic result, while changing the
   operation, body, region, family, resource, schema, or expected version with
   the same client key returns `409 IDEMPOTENCY_CONFLICT`.
9. The append-only audit ledger contains no response JSON, message body,
   invitation code, family name, or record metadata. Expired encrypted replay
   receipts are cleared by the maintenance runner.

## Fictional staging reset required by migration 202608090012

Migration `202608090012_v2_idempotency_receipts.sql` deliberately stops with
`STAGING_AUDIT_RESET_REQUIRED` if an existing project still contains plaintext
response JSON in `peacepad_v2.audit_event.result`. Do not bypass the check and
do not edit deployed migration history. Because these two projects are
fictional-only staging, the approved operator path is to export schema proof,
confirm the exact project ref and region, revoke fictional sessions, reset the
`peacepad_v2` staging schema, and apply the complete migration chain from an
empty schema. Capture the project ref, region, reviewed commit, migration
hashes, and post-reset contract result. This procedure must refuse production
identifiers and must never be used against V1 or real family data.

## Last verified access blocker (2026-08-09)

The previously authenticated Supabase CLI token could not see either approved
regional staging project. The current workstation could not re-check that
operator identity on 2026-08-10 because the Supabase CLI is unavailable. The
protected environments do not yet have a usable Supabase access token,
database URLs, or request-bound idempotency secrets. Pending migrations and
the Edge Function are therefore
**BLOCKED BY DEPLOYMENT IDENTITY**, not reported as deployed. Hosted CI applies
every migration twice to an isolated PostgreSQL 16 service and verifies the
fictional invitation, messaging, correction, receipt, search, deletion, and
access-revocation journey. That is hosted database proof, not managed-project
execution. The protected workflow and both regional environments are now
registered. Their main-only branch policies and required reviewer are
verified, and each environment has a distinct maintenance secret. Managed
deployment remains blocked on the regional `SUPABASE_ACCESS_TOKEN`,
`DATABASE_URL`, and new `IDEMPOTENCY_SECRET` slots for Canada and the United
States. One access token may be shared if it can see both approved projects;
the database URLs and idempotency secrets remain regional. Resolve by granting a dedicated
deployment identity access to both projects and adding those values privately.
Do not share passwords, database URLs, maintenance secrets, or service-role
keys in chat.

