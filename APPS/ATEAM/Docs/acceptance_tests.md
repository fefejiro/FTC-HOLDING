## Phase 2 Acceptance Checklist

> Status: supporting reference.
>
> Use `ACTIONABLE_TASK_QUEUE.md` for the active unresolved work list.
> This file should stay focused on detailed acceptance procedures and evidence.

Automated checks run:

```powershell
node --check Server/lib/eventLog.js
node --check Server/server.js
node --check Public/app.js
cd Server
npm run test:backend
```

API smoke check run:

```powershell
$serverDir='c:\Users\mikef\ATEAM\Server'
$proc = Start-Process -FilePath node -ArgumentList 'server.js' -WorkingDirectory $serverDir -PassThru
Start-Sleep -Seconds 2
$uri = 'http://localhost:3000/events/bad id:*'
$payload = @{ type='talk_turn_committed'; actor='user'; lane='talk'; summary='demo'; meta=@{ turnId='turn_demo_1' } } | ConvertTo-Json -Depth 5
$r1 = Invoke-RestMethod -Uri $uri -Method Post -ContentType 'application/json' -Body $payload
$r2 = Invoke-RestMethod -Uri $uri -Method Post -ContentType 'application/json' -Body $payload
$g = Invoke-RestMethod -Uri $uri -Method Get
Stop-Process -Id $proc.Id -Force
$r1, $r2, $g
```

Expected smoke result:
- first POST: `deduped = false`
- second POST: `deduped = true`
- GET: `sessionId` returned sanitized and event count remains `1`

Manual browser checks to run:

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || []).slice(-20).map(e => ({
    type: e.type,
    turnId: e.turnId,
    deduped: e.deduped,
    summary: e.summary
  }))));
```

- [x] `talk_turn_committed` emitted once per committed turn (manual browser flow)
- [x] `assistant_response_started` emitted once (manual browser flow)
- [x] `assistant_response_completed` emitted once (manual browser flow)
- [x] `turnId` is present and consistent across the 3 lifecycle events for one turn
- [x] Events persist after refresh (manual browser flow + refetch)
- [x] No duplicate events (unit test + API smoke check with same `meta.turnId` + `type`)
- [ ] No TTS retry loop on quota exhaustion (manual quota simulation; quota-limited test pending)
- [x] `sessionId` sanitized (unit test + API smoke check)
- [x] `memory/events` directory auto-creates (unit test)

## Phase 3 Acceptance Checklist

Manual browser checks run:

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => {
    const types = (d.events || []).reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {});
    console.table(types);
  });
```

Observed type counts included:
- `agent_status_updated: 2`
- `talk_turn_committed: 10`
- `assistant_response_started: 7`
- `assistant_response_completed: 6`
- `error: 1` (expected from ElevenLabs quota exhaustion)

- [x] Status badges change in UI (Idle/Listening/Thinking/Speaking)
- [x] `agent_status_updated` events are emitted and persisted (`> 0`)
- [x] Status events emit on change, not every 3 seconds

## Phase 4 Acceptance Checklist

Manual browser checks run:

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || []).slice(-20).map(e => ({
    type: e.type,
    actor: e.actor,
    lane: e.lane,
    summary: e.summary
  }))));
```

- [x] Timeline panel renders in Talk Mode
- [x] Timeline polling updates with new events
- [x] Timeline filter buttons work (`All`, `Talk`, `Status`, `Errors`)
- [x] Refresh keeps persisted history visible after page reload

## Phase 5 Acceptance Checklist

Manual browser checks run:

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || []).filter(e => e.type === 'highlight_marked').slice(-10).map(e => ({
    ts: e.timestamp,
    turnId: e.meta?.turnId,
    summary: e.summary
  }))));
```

- [x] Pause/Resume controls affect client polling only
- [x] Clear View clears local timeline view without deleting server events
- [x] Export JSON downloads current session event payload
- [x] Mark Highlight emits `highlight_marked`
- [x] TTS kill switch disables future `/voice/speak` attempts after quota failure

## Phase 6 Acceptance Checklist

Automated checks run:

```powershell
node --check Public/app.js
cd Server
npm run test:backend
```

Manual browser checks to run:

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || []).filter(e =>
    [
      'silence_started',
      'silence_ended',
      'chapter_created',
      'highlight_marked',
      'segment_started',
      'segment_ended',
      'speaker_selected',
      'speaker_labeled',
      'speaker_label_edited',
      'session_summary_generated',
      'speech_clarity_report_generated'
    ].includes(e.type)
  ).slice(-20).map(e => ({
    ts: e.timestamp,
    type: e.type,
    reason: e.meta?.reason,
    durationMs: e.meta?.durationMs,
    segmentId: e.meta?.segmentId,
    speakerId: e.meta?.speakerId || e.meta?.newSpeakerId,
    chapterId: e.meta?.chapterId,
    summary: e.summary
  }))));
