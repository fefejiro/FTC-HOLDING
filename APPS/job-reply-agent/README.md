# Job Reply Agent

A local recruiter-response operations service designed for controlled automation:

- `draft_only` for safe onboarding
- `approval_required` as the target steady-state operating mode
- end-of-day self-report email so you are not babysitting the machine

## Current Scope

This initial implementation includes:

- config-driven mode controls and risk policy files
- SQLite schema for opportunities and decision states
- daily report aggregation
- OAuth-first Gmail inbox intake, drafting, and sending
- daily self-report via Gmail API (SMTP fallback supported)
- responsive browser control surface for desktop and mobile
- sample data seeding for local verification

## Commands

- `npm run db:reset`
- `npm run seed -- --date=YYYY-MM-DD`
- `npm run gmail:auth:url`
- `npm run gmail:auth:save -- --code=YOUR_CODE`
- `npm run process:mock`
- `npm run process:gmail`
- `npm run approve:all`
- `npm run send:approved`
- `npm run send:approved:gmail`
- `npm run run:mock-cycle`
- `npm run run:gmail-cycle`
- `npm run report -- --date=YYYY-MM-DD`
- `npm run build`
- `npm run serve`

If `--date` is omitted, current date is used.

## Fast Dry-Run Workflow

1. `npm run db:reset`
2. `npm run process:mock`
3. `npm run approve:all`
4. `npm run send:approved`
5. `npm run report -- --date=YYYY-MM-DD`

Or run steps 2 to 4 together:

`npm run run:mock-cycle`

## OAuth Setup (Recommended)

1. Copy `.env.example` to `.env`.
2. Set OAuth values in `.env`:
   - `GMAIL_CLIENT_ID`
   - `GMAIL_CLIENT_SECRET`
   - `GMAIL_REDIRECT_URI` (must match Google console)
   - `GMAIL_ACCOUNT_EMAIL`
3. Generate consent URL:
   - `npm run gmail:auth:url`
4. Open URL, authorize, copy `code` from callback URL, then save tokens:
   - `npm run gmail:auth:save -- --code=PASTE_CODE`
5. Keep `GMAIL_AUTH_MODE=oauth` and `DAILY_REPORT_ENABLE_SEND=true`.

## SMTP Fallback (Optional)

Use only when you explicitly want SMTP mode.

1. Set `GMAIL_AUTH_MODE=smtp`.
2. Set:
   - `SMTP_USER`
   - `SMTP_PASS`
3. Set `REPORT_TO`.

## Live Same-Day Start

1. `npm run process:gmail`
2. `npm run approve:all`
3. `npm run send:approved:gmail`
4. `npm run report`

Or one command:

`npm run run:gmail-cycle`

## Desktop + Mobile Control Surface

Run the browser server with:

`npm run serve`

Then open the server URL on desktop or phone. Add `JOB_AGENT_WEB_TOKEN` in `.env` and pass it as `?token=...` or `x-job-agent-token` for API calls.

Important: to use this entirely from your phone without a computer command, host the service on an always-on machine or cloud VM first. After that, the same browser UI works on both desktop and mobile.

## Expected Report Format

Subject:

`Job Reply Agent Daily Report - YYYY-MM-DD`

Body:

- Processed
- Drafted
- Needs Review
- Approved and Sent
- Skipped
- Blocked
- Errors
- Top Opportunities
- Blocked / Risk Items
- Suggested Tomorrow Actions

## Scheduling (Windows Task Scheduler)

For continuous intake and auto-reply, run the full cycle every 10 minutes:

`powershell -ExecutionPolicy Bypass -File scripts/register-periodic-agent-task.ps1 -IntervalMinutes 10`

This registers `JobReplyAgent-Periodic` to execute:

`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/daily-run.ps1`

For a report-only daily task (optional), use:

`powershell -ExecutionPolicy Bypass -File scripts/register-daily-report-task.ps1 -RunTime 19:00`

## GitHub Actions Automation

The job-reply-agent is deployed to GitHub Actions for scheduled, hands-off operation:

- **Workflow**: `.github/workflows/job-reply-agent.yml`
  - Runs every 15 minutes, weekdays 8AM–9PM EST
  - Executes `npm run run:gmail-cycle` (full intake + draft + send cycle)
  - All 5 secrets configured: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`, `GMAIL_ACCOUNT_EMAIL`, `ATEAM_KEY`

- **Report Workflow**: `.github/workflows/job-reply-report.yml`
  - Runs daily at 6PM EST
  - Executes `npm run report:daily` to send end-of-day summary email

**Status (as of 2026-05-11):**
- Repository changed from private → **public** to unlock unlimited free GitHub Actions minutes
- Both workflows verified working: runners assigned, jobs execute to completion with `conclusion="success"`
- Last backfill test (2026-05-04 to 2026-05-10): 38 recruiter-like emails scanned, 0 qualified for draft/send (all marked `status="skipped"` due to multi-band scoring thresholds)

## Roadmap

See:

- `ops/BACKLOG.md`
- `ops/COPILOT_PROMPT_SEQUENCE.md`
- `ops/ROADMAP.md`
