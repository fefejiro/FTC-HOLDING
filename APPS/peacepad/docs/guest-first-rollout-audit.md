# Guest-First Rollout Audit

Updated: 2026-04-14

## Goal

Make PeacePad usable on first run without login, keep guest usage idempotent, and preserve account auth as an optional upgrade path for persistence and sync.

## Guest-First Flow Status

- First meaningful route is now `Prep Chat`, not the email auth step.
- Guest bootstrap is centralized in `client/src/lib/guestSession.ts`.
- Guest session creation/restoration is idempotent:
  - reuses `peacepad_session_id`
  - reuses the existing `/api/auth/guest` contract
  - refreshes `/api/auth/user`, `/api/auth/guest-session-info`, and `/api/session`
- `Prep Chat` now self-boots a guest session on first load if auth has settled and no user exists.
- Auth is now deferred to later upgrade moments instead of blocking first use.

## Route Protection Classification

### Guest-Friendly Core Value Routes

These are appropriate for first-run guest access because they deliver immediate product value without requiring cross-device persistence:

- `POST /api/auth/guest`
- `GET /api/auth/user`
- `GET /api/auth/guest-session-info`
- `GET /api/session`
- `GET /api/usage/status`
- `POST /api/messages/preview`
- `POST /api/prep-chat/sessions`
- `GET /api/prep-chat/sessions`
- `GET /api/prep-chat/sessions/:id`
- `PUT /api/prep-chat/sessions/:id`
- `POST /api/prep-chat/sessions/:id/messages`
- `POST /api/prep-chat/sessions/:id/draft`
- `POST /api/prep-chat/analyze-draft`

### Guest Routes With Trial / Usage Enforcement

The backend already applies `trialEnforcer` to `/api/*` write methods. That means guest users can use approved write routes until the guest trial expires, while auth, guest creation, upgrade, and logout remain exempt from the limiter.

Routes in this bucket include the guest-capable core flows above plus any other write routes still using `isAuthenticatedEither`.

Important current behavior:

- `trialEnforcer` only applies to write methods.
- `isAuthenticatedEither` accepts either a full account session or a valid guest session.
- This is what makes guest-first possible without stripping auth from the whole backend.

### Authenticated-Only Routes

Currently enforced server-side:

- `GET /api/user/export`

Currently gated in the product flow and should remain account-linked:

- saved history and cross-device continuity surfaces
- account/profile management beyond lightweight guest profile setup
- premium/account-linked features

Follow-up hardening candidates after guest-first rollout is stable:

- account export / deletion review
- push registration endpoints
- long-lived summaries, agent memory, and other persistence-heavy endpoints
- any history view that is meant to survive guest expiry or span devices

## UI Gating Notes

- Settings now shows a sign-in gate for guest users instead of exposing full account management as if the user already has a durable account.
- The guest upgrade CTA now routes into the explicit onboarding auth step instead of silently falling back to the legacy login helper.
- The upgrade path from guest to authenticated still uses the existing guest-upgrade intent flow.
- Onboarding still contains the email sign-in step, but it is no longer the default first-run path.

## Supabase Auth Audit Findings

### Production Behavior Observed

- First-time visitors on `https://peacepad.ca` still reach onboarding on the current production deployment.
- The onboarding auth step sends a Supabase OTP magic-link request.
- Production request observed:
  - `POST https://cmxahlxcqxphszmfywzn.supabase.co/auth/v1/otp?redirect_to=https%3A%2F%2Fpeacepad.ca%2Fauth%2Fcallback`
- Production response observed:
  - HTTP `402`

### Code Paths Involved

- `client/src/lib/supabaseAuth.ts`
- `client/src/pages/auth-callback.tsx`
- `server/replitAuth.ts`
- `server/config.ts`
- `.env.example`

### Findings

- The auth UI was previously collapsing several Supabase failures into generic messages.
- The client still contains legacy assumptions from the earlier auth stack:
  - server fallback login endpoints still exist
  - legacy Replit OIDC config remains in the codebase and examples
- The production OTP call is targeting `https://peacepad.ca/auth/callback` as the redirect URL.
- Based on the live `402`, the failure is not just a frontend redirect bug; the Supabase auth initiation itself is being rejected.

### Auth UX Improvements Applied

- Magic-link failures now surface clearer, actionable messages in onboarding.
- Auth callback failures now show the actual failure class and explicitly offer a guest-mode fallback.
- The callback screen now routes the user back into the usable product instead of leaving them at a dead-end.

### Remaining Auth Repair Checklist

- Verify Supabase project `Site URL`
- Verify allowed redirect URLs include:
  - `https://peacepad.ca/auth/callback`
  - `https://peacepad.ca/auth/mobile-callback`
- Verify the active frontend `VITE_SUPABASE_URL`
- Verify the active anon key matches the intended project
- Verify email auth / OTP provider settings are enabled as expected
- Verify there are no stale environment values inherited from Replit-era auth assumptions
- Inspect the server-side `/api/auth/supabase/exchange` path against the active Supabase project

## Capacitor / Android Status

### Already Present

- Capacitor is already installed.
- Android platform is already checked in under `android/`.
- Current Capacitor config:
  - app id: `ca.peacepad.family`
  - web dir: `dist/public`
  - production server URL: `https://peacepad.ca`
- Allowed navigation already includes:
  - `https://peacepad.ca`
  - `https://www.peacepad.ca`
  - `https://api.peacepad.ca`

### Versioning Touchpoints

- `package.json`: `1.0.8`
- `android/app/build.gradle`: `versionCode 40`, `versionName "1.0.8"`
- Existing release note in repo indicates Google Play production release `40 (1.0.8)`

### What Still Needs Verification

- fresh `build:frontend`
- `npx cap sync android`
- Android emulator or device launch smoke test
- confirmation that guest-first flow works inside the WebView
- confirmation that production API/session handling behaves correctly on Android

## Known Validation Constraint

Local Playwright guest-first smoke could not fully run against the local app because the current local database host in the local environment was not reachable from this machine, so the dev server never became healthy enough for a full browser pass.

## Recommended Next Steps

1. Deploy the guest-first web changes.
2. Re-run the Playwright guest-first smoke suite against a healthy environment.
3. Verify Supabase dashboard config for redirect URLs and OTP/email auth.
4. Run `npx cap sync android` after the next web build.
5. Open the Android project in Android Studio and perform one emulator/device smoke pass focused on guest-first Prep Chat.
6. If a new Play Store build is required, increment `versionCode` and `versionName` before generating the next signed AAB.
