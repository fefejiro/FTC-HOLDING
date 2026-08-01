# Quiet-Premium Coordination Sprint

## Decision

PeacePad communicates value through calm tasks and reliable state, not through
repeated claims that the product is premium. Ordinary navigation and headings
do not use prototype, lab, architecture, or marketing commentary.

## Delivered

- Task-based shell: Home, Messages, Calendar, Records, More.
- State-derived Home actions and honest empty/count states.
- Explicit invitation preview and acceptance boundary.
- Typed `/api/v2` client contracts and isolated in-memory adapter.
- Private-by-default calendar layers with explicit sharing confirmation.
- Month, Week, and Day view selection plus event lifecycle.
- Per-conversation Message Check, off by default, using the rule-based preview.
- Original-draft preservation and explicit send choice.
- Release guardrails for the visible name, lab bundle, diagnostics, and
  production-write boundary.

## API boundary

The native client consumes `PeacePadCoordinationApi`, not legacy v1 storage
shapes. `HttpPeacePadCoordinationApi` maps that interface to versioned
`/api/v2` routes and supplies region, schema, idempotency, and concurrency
headers on writes. `SyntheticCoordinationApi` exists only for isolated product
proof.

Server-side staging handlers are intentionally not claimed by this sprint.
They must independently enforce identity, participant grant, family, region,
idempotency, optimistic concurrency, rate limiting, and append-only audit
requirements.

## Data policy

All fixtures are fictional and in memory. Development evidence must not contain
real messages, invitation codes, family names, child data, court records, or
production credentials.

## Promotion gate

Do not connect production or change the approved Capacitor app. Promotion needs:

1. Deployed staging invitation handlers and authorization tests.
2. Current Simulator proof for the ten required screens/interactions.
3. One real-iPhone staging pass with synthetic accounts.
4. Accessibility and weak-network results.
