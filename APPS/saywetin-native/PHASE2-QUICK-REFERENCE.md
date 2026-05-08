# Phase 2 Quick Reference: Per-Section Result Hydration

## State Machine Overview

### Per-Section State Transitions

```
PENDING ──[user tap retry]──→ LOADING ──[content found]──→ READY
  ↓                              ↓
  │ (>3s elapsed)               │ (backend error or timeout)
  ↓                              ↓
STALLED ────────────────────→ ERROR ──[user tap retry]──→ LOADING
  ↓                              ↑                           ↓
  └──[content arrives late]──────┴──[ready]─────────────────→ READY
```

### Key Differences from Phase 1

| Aspect | Phase 1 | Phase 2 |
|--------|---------|---------|
| **Loading Model** | Monolithic (all or nothing) | Per-section (independent) |
| **Retry** | Full result retry | Section-specific retry |
| **Error Handling** | Block entire result | Section still usable |
| **User Messaging** | Generic "loading" | Section-specific messages |
| **Stall Detection** | Implicit (silent hang) | Explicit (3s threshold) |

---

## Code Patterns

### Pattern 1: Initialize Section State
```typescript
// Initialize based on content availability
const [lyricsSection, setLyricsSection] = useState<SectionState>({
  ready: (track.lyric || '').trim().length > 0,
  loading: false,
  error: null,
});
```

### Pattern 2: Section Retry Handler
```typescript
const retryLyricsSection = () => {
  // Guard: prevent duplicate requests
  if (lyricsSection.loading) return;
  
  // Enter loading state
  setLyricsSection({ ready: false, loading: true, error: null });
  
  // Simulate fetch (will become real API call in Phase 2b)
  setTimeout(() => {
    if (inlineLyrics) {
      // Success: mark ready
      setLyricsSection({ ready: true, loading: false, error: null });
    } else {
      // Failure: set error message
      setLyricsSection({ 
        ready: false, 
        loading: false, 
        error: 'Lyrics not available from backend. Open Live Lyrics to search.' 
      });
    }
  }, SECTION_RETRY_DELAY_MS);
};
```

### Pattern 3: Stall Detection
```typescript
const elapsedSinceResultMs = Date.now() - resultShownAtMs;
const isLyricsStalled = 
  !lyricsSection.ready &&        // Not ready
  !lyricsSection.loading &&      // Not fetching
  !lyricsSection.error &&        // No error
  elapsedSinceResultMs > 3000;   // And it's been >3 seconds
```

### Pattern 4: Per-Section Render Cascade
```typescript
{lyricsSection.loading ? (
  <Text style={styles.loadingText}>Loading lyrics…</Text>
) : lyricsSection.error ? (
  <>
    <Text style={styles.errorText}>{lyricsSection.error}</Text>
    <Pressable onPress={retryLyricsSection}>
      <Text>Retry</Text>
    </Pressable>
  </>
) : inlineLyrics ? (
  <Text style={styles.lyricText}>{inlineLyrics}</Text>
) : isLyricsStalled ? (
  <Text style={styles.stalledText}>Lyrics taking longer than expected…</Text>
) : (
  <Text style={styles.pendingText}>Lyrics are still loading…</Text>
)}
```

---

## User Interaction Flow

### Scenario: Slow Lyrics, Fast Meaning

```
Result screen opens at T=0ms
├─ Meaning section: READY (displays immediately)
└─ Lyrics section: PENDING (shows "still loading…")
   └─ T=3000ms: STALLED (show "taking longer…")
      └─ T=3500ms: User taps "Open Live Lyrics"
         └─ Or user taps "Retry" if error appears
            └─ Section goes to LOADING for 500ms
               └─ Then READY (if content found) or ERROR (if failed)
```

### Scenario: Both Sections Fail

```
Result screen opens
├─ Lyrics: ERROR (shows "Lyrics not available…" + Retry button)
└─ Meaning: ERROR (shows "Meaning not available…" + Retry button)
   └─ User taps Lyrics "Retry" → LOADING → Ready or Error
   └─ User taps Meaning "Retry" → LOADING → Ready or Error
      └─ (Independent, no interference)
```

