# Una Labs Weekly Funnel Review

Use this once there is at least one week of data flowing through:

- ATEAM events
- intake submission events
- internal pipeline stage events

The goal is simple:

1. identify where commercial movement is strongest
2. identify where buyers are stalling
3. decide the single highest-leverage fix for the next week

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
- strengthen the “what happens next” promise

### 2. Intake quality

Ask:

- Which offer is being selected most often?
- Which business type shows up most often?
- Are high-intent leads choosing the right lane, or defaulting to “not sure yet”?

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
- improve proof alignment to the buyer’s exact problem

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
