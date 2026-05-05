# SayWetin — Private Listening Plan

**Status:** OPEN  
**Owner:** Product + Engineering  
**Priority:** HIGH — affects all wired/Bluetooth headphone users

---

## Problem Statement

SayWetin captures microphone audio to recognize songs via ACRCloud fingerprinting.  
When a user is wearing headphones or earbuds (wired or Bluetooth), the audio plays directly into their ears — not into the room — so the microphone captures near-silence, not music.

**Result:** ACRCloud returns no match, and the user sees an error:
> _"We couldn't hear the song clearly. If you're using headphones or earbuds, play the music out loud — or sing, hum, or type a lyric instead."_

This is a **hardware constraint**, not a bug. The microphone physically cannot hear audio routed to headphones.

---

## Affected Scenarios

| Scenario | Impact | Workaround Available |
|---|---|---|
| Wired headphones (3.5mm or USB-C) | Recognition always fails | Yes — lyric input fallback |
| Bluetooth headphones / earbuds | Recognition always fails | Yes — lyric input fallback |
| Speaker on phone (no headphones) | Recognition works normally | N/A |
| External Bluetooth speaker | Recognition works (audio in room) | N/A |
| Screen reader / accessibility audio | Recognition always fails | Yes — lyric input fallback |

---

## Root Cause

ACRCloud fingerprinting requires ambient audio captured by the device microphone.  
Private audio output paths (headphones, earbuds) produce no measurable ambient signal.

**Code path:**
1. `ListenScreen.tsx → startRecognition()` records audio via `expo-audio`
2. Audio file uploaded to `POST /api/listen` (server: `routes.ts`)
3. `acrcloud-service.ts → recognizeSong()` sends to ACRCloud
4. ACRCloud returns 1001 (no result) or a very low-confidence match
5. Server returns `error: "We couldn't hear the song clearly…"` (HTTP 404)
6. Native app: `listen.ts` throws `new Error(payload.error)`
7. `ListenScreen.tsx` shows the error and reveals the lyric input fallback

---

## Current Mitigations (as of this patch)

### Server — `acrcloud-service.ts`
All low-match error messages now explicitly mention headphones and provide actionable alternatives:
- Primary no-match: _"We couldn't hear the song clearly. If you're using headphones or earbuds, play the music out loud — or sing, hum, or type a lyric instead."_
- Low-confidence: _"Play the music out loud (not through headphones), or try again with louder, clearer audio."_
- Weak match: _"Play the music out loud (not through headphones), or move closer to the speaker and try again."_

### Native app — `ListenScreen.tsx`
When the lyric fallback input appears after a failed recognition, the hint now reads:
> _"Using headphones? Play music out loud, or sing, hum, or type a lyric below"_

This surfaces the lyric-input fallback immediately and explains *why* recognition may have failed.

---

## Lyric/Text Fallback Path

`POST /api/identify-by-text` accepts free-text lyric, phrase, or title and uses OpenAI to match.  
This is the correct fallback for all private listening scenarios.

**Flow:**
1. User sees error → lyric input box auto-shows in `ListenScreen`
2. User types lyric, phrase, or title
3. `identifyByText()` calls `POST /api/identify-by-text`
4. Result follows same downstream path as audio recognition

---

## Known Gaps (Remaining Work)

### GAP 1 — No pre-recognition headphone detection  
There is no code today that detects whether headphones are connected before starting the microphone capture. A proactive nudge ("We see you have headphones connected — you may want to type a lyric instead") would prevent the failed-recording UX entirely.

**Proposed solution:**
- Use `react-native-headphone-detection` (MIT) or RN's `AudioManager` (Android) + `AVAudioSession.currentRoute` (iOS) to detect headphones at listen-start
- If headphones are detected: show an inline banner above the orb: _"Headphones connected. Play music out loud or type a lyric to match."_
- Do NOT block recognition — the user may want to take headphones off and tap again

**Owner:** Dev — Mobile  
**Priority:** MEDIUM  
**Blocking release:** No (fallback copy already added)

### GAP 2 — No humming/singing UX guidance  
ACRCloud supports humming recognition. The app does not tell users they can hum the melody.  
The lyric hint was updated to mention humming, but there is no dedicated humming UI affordance.

**Proposed solution:**
- Add a secondary button or `orbHint` variant: _"Or hum the melody"_  
- No code change required to enable it — humming already goes through the same audio capture path; ACRCloud's humming engine handles it automatically

**Owner:** Dev — Mobile / Design  
**Priority:** LOW  
**Blocking release:** No

### GAP 3 — Preview build missing API env var (resolved)  
`eas.json` preview profile was missing `EXPO_PUBLIC_API_BASE_URL`. Fixed in this patch.

---

## Test Matrix for Private Listening QA

| Test Case | Steps | Expected Result | Pass/Fail |
|---|---|---|---|
| Wired headphones — no lyric | Connect wired headphones. Tap orb. Wait. | Error shown with headphone message. Lyric box appears. | |
| Bluetooth headphones — no lyric | Connect BT headphones. Tap orb. Wait. | Error shown with headphone message. Lyric box appears. | |
| Wired headphones — lyric fallback | Connect wired headphones. Tap orb. Wait for error. Type lyric. Tap Match. | Song identified via text match. Result screen shown. | |
| No headphones — loud music | No headphones. Play music on speaker. Tap orb. Wait. | Song identified via audio fingerprint. Result screen shown. | |
| Tap stop early during headphone capture | Connect headphones. Tap orb. Tap orb again to stop. | Graceful stop. Error shown if recording too short. Lyric box appears. | |

---

## Acceptance Criteria for GAP 1 (headphone detection pre-recognition)

- [ ] Headphone state detected on Android (wired and Bluetooth) before recording starts
- [ ] Headphone state detected on iOS before recording starts
- [ ] Banner shown above orb when headphones detected (non-blocking)
- [ ] Banner dismissible; user can still tap orb to attempt audio recognition
- [ ] Banner absent when no headphones connected
- [ ] No regression in normal recognition flow (speakers)
- [ ] QA passed on Samsung Galaxy A55 5G (device: 2B260DLH2000C8)
- [ ] QA passed on iOS (simulator or physical)

---

## Related Files

| File | Relevance |
|---|---|
| `APPS/saywetin/server/acrcloud-service.ts` | Error messages patched in this plan |
| `APPS/saywetin-native/src/screens/ListenScreen.tsx` | Lyric hint copy updated |
| `APPS/saywetin-native/src/api/listen.ts` | Error propagation from API to screen |
| `APPS/saywetin/server/routes.ts` | `/api/listen` — passes errorMessage to client |
| `APPS/saywetin/ops/FULL_E2E_QA_REPORT.md` | Main QA status tracker |
| `APPS/saywetin/ops/SAYWETIN_ANDROID_E2E_QA_SCRIPT.md` | Device QA steps |
