# Cloud Setup — Job Reply Agent on GitHub Actions

Run this once to make the agent work in the cloud with zero additional cost.

---

## What you need

Five GitHub repository secrets. The agent reads everything from them at runtime.

---

## Step 1 — Get your Gmail tokens JSON

Your tokens file is already on your machine from when you ran `gmail:auth:save`.

```powershell
Get-Content "C:\FTC HOLDING\APPS\job-reply-agent\data\gmail_tokens.json"
```

Copy the entire output (it looks like `{"access_token":"...","refresh_token":"...","expiry_date":...}`).

> If the file doesn't exist yet, run `npm run gmail:auth:url` and complete the OAuth flow first.

---

## Step 2 — Add secrets to GitHub

Go to: **https://github.com/fefejiro/FTC-HOLDING/settings/secrets/actions**

Add these five secrets:

| Secret name | Value |
|---|---|
| `JOB_AGENT_GMAIL_CLIENT_ID` | Your Google OAuth client ID (from Google Cloud Console) |
| `JOB_AGENT_GMAIL_CLIENT_SECRET` | Your Google OAuth client secret |
| `JOB_AGENT_GMAIL_TOKENS_JSON` | Full JSON from `data/gmail_tokens.json` (step 1) |
| `JOB_AGENT_GMAIL_ACCOUNT_EMAIL` | Your Gmail address (e.g. `you@gmail.com`) |
| `JOB_AGENT_REPORT_TO` | Where to send the daily report (usually same Gmail address) |

---

## Step 3 — Verify it works

1. Go to **Actions** tab on GitHub: https://github.com/fefejiro/FTC-HOLDING/actions
2. Select **Job Reply Agent** workflow
3. Click **Run workflow** → leave command as `run:gmail-cycle` → click Run
4. Watch the run complete. Check for errors in the logs.

---

## How it runs automatically

| Schedule | What happens |
|---|---|
| Every 15 min, Mon–Fri, 8 AM – 9 PM EST | Scans inbox, drafts replies, sends pre-approved |
| Once daily at 6 PM EST, Mon–Fri | Sends your daily summary email |

Your computer does not need to be on.

---

## SQLite database persistence

The agent's database (`data/job_leads.sqlite`) is cached between runs using GitHub Actions cache. It persists all day and rolls over to a fresh copy each day. Gmail labels act as the primary deduplication guard, so even if the cache misses, it won't re-send to the same thread.

---

## Disabling cloud mode temporarily

Go to **Actions → Job Reply Agent → (top-right) Disable workflow** to pause it.
Re-enable whenever you want it back on.

---

## Keeping tokens fresh

Gmail refresh tokens don't expire unless:
- You haven't used the agent in 6+ months
- You revoke access in Google account settings

If the workflow starts failing with auth errors, re-run `npm run gmail:auth:url` locally, save new tokens, and update the `JOB_AGENT_GMAIL_TOKENS_JSON` secret with the new file contents.
