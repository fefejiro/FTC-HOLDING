-- Garden portal experiment comparison (GA4 BigQuery export)
-- Purpose:
-- Compare a baseline window vs experiment window for funnel quality.
--
-- Usage:
-- 1) Replace `your-gcp-project.your_dataset` below.
-- 2) Set baseline_* and experiment_* date variables.
-- 3) Run as a BigQuery script.

DECLARE baseline_start STRING DEFAULT '20260401';
DECLARE baseline_end STRING DEFAULT '20260407';
DECLARE experiment_start STRING DEFAULT '20260408';
DECLARE experiment_end STRING DEFAULT '20260414';

WITH scoped_events AS (
  SELECT
    PARSE_DATE('%Y%m%d', event_date) AS event_day,
    event_name,
    user_pseudo_id,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'region') AS region,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'service_needed') AS service_needed,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'frequency') AS frequency,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'property_type') AS property_type,
    CASE
      WHEN _TABLE_SUFFIX BETWEEN baseline_start AND baseline_end THEN 'baseline'
      WHEN _TABLE_SUFFIX BETWEEN experiment_start AND experiment_end THEN 'experiment'
      ELSE NULL
    END AS period
  FROM `your-gcp-project.your_dataset.events_*`
  WHERE _TABLE_SUFFIX BETWEEN LEAST(baseline_start, experiment_start) AND GREATEST(baseline_end, experiment_end)
    AND event_name IN (
      'garden_portal_cta_click',
      'garden_portal_region_quote_click',
      'garden_portal_sticky_click',
      'garden_quote_submit_attempt',
      'garden_quote_submit_success',
      'garden_quote_submit_error'
    )
),
period_totals AS (
  SELECT
    period,
    COUNTIF(event_name IN (
      'garden_portal_cta_click',
      'garden_portal_region_quote_click',
      'garden_portal_sticky_click'
    )) AS portal_intent_total,
    COUNTIF(event_name = 'garden_quote_submit_attempt') AS quote_submit_attempts,
    COUNTIF(event_name = 'garden_quote_submit_success') AS quote_submit_successes,
    COUNTIF(event_name = 'garden_quote_submit_error') AS quote_submit_errors,
    COUNT(DISTINCT IF(event_name = 'garden_quote_submit_success', user_pseudo_id, NULL)) AS unique_submit_success_users
  FROM scoped_events
  WHERE period IS NOT NULL
  GROUP BY period
),
period_rates AS (
  SELECT
    period,
    portal_intent_total,
    quote_submit_attempts,
    quote_submit_successes,
    quote_submit_errors,
    unique_submit_success_users,
    SAFE_DIVIDE(quote_submit_attempts, NULLIF(portal_intent_total, 0)) AS intent_to_attempt_rate,
    SAFE_DIVIDE(quote_submit_successes, NULLIF(quote_submit_attempts, 0)) AS submit_success_rate,
    SAFE_DIVIDE(quote_submit_successes, NULLIF(portal_intent_total, 0)) AS end_to_end_intent_to_success_rate,
    SAFE_DIVIDE(quote_submit_errors, NULLIF(quote_submit_attempts, 0)) AS submit_error_rate
  FROM period_totals
),
segment_totals AS (
  SELECT
    period,
    COALESCE(NULLIF(region, ''), '(unknown)') AS region,
    COALESCE(NULLIF(service_needed, ''), '(unknown)') AS service_needed,
    COALESCE(NULLIF(frequency, ''), '(unknown)') AS frequency,
    COALESCE(NULLIF(property_type, ''), '(unknown)') AS property_type,
    COUNTIF(event_name = 'garden_quote_submit_attempt') AS attempts,
    COUNTIF(event_name = 'garden_quote_submit_success') AS successes,
    COUNTIF(event_name = 'garden_quote_submit_error') AS errors
  FROM scoped_events
  WHERE period IS NOT NULL
    AND event_name IN (
      'garden_quote_submit_attempt',
      'garden_quote_submit_success',
      'garden_quote_submit_error'
    )
  GROUP BY period, region, service_needed, frequency, property_type
)