```

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || [])
    .filter(e => e.type === 'talk_turn_committed')
    .slice(-10)
    .map(e => ({
      ts: e.timestamp,
      speakerId: e.meta?.speakerId,
      speakerLabel: e.meta?.speakerLabel,
      segmentId: e.meta?.segmentId,
      summary: e.summary
    }))));
```

- [x] Speak one turn and verify `talk_turn_committed.meta` includes `segmentId`, `speakerId`, `speakerLabel`, `audioStartMs`, `audioEndMs`, `confidence`
- [x] Stay silent for ~8 seconds in listening mode emits `silence_started`, `silence_ended`, `segment_ended`, `segment_started`, then `chapter_created` (`reason=long_silence`)
- [x] Press `Mark Highlight` emits `highlight_marked` and `chapter_created` (`reason=highlight`)
- [x] Change speaker from dropdown emits `speaker_selected` and new turns use that `speakerId` + `speakerLabel`
- [ ] Use timeline row speaker edit and top `Edit Name` button; verify `speaker_label_edited` persists after refresh
- [ ] Chapters panel renders from event log after hard refresh
- [ ] Clicking a chapter focuses timeline to that chapter window
- [x] No chapter spam during one continuous long-silence window
- [x] End session emits `session_summary_generated` and `speech_clarity_report_generated`

## Phase 7 Acceptance Checklist (Hardening v2.1)

Manual browser checks to run:

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || [])
    .filter(e => e.type === 'talk_turn_committed')
    .slice(-5)
    .map(e => ({
      ts: e.timestamp,
      speakerId: e.meta?.speakerId,
      speakerLabel: e.meta?.speakerLabel,
      audioStartMs: e.meta?.audioStartMs,
      audioEndMs: e.meta?.audioEndMs,
      confidence: e.meta?.confidence
    }))));
```

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || [])
    .filter(e => e.type === 'speaker_analytics_generated')
    .slice(-10)
    .map(e => ({
      ts: e.timestamp,
      source: e.meta?.source,
      dedupeKey: e.meta?.dedupeKey,
      analyticsKey: e.meta?.analyticsKey,
      measuredTurns: e.meta?.timing?.measuredTurns,
      unmeasuredTurns: e.meta?.timing?.unmeasuredTurns,
      measuredTalkMs: e.meta?.timing?.measuredTalkMs
    }))));
```

- [x] Talk Mode shows `Speaker Analytics` under Chapters with helper text: `Talk time uses measured audio windows only.`
- [ ] Sort controls work: `Turns`, `Talk Time`, `Longest Gap`
- [ ] Gap and rapid-switch metrics move with wall clock pacing (not audio windows)
- [ ] If all turns are unmeasured, card talk time remains `00:00` and timing shows `mixed (N unmeasured)`
- [ ] In mixed sessions, measured talk time is `> 0` and unmeasured count is shown
- [x] Metric label is `Rapid Switches` (not `Interruptions`)
- [ ] Label edits (`Edit Name`) update analytics cards immediately without reload
- [x] `speaker_analytics_generated` emits on snapshot changes and on session end
- [ ] Refresh twice with no new committed turns keeps same `analyticsKey` / `dedupeKey`

## Phase 8 Acceptance Checklist (Initial Slice)

Manual browser checks to run:

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || [])
    .filter(e => ['review_mode_toggled', 'speaker_analytics_generated'].includes(e.type))
    .slice(-20)
    .map(e => ({
      ts: e.timestamp,
      type: e.type,
      summary: e.summary,
      source: e.meta?.source,
      enabled: e.meta?.enabled,
      dedupeKey: e.meta?.dedupeKey
    }))));
```

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || [])
    .filter(e => e.type === 'export_pack_generated')
    .slice(-5)
    .map(e => ({
      ts: e.timestamp,
      summary: e.summary,
      exportHash: e.meta?.exportHash,
      exportSchemaVersion: e.meta?.exportSchemaVersion,
      eventCount: e.meta?.eventCount,
      chapterCount: e.meta?.chapterCount,
      fileSizeBytes: e.meta?.fileSizeBytes
    }))));
```

