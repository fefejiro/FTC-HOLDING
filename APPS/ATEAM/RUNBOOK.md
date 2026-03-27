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

# or switch workflow runs / jobs / approvals to Supabase
$env:ATEAM_STORAGE_BACKEND="supabase"
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="..."
```

Before enabling Supabase in production:

1. Apply [Docs/SUPABASE_WORKFLOW_SCHEMA.sql](/c:/FTC%20HOLDING/APPS/ATEAM/Docs/SUPABASE_WORKFLOW_SCHEMA.sql).
2. Set the `SUPABASE_*` secrets in Railway.
3. Optional: migrate existing workflow state:

```powershell
# from the live public/ops surfaces
$env:ATEAM_OPS_BASIC_AUTH_USERNAME="mike.fejiro@gmail.com"
$env:ATEAM_OPS_BASIC_AUTH_PASSWORD="..."
npm run migrate:workflow:supabase -- --source-http
```

4. Confirm `/health` reports `storage.backend = supabase`.

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
