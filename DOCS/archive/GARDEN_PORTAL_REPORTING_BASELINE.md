# Garden Portal Reporting Baseline

## Goal

Operationalize the Garden portal funnel so the team can monitor:

- portal intent totals,
- submit attempts,
- submit successes/errors,
- end-to-end conversion from intent to successful quote submit.

This baseline is designed to work with the canonical event contract in:

- `DOCS/GARDEN_PORTAL_ANALYTICS_EVENT_MAP.md`

## Query Template

Use:

- `scripts/garden-portal-ga4-funnel-baseline.sql`
- `scripts/garden-portal-ga4-experiment-compare.sql`

The script returns 3 result sets:

1. Range totals and core rates (intent to attempt, submit success, end-to-end).
2. Daily trend table for funnel monitoring.
3. Submit breakdown by `region`, `service_needed`, `frequency`, `property_type`.

The experiment script returns 3 result sets:

1. Baseline and experiment totals/rates side-by-side.
2. Delta summary (experiment minus baseline).
3. Segment-level change table for identifying where lift/regression came from.

## Setup Steps

1. Open the SQL file in BigQuery.
2. Replace `your-gcp-project.your_dataset` with the GA4 export dataset.
3. Set `start_date` and `end_date` in `YYYYMMDD` format.
4. Run as a BigQuery script.

## KPI Definitions

- `portal_intent_total`:
  sum of `garden_portal_cta_click`, `garden_portal_region_quote_click`, `garden_portal_sticky_click`.
- `quote_submit_attempts`: count of `garden_quote_submit_attempt`.
- `quote_submit_successes`: count of `garden_quote_submit_success`.
- `quote_submit_errors`: count of `garden_quote_submit_error`.
- `intent_to_attempt_rate`: `quote_submit_attempts / portal_intent_total`.
- `submit_success_rate`: `quote_submit_successes / quote_submit_attempts`.
- `end_to_end_intent_to_success_rate`: `quote_submit_successes / portal_intent_total`.

## Weekly Operator Cadence

1. Run query for the last 7 days and last 28 days.
2. Compare:
   - end-to-end conversion,
   - submit success rate,
   - top segments by attempts.
3. Flag segments where:
   - attempts are high but success rate is low,
   - error rate is rising week-over-week,
   - a region has intent growth but no submit growth.
4. Record notes and action items in sprint ops notes.

## Experiment Loop (Lightweight)

Use this standard loop for portal copy/layout tests:

1. Define variant scope (for example hero CTA copy or region-card phrasing).
2. Run variant for at least one full business week.
3. Compare against prior window on:
   - `portal_intent_total`,
   - `intent_to_attempt_rate`,
   - `end_to_end_intent_to_success_rate`,
   - `submit_error_rate`.
4. Keep variant only if conversion improves without error-rate regression.

### Running The Comparison Query

1. Open `scripts/garden-portal-ga4-experiment-compare.sql` in BigQuery.
2. Replace `your-gcp-project.your_dataset`.
3. Set:
   - `baseline_start` / `baseline_end`
   - `experiment_start` / `experiment_end`
4. Run and review:
   - Result set 2 for top-level go/no-go signal.
   - Result set 3 for segment-specific impact.

### Decision Guardrails

- Promote variant only when all are true:
  - `delta_end_to_end_rate > 0`
  - `delta_submit_success_rate >= 0`
  - `delta_submit_error_rate <= 0`
- If overall lift is flat but a high-volume segment improves, keep variant only when that segment aligns with business priority.

## Ownership

- Product/ops owner: reviews weekly funnel trend and approves experiment decisions.
- Engineering owner: maintains event integrity and updates SQL when event schema changes.
