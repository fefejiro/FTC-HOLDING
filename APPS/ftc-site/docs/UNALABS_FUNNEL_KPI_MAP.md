# Una Labs Funnel KPI Map

This is the working event map for the ATEAM -> intake -> project-request funnel.

## Goal

Measure whether Una Labs is getting stronger at:

1. getting visitors to start ATEAM
2. getting started runs to reach pack-ready
3. getting pack-ready users into intake
4. getting intake visits into submitted project requests
5. seeing which offer path and source convert best

## Core Funnel

1. `ateam_landing_view`
2. `ateam_run_start`
3. `ateam_run_started`
4. `ateam_pack_build_start`
5. `ateam_pack_ready`
6. `ateam_continue_to_intake`
7. `intake_form_view`
8. `lead_submit_attempt`
9. `lead_submit_success`

## Recommended Weekly KPIs

### Top-of-funnel

- `ATEAM landing views`
  - event: `ateam_landing_view`
- `ATEAM run starts`
  - event: `ateam_run_start`
- `ATEAM run start rate`
  - formula: `ateam_run_start / ateam_landing_view`

### ATEAM workflow quality

- `ATEAM runs created`
  - event: `ateam_run_started`
- `Pack-ready count`
  - event: `ateam_pack_ready`
- `Pack-ready rate`
  - formula: `ateam_pack_ready / ateam_run_started`
- `Pack view rate`
  - formula: `ateam_pack_view / ateam_pack_ready`

### Handoff / sales conversion

- `Continue-to-intake count`
  - event: `ateam_continue_to_intake`
- `Handoff-to-intake continuation rate`
  - formula: `ateam_continue_to_intake / ateam_pack_ready`
- `Intake form views`
  - event: `intake_form_view`
- `Lead submit attempts`
  - event: `lead_submit_attempt`
- `Lead submit successes`
  - event: `lead_submit_success`
- `Intake completion rate`
  - formula: `lead_submit_success / intake_form_view`

## Useful Breakdowns

### By source

Use the `source` param on intake events:

- `direct`
- `ateam_workflow`
- `ateam_demo`

Important comparison:

- `lead_submit_success` by `source`
- `lead_submit_attempt` by `source`
- `intake_form_view` by `source`

This tells you whether direct project requests or ATEAM-originated handoffs are converting better.

### By offer

Use the `engagement_type` param on submit events:

- `scoped-first-pass`
- `prototype-direction-sprint`
- `build-execution-track`
- `not-sure-yet`

Important comparison:

- `lead_submit_attempt` by `engagement_type`
- `lead_submit_success` by `engagement_type`

This tells you which commercial offer buyers are choosing most often.

### By lane

Use:

- `category` on ATEAM events
- `project_type` on intake events
- `recommended_lane` on ATEAM pack / handoff events

Important comparison:

- which lanes produce the most pack-ready outputs
- which lanes produce the most successful submissions
- whether the recommended lane aligns with submitted `project_type`

## Event Reference

### ATEAM events

- `ateam_landing_view`
  - params:
    - `location`
    - `base_path`

- `ateam_run_start`
  - params:
    - `location`
    - `category`
    - `idea_length`

- `ateam_run_started`
  - params:
    - `location`
    - `run_id`
    - `category`
    - `question_count`

- `ateam_run_start_error`
  - params:
    - `reason`
    - `location`
    - `category`

- `ateam_pack_build_start`
  - params:
    - `location`
    - `run_id`
    - `question_count`

- `ateam_pack_ready`
  - params:
    - `location`
    - `run_id`
    - `recommended_lane`
    - `next_steps_count`

- `ateam_pack_view`
  - params:
    - `location`
    - `run_id`
    - `recommended_lane`
    - `category`

- `ateam_pack_build_error`
  - params:
    - `reason`
    - `location`
    - `run_id`

- `ateam_continue_to_intake`
  - params:
    - `location`
    - `run_id`
    - `recommended_lane`
    - `category`

