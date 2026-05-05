# SayWetin Chrome Extension — Release Notes

## v1.0.1 (2026-04-30)

### Highlights
- API custom domain cutover completed: `https://api.saywetin.app`
- Railway custom domain verified and certificate status valid
- Extension docs refreshed across README, testing, and store checklist
- Added automatic docs guard workflow for pull requests

### Infra Notes
- Primary API endpoint: `https://api.saywetin.app`
- Railway fallback endpoint: `https://saywetin-api.splendid-spirit.up.railway.app`
- Health check: `GET /health` returns `{"status":"ok"}`

## v1.0.0 (2026-04-28)

### Highlights
- Shazam-style recognition for African music in any browser tab
- One-tap listen orb, premium UI, and branding
- Tab audio capture (no mic required)
- 7-second snippet recognition via backend
- Lyric display with tap-for-meaning (cultural analysis)
- Deep-link to full track page on saywetin.app
- Syncs recent recognitions to user account if logged in
- Minimal permissions (tabCapture, storage, scripting, tabs)
- Mobile-friendly, accessible, and fast

### How to Use
1. Install from Chrome Web Store (or load unpacked)
2. Open a tab with music playing
3. Tap the orb in the popup
4. See instant recognition, lyric, and meaning
5. Click to view full track or meaning

### Privacy
- No tracking, analytics, or ads
- Audio is only sent to backend for recognition
- See saywetin.app/privacy for full policy

### Support
- For help or feedback, visit https://saywetin.app or contact support@saywetin.app