---

## Implementation Checklist

- [x] Add `SectionState` type definition
- [x] Initialize `lyricsSection` and `meaningSection` hooks
- [x] Implement `retryLyricsSection()` handler
- [x] Implement `retryMeaningSection()` handler
- [x] Add stall detection: `isLyricsStalled`, `isMeaningStalled`
- [x] Refactor JSX to per-section conditionals
- [x] Add retry buttons (visible on error only)
- [x] Add section divider (visual separator)
- [x] Style loading text (italic violet)
- [x] Style stalled text (amber)
- [x] Style error text (amber)
- [x] Style pending text (muted)
- [x] Validate TypeScript compilation
- [x] Document test scenarios
- [x] Create PHASE2-IMPLEMENTATION.md

---

## Integration Points for Phase 2b (Future)

### Real Per-Section Fetching
```typescript
// Will replace simulated timeout in Phase 2b
async function fetchLyricSection(trackId: string, track: RitualTrack) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/tracks/${trackId}/lyrics`);
    const data = await response.json();
    return data.lyric || '';
  } catch (err) {
    return null; // Will trigger error state
  }
}
```

### Backend Timing Field Usage
```typescript
// Use timing fields from API response
const recognitionDuration = recognitionReceivedAtMs - listenStartedAtMs;
if (recognitionDuration > 5000) {
  // Show "Recognition took X seconds" hint in lyrics section
}
```

### Per-Section Error Classification
```typescript
// Map HTTP status codes to user messages
const errorMessages: Record<number, string> = {
  404: 'Lyrics not available from backend. Open Live Lyrics to search.',
  500: 'Backend service unavailable. Please try again.',
  timeout: 'Connection slow. Check your network.',
};
```

---

## Performance Characteristics

- **State Update:** O(1) per section (no loops)
- **Re-render Cost:** Minimal (simple conditional text rendering)
- **Memory Footprint:** +3 state objects (~150 bytes total)
- **Network:** No additional calls in current phase (simulated)

---

## Testing Checklist

- [ ] Manual test on device: fast lyrics, fast meaning
- [ ] Manual test on device: slow lyrics, fast meaning
- [ ] Manual test on device: lyrics retry (simulated failure)
- [ ] Manual test on device: meaning retry (simulated failure)
- [ ] Manual test on device: stall message appears at 3s
- [ ] Manual test on device: Live Lyrics integration (state preserved)
- [ ] Unit test: SectionState type usage
- [ ] Unit test: Retry handler guards (loading prevention)
- [ ] Unit test: Stall detection thresholds

---

## Known Limitations & Future Work

### Phase 2b: Real Backend Fetching
- Current retry handlers simulate with 500ms timeout
- Will replace with real API calls to `/api/tracks/:id/lyrics` etc.
- Requires backend endpoint implementation

### Phase 2c: Timing Field Integration
- Backend already returns timing data in response
- Will use to show "Recognition took 2.3 seconds" hints
- Requires parsing and display in lyrics section

### Phase 2d: Offline Retry Persistence
- Current retries are in-session only
- Will persist failed sections to AsyncStorage
- Will attempt retry on next app launch

### Phase 2e: Analytics & Observability
- Track section retry rates per endpoint
- Identify slow endpoints for optimization
- Monitor error classification distribution

---

## Files & Artifacts

- **Modified:** `src/screens/ResultScreen.tsx` (500+ lines)
- **Documentation:** `PHASE2-IMPLEMENTATION.md` (comprehensive test plan)
- **This File:** `PHASE2-QUICK-REFERENCE.md` (patterns & integration guide)
- **Session Memory:** `/memories/session/phase2-progress.md` (tracking)

---

## Type Safety Validation

✅ **Full TypeScript Compilation Pass**
- Command: `npx tsc --noEmit`
- Result: 0 errors
- Scope: Entire codebase

---

## Approval Gate: Ready for Device Testing ✅

All code changes complete, type-safe, and documented. Next: manual smoke testing on iOS/Android device to validate UX before Phase 2b.

