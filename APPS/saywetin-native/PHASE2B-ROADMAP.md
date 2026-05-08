# Phase 2b Roadmap: Real Per-Section Fetching & Backend Integration

## Phase 2a Status: ✅ COMPLETE

All per-section state management, retry handlers, and UX messaging implemented.

- TypeScript: ✅ 0 errors
- Styling: ✅ Complete
- Test scenarios: ✅ 8 documented
- Documentation: ✅ Comprehensive

**Gate for Phase 2b Entry:** Manual device smoke test (iOS/Android) to validate UX

---

## Phase 2b: Real Per-Section Backend Fetching

### Objective
Replace simulated 500ms timeout retry handlers with real API calls to backend endpoints. Allow lyrics, meaning, and cultural analysis to hydrate independently from the backend.

### Success Criteria
- [ ] Create `fetchLyricSection(trackId)` function
- [ ] Create `fetchMeaningSection(trackId)` function
- [ ] Create `fetchCulturalSection(trackId)` function
- [ ] Integrate functions into ResultScreen retry handlers
- [ ] Handle backend errors with appropriate user messages
- [ ] Handle network timeouts with fallback messages
- [ ] Validate TypeScript compilation
- [ ] Device test: verify per-section refetch works

### Implementation Tasks

#### Task 2b-1: Define Backend API Contract

**Current Status:** Backend returns lyrics, meaning, cultural analysis in initial result

**Required:** Define per-section fetch endpoints

```typescript
// File: src/api/result-sections.ts (NEW)

type LyricFetchResponse = {
  lyric: string;
  source: 'live-lyrics' | 'genius' | 'fallback' | null;
};

type MeaningFetchResponse = {
  meaning: string;
};

type CulturalFetchResponse = {
  culturalAnalyses: CulturalAnalysisEntry[];
};

// Endpoint: GET /api/tracks/:trackId/lyrics
async function fetchLyricSection(trackId: string): Promise<LyricFetchResponse | null> {
  // Fetch from backend
}

// Endpoint: GET /api/tracks/:trackId/meaning
async function fetchMeaningSection(trackId: string): Promise<MeaningFetchResponse | null> {
  // Fetch from backend
}

// Endpoint: GET /api/tracks/:trackId/cultural-analysis
async function fetchCulturalSection(trackId: string): Promise<CulturalFetchResponse | null> {
  // Fetch from backend
}
```

**Dependencies:** `api.saywetin.app/health` endpoint confirmed active

**Blockers:** Need backend endpoint definitions (contact API team)

#### Task 2b-2: Implement Real Fetch Functions

**Files to Create:**
- `src/api/result-sections.ts` (new)

**Implementation Pattern:**
```typescript
export async function fetchLyricSection(trackId: string): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/tracks/${trackId}/lyrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Not available
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json() as LyricFetchResponse;
    return data.lyric || null;
  } catch (err) {
    console.error('Lyric fetch failed:', err);
    return null; // Will trigger error state in ResultScreen
  }
}
```

**Error Handling Strategy:**
- Network error: Set section error to "Connection issue. Check your network."
- HTTP 404: Set section error to "Not available from backend. Open Live Lyrics."
- HTTP 5xx: Set section error to "Backend service unavailable. Please try again."
- Timeout (5s): Set section error to "Request took too long. Try again?"

**Timeout Configuration:**
```typescript
const FETCH_TIMEOUT_MS = 5000;
const withTimeout = async (promise, ms) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};
```

#### Task 2b-3: Integrate Fetches into ResultScreen

**File to Modify:** `src/screens/ResultScreen.tsx`

**Changes:**
1. Import new fetch functions:
   ```typescript
   import { 
     fetchLyricSection, 
     fetchMeaningSection, 
     fetchCulturalSection 
   } from '../api/result-sections';
   ```

2. Replace simulated retry handlers with real fetches:
   ```typescript
   const retryLyricsSection = async () => {
     if (lyricsSection.loading) return;
     setLyricsSection({ ready: false, loading: true, error: null });
     
     try {
       const lyric = await fetchLyricSection(track.id);
       if (lyric) {
         setLyricsSection({ ready: true, loading: false, error: null });
         // Optionally update track.lyric state or display inline
       } else {
         setLyricsSection({ 
           ready: false, 
           loading: false, 
           error: 'Lyrics not available from backend. Open Live Lyrics to search.' 
         });
       }
     } catch (err) {
       const errorMsg = isNetworkError(err) 
         ? 'Connection issue. Check your network.'
         : 'Failed to load lyrics. Try again?';
       setLyricsSection({ ready: false, loading: false, error: errorMsg });
     }
   };
   ```

3. Similar pattern for `retryMeaningSection()` and cultural section

**Timeline:** ~4-6 hours (depends on backend endpoint availability)

---

## Phase 2c: Backend Timing Field Integration

### Objective
Wire backend timing fields (`listenStartedAtMs`, `recognitionReceivedAtMs`, `resultShownAtMs`) into UI to show performance hints and coordinate loading indicators.

### Implementation Tasks

#### Task 2c-1: Extract Timing Fields from RitualTrack

**File:** `src/state/ritual-state.ts`

