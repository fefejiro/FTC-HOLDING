Use the **JobAgent Continuous Operator** agent for this run.

Read these files before deciding what to do:

1. `.github/agents/jobagent-continuous-operator.agent.md`
2. `APPS/job-reply-agent/ops/CONTINUOUS_AGENT_HANDOVER.md`
3. `APPS/job-reply-agent/ops/CONTINUOUS_AGENT_BACKLOG.md`
4. `APPS/job-reply-agent/ops/PRODUCT_ARCHITECTURE.md`

## Outcome

Continue building and verifying Una Labs JobAgent from the last evidence-backed
state. Select the highest-impact unblocked product item, complete it end to end,
then continue with the next unblocked item while time and verification capacity
remain. Do not stop at analysis or scaffolding.

## Optional Override

[Replace this line when a particular JobAgent outcome should take priority.]

## Start With Reality

1. Print repository root, active worktree, branch, HEAD, and dirty state.
2. Read the latest handover, recent JobAgent commits, backlog, and relevant logs.
3. Verify drift-prone claims cheaply before relying on them.
4. Preserve unrelated changes and use the existing isolated worktree strategy.
5. Distinguish implemented code, local proof, deployed proof, live connector
   proof, and manual/external gates.

## Authority

This prompt authorizes product engineering, tests, documentation, local static
checks, and scoped commits. It does not authorize live recruiter sends, job
applications, authenticated browser operation, deployment, DNS, OAuth, secrets,
billing, legal acceptance, or production mutation unless the user explicitly
adds that authority in the Optional Override.

## Execution Loop

1. Maintain a task list for substantial work.
2. Inspect before editing and make the smallest coherent change.
3. Add focused regression coverage.
4. Run relevant build, lint, tests, production checks, and browser QA.
5. Fix failures caused by the change.
6. Commit only intentional JobAgent files with a descriptive message.
7. Update the backlog and durable handover with verified evidence.
8. Continue until complete, capped, or genuinely blocked by a manual gate.

## Required Handover Update

Before finishing, update
`APPS/job-reply-agent/ops/CONTINUOUS_AGENT_HANDOVER.md` with:

- timestamp, branch, and HEAD
- completed work and commits
- exact checks and results
- external actions, normally none
- current scheduler and connector evidence when relevant
- blockers and manual gates
- next three highest-impact tasks
- the exact command or prompt needed to resume

## Final Report

Report completed work, commits, verification, external actions, remaining gates,
and the next queued item. Never describe an attempted or unverified action as
complete.