-- Result set 1: Side-by-side period totals and rates
SELECT
  period,
  portal_intent_total,
  quote_submit_attempts,
  quote_submit_successes,
  quote_submit_errors,
  unique_submit_success_users,
  intent_to_attempt_rate,
  submit_success_rate,
  end_to_end_intent_to_success_rate,
  submit_error_rate
FROM period_rates
ORDER BY period;

-- Result set 2: Uplift/regression summary (experiment minus baseline)
SELECT
  baseline_start AS baseline_start,
  baseline_end AS baseline_end,
  experiment_start AS experiment_start,
  experiment_end AS experiment_end,
  (SELECT portal_intent_total FROM period_rates WHERE period = 'baseline') AS baseline_intent,
  (SELECT portal_intent_total FROM period_rates WHERE period = 'experiment') AS experiment_intent,
  (SELECT quote_submit_successes FROM period_rates WHERE period = 'baseline') AS baseline_successes,
  (SELECT quote_submit_successes FROM period_rates WHERE period = 'experiment') AS experiment_successes,
  (SELECT end_to_end_intent_to_success_rate FROM period_rates WHERE period = 'baseline') AS baseline_end_to_end_rate,
  (SELECT end_to_end_intent_to_success_rate FROM period_rates WHERE period = 'experiment') AS experiment_end_to_end_rate,
  (SELECT submit_success_rate FROM period_rates WHERE period = 'baseline') AS baseline_submit_success_rate,
  (SELECT submit_success_rate FROM period_rates WHERE period = 'experiment') AS experiment_submit_success_rate,
  (SELECT submit_error_rate FROM period_rates WHERE period = 'baseline') AS baseline_submit_error_rate,
  (SELECT submit_error_rate FROM period_rates WHERE period = 'experiment') AS experiment_submit_error_rate,
  (SELECT end_to_end_intent_to_success_rate FROM period_rates WHERE period = 'experiment')
    - (SELECT end_to_end_intent_to_success_rate FROM period_rates WHERE period = 'baseline')
    AS delta_end_to_end_rate,
  (SELECT submit_success_rate FROM period_rates WHERE period = 'experiment')
    - (SELECT submit_success_rate FROM period_rates WHERE period = 'baseline')
    AS delta_submit_success_rate,
  (SELECT submit_error_rate FROM period_rates WHERE period = 'experiment')
    - (SELECT submit_error_rate FROM period_rates WHERE period = 'baseline')
    AS delta_submit_error_rate;

-- Result set 3: Segment-level changes by attempts and success rate
WITH baseline_segments AS (
  SELECT
    region,
    service_needed,
    frequency,
    property_type,
    attempts AS baseline_attempts,
    successes AS baseline_successes,
    errors AS baseline_errors,
    SAFE_DIVIDE(successes, NULLIF(attempts, 0)) AS baseline_submit_success_rate
  FROM segment_totals
  WHERE period = 'baseline'
),
experiment_segments AS (
  SELECT
    region,
    service_needed,
    frequency,
    property_type,
    attempts AS experiment_attempts,
    successes AS experiment_successes,
    errors AS experiment_errors,
    SAFE_DIVIDE(successes, NULLIF(attempts, 0)) AS experiment_submit_success_rate
  FROM segment_totals
  WHERE period = 'experiment'
)
SELECT
  COALESCE(e.region, b.region) AS region,
  COALESCE(e.service_needed, b.service_needed) AS service_needed,
  COALESCE(e.frequency, b.frequency) AS frequency,
  COALESCE(e.property_type, b.property_type) AS property_type,
  b.baseline_attempts,
  e.experiment_attempts,
  b.baseline_successes,
  e.experiment_successes,
  b.baseline_errors,
  e.experiment_errors,
  b.baseline_submit_success_rate,
  e.experiment_submit_success_rate,
  e.experiment_submit_success_rate - b.baseline_submit_success_rate AS delta_submit_success_rate
FROM baseline_segments b
FULL OUTER JOIN experiment_segments e
  ON b.region = e.region
  AND b.service_needed = e.service_needed
  AND b.frequency = e.frequency
  AND b.property_type = e.property_type
ORDER BY COALESCE(e.experiment_attempts, 0) DESC, COALESCE(b.baseline_attempts, 0) DESC;