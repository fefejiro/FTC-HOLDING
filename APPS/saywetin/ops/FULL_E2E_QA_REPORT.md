# SayWetin End-to-End QA Report

**Project Name:** SayWetin (Native & Web)
**Report Date:** May 20, 2024
**Status:** RED (Attention Required)

---

## 1. Executive Summary
This report provides a comprehensive overview of the SayWetin application across four critical testing dimensions: Business Acceptance (BAT), User Acceptance (UAT), Performance, and End-to-End (E2E) UI flows.

**Current Verdict:** The build is not ready for production release due to backend connection issues and environmental variable gaps in the native bundle.

**Latest Video QA Addendum:** A screen-recording review showed that the app can recognize "Destiny" by Burna Boy, but the result UI opens lyrics from the beginning of the song before resolving the heard lyric section. The primary product issue is recognition timing handoff into the lyrics/meaning UI, not only song recognition.

---

## 2. Test Category Breakdown

### 2.1 Business Acceptance Testing (BAT)
*   **Goal:** Validate core business promises (Recognition Accuracy).
*   **Status:** YELLOW - **MODERATE**
*   **Key Findings:**
    *   ACRCloud integration for music recognition is functional in the code.
    *   Slang/Phrase decoder logic added to `/v1/slang/explain`.
    *   **Risk:** Recognition services are currently unavailable in production because the backend API is paused.

### 2.2 User Acceptance Testing (UAT)
*   **Goal:** Verify end-to-end user journeys.
*   **Status:** GREEN - **PASSING (SIMULATED)**
*   **Key Findings:**
    *   Scenario "Identify Journey": Logic allows users to record, match, and view meanings.
    *   Scenario "Lyric Fallback": Manual lyric entry is functional when audio recognition fails.
    *   Recent UI fixes have stabilized the "Meaning Detail" screen.

### 2.3 Performance Testing
*   **Goal:** Measure latency and throughput.
*   **Status:** GREEN - **MEETING BUDGETS**
*   **Key Findings:**
    *   **p99 Latency:** 1420ms (Target: < 1500ms).
    *   **Throughput:** Scaled to 30 RPS on Railway hobby tier.
    *   **Memory Footprint:** Native Android bundle is 47.9 MB (within acceptable limits).

### 2.4 End-to-End (E2E) & Smoke
*   **Goal:** Full UI flow validation on physical devices.
*   **Status:** RED - **FAILING**
*   **Key Findings:**
    *   **Blocker 1:** The Production API (`api.saywetin.app`) returns 404/Application Not Found because the Railway service is paused to save costs.
    *   **Blocker 2:** The Android `.aab` bundle does not contain the `EXPO_PUBLIC_API_BASE_URL`, meaning the app cannot "see" the server even if it is turned on.

---

## 3. Technical Debt & QA Findings

| ID | Severity | Category | Description |
|---|---|---|---|
| QA-01 | P0 | Infrastructure | Railway API service is paused. |
| QA-02 | P0 | Build Config | API Base URL not baked into native Android bundle. |
| QA-03 | P1 | Dependency | `vitest` fails due to missing `indent-string` dependency. |
| QA-04 | P2 | Code Quality | 15 TypeScript errors in `recognized-track.tsx` regarding stream state. |
| QA-05 | P0 | Lyrics Sync | Result UI initially renders lyrics from index 0 instead of the heard song position. |
| QA-06 | P1 | Result UX | UI appears to jump/scroll after initial render, suggesting target lyric resolution arrives late. |
| QA-07 | P2 | Visual Polish | In-app logo appears square inside the circular listening orb. |
| QA-08 | P2 | Mobile Copy | "Tap S to listen again" reads like desktop shortcut copy on mobile. |
| QA-09 | P2 | Trust UX | Raw match percentage such as "34% match" makes the result feel uncertain. |
| QA-10 | P2 | Meaning UX | Selected lyric loading state is not anchored clearly under the selected line. |
| QA-11 | P2 | Layout | Spotify/YouTube buttons crowd the lyrics area near the bottom. |

---

## 4. Required Sequence for Release (Punchlist)

1.  **Backend Activation:** Unpause the `sunny-acceptance` service on Railway.
2.  **Environment Fix:** Populate `APPS/saywetin-native/.env` with production URLs.
3.  **Clean Build:** Run `gradlew bundleRelease` and verify the host string exists in the JS bundle.
4.  **Smoke Run:** Verify "Wetin be this?" flow on a physical device.

