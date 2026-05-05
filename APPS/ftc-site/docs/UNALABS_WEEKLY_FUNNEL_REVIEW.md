# Una Labs Weekly Funnel Review

Use this once there is at least one full week of data flowing through:

- ATEAM events
- intake submission events
- internal pipeline stage events

The goal is simple:

1. identify where commercial movement is strongest
2. identify where buyers are stalling
3. decide the single highest-leverage fix for the next week

This is not a reporting ritual. It is a decision ritual.

## Inputs to review

### Public funnel

- `ateam_landing_view`
- `ateam_run_start`
- `ateam_run_started`
- `ateam_pack_ready`
- `ateam_continue_to_intake`
- `intake_form_view`
- `lead_submit_attempt`
- `lead_submit_success`

### Downstream pipeline

- `lead_qualified`
- `call_booked`
- `proposal_sent`
- `project_closed_won`
- `project_closed_lost`

## Weekly review order

### 1. Traffic to commercial intent

Ask:

- Are visitors starting ATEAM at a healthy rate?
- Are pack-ready users continuing into intake?
- Is direct intake outperforming ATEAM-originated intake?

If weak:

- tighten hero copy
- shorten first clarifier friction
- strengthen the "what happens next" promise

### 2. Intake quality

Ask:

- Which offer is being selected most often?
- Which business type shows up most often?
- Are high-intent leads choosing the right lane, or defaulting to "not sure yet"?

If weak:

- improve offer copy
- make proof more specific to the strongest lane
- sharpen buyer-fit language

### 3. Qualification speed

Ask:

- How quickly are submitted leads being marked `lead_qualified`?
- Did any strong request sit too long without a decision?

If weak:

- shorten internal response time
- tighten qualification criteria
- reduce ambiguity in the intake summary

### 4. Booked call conversion

Ask:

- Of qualified leads, how many book a call?
- Which source produces the best booked-call rate?

If weak:

- improve follow-up speed
- make the commercial next move clearer in the response
- reduce the need for a call when a scoped first pass is enough

### 5. Proposal conversion

Ask:

- Of booked calls, how many receive a proposal?
- Which offer leads to the fastest proposal path?

If weak:

- standardize proposal templates by offer
- tighten the handoff from qualification to scope
- stop custom-scoping every opportunity from scratch

### 6. Won / lost analysis

Ask:

- Which offer closes most often?
- Which source creates the most real revenue?
- What is the main reason for `project_closed_lost`?

If weak:

- simplify the offer
- reduce scope ambiguity
- improve proof alignment to the buyer's exact problem

## Core KPI table

Track these every week:

1. ATEAM landing views
2. Run starts
3. Pack-ready count
4. Continue-to-intake count
5. Intake submit successes
6. Qualified leads
7. Calls booked
8. Proposals sent
9. Closed won
10. Closed lost

## Starter thresholds and decision rules

These are not universal SaaS benchmarks. They are operational starter thresholds for Una Labs so you can spot the weakest drop quickly.

### Stage 1: Landing -> ATEAM start

- Metric: `ateam_run_start / ateam_landing_view`
- Healthy starter target: `>= 12%`
- Attention zone: `< 12%`

If below target:

- tighten the hero headline and support copy
- clarify what ATEAM produces in one sentence
- make the first CTA stronger and more specific

### Stage 2: Run started -> pack ready

- Metric: `ateam_pack_ready / ateam_run_started`
- Healthy starter target: `>= 45%`
- Attention zone: `< 45%`

If below target:

- reduce clarifier friction
- remove any confusing or redundant questions
- strengthen progress clarity inside ATEAM

### Stage 3: Pack ready -> continue to intake

- Metric: `ateam_continue_to_intake / ateam_pack_ready`
- Healthy starter target: `>= 35%`
- Attention zone: `< 35%`

If below target:

- tighten the pack CTA
- make the commercial next move more explicit
- reduce any feeling that the pack is "interesting" but not actionable

### Stage 4: Intake view -> submit success

- Metric: `lead_submit_success / intake_form_view`
- Healthy starter target: `>= 40%`
- Attention zone: `< 40%`

If below target:

- reduce field friction
- sharpen the "best for / not ideal for" framing
- improve offer selection clarity

### Stage 5: Submit success -> qualified

- Metric: `lead_qualified / lead_submit_success`
- Healthy starter target: `>= 60%`
- Attention zone: `< 60%`

If below target:

- review whether the site is attracting the wrong buyer
- tighten buyer-fit language
- improve offer and proof alignment

### Stage 6: Qualified -> booked

- Metric: `call_booked / lead_qualified`
- Healthy starter target: `>= 50%`
- Attention zone: `< 50%`

If below target:

- improve speed of follow-up
- reduce ambiguity in the next commercial step
- use scoped-first-pass more aggressively when a full call is unnecessary

### Stage 7: Proposal sent -> won

- Metric: `project_closed_won / proposal_sent`
- Healthy starter target: `>= 30%`
- Attention zone: `< 30%`

If below target:

- simplify the offer
- reduce scope ambiguity
- tighten the proof-to-offer match

## Review by source

Look at every major stage by:

- `direct`
- `ateam_workflow`
- `ateam_demo`

Questions:

1. Which source creates the highest qualification rate?
2. Which source creates the fastest booked-call path?
3. Which source creates the most revenue, not just the most submissions?

Rule:

- If ATEAM creates more submissions but lower qualification, tighten the handoff.
- If direct creates fewer leads but better quality, learn from the direct proof/copy and import it into ATEAM.

## Review by offer

Look at every major stage by:

- `scoped-first-pass`
- `prototype-direction-sprint`
- `build-execution-track`
- `not-sure-yet`

Questions:

1. Which offer is selected most often?
2. Which offer qualifies best?
3. Which offer books fastest?
4. Which offer closes at the highest rate?

Rule:

- If `not-sure-yet` is too high, the offer framing is too weak.
- If one offer gets attention but not revenue, either reposition it or simplify it.
- If one offer wins consistently, give it more homepage and proof emphasis next week.

## The three questions that matter most

1. Which source is producing the highest-quality leads?
2. Which offer is converting into real revenue, not just form submissions?
3. What is the single biggest bottleneck right now?

## Output for each review

At the end of every weekly review, decide:

- one thing to keep
- one thing to cut
- one thing to test next

Do not leave the review with ten ideas.
Leave with one operational change for the next week.

## Suggested weekly review rhythm

### Monday

- review the prior 7 days
- identify the weakest stage
- assign one owner and one experiment

### Wednesday

- do a 10-minute check:
  - are pipeline stages being recorded properly?
  - did the chosen experiment actually go live?

### Friday

- review whether the chosen fix improved the weakest stage
- decide if it should stay, be rolled back, or be replaced next week
