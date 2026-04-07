# ATEAM Product V1

ATEAM V1 is a structured AI workflow surface, not a Replit-style build platform.

Its core loop is:

`intake -> normalize -> plan -> approve -> execute -> artifact -> log -> evaluate`

## V1 Goal

Make the first run feel trustworthy.

A user should be able to:

- submit a rough idea
- see a normalized request and visible plan
- approve, reject, or regenerate the plan
- receive a concrete artifact bundle
- inspect what happened through logs, state, and evaluation

## Public-First Scope

Primary public surface:

- `APPS/ftc-site/app/ateam`

Canonical backend/runtime:

- `APPS/ATEAM`

Public V1 keeps the current workflow routes and decision-pack artifact, but makes the system behavior more explicit through:

- guided intake fields
- immutable request objects
- visible plan generation
- explicit approval controls
- normalized workflow state
- recent run visibility

Phase 2 scaffolding now also exists on the same public surface through:

- request templates
- agent role library visibility
- filtered recent-run browsing
- editable-plan scaffolding before approval

## Current Status

Implemented in this reframe pass:

- additive workflow storage fields for `request`, `plan`, `evaluation`, `state`, and `stateHistory`
- request normalization and visible planning in `workflowEngine.js`
- workflow-service support for approval-gated V1 state transitions, including `regenerate`
- expanded public run contract in `APPS/ftc-site/lib/ateamWorkflow.ts`
- public `/ateam` UI updated for guided intake, plan review, approval actions, state progress, recent runs, and bundle download

Implemented in the current Phase 2 extension pass:

- reusable workflow templates exposed from the backend catalog and applied at run start or plan-update time
- agent role library metadata exposed in the public contract so users can see the execution lane before approval
- editable-plan scaffolding persisted through the workflow service without replacing the single approval gate
- filtered recent-run browsing by search, category, and state in the public `/ateam` surface

Validated:

- `npm --prefix APPS/ATEAM run test:backend`
- `npm --prefix APPS/ATEAM run verify:server`
- `npm --prefix APPS/ftc-site run build`

## Boundaries

V1 is explicitly not:

- a full IDE
- a code execution sandbox
- a general-purpose app builder
- a multi-agent autonomous build factory

Use the rest of this folder as the primary continuation point for future ATEAM V1 work.