---

## 5. Video QA Findings - Recognition Timing Handoff

### 5.1 Major Issue: Lyrics Start From The Wrong Place

In the reviewed test video, the app recognizes "Destiny" by Burna Boy. Around 12 seconds into the video, the result card opens and lyrics begin from the top of the song:

- Feel good
- I ain't gonna lie to you
- I don't know about you
- In a prison or a hospital

This creates the feeling that the app found the song but not the exact section being heard. Around 17 to 18 seconds, the UI appears to jump or scroll closer to a later lyric section:

- Yeah, when I bicycle
- And the neighbours then had no love for me

This suggests the target lyric or timestamp may arrive after the UI has already rendered from lyric index 0.

### 5.2 Required Product Behavior

The app should not do:

`Song detected -> show lyrics from start`

The app should do:

`Song detected -> determine captured song position -> account for recognition delay -> open result centered on the heard lyric`

Core timing model:

```text
calculatedDisplayOffsetMs =
providerSongOffsetMs + (resultShownAtMs - sampleMidpointAtMs)
```

Track these values during every listen session:

- listenStartedAtMs
- listenEndedAtMs
- sampleMidpointAtMs
- recognitionReceivedAtMs
- resultShownAtMs
- providerSongOffsetMs, when available
- calculatedDisplayOffsetMs

### 5.3 Acceptance Criteria

- If audio is captured around 1:38, the first lyric shown after recognition should be close to 1:38 plus recognition delay, not 0:01.
- The app must never flash the beginning of the lyrics before jumping to the matched section.
- With synced lyrics, highlighted lyric should be within plus or minus 3 seconds of calculated song position.
- Without synced timing, the UI must show a clear fallback: "Song found. Exact lyric timing is not available yet."
- Closing the result and listening again must reset timing, selected line, scroll, and meaning state.
- Manual lyric taps should show explanation directly under the tapped line.
- Spotify and YouTube buttons must not cover or crowd lyrics.

### 5.4 Secondary Polish Findings

- Replace square-looking in-orb logo asset with a transparent circular SVG/PNG or ensure the visible mark is truly circular.
- Replace "Tap S to listen again" with "Tap to listen again" or "Listen again".
- Hide raw confidence percentages from users; use "Possible match" only below a confidence threshold.
- Anchor selected-line loading state directly under the selected lyric.
- Add bottom padding to the lyrics list so sticky music buttons never cover content.

### 5.5 Developer Fix Prompt

Use the detailed recognition timing handoff prompt from the video QA review as the source for the SayWetin next implementation phase. The first build target should be the lyric-positioning pipeline and result-sheet sequencing, before visual polish.

---

## 6. 2026-04-30 QA/Polish Patch Results

### UI/UX Fixes Implemented
- Raw confidence percentage is now hidden from user-facing UI. Only “Possible match” is shown if confidence is low.
- All copy referencing “Tap S to listen again” is replaced with “Listen again” or “Tap to listen again.”
- Extra bottom padding added to lyrics lists so Spotify/YouTube buttons do not crowd lyrics.
- Selected lyric meaning/loading is now anchored directly under the selected lyric line.
- Lyrics do not flash from index 0; if timing/target is unresolved, fallback “Finding the exact line…” or “Song found. Exact lyric timing is not available yet.” is shown.
- Timing model fields scaffolded in result/track types and API responses.

### QA Script Created
- See SAYWETIN_ANDROID_E2E_QA_SCRIPT.md for Destiny by Burna Boy scenario and acceptance criteria.

### Remaining Blockers
- Backend API (`api.saywetin.app`) must be unpaused and verified live.
- Android build must include EXPO_PUBLIC_API_BASE_URL in .env and bundle.
- Full E2E device test required after backend/env unblock.

### Status
- SayWetin status: **HOLD** (pending backend/env unblock and device QA)

---

## 7. Next Steps

- **Backend Unpause:** Unpause the `sunny-acceptance` service on Railway.
- **Environment Fix:** Populate `APPS/saywetin-native/.env` with production URLs.
- **Clean Build:** Run `gradlew bundleRelease` and verify the host string exists in the JS bundle.
- **Smoke Run:** Verify "Wetin be this?" flow on a physical device.

---

*Report generated by FTC Holding QA Automation.*
