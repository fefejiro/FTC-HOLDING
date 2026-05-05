-- Garden portal funnel baseline (GA4 BigQuery export)
-- Usage:
-- 1) Replace `your-gcp-project.your_dataset` below.
-- 2) Set start_date / end_date.
-- 3) Run as a BigQuery script.

DECLARE start_date STRING DEFAULT '20260401';
DECLARE end_date STRING DEFAULT FORMAT_DATE('%Y%m%d', CURRENT_DATE());

WITH scoped_events AS (
  SELECT
    PARSE_DATE('%Y%m%d', event_date) AS event_day,
    event_name,
    user_pseudo_id,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'location') AS location,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'label') AS label,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'region') AS region,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'service_needed') AS service_needed,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'frequency') AS frequency,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'property_type') AS property_type
  FROM `your-gcp-project.your_dataset.events_*`
  WHERE _TABLE_SUFFIX BETWEEN start_date AND end_date
    AND event_name IN (
      'garden_portal_entry_click',
      'garden_portal_cta_click',
      'garden_portal_region_quote_click',
      'garden_portal_sticky_click',
      'garden_quote_submit_attempt',
      'garden_quote_submit_success',
      'garden_quote_submit_error'
    )
),
daily_funnel AS (
  SELECT
    event_day,
    COUNTIF(event_name = 'garden_portal_entry_click') AS portal_entry_clicks,
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
  GROUP BY event_day
),
range_totals AS (
  SELECT
    SUM(portal_entry_clicks) AS portal_entry_clicks,
    SUM(portal_intent_total) AS portal_intent_total,
    SUM(quote_submit_attempts) AS quote_submit_attempts,
    SUM(quote_submit_successes) AS quote_submit_successes,
    SUM(quote_submit_errors) AS quote_submit_errors,
    SUM(unique_submit_success_users) AS unique_submit_success_users
  FROM daily_funnel
)
SELECT
  start_date AS report_start,
  end_date AS report_end,
  portal_entry_clicks,
  portal_intent_total,
  quote_submit_attempts,
  quote_submit_successes,
  quote_submit_errors,
  unique_submit_success_users,
  SAFE_DIVIDE(quote_submit_attempts, NULLIF(portal_intent_total, 0)) AS intent_to_attempt_rate,
  SAFE_DIVIDE(quote_submit_successes, NULLIF(quote_submit_attempts, 0)) AS submit_success_rate,
  SAFE_DIVIDE(quote_submit_successes, NULLIF(portal_intent_total, 0)) AS end_to_end_intent_to_success_rate,
  SAFE_DIVIDE(quote_submit_errors, NULLIF(quote_submit_attempts, 0)) AS submit_error_rate
FROM range_totals;

SELECT
  event_day,
  portal_entry_clicks,
  portal_intent_total,
  quote_submit_attempts,
  quote_submit_successes,
  quote_submit_errors,
  SAFE_DIVIDE(quote_submit_successes, NULLIF(quote_submit_attempts, 0)) AS submit_success_rate,
  SAFE_DIVIDE(quote_submit_successes, NULLIF(portal_intent_total, 0)) AS end_to_end_intent_to_success_rate
FROM daily_funnel
ORDER BY event_day DESC;

SELECT
  COALESCE(NULLIF(region, ''), '(unknown)') AS region,
  COALESCE(NULLIF(service_needed, ''), '(unknown)') AS service_needed,
  COALESCE(NULLIF(frequency, ''), '(unknown)') AS frequency,
  COALESCE(NULLIF(property_type, ''), '(unknown)') AS property_type,
  COUNTIF(event_name = 'garden_quote_submit_attempt') AS attempts,
  COUNTIF(event_name = 'garden_quote_submit_success') AS successes,
  COUNTIF(event_name = 'garden_quote_submit_error') AS errors,
  SAFE_DIVIDE(
    COUNTIF(event_name = 'garden_quote_submit_success'),
    NULLIF(COUNTIF(event_name = 'garden_quote_submit_attempt'), 0)
  ) AS submit_success_rate
FROM scoped_events
WHERE event_name IN (
  'garden_quote_submit_attempt',
  'garden_quote_submit_success',
  'garden_quote_submit_error'
)
GROUP BY region, service_needed, frequency, property_type
ORDER BY attempts DESC, successes DESC;
