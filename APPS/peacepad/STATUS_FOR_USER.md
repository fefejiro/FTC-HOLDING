# PeacePad Release Status

## Current State

- Web production is live at `https://peacepad.ca`
- API production is live at `https://api.peacepad.ca`
- Production ownership verification passed on March 30, 2026
- Google Play production release `40 (1.0.8)` was the last uploaded bundle before the guest-first rollout

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
- Android version prepared for next release:
  - `versionCode 41`
  - `versionName 1.0.9`
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

## Hotfix — 2026-05-08: Guest auth 500 on Railway

Symptom: Web and Android shell showed "Failed to authenticate guest" toast on first open. `POST /api/guest/start` returned HTTP 500 with body `{"message":"Failed to authenticate guest"}`.

Root cause: Supabase Postgres pooled connections defaulted to `search_path = "$user", public, extensions`. All PeacePad tables live in the `peacepad` schema (`peacepad.users`, `peacepad.guest_sessions`, etc.), so unqualified Drizzle queries failed with `relation "users" does not exist` / `relation "guest_sessions" does not exist`.

Fix: `APPS/peacepad/server/db.ts` — added `pool.on('connect')` hook that runs `SET search_path TO peacepad, public, extensions` on every new pooled connection. Commit `2fc8f2d4` on `main`. Railway auto-deployed `@ftc/peacepad` service in `lively-simplicity` project.

Verification (2026-05-08, live):
- `GET /health` → 200
- `POST /api/guest/start` → 200 (returns guestId, guestSessionId, expiresAt)
- `GET /api/auth/user` (with guest cookie) → 200 (guest user resolved, isGuest:true)
- `GET /api/messages` → 200 (3 demo messages seeded)
- `GET /api/notes` → 200 `[]`
- `GET /api/tasks` → 200 `[]`
- `GET /api/partnerships` → 200 (demo co-parent created)

User confirmation: Web works after refresh. Android Play Store build (1.0.9 / 41) starts working after force-stop + relaunch (stale cookie clears on next request because the server now creates a new guest session when restore fails).

No client/AAB rebuild required — pure server-side fix.