**Additions to RitualTrack type:**
```typescript
type RitualTrack = {
  // ... existing fields
  
  // Timing fields (from backend)
  listenStartedAtMs?: number;
  recognitionReceivedAtMs?: number;
  resultShownAtMs?: number;
  providerSongOffsetMs?: number;
  
  // Computed fields (for UI)
  recognitionDurationMs?: number;  // recognitionReceivedAtMs - listenStartedAtMs
};
```

#### Task 2c-2: Display Timing Hints in Result Screen

**Pattern:**
```typescript
const recognitionDuration = track.recognitionReceivedAtMs 
  ? track.recognitionReceivedAtMs - (track.listenStartedAtMs || 0)
  : null;

{recognitionDuration && recognitionDuration > 3000 && (
  <Text style={styles.hintText}>
    Recognition took {(recognitionDuration / 1000).toFixed(1)}s
  </Text>
)}
```

**Where to Display:** In lyrics section, above or alongside the lyric text

**Goal:** Show users that backend recognized the track quickly or slowly (UX transparency)

---

## Phase 2d: Offline Retry Persistence

### Objective
Save failed section states to AsyncStorage so users can retry failed sections when they regain connection, without re-opening the result.

### Implementation Tasks

#### Task 2d-1: Define Failed Section Schema

```typescript
type FailedSection = {
  trackId: string;
  sectionType: 'lyrics' | 'meaning' | 'cultural';
  error: string;
  attemptedAtMs: number;
  lastError?: string;
};
```

#### Task 2d-2: Persist Failures to AsyncStorage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAILED_SECTIONS_KEY = '@saywetin/failed_sections';

async function persistFailedSection(section: FailedSection) {
  const existing = await AsyncStorage.getItem(FAILED_SECTIONS_KEY);
  const list = existing ? JSON.parse(existing) : [];
  list.push(section);
  await AsyncStorage.setItem(FAILED_SECTIONS_KEY, JSON.stringify(list));
}
```

#### Task 2d-3: Auto-Retry on Connection Restore

Hook into network state listener (Expo Network):
```typescript
import * as Network from 'expo-network';

useEffect(() => {
  const subscription = Network.addNetworkStateListener(async (state) => {
    if (state.isConnected) {
      // Auto-retry all failed sections for this track
      const failed = await getFailedSections(track.id);
      for (const section of failed) {
        if (section.sectionType === 'lyrics') {
          await retryLyricsSection();
        } else if (section.sectionType === 'meaning') {
          await retryMeaningSection();
        }
      }
    }
  });
  return () => subscription.remove();
}, [track.id]);
```

---

## Phase 2e: Analytics & Observability

### Objective
Track section retry rates, error classifications, and timing distributions to identify slow endpoints and UX friction.

### Events to Track

```typescript
type SectionRetryEvent = {
  timestamp: number;
  trackId: string;
  section: 'lyrics' | 'meaning' | 'cultural';
  reason: 'user-tap' | 'auto-retry' | 'offline-recovery';
  resultStatus: 'success' | 'error' | 'timeout';
  durationMs: number;
  error?: string;
};

async function logSectionRetry(event: SectionRetryEvent) {
  // Send to analytics backend (e.g., Sentry, LogRocket)
  await analytics.track('section_retry', event);
}
```

### Metrics to Monitor

- **Section Retry Rate:** % of results requiring section retry
- **Error Distribution:** Count by error type (404, 500, timeout, network)
- **Success After Retry:** % of retries that succeed
- **Timing Distribution:** P50, P95, P99 fetch times per section
- **Offline Retry Success:** % of offline retries that succeed after reconnect

---

## Implementation Timeline

| Phase | Tasks | Est. Duration | Dependencies |
|-------|-------|---------------|--------------|
| 2a | ✅ Per-section state management | ✅ Done | None |
| 2b | Real backend fetching | 4-6 hours | Backend endpoints ready |
| 2c | Timing field integration | 2-3 hours | Depends on 2b |
| 2d | Offline persistence | 3-4 hours | Depends on 2b |
| 2e | Analytics | 2-3 hours | Can run in parallel with 2b-2d |

**Total Phase 2 (2a-2e):** ~2 weeks (with backend ready)

---

## Blocking Issues

1. **Backend Endpoint Definitions:** Need `/api/tracks/:id/lyrics`, `/api/tracks/:id/meaning`, `/api/tracks/:id/cultural-analysis` endpoints defined
2. **Auth Token Management:** Ensure ResultScreen has access to current auth token for API calls
3. **CORS Configuration:** Backend must allow requests from `expo://` URLs (or deployed domain)

---

## Success Criteria (Phase 2 Complete)

- [x] Per-section state management (Phase 2a)
- [ ] Real backend fetching (Phase 2b)
- [ ] Timing field display (Phase 2c)
- [ ] Offline retry persistence (Phase 2d)
- [ ] Analytics tracking (Phase 2e)
- [ ] Device testing across all scenarios
- [ ] Zero TypeScript errors
- [ ] Performance validated (no janky renders)
- [ ] Error messaging tested and polished

---

## Approval Gate for Next Phase

**Approval Required From:**
- [ ] Backend API team (endpoint definitions)
- [ ] QA team (manual device testing)
- [ ] Product team (timing/messaging copy review)

**Blockers to Address:**
- [ ] Backend endpoints not yet defined → contact API team
- [ ] Auth token not accessible in ResultScreen → implement token injection
- [ ] CORS not configured → backend team to update

