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

### Phase 5: V2 Scaffolding Without Scope Drift

- request templates on the public `/ateam` surface
- agent role library visibility
- filtered recent-run browsing
- editable-plan scaffolding before approval

Status:

- implemented in the current pass
- kept within the same route surface and single-agent architecture

## Reuse Decisions

- keep current workflow routes stable
- keep current decision-pack artifact
- keep `phase` for compatibility
- expose `state` as the V1 lifecycle contract
- keep Mission Control/operator flows private and non-essential to public V1 comprehension

## Known Follow-Up Work

- live QA of templates, editable-plan saves, and filtered recent-run browsing on `/ateam`
- decide whether plan edits should stay as freeform scaffolding or evolve into a more structured V2 editing model
- optional recent-runs pagination and deeper artifact download formats
- optional public auth layer if V1 expands beyond the current usage boundary

## Validation Checklist

- [x] backend syntax verified
- [x] backend tests passed
- [x] `ftc-site` build passed
- [x] docs spine created
- [x] handover log updated
- [x] Phase 2 template/history/editable-plan scaffolding documented
