# Phase 10.1 + Phase 11 Plan: Prompt UI Hardening and Voice Continuity (Current Stack)

## Summary
Use your new prompt UI as the controlled STT safety gate, keep the current architecture (`ATEAM context/LLM` + `ElevenLabs TTS`), and harden the path so mishears like “basketball -> furniture” are corrected before commit while continuity remains strong and auditable.

Assumption locked (due no explicit choice): **stay on current stack now**, defer full ElevenLabs Agents end-to-end switch.

## Important API / Interface / Type Changes
1. `POST /agent/command` and `POST /agent/command/stream`
- Keep existing `contextPack` contract.
- Add server-side concurrency response:
  - `409` body: `{ ok:false, error:"request_in_flight", taskId, turnId? }`.

2. Event log additions (same `/events/:sessionId` routes)
- New event types:
  - `voice_transcript_confirmation_submitted`
  - `voice_transcript_confirmation_cancelled`
  - `voice_transcript_confirmation_retried`
- Keep existing:
  - `voice_transcript_confirmation_requested`
  - `assistant_request_skipped`

3. Frontend state additions (`Public/app.js`)
- `state.pendingVoiceDraftSuggestions: string[]`
- `state.pendingVoiceDraftOriginalText: string`
- `state.pendingRequestTurnId: string | null` (for stronger in-flight tracking)

## Implementation Plan

1. **Prompt UI from “raw input” to “confirmation card”**
- Keep current fallback composer entry point.
- Add explicit actions:
  - `Send`
  - `Retry` (re-open listening for a fresh capture)
  - `Cancel`
- Keep Enter/Esc shortcuts, but bind buttons to same code path.
- Emit:
  - `voice_transcript_confirmation_submitted` when user sends edited text.
  - `voice_transcript_confirmation_retried` when user requests fresh capture.
  - `voice_transcript_confirmation_cancelled` when dismissed.

2. **Targeted mishear correction suggestions (non-destructive)**
- Add deterministic suggestion helper in `Public/app.js`:
  - `buildTranscriptSuggestions(text)` returns max 3 options.
- Rules:
  - Use a small curated map for known high-frequency confusions (sports terms first).
  - Never auto-commit replacements.
  - Show suggestions as clickable chips in the prompt UI.
- Selected suggestion replaces input text but still requires explicit send.

3. **Context continuity hardening**
- Keep `buildTalkContextPack()` as canonical client bundle.
- Tighten pack:
  - Deduplicate adjacent duplicate assistant replies.
  - Keep last `N=6` user + `N=6` assistant turns max.
  - Preserve active speaker label and recent highlights.
- On server (`Server/server.js`), keep existing sanitize/merge logic and add:
  - enforce max lengths on all injected fields (already mostly present),
  - drop empty entries aggressively.

4. **One-in-flight guard end-to-end**
- Frontend: keep existing `pendingRequestController` check.
- Server: add per-`taskId` in-flight map in `Server/server.js`:
  - set lock before routeAgentCommand call,
  - release in `finally`,
  - reject new request with `409 request_in_flight` while locked.
- Client handling:
  - on `409`, emit `assistant_request_skipped` with `reason:"server_request_in_flight"`.

5. **Voice realism tuning (without architecture switch)**
- Keep ElevenLabs TTS route.
- In `Server/lib/elevenlabsTts.js`:
  - expose profile tuning via env with defaults (existing defaults remain fallback),
  - keep sanitize rules, add sentence-break normalization for overly long comma chains.
- In `Server/lib/llmAdapter.js` talk persona:
  - enforce concise spoken sentence rhythm,
  - forbid repeating user prompt before answer,
  - keep no markdown/action tags rule.

6. **Docs sync**
- `Docs/current_phase.md`
  - update to `Phase 10 - Prompt Confirmation + Continuity Hardening`.
- `Docs/acceptance_tests.md`
  - add explicit checks for new confirmation events, suggestions, and server-side in-flight 409 path.

## Test Cases and Scenarios

1. **Prompt trigger**
- Low-confidence or short utterance opens confirmation UI and logs `voice_transcript_confirmation_requested`.

2. **Submit path**
- Edit transcript from “furniture” to “basketball news”, click Send.
- Expect `talk_turn_committed` text matches edited value.
- Expect `voice_transcript_confirmation_submitted`.

3. **Retry path**
- Click Retry.
- Expect listening resumes without new committed turn.
- Expect `voice_transcript_confirmation_retried`.

4. **Cancel path**
- Click Cancel/Esc.
- Expect no committed turn, UI closes, state returns to idle/listening.
- Expect `voice_transcript_confirmation_cancelled`.

5. **In-flight guard**
- Force rapid double-submit while thinking.
- Expect only one assistant request executes.
- Expect `assistant_request_skipped` client-side and/or `409 request_in_flight` server-side event path.

6. **Continuity probe**
- “My favorite dish is fish” then “What did I say my favorite dish is?”
- Expect answer references fish reliably across both typed and voice-confirmed turns.

7. **No duplicate response regression**
- Validate latest `assistant_response_completed.meta.agentReply` rows do not show repeated-half pattern on fresh turns.

8. **Phase regression**
- Re-run existing Phase 2–9 checks unchanged.

## Assumptions and Defaults
1. Architecture remains app-managed memory + LLM + ElevenLabs TTS for this phase.
2. No new external dependencies are introduced.
3. No migration/backfill of historical events is required.
4. Suggestion dictionary starts small and domain-focused (sports/news), expanded only from observed errors.
5. Full ElevenLabs Agents end-to-end integration is deferred to a separate phase after this hardening.