- [x] Review mode button toggles `Review: Off` <-> `Review: On`
- [x] In review mode, orb tap does not start a new talk session
- [x] In review mode, fallback Enter submit is blocked
- [x] Export Pack downloads a JSON file containing `events`, `chapters`, `speakerAnalytics`, and `summary`
- [x] Toggling review mode emits `review_mode_toggled` events
- [x] Historical pre-session errors are de-emphasized in timeline and hidden from `Errors` filter when current-session errors exist
- [x] Exporting Review Pack emits `export_pack_generated` with `eventCount`, `speakerCount`, `chapterCount`, `analyticsKey`, `exportSchemaVersion`, `fileSizeBytes`, `exportHash`
- [x] Re-export without new talk changes keeps `exportHash` stable

## Phase 9 Acceptance Checklist (Playback + Review UX)

Manual browser checks to run:

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || [])
    .filter(e => ['review_mode_toggled', 'review_playback_toggled', 'export_pack_generated'].includes(e.type))
    .slice(-20)
    .map(e => ({
      ts: e.timestamp,
      type: e.type,
      summary: e.summary,
      enabled: e.meta?.enabled,
      intervalMs: e.meta?.intervalMs,
      exportHash: e.meta?.exportHash
    }))));
```

```javascript
(() => {
  const focused = document.querySelectorAll('#talk-timeline .timeline-event.focused').length;
  const status = document.getElementById('timeline-review-status')?.textContent || '';
  console.log({ focused, status });
})();
```

- [x] `Review: On` reveals playback controls (`Prev`, `Next`, `Latest`, `Auto`)
- [x] `Prev` and `Next` move focused timeline row and update review status text
- [x] `Latest` jumps cursor to most recent visible timeline event
- [x] Clicking a timeline row in review mode focuses that row
- [x] `Auto: On` advances focus through events and stops at end
- [x] Toggling autoplay emits `review_playback_toggled`

## Phase 10.1 Acceptance Checklist (Voice Transcript Safety Gate)

Manual browser checks to run:

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || [])
    .filter(e => [
      'voice_transcript_confirmation_requested',
      'voice_transcript_confirmation_submitted',
      'voice_transcript_confirmation_retried',
      'voice_transcript_confirmation_cancelled',
      'talk_turn_committed'
    ].includes(e.type))
    .slice(-20)
    .map(e => ({
      ts: e.timestamp,
      type: e.type,
      draftText: e.meta?.draftText,
      originalDraftText: e.meta?.originalDraftText,
      finalText: e.meta?.finalText,
      edited: e.meta?.edited,
      speakerId: e.meta?.speakerId
    }))));
```

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || [])
    .filter(e => e.type === 'talk_turn_committed')
    .slice(-8)
    .map(e => ({
      ts: e.timestamp,
      text: e.meta?.text,
      speakerId: e.meta?.speakerId,
      speakerLabel: e.meta?.speakerLabel
    }))));
```

- [x] Low-confidence voice captures open transcript confirmation card before commit
- [x] Clicking `Send` commits only confirmed text into `talk_turn_committed.meta.text`
- [x] `Send` emits `voice_transcript_confirmation_submitted` with `edited=true/false`
- [x] `Retry` emits `voice_transcript_confirmation_retried` and resumes listening
- [x] `Cancel` emits `voice_transcript_confirmation_cancelled` and does not commit a new turn
- [x] Suggestion chips render (max 3), are click-to-apply only, and never auto-send

## Phase 11 Acceptance Checklist (Continuity + Concurrency Hardening)

Manual browser checks to run:

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || [])
    .filter(e => ['assistant_request_skipped', 'assistant_response_started', 'assistant_response_completed'].includes(e.type))
    .slice(-20)
    .map(e => ({
      ts: e.timestamp,
      type: e.type,
      reason: e.meta?.reason,
      turnId: e.turnId || e.meta?.turnId,
      summary: e.summary
    }))));
```

```javascript
(async () => {
  const payload = {
    taskId: 'global_podcast',
    mode: 'talk',
    agent: 'podcast',
    message: 'lock probe',
    contextPack: { sessionId: 'global_podcast', mode: 'talk' }
  };
  const [a, b] = await Promise.all([
    fetch('/agent/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => ({ status: r.status })),
    fetch('/agent/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => ({ status: r.status }))
  ]);
  console.table([a, b]);
})();
```

- [x] Continuity probe passes: ask "My favorite dish is fish", then later "What did I say my favorite dish is?" and assistant recalls fish
- [x] Server lock returns one `409 request_in_flight` for overlapping same-session talk requests
- [x] Client handles `409` with toast + `assistant_request_skipped` (`reason=server_request_in_flight`)
- [x] No duplicate `assistant_response_started/completed` per committed turn
- [x] Context continuity remains stable across turns after hard refresh
- [x] Fresh `assistant_response_completed` events do not show repeated-half duplication

