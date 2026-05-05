# OpenClaw Removal Handover 2026-03-24

## Summary

OpenClaw was fully removed from this machine and scrubbed from the repo copies at:

- `C:\FTC HOLDING`
- `C:\FTC HOLDING\FTC-HOLDING`

This change was made because OpenClaw was no longer wanted on the system and its old Telegram-linked automation was causing unwanted shell behavior.

## What Was Removed From The Machine

- OpenClaw global npm install and shims
- OpenClaw config under `C:\Users\mikef\.openclaw`
- OpenClaw startup hooks
- OpenClaw scheduled task
- OpenClaw process
- leftover `OPENCLAW_*` user environment variables

## What Was Removed From The Repo

- `scripts/up-nepa.ps1`
- `scripts/up-nepa-scheduler.ps1`
- old `UP_NEPA` documentation

Those files were OpenClaw-specific account-switching automation and are intentionally gone.

## What Was Changed Instead

The Una Labs LinkedIn helper scripts were kept, but they were rewritten to stop depending on OpenClaw:

- [unalabs-linkedin-setup.ps1](/c:/FTC%20HOLDING/FTC-HOLDING/scripts/unalabs-linkedin-setup.ps1)
- [unalabs-linkedin-digest.ps1](/c:/FTC%20HOLDING/FTC-HOLDING/scripts/unalabs-linkedin-digest.ps1)
- [unalabs-linkedin-approvals.ps1](/c:/FTC%20HOLDING/FTC-HOLDING/scripts/unalabs-linkedin-approvals.ps1)
- [unalabs-linkedin-reminder.ps1](/c:/FTC%20HOLDING/FTC-HOLDING/scripts/unalabs-linkedin-reminder.ps1)
- [UNALABS_LINKEDIN_AUTOMATION.md](/c:/FTC%20HOLDING/FTC-HOLDING/DOCS/linkedin/UNALABS_LINKEDIN_AUTOMATION.md)

The digest flow now uses a local drafter instead of calling OpenClaw.

## Important Non-Removal

The standalone ATEAM Telegram gateway was not removed. It is separate from OpenClaw.

Path:

- `APPS/ATEAM/telegram-gateway`

If Telegram remote access ever needs to be disabled too, that should be treated as a separate cleanup task.

## Verification Completed

- no OpenClaw process running
- no OpenClaw Startup entry
- no OpenClaw scheduled task
- no `OPENCLAW_*` user env vars left
- no remaining `openclaw` or `Up Nepa` references in workspace text search
- rewritten PowerShell helper scripts parse cleanly

## Follow-Up Guidance

- Do not reintroduce `Up Nepa` or `OPENCLAW_*` env usage unless OpenClaw is intentionally brought back.
- If future LinkedIn drafting needs a model-backed path, add it explicitly as a new supported provider instead of silently tying it to OpenClaw again.
