# Job Reply Agent

A local recruiter-response operations service designed for controlled automation:

- `draft_only` for safe onboarding
- `approval_required` as the target steady-state operating mode
- end-of-day self-report email so you are not babysitting the machine

## Current Scope

This initial implementation includes:

- config-driven mode controls and risk policy files
- SQLite schema for opportunities and decision states
- Hunt OS tables for normalized job leads, generated packages, and outreach drafts
- daily report aggregation
- OAuth-first Gmail inbox intake, drafting, and sending
- Gmail job-alert intake for LinkedIn, Indeed, Dice, Workday, Greenhouse, Lever, Ashby, recruiter, and agency-style alerts
- manual pasted-job intake for job descriptions and apply URLs
- Greenhouse, Lever, and Ashby source normalization
- draft-only outreach generation for connection notes, recruiter follow-ups, cold intros, and post-application follow-ups
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
- `npm run hunt:ingest -- --file ./data/manual_job.txt`
- `npm run hunt:score`
- `npm run hunt:package`
- `npm run hunt:report`
- `npm run build`
- `npm run serve`

If `--date` is omitted, current date is used.

## Job Hunt OS Workflow

Manual pasted-job flow:

1. Add a pasted job description to a local text file such as `data/manual_job.txt`.
2. Run `npm run hunt:ingest -- --file ./data/manual_job.txt`.
3. Run `npm run hunt:score`.
4. Run `npm run hunt:package`.
5. Run `npm run hunt:report`.

The ingestion path normalizes title, company, location, work mode, employment type, source, source URL, apply URL, description, required skills, preferred skills, work authorization language, salary/rate, and red flags into `hunt_jobs`.

Gmail job-alert flow:

- `process:gmail` and `run:gmail-cycle` read recruiter/job-alert messages and normalize job-alert leads into `hunt_jobs`.
- The system reads and normalizes job alerts. It does not send, delete, archive, auto-apply, auto-submit, or run LinkedIn automation.

Safety gates:

- Never claim U.S. citizen, Green Card, U.S. permanent resident, or security clearance.
- Salary/rate, work authorization, relocation, EEO, legal attestation, references, SIN/SSN, passport, date of birth, and final-submit language are marked for review.
- Dice and Indeed are handled through Gmail alerts or manual pasted job text/URL.
- Workday remains manual/open-and-pause only.
- Outreach drafts are saved in the database as waiting drafts under 120 words. They are not sent.

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

Current production notes:

- `.github/workflows/job-reply-agent.yml` runs build/test as a hard gate and runs `node dist/main.js run:gmail-cycle` for scheduled Gmail cycles.
- `.github/workflows/job-reply-report.yml` runs `node dist/main.js report:daily` for end-of-day summaries.
- Required scheduled Gmail secrets are `JOB_AGENT_GMAIL_TOKENS_JSON`, `JOB_AGENT_GMAIL_CLIENT_ID`, `JOB_AGENT_GMAIL_CLIENT_SECRET`, `JOB_AGENT_GMAIL_ACCOUNT_EMAIL`, and optionally `JOB_AGENT_REPORT_TO`.
- Scheduled Gmail/report runtime failures, such as expired OAuth tokens, warn instead of turning the whole repo red. Refresh `JOB_AGENT_GMAIL_TOKENS_JSON` when GitHub reports an OAuth warning.
- As of 2026-05-18, Job Reply Agent build/test, Daily Report, and Gmail scheduled workflows have fresh green `main` validations.

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
