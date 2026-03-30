# PeacePad Release Status

## Current State

- Web production is live at `https://peacepad.ca`
- API production is live at `https://api.peacepad.ca`
- Production ownership verification passed on March 30, 2026
- Google Play production release `40 (1.0.8)` has been uploaded and is currently `In review`

## What Shipped

- PeacePad MVP refocus is live:
  - Messages
  - Prep Chat
  - Calendar
  - You / Settings
- Messaging now uses inline tone guidance and rewording suggestions
- Prep Chat is simplified around difficult-conversation coaching
- Calendar is display-only
- Support resources are curated external links
- Deferred surfaces were hidden or disabled for the MVP refocus

## Release Artifact

- Latest Android bundle:
  - `C:\FTC HOLDING\APPS\peacepad\android\app\build\outputs\bundle\release\app-release.aab`
- Android version:
  - `versionCode 40`
  - `versionName 1.0.8`
- Package:
  - `ca.peacepad.family`

## Deploy Notes

- Cloudflare Pages project: `ftc-holding`
- PeacePad needed a local Pages config to avoid inheriting the unrelated repo-root Wrangler config
- Fix added at:
  - `APPS/peacepad/wrangler.toml`
- Live web build metadata now points to commit:
  - `7096170e14b6c0b4bd1932f731aadcbb3b6a3645`

## Play Release Notes Used

- Refocused PeacePad around calmer co-parent communication.
- Improved before-send tone feedback and clearer rewording suggestions.
- Updated Prep Chat to better coach difficult conversations before sending.
- Simplified navigation and onboarding for a faster, more focused experience.
- Improved stability, performance, and overall polish.

## Immediate Follow-Up

- Wait for Google Play review outcome
- If approved, confirm production rollout completion in Play Console
- Smoke test installed Android app after approval
- Update screenshots/store creatives later if needed to better match the MVP refocus
