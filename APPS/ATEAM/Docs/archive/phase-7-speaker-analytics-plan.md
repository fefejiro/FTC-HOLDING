# Phase 7 Hardening v2.1: Speaker Analytics Truth Layer (Locked Spec)

## Summary
Implement a low-risk hardening pass that makes Speaker Analytics numerically honest and auditable:

- **Measured talk duration** uses only `audioStartMs/audioEndMs`.
- **Gaps + rapid switches** use only wall-clock committed event timestamps.
- Emit auditable snapshots via `speaker_analytics_generated`.
- Extend backend dedupe to support analytics events with `turnId: null` using `meta.dedupeKey`.

## Locked Metric Definitions

1. **Commit-to-commit gap (wall clock)**  
   - For consecutive committed turns:
   - `gapMs = max(0, next.timestampMs - current.timestampMs)`
   - Attribute each gap to the speaker of the **current** turn.

2. **Rapid switches (wall clock)**  
   - On consecutive committed turns:
   - speaker changed: `prev.speakerId !== next.speakerId`
   - rapid: `next.timestampMs - prev.timestampMs <= RAPID_SWITCH_THRESHOLD_MS`
   - default `RAPID_SWITCH_THRESHOLD_MS = 1200`.

3. **Measured talk duration (audio window only)**  
   - Valid only when both `audioStartMs` and `audioEndMs` are finite and `end >= start`.
   - Otherwise, turn is **unmeasured**.
   - No silent fallback is counted as measured talk time.

## Public API / Event Contract Changes

### New event type
`speaker_analytics_generated` (`actor: system`, `lane: talk`, `turnId: null`)

`meta`:
- `sessionId`
- `dedupeKey`
- `analyticsKey`
- `source` (`refresh` | `session_end`)
- `generatedAtMs`
- `timing`:
  - `measuredTurns`
  - `unmeasuredTurns`
  - `measuredTalkMs`
- `bySpeaker` (sorted by `speakerId`):
  - `speakerId`
  - `speakerLabel`
  - `turns`
  - `measuredTalkMs`
  - `avgTurnMsMeasured`
  - `maxTurnMsMeasured`
  - `longestGapMs`
  - `rapidSwitchCount`
  - `avgConfidence` (`null` if unavailable)

## Backend Changes (`Server/lib/eventLog.js`)

1. Keep existing dedupe behavior unchanged for events with turn IDs:
   - current keying remains `type + turnId (+ statusKey)`.

2. Add secondary dedupe path for non-turn events:
   - apply only when `turnId` is empty **and** `meta.dedupeKey` is a non-empty string.
   - dedupe key: `(type + meta.dedupeKey)`.

3. Safety rule:
   - if `meta.dedupeKey` missing/empty, do not use fallback dedupe path.

4. Internal debug aid:
   - compute/store internal dedupe key (e.g. `_dedupeKey`) in-memory during append flow for logs/traceability only; do not rely on it as public contract.

## Frontend Changes (`Public/app.js`, `Public/index.html`, `Public/style.css`)

1. Analytics builder:
- Separate timing channels:
  - measured duration channel from audio fields.
  - pacing/switch channel from event timestamps.
- Normalize missing numerics to `null`, not `undefined`.

2. Stable analytics key generation:
- canonical payload before hash:
  - sort `bySpeaker` by `speakerId`
  - integer ms values only
  - missing values normalized to `null`
- `analyticsKey = hash(JSON.stringify(canonicalPayload))`
- `meta.dedupeKey = analyticsKey`.

3. Emission policy:
- emit on refresh only when snapshot key changes.
- always emit final snapshot on session end.

4. UI wording:
- Metric label: `Rapid Switches` (not Interruptions).
- Add header/helper line in analytics panel:
  - `Talk time uses measured audio windows only.`
- Per-card timing quality:
  - `Timing: measured`
  - `Timing: mixed (N unmeasured)`.

5. Sorting controls in panel:
- `Turns` (default)
- `Talk Time`
- `Longest Gap`.

## Test Cases and Scenarios

1. **Field presence sanity**
- last 5 `talk_turn_committed`: verify audio fields exist on fresh voice turns.

2. **All-unmeasured case**
- only turns without valid audio window:
  - talk time must be `0`
  - timing must show `mixed (N unmeasured)`.

3. **Mixed case**
- mix measured + unmeasured turns:
  - measured talk time > 0
  - unmeasured count displayed.

4. **Gap correctness**
- create known pauses; verify longest gap uses commit timestamp deltas.

5. **Rapid switch correctness**
- alternate speakers under/over 1200ms; only under-threshold changes increment.

6. **Analytics dedupe stability**
- refresh twice with no new turns:
  - same `analyticsKey` / `dedupeKey`
  - no new distinct analytics snapshot event.

7. **Session-end emission**
- end session emits one final `speaker_analytics_generated`.

8. **Regression**
- existing Phase 2–6 checks remain green.

## Assumptions and Defaults
- `talk_turn_committed.timestamp` is authoritative wall clock for pacing metrics.
- Audio ms fields are valid only for per-turn measured duration.
- No historical event backfill in this phase.
- No new routes or dependencies.
