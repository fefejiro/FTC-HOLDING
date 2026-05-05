# State Machine

## Canonical V1 States

- `queued`
- `planning`
- `awaiting_approval`
- `executing`
- `generating_artifact`
- `completed`
- `failed`
- `escalated`

## Compatibility Mapping

- `analysis` -> `planning`
- `brief_approval` -> `awaiting_approval`
- `initiation` -> `executing`
- `prototype_pack` -> `executing`
- pack assembly -> `generating_artifact`
- `handoff` -> `completed`

`phase` still exists for compatibility with current services, but `state` is the public V1 lifecycle contract.

## Main Transition Path

1. `queued`
2. `planning`
3. `awaiting_approval`
4. `executing`
5. `generating_artifact`
6. `completed`

## Approval Behavior

Public V1 brief gate supports:

- `approve`
- `reject`
- `regenerate`

Effects:

- `approve`: move from `awaiting_approval` to `executing`
- `reject`: move to `failed` with an evaluation summary
- `regenerate`: move back through `planning` and return to `awaiting_approval`

Internal pack approval remains available for the existing workflow service, but the public experience should feel like one visible approval gate.

## Failure Cases

- Bad input or missing run -> `failed`
- Rejected brief -> `failed`
- Artifact generation error -> `failed`
- Operator/manual hold -> `escalated`

## State History

Every meaningful transition should append a compact state history entry with:

- `state`
- `phase`
- `reason`
- `actor`
- `createdAt`

This history is meant for inspection and debugging, not long-form narrative.
