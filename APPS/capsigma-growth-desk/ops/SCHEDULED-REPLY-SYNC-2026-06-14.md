# Scheduled Reply Sync - 2026-06-14

Status: implemented locally, cloud-ready after merge to `main`.

## Cloud Schedule

GitHub Actions workflow:

```text
.github/workflows/capsigma-reply-sync.yml
```

Schedule:

```text
Every 30 minutes, Monday to Friday, during Eastern business hours.
```

Manual run is also available from GitHub Actions through `workflow_dispatch`.

Activation note: GitHub only schedules or dispatches a workflow after the
workflow file exists on the repository default branch. This workflow is committed
on the current branch and becomes cloud-active after merge to `main`.

## What It Does

The workflow calls:

```text
POST https://capsigma-growth-desk.pages.dev/api/mailbox/gmail/sync?maxResults=10
```

with:

```text
X-Capsigma-Sync-Token: ${{ secrets.CAPSIGMA_REPLY_SYNC_TOKEN }}
```

The endpoint syncs recent Gmail messages into the CapSigma reply ledger and
surfaces human-attention replies in the dashboard.

## Laptop Schedule

For immediate no-babysitting operation on this Windows machine, register:

```powershell
npm run schedule:reply-sync:windows
```

This creates:

```text
CapSigmaGrowthDeskReplySync
```

The task runs every 30 minutes and calls:

```powershell
scripts/run-reply-sync.ps1
```

Local logs are written under:

```text
.local/reply-sync-logs/
```

The `.local` folder is ignored by git.

Current local status:

```text
Task: CapSigmaGrowthDeskReplySync
State: Ready
Last task result: 0
```

## Secret Handling

The same token must be configured in both places:

- Cloudflare Pages secret: `REPLY_SYNC_TOKEN`
- GitHub Actions secret: `CAPSIGMA_REPLY_SYNC_TOKEN`

No token value is committed.

## Proof

Each workflow run uploads:

```text
capsigma-reply-sync.json
```

The sync payload contains counts and reply ids/classifications only, not email
token secrets.