- `ateam_reset`
  - params:
    - `location`
    - `had_run`
    - `had_idea`

### Intake events

- `intake_form_view`
  - params:
    - `source`
    - `project_type`

- `lead_submit_attempt`
  - params:
    - `source`
    - `project_type`
    - `engagement_type`
    - `business_type`
    - `main_goal`
    - `urgency`
    - `buyer_readiness`
    - `budget_range`
    - `timeline`

- `lead_submit_success`
  - params:
    - `source`
    - `project_type`
    - `engagement_type`
    - `business_type`
    - `main_goal`
    - `urgency`
    - `budget_range`
    - `timeline`

- `lead_submit_error`
  - params:
    - usually `source`
    - `project_type`
    - `engagement_type`
    - or `reason` for validation failures

## First Questions To Answer

After 1-2 weeks of data, answer these first:

1. Does ATEAM create better submission quality than direct intake?
2. Do more users choose `Scoped First Pass` than the other two offers?
3. Where is the biggest drop:
   - landing -> run start
   - run start -> pack ready
   - pack ready -> continue to intake
   - intake view -> submit success
4. Which lane is generating the highest-quality commercial signal?

## Suggested Dashboard Tiles

1. ATEAM landing views
2. ATEAM run starts
3. Pack-ready count
4. Continue-to-intake count
5. Intake views
6. Submit attempts
7. Submit successes
8. Success rate by source
9. Success rate by engagement type
10. Top selected lane / project type

## Important Note

This tracking does not yet measure booked calls, signed projects, or closed revenue.

That now has an internal recording path through:

- `POST /api/intake/pipeline`

Supported pipeline stage events:

- `lead_qualified`
- `call_booked`
- `proposal_sent`
- `project_closed_won`
- `project_closed_lost`

Once those exist, Una Labs can see not just which traffic converts, but which path creates revenue.

## Internal Pipeline Tracking

Use the internal route below after the lead has been submitted and a `requestId` exists.

### Endpoint

- `POST /api/intake/pipeline`

### Auth

- send `Authorization: Bearer <UNALABS_PIPELINE_API_KEY>`
  or
- send `x-unalabs-pipeline-key: <UNALABS_PIPELINE_API_KEY>`

In production, the endpoint requires `UNALABS_PIPELINE_API_KEY` to be configured.

### Example payload

```json
{
  "requestId": "UL-20260330-ABC123",
  "eventType": "proposal_sent",
  "owner": "Mike",
  "engagementType": "scoped-first-pass",
  "leadSource": "ateam_workflow",
  "proposalId": "PROP-014",
  "value": 2500,
  "notes": "Scope pack approved and proposal sent after review."
}
```

### Lightweight CLI updater

If you want to record stages from your actual ops flow without opening the internal revenue page each time, use:

```bash
npm run pipeline:update -- --request-id UL-20260330-ABC123 --event lead_qualified --owner Mike --offer scoped-first-pass --source ateam_workflow
```

Useful follow-ups:

```bash
npm run pipeline:update -- --request-id UL-20260330-ABC123 --event call_booked --booked-for "2026-04-02 2:30 PM ET"
npm run pipeline:update -- --request-id UL-20260330-ABC123 --event proposal_sent --proposal-id PROP-014 --value 2500
npm run pipeline:update -- --request-id UL-20260330-ABC123 --event project_closed_won --value 5000 --notes "Moved into build execution"
```

### Supported fields

- `requestId` required
- `eventType` required
- `owner` optional
- `notes` optional
- `value` optional numeric amount
- `engagementType` optional
- `leadSource` optional
- `bookedFor` optional date/time string
- `proposalId` optional
- `metadata` optional object for internal extensions

### Suggested operational sequence

1. `lead_submit_success`
2. `lead_qualified`
3. `call_booked`
4. `proposal_sent`
5. `project_closed_won` or `project_closed_lost`

This gives Una Labs a clean bridge from website funnel analytics into actual revenue tracking without forcing a full CRM rebuild first.
