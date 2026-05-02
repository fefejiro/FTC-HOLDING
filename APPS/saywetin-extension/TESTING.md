# SayWetin Chrome Extension — End-to-End Test Plan

## 1. Popup UI
- [x] Popup loads with hero image, orb, and branding
- [x] Orb tap triggers listening state and disables button

## 2. Tab Audio Capture
- [x] Orb tap requests tab audio (tabCapture)
- [x] MediaRecorder records 7s of tab audio
- [x] Recording stops and audio is ready for upload

## 3. Recognition API
- [x] Audio blob is POSTed to /api/recognize
- [x] Recognition result is parsed and displayed
- [x] Error state is shown if recognition fails

## 4. Lyric Meaning
- [x] Lyric line is clickable
- [x] Clicking lyric fetches meaning from /v1/cultural-analysis
- [x] Meaning is displayed, loading and error states handled

## 5. Deep-Link
- [x] If trackId is present, "View Full Track Page" button appears
- [x] Button opens saywetin.app/track/:id in new tab

## 6. Sync Recent Recognitions
- [x] If user is authenticated (session in localStorage), POST to /api/recent-recognition
- [x] No error if not authenticated

## 7. General
- [x] All UI states are mobile-friendly and accessible
- [x] No console errors in Chrome extension context
- [x] Build output loads in Chrome extension (dist/)

## 8. Manual QA
- [ ] Test on multiple tabs/sites (YouTube, Spotify, etc.)
- [ ] Test with/without user session
- [ ] Test error handling (network, backend down)
- [ ] Test on Chrome stable and beta

## 9. Infrastructure Verification
- [ ] Set `VITE_SAYWETIN_API_BASE_URL` explicitly when targeting non-default QA backend
- [x] `api.saywetin.app` resolves to Railway CNAME target
- [x] `https://api.saywetin.app/health` returns HTTP 200
- [x] Railway domain status is verified with valid certificate

## 10. Documentation Guard
- [x] Pull request docs guard workflow is enabled
- [x] `node scripts/docs-guard.mjs` passes for docs-only updates
- [ ] Validate docs guard blocks a code-only PR with no docs changes

---

## How to Test
1. Run `npm run build`
2. Load `dist/` as unpacked extension in Chrome
3. Open a tab with music playing
4. Open popup, tap orb, verify recognition and UI
5. Try lyric meaning, deep-link, and session sync
