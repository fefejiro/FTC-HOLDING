# Copilot Prompt Sequence

Use these prompts in order to build safely and avoid chaotic generation.

## Prompt 1

Create modular TypeScript services for Gmail intake, parser, scorer, red flags, resume selector, draft creator, approval service, reporter, and logger. Keep `approval_required` as target mode.

## Prompt 2

Implement SQLite repositories and idempotent inserts keyed by Gmail message/thread IDs.

## Prompt 3

Implement Gmail OAuth and recruiter label ingestion (`JOBS/RecruiterInbound`) with dedupe.

## Prompt 4

Implement deterministic parsing and confidence scoring. Add explicit red-flag detection for sensitive asks.

## Prompt 5

Port role-family scoring concepts from existing job-hunt pipeline and connect approved resume selection.

## Prompt 6

Create in-thread Gmail drafts with selected resume and status labels (`JOBS/Drafted`, `JOBS/NeedsReview`, `JOBS/Blocked`, `JOBS/Skipped`).

## Prompt 7

Implement `approval_required` send gate: only approved, fresh, unchanged drafts can send.

## Prompt 8

Implement end-of-day report email to self with exact subject/body format.

## Prompt 9

Add tests for dedupe, parser confidence, red-flag block, resume selection, approval gates, and report formatting.

## Prompt 10

Add operational docs and Task Scheduler setup for no-babysitting daily operation.
