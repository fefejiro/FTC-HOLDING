# Una Labs LinkedIn Automation

This automation produces daily LinkedIn draft content (Mon-Fri, 9:00 AM ET) and sends a Telegram digest for review. Posting stays manual.

## What it does
- Pulls AI news from RSS sources (last 24-48 hours)
- If too few items are found, expands lookback up to 72 hours
- Falls back to the last successful digest when current feeds are empty
- Ranks top 3–5 topics
- Drafts posts in the Una Labs voice via OpenClaw
- Sends a Telegram digest marked **REVIEW REQUIRED**
- Saves a local archive in `DOCS/linkedin/daily/`
- Logs approvals into `DOCS/linkedin/UNALABS_POST_QUEUE_LOG.md`
- Tracks weekly metrics in `DOCS/linkedin/UNALABS_LINKEDIN_WEEKLY_METRICS.md`

## Required setup

### Telegram
Set these environment variables before running:
```
$env:TELEGRAM_BOT_TOKEN="123456:ABC..."
$env:TELEGRAM_CHAT_ID="123456789"
```

**Important:** Use a dedicated Telegram bot for this automation (do not reuse the OpenClaw bot) to avoid polling conflicts.

To find your chat ID quickly:
1. Send a message to your bot.
2. Run the approvals script once - it will print the detected chat id if missing.

### One-time setup helper
```
.\scripts\unalabs-linkedin-setup.ps1
```

### OpenClaw
OpenClaw must be running with OAuth enabled.
Optional:
```
$env:OPENCLAW_PROFILE="UpNepa"
```

## Run commands

### Daily digest
```
.\scripts\unalabs-linkedin-digest.ps1
```

### Quick test (dry run + approvals)
```
.\scripts\unalabs-linkedin-quicktest.ps1
```

### Approvals polling (manual)
```
.\scripts\unalabs-linkedin-approvals.ps1
```

### Reminder ping (manual)
```
.\scripts\unalabs-linkedin-reminder.ps1
```

### Weekly metrics prompt
```
.\scripts\unalabs-linkedin-weekly-metrics.ps1
```

## Scheduler (optional)
If you want low-touch daily automation, create a Windows Task Scheduler job that runs:
```
powershell -ExecutionPolicy Bypass -File C:\FTC HOLDING\scripts\unalabs-linkedin-digest.ps1
```

You can also schedule the approvals poller every 10-15 minutes:
```
powershell -ExecutionPolicy Bypass -File C:\FTC HOLDING\scripts\unalabs-linkedin-approvals.ps1
```

Or use the helper:
```
.\scripts\unalabs-linkedin-scheduler.ps1
```

## Files
- Sources: `DOCS/linkedin/UNALABS_AI_NEWS_SOURCES.json`
- Prompt template: `DOCS/linkedin/UNALABS_LINKEDIN_PROMPT_TEMPLATE.md`
- Daily archive: `DOCS/linkedin/daily/YYYY-MM-DD.md`
- Approval queue log: `DOCS/linkedin/UNALABS_POST_QUEUE_LOG.md`
- Metrics: `DOCS/linkedin/UNALABS_LINKEDIN_WEEKLY_METRICS.md`
