# Supabase Free staging runbook

## Fixed staging topology

| Data plane | Project | Database region | Edge invocation region |
| --- | --- | --- | --- |
| Canada | `peacepad-v2-staging-ca-mike` (`rohvkyuxbnqzglaromms`) | `ca-central-1` | `ca-central-1` |

Native V2 now uses only this Canadian fictional-staging data plane. The earlier
U.S. staging projects were retired during the 2026-08-31 consolidation and are
not valid deployment targets.

## Local verification

```powershell
./scripts/validate-supabase-free-staging.ps1
./scripts/validate-supabase-edge-function.ps1
./scripts/deploy-supabase-free-staging.ps1 -Region ca -ProjectRef rohvkyuxbnqzglaromms -FunctionRegion ca-central-1 -SkipDeploy
```

## 2026-08-10 project rebind and rollback record

| Region | Active approved project | Historical project | Historical state |
| --- | --- | --- | --- |
| Canada | `rohvkyuxbnqzglaromms` | `ftdqnhlesqrkstnqgfxr` | Paused, recoverable; historical evidence only |
| United States | `spmpndalcvwmygznihec` | `kgechdqdtryktfahyqez` | Paused, recoverable; historical evidence only |

This rebind changes repository targeting only. It does not migrate data, apply
a migration, deploy an Edge Function, prove managed persistence, or promote
either project to production. Historical verification artifacts retain their
original project refs and remain evidence only for those earlier projects.

Rollback is an explicit operator decision, never automatic failover: pause all
staging writes, confirm the intended historical project has been recovered in
its recorded region, re-verify its schema and fictional-only data boundary,
restore all active mappings in one reviewed change, and run the protected
regional dry-run before any deployment. Never copy Canadian data to the U.S.
project or U.S. data to the Canadian project as part of rollback.

## Database migration

Apply every file under `supabase/migrations` independently to each empty
project. Use an IPv4 pooler connection and a password supplied through the
operator's secret store; never place a database password in the repository,
shell history, Expo configuration, screenshots, or logs.

Run migration dry-run and apply through the Supabase CLI for the Canadian
staging project only:

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
- `PUSH_TOKEN_SECRET`
- `TURN_URLS`
- `TURN_SHARED_SECRET`
- `SUPPORT_DISCOVERY_URL`
- `SUPPORT_DISCOVERY_TOKEN`
- `COACH_TRANSCRIPTION_URL`
- `COACH_TRANSCRIPTION_TOKEN`
- `COACH_CONVERSATION_URL`
- `COACH_CONVERSATION_TOKEN`

All four required secret slots exist independently in each protected regional
environment. Their values are not repository evidence and must not be printed
or copied into logs. The access token used by a run must be able to see the
active approved project ref for that one region. Dispatch from `main` and enter
the exact reviewed V2 target commit SHA.
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

## Current managed-execution boundary (2026-08-10)

The replacement regional projects are reported `ACTIVE_HEALTHY` under the
company Supabase organization, and all four protected environment secret slots
exist for each region. No protected dry-run or deployment has yet executed
against either replacement project. Pending migrations and the Edge Function
are therefore **NOT DEPLOYED**, and managed-project persistence is not claimed.
Hosted CI applies
every migration twice to an isolated PostgreSQL 16 service and verifies the
fictional invitation, messaging, correction, receipt, search, deletion, and
access-revocation journey. That is hosted database proof, not managed-project
execution. The protected workflow and both regional environments are now
registered. Their main-only branch policies and required reviewer are
verified. The next authorized action is a one-region-at-a-time protected dry
run using the exact reviewed commit and active project ref; deployment still
requires separate explicit confirmation. One access token may be shared if it
can see both active approved projects; database URLs, maintenance secrets, and
idempotency secrets remain regional.
Do not share passwords, database URLs, maintenance secrets, or service-role
keys in chat.

