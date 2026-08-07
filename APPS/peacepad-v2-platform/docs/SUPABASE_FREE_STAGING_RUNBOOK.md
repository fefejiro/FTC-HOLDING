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

## Current access blocker (2026-08-07)

The locally authenticated Supabase CLI token can list the `FTC Peacepad`
organization but cannot list either staging project or update its Function
secrets. Supabase returns `Your account does not have the necessary privileges`.
Deployment and migration are therefore **BLOCKED BY PROJECT ROLE**, not reported
as deployed. Resolve by authenticating the CLI as a project Owner/Administrator
or granting the current CLI identity the required project permissions. Do not
share passwords or service-role keys in chat.

