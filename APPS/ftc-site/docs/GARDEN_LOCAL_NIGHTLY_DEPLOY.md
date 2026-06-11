# Garden Local Nightly Deploy

Last updated: 2026-06-11

## Purpose

Garden Cleaners has a local Windows scheduled deployment path that does not depend on GitHub Actions. It exists because GitHub-hosted jobs can be blocked by account billing, while Cloudflare Pages direct upload is already working from this machine.

## Schedule

Task name:

```powershell
FTC Garden Cleaners Nightly Deploy
```

Default schedule:

```powershell
Daily at 20:00 local Windows time
```

On this machine that is intended to be 8:00 PM America/New_York.

## Register Or Replace The Task

From the repo root:

```powershell
npm run garden:nightly:register
```

Equivalent direct command:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/register-garden-nightly-task.ps1 -Force
```

The scheduled task runs as the current Windows user with interactive logon. The machine must be on, the user session must be available, and local Wrangler auth must remain valid.

## What The Runner Does

Command:

```powershell
npm run garden:nightly
```

Steps:

- Refuses to run if the repo has uncommitted changes.
- Fetches `origin/main`.
- Fast-forwards the current local branch to `origin/main`.
- Runs the Garden env contract using temporary placeholder values only when local Supabase env vars are missing.
- Restores env before build so the browser bundle can use `/api/public-auth-config` and Cloudflare runtime env.
- Runs `garden:worker-contract`.
- Builds `APPS/ftc-site`.
- Runs Garden public/portal Playwright smoke, excluding the service-backed quote submission test.
- Deploys `.vercel/output/static` to Cloudflare Pages project `ftc-site-pages`.
- Runs Garden production route smoke.
- Runs Garden auth callback smoke.

## Logs

Logs are written under:

```powershell
.local\garden-release-logs\
```

That folder is ignored by git.

## Useful Manual Commands

Rehearsal without fetch, Playwright, or deploy:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-garden-nightly-release.ps1 -SkipFetch -SkipDeploy -SkipPlaywright -AllowDirty
```

Full run without waiting for 8 PM:

```powershell
npm run garden:nightly
```

View the registered task:

```powershell
Get-ScheduledTask -TaskName "FTC Garden Cleaners Nightly Deploy" | Format-List *
Get-ScheduledTaskInfo -TaskName "FTC Garden Cleaners Nightly Deploy"
```
