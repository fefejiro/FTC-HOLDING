# Operations Runbook

## Objective

Run Job Reply Agent with minimal operator overhead.

## Daily Runtime

1. Intake and decision jobs run on schedule.
2. End-of-day report is emailed to operator.
3. Operator reviews only exception queues in the browser UI:
   - `JOBS/NeedsReview`
   - `JOBS/Drafted`
4. Desktop and phone use the same responsive control surface.

## Mode Policy

- Default production mode: `approval_required`
- Temporary safety mode: `draft_only`
- Emergency stop: `enabled: false`
- Optional future mode: `trusted_auto_send` (narrow whitelist only)

## End-of-Day Report

Subject:

`Job Reply Agent Daily Report - YYYY-MM-DD`

Report always includes:

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

## Failure Handling

1. If SMTP fails, report preview remains in logs.
2. If Gmail intake fails, run marked as error and retried on next schedule.
3. If parse confidence is low, route to `NeedsReview` not send path.
4. If sensitive request detected, route to `Blocked` with reason.
5. If the web token is enabled, require `JOB_AGENT_WEB_TOKEN` on all remote API calls.

## Ownership Cadence

1. Weekly: tune rules and resume mappings.
2. Bi-weekly: review blocked reasons for policy updates.
3. Monthly: role-family scoring calibration from response outcomes.
