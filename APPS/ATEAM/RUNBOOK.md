# RUNBOOK - ATEAM

## Prerequisites

- Node.js 22.x
- Windows PowerShell for the launcher and cleanup helpers

## Install

From `APPS/ATEAM`:

```powershell
npm install
```

For a full local dev install after switching machines:

```powershell
npm run install:dev
```

## Run Dev

Main local server:

```powershell
npm run start:server
```

Launch Office with health-check guard:

```powershell
npm run launch:office
```

Optional sidecars:

```powershell
npm run start:bridge
npm run start:phone
npm run start:telegram
```

For local no-key testing:

```powershell
Copy-Item .env.example .env
# set LLM_MODE=stub
npm run start:server
```

## Supabase CLI

ATEAM now carries the Supabase CLI as a local dev dependency. From `APPS/ATEAM`:

```powershell
npm run supabase:status
npm run supabase:login
npm run supabase:projects
npm run supabase:link
npm run supabase:preflight
npm run storage:preflight
```

Notes:

- Local Supabase stack commands require Docker Desktop to be running.
- Remote project commands require a Supabase access token from `npm run supabase:login`.
- In non-TTY shells like Codex, use `SUPABASE_ACCESS_TOKEN` or run `supabase login --token <token>` in a normal terminal first.
- `SUPABASE_PROJECT_REF` is required for scripted remote cutover.
- The preferred managed runtime path is direct Postgres with `ATEAM_DATABASE_URL` or `DATABASE_URL`.

Useful local database commands:

```powershell
npm run supabase:start
npm run supabase:db:reset
npm run supabase:db:lint
npm run supabase:stop
```

## Build

No frontend build step is required for the local app. The main verification is syntax and tests.

## Start Production

Railway starts the root package with:

```powershell
npm run start
```

Public workflow-only behavior is available locally with:

```powershell
npm run start:public
```

Durable workflow storage:

```powershell
# keep local fallback
$env:ATEAM_STORAGE_BACKEND="local"

# or switch workflow runs / jobs / approvals to managed Postgres
$env:ATEAM_STORAGE_BACKEND="postgres"
$env:ATEAM_DATABASE_URL="postgresql://..."

# optional REST-based Supabase storage
$env:ATEAM_STORAGE_BACKEND="supabase"
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="..."
```

Before enabling Supabase in production:

1. Preferred path: set `ATEAM_STORAGE_BACKEND=postgres` and `ATEAM_DATABASE_URL` (or `DATABASE_URL`) to the managed database.
2. Run `npm run storage:preflight`.
3. Run `npm run migrate:workflow:postgres -- --source-http` or `npm run storage:cutover`.
4. Redeploy the ATEAM runtime and confirm `/health` reports `storage.backend = postgres`.
5. Optional REST path: authenticate the Supabase CLI, set `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`, then use `npm run supabase:cutover`.
6. Keep the legacy reference copy in [Docs/SUPABASE_WORKFLOW_SCHEMA.sql](/c:/FTC%20HOLDING/APPS/ATEAM/Docs/SUPABASE_WORKFLOW_SCHEMA.sql) for manual SQL fallback only.
7. Optional: migrate existing workflow state:

```powershell
# from the live public/ops surfaces
$env:ATEAM_OPS_BASIC_AUTH_USERNAME="mike.fejiro@gmail.com"
$env:ATEAM_OPS_BASIC_AUTH_PASSWORD="..."
npm run migrate:workflow:supabase -- --source-http
```

8. Confirm `/health` reports the intended managed backend.

## Test Commands

```powershell
npm run test:backend
npm run test:unit
npm run test:integration
npm run test:coverage
npm run verify:server
```

## Troubleshooting

- If local startup feels noisy, run `npm run clean:local`.
- If `/health` is up but the launcher refuses to open, check `projectRoot` in the health response and make sure you are running the canonical repo copy.
- If you do not want live model calls, use `LLM_MODE=stub`.
- Keep `memory/` as local state, not as a place to hand-edit source behavior.

## Deployment Notes

- Public Una Labs intake uses the cloud-backed Railway API plus the Cloudflare route layer.
- Local bridge and Telegram gateway are optional operator tools, not part of the public product narrative.
- Core workflow durability now supports a safe `supabase -> local` fallback for runs, jobs, and approvals.
