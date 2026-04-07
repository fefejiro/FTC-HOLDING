# Implementation Plan

## Reframe Principle

This is an evolution of the existing workflow system, not a greenfield rebuild.

## Build Order

### Phase 1: Foundation

- request object schema
- workflow storage fields
- guided intake structure
- request normalization flow

Status:

- completed in this pass

### Phase 2: Planning and Control

- visible planning stage
- approval gate with `approve`, `reject`, `regenerate`
- normalized state model
- single-agent execution lane

Status:

- completed in this pass

### Phase 3: Output Surface

- artifact preview/download
- recent runs list
- public-safe run presentation

Status:

- completed in this pass

### Phase 4: Trust Layer

- evaluation persistence
- expanded testing
- docs spine and continuation log

Status:

- completed in this pass for current local implementation

## Reuse Decisions

- keep current workflow routes stable
- keep current decision-pack artifact
- keep `phase` for compatibility
- expose `state` as the V1 lifecycle contract
- keep Mission Control/operator flows private and non-essential to public V1 comprehension

## Known Follow-Up Work

- manual QA on the live `/ateam` surface
- production migration/apply path for hosted Postgres if not already auto-applied on startup
- optional recent-runs pagination and deeper artifact download formats
- optional public auth layer if V1 expands beyond the current usage boundary

## Validation Checklist

- [x] backend syntax verified
- [x] backend tests passed
- [x] `ftc-site` build passed
- [x] docs spine created
- [x] handover log updated
