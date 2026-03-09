# Production Core DoD Scorecard

Validation cycle date: 2026-02-24

## Scope

Production-quality core voice product for current stack. This scorecard excludes Phase 13 UX expansion work.

## Frozen Contracts

1. `voice_transcript_auto_committed`
- `actor: "user"`, `lane: "talk"`
- `meta`: `originalText`, `finalText`, `confidence`, `autoCommitted`, `speakerId`, `speakerLabel`, optional `turnId`

2. `voice_transcript_confirmation_submitted`
- `meta`: `originalText`, `finalText`, `edited`, `deltaType`, `confidence`, `speakerId`, optional `turnId`
- Backward compatibility key retained: `originalDraftText`

3. Frontend learning key
- `localStorage["ATEAM_CONFUSION_MAP_V1"]`
- Entry shape: `{ heard, corrected, count, lastSeenAt }`
- Update rule: low-confidence + `deltaType === "substitution"` only

4. Confidence gate
- Default threshold: `0.85`
- Override: `localStorage["ATEAM_VOICE_CONFIRM_THRESHOLD"]`
- Missing confidence treated as low confidence (confirmation required)

## Gate Results

### Gate 1: Build/Static Integrity
- `node --check Public/app.js`: pass
- `node --check Server/server.js`: pass
- `cd Server && npm run test:backend`: pass (`63 passed, 1 skipped`)

### Gate 2: Voice Flow Semantics
- High-confidence path: pass (`voice_transcript_auto_committed` observed; auto-commit followed by `talk_turn_committed`)
- Low-confidence/forced confirm path: pass (`voice_transcript_confirmation_requested` observed with forced threshold override)
- Edited submit telemetry: pass (`originalText`, `finalText`, `edited`, `deltaType` present)

### Gate 3: Learning Telemetry Integrity
- Pass (`ATEAM_CONFUSION_MAP_V1` observed with substitution pair `yo -> begin`, count incremented)

### Gate 4: Concurrency + Continuity Non-Regression
- 409 lock path: pass (`assistant_request_skipped` with `reason=server_request_in_flight`; direct API overlap returned `409 request_in_flight`)
- Continuity probe: pass (follow-up recall returned `fish` after seeding "my favorite dish is fish")

### Gate 5: Transcript Quality Regression
- Pass (latest assistant responses: no repeated-half and no adjacent sentence-run duplication in event payloads)

### Gate 6: Documentation Truthfulness
- Pass (`Docs/acceptance_tests.md` and `Docs/current_phase.md` reconciled to the above validation cycle)

## Completion Decision

Production Core is complete when all gates are green in one cycle.  
This cycle is green, so Production Core is closed.

## Next Work

Phase 13: Voice Realism + Conversation Continuity UX.