## Phase 12 Acceptance Checklist (One-Circle Voice Flow Shift)

Manual browser checks to run:

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || [])
    .filter(e => [
      'voice_transcript_auto_committed',
      'voice_transcript_confirmation_requested',
      'voice_transcript_confirmation_submitted',
      'voice_transcript_confirmation_retried',
      'voice_transcript_confirmation_cancelled'
    ].includes(e.type))
    .slice(-20)
    .map(e => ({
      ts: e.timestamp,
      type: e.type,
      confidence: e.meta?.confidence,
      originalText: e.meta?.originalText || e.meta?.originalDraftText,
      finalText: e.meta?.finalText,
      edited: e.meta?.edited,
      deltaType: e.meta?.deltaType
    }))));
```

```javascript
JSON.parse(localStorage.getItem('ATEAM_CONFUSION_MAP_V1') || '{}');
```

- [x] High-confidence clear speech skips confirmation UI and emits `voice_transcript_auto_committed`
- [x] Low-confidence or missing-confidence speech opens confirmation UI and emits `voice_transcript_confirmation_requested`
- [x] Submitted confirmation events include `originalText`, `finalText`, `edited`, and `deltaType`
- [x] `deltaType` values are deterministic: `none | substitution | minor_edit | rewrite`
- [x] Confusion map only updates on low-confidence `substitution` edits
- [x] Existing 409 lock + continuity behavior remains unchanged after the gate shift

### Phase 12 DoD Validation Snapshot (2026-02-24)

- Gate 1 (static + backend): passed (`node --check Public/app.js`, `node --check Server/server.js`, `npm run test:backend`)
- Gate 2 (voice flow semantics): passed (`voice_transcript_auto_committed` seen; forced confirm path produced `voice_transcript_confirmation_requested`; submitted event schema valid)
- Gate 3 (learning telemetry): passed (`ATEAM_CONFUSION_MAP_V1` entry observed for low-confidence substitution: `yo -> begin`, `count=1`)
- Gate 4 (concurrency + continuity): passed (live API probe returned continuity recall with `fish` and lock probe returned `409 request_in_flight`)
- Gate 5 (transcript duplication regression): passed (latest assistant replies show no repeated-half and no adjacent sentence-run duplication)

### Prompt Update 12.2 Validation (manchi_voice_v2)

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || [])
    .filter(e => e.type === 'agent_prompt_updated')
    .slice(-5)
    .map(e => ({
      ts: e.timestamp,
      type: e.type,
      version: e.meta?.version,
      reason: e.meta?.reason,
      dedupeKey: e.meta?.dedupeKey
    }))));
```

- [x] Prompt profile version tag set to `manchi_voice_v2` in server prompt source
- [x] `agent_prompt_updated` event wiring added with meta `{ version, reason }` and dedupe key

## Talk Engine V1 Interaction Hardening (Interrupt + Cadence)

Manual browser checks to run:

```javascript
fetch('/events/global_podcast')
  .then(r => r.json())
  .then(d => console.table((d.events || [])
    .filter(e => ['assistant_interrupt_requested', 'assistant_interrupt_applied', 'assistant_request_cancelled'].includes(e.type))
    .slice(-20)
    .map(e => ({
      ts: e.timestamp,
      type: e.type,
      activeTurnId: e.meta?.activeTurnId,
      previousTurnId: e.meta?.previousTurnId || e.meta?.turnId,
      lane: e.meta?.lane,
      reason: e.meta?.reason,
      aborted: e.meta?.aborted,
      summary: e.summary
    }))));
```

```javascript
(() => {
  const btn = document.getElementById('tts-stop-btn');
  console.log({
    exists: Boolean(btn),
    text: btn?.textContent || '',
    disabled: Boolean(btn?.disabled),
    className: btn?.className || ''
  });
})();
```

- [x] `Interrupt` button exists in Talk Mode controls and is hidden (and disabled) when idle
- [x] During assistant speech/thinking, `Interrupt` control appears and cancels active flow immediately
- [x] Client interrupt emits `assistant_interrupt_requested` (user/talk) then `assistant_interrupt_applied` (system/talk)
- [x] Server emits `assistant_request_cancelled` (system/system) with `reason=client_disconnect` on request close, and lock releases
- [x] Aborted turn does not produce late ghost subtitle chunks or late committed assistant reply
- [x] Voice barge-in interrupts both thinking and speaking paths (`reason=voice_barge_in`) and resumes listening
- [x] Orb tap and Enter key interrupt active assistant flow without ending the session
- [x] If interrupt races a lock release, client performs one bounded retry on `409 request_in_flight`
