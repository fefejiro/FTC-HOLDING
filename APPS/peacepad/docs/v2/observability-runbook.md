# PeacePad v2 Observability Runbook

Goal: answer both questions in under 5 minutes:
1. Which module is used most?
2. Where are failures happening?

## Inputs
- SQL file: `docs/v2/observability.sql`
- Application logs for `/v2/*` endpoints (request IDs included in `x-request-id`)
- Time window: last 24 hours unless incident scope says otherwise

## 5-Minute Workflow
1. Run query `0` and confirm `pp_v2_module_runs` and `pp_v2_launcher_state` exist.
2. Run query `1` and capture top module by run count.
3. Run query `4` and capture highest error-rate module.
4. Run query `5` for recent failures and collect `error_code` plus timestamp.
5. Run query `3` to identify top safety flags among recent runs.
6. Pull matching log lines by timestamp and `x-request-id` for one failure and one success path.

## Interpretation Rules
- If `error_rate_pct` > 5 for any module, open a P1/P2 issue.
- If errors cluster to one `error_code`, prioritize that failure mode first.
- If safety flags spike (for example `immediate_danger`, `domestic_violence_risk`), ensure crisis routing quality check is run.

## Correlation ID Usage
- Every v2 response returns `x-request-id`.
- Client-provided `x-request-id` is preserved when valid.
- Use this value to pivot from API response to server logs.

## Batch 1 Acceptance Check
- Query `1` identifies most-used module quickly.
- Query `4` + `5` identifies error hotspot and recent failing examples.
- At least one log trace can be tied to a request using `x-request-id`.
