# SayWetin Android E2E QA Script

## Scenario: Destiny by Burna Boy (Video QA)

### Steps
1. Launch SayWetin app on Android device.
2. Tap the listen orb to start recognition.
3. Play "Destiny" by Burna Boy near the device.
4. Wait for recognition result.
5. Observe lyric display and meaning.
6. Tap "Listen again" to repeat.

### Acceptance Criteria
- No flash from lyric index 0 before target line is resolved.
- If timing is unavailable, show fallback: “Finding the exact line…” or “Song found. Exact lyric timing is not available yet.”
- Matched lyric is centered/highlighted when timing is resolved.
- Selected lyric meaning/loading is anchored directly under the selected line.
- Raw confidence percentage is hidden from user-facing UI.
- Mobile copy is correct: “Listen again” or “Tap to listen again.”
- Spotify/YouTube buttons do not crowd lyrics (bottom padding present).
- Listen-again resets timing, scroll, and meaning state.
- API/env checks: app connects to backend, no 404s on recognition/lyrics/meaning endpoints.

### Notes
- Attach video evidence for Destiny scenario.
- Log any UI/UX issues or regressions.
- Mark GO/HOLD/NO-GO at end of run.
