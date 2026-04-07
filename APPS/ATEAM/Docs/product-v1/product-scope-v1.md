# Product Scope V1

## Product Definition

ATEAM is a structured AI workflow surface.

Its V1 loop is:

`intake -> normalize -> plan -> approve -> execute -> artifact -> log -> evaluate`

The product target is trust and clarity on first use, not maximum capability.

## V1 Must-Haves

- Guided intake form
- Immutable request object
- Request normalization
- Visible planning stage
- Approval gate with `approve`, `reject`, and `regenerate`
- Single-agent execution lane
- Progress indicators
- Artifact generation
- Artifact preview and download
- Run logging
- Basic recent runs list
- Basic eval rubric
- Error handling
- Lightweight auth boundary when needed for private/public separation

## V2, Not Blocking

- Multi-agent workflows
- Agent role library
- Request templates
- Editable plans
- Full run history UI
- Artifact versioning
- Custom eval rubrics
- LLM-as-judge automation
- Parallel execution
- Read-only tool integrations
- Multi-model routing
- Webhook notifications
- API-triggered runs
- Collaborative runs

## V3+, Not Yet

- Code execution sandbox
- Autonomous file writing
- Deployment automation
- Write-enabled integrations
- Real-time collaboration
- Agent marketplace
- Fine-tuned models
- On-prem deployment
- Native mobile app
- Voice-first interaction beyond optional intake assist

## Never Build For Now

- Full IDE behavior
- General-purpose app builder positioning
- Built-in design canvas
- Social or public-feed features
- Gamification
- Blockchain or crypto add-ons
- Video generation
- Desktop app

## Guardrail

If a feature does not directly improve:

`intake -> plan -> execute -> artifact`

defer it.

## Success Metrics

ATEAM V1 is healthy when:

- a user sees a visible plan in under 30 seconds
- the plan is understandable to a non-technical reviewer
- output matches original user intent in at least 70% of internal reviews
- execution succeeds more than 80% of the time
- artifacts are usable without heavy editing more than 60% of the time
- recent runs can be reopened and re-downloaded
- failures are understandable from logs and state history

## Current Reframe Decisions

- Public-first experience remains at `/ateam`
- Existing workflow routes stay stable
- Existing decision-pack artifact remains the default V1 output bundle
- `phase` remains for compatibility, but `state` is now the primary V1 lifecycle surface
