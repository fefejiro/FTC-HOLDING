# Anion Feature Status Report - June 9, 2026

## 1. Video Call / Daily Integration

### Current Status: Implemented; Production Role Evidence Pending

What is implemented:
- Daily.co video rooms are integrated.
- Join, leave, and rejoin behavior is implemented and locally tested.
- Room token generation includes auth and booking-access checks.
- Tutor is marked as room owner (`is_owner: true`).
- Student/tutor role-based call access is implemented.
- Parent call denial is the current product rule.
- Sessions expire after 3 hours.
- Cloud recording capability is configured.
- Local demo mode works for QA (`ANION_LOCAL_DEMO=1`).
- The lesson room uses Anion's first-party Daily call-object UI instead of the hosted Daily prebuilt iframe, so it does not depend on `https://c.daily.co` call UI assets.
- Production provider config is present, but final handover still requires authenticated parent/tutor/student evidence.

How it works:
1. Student or tutor opens `/lesson/[sessionId]`.
2. `LessonRoom` calls `POST /api/daily/room` with the booking ID.
3. The handler validates auth and booking access.
4. Daily API creates or retrieves the room and generates a meeting token.
5. `daily-js` joins through a custom Anion call UI and renders participant media tracks in the lesson page.

Testing:
- E2E tests: `npm run test:e2e`
- Local video tests: `npm run test:local-video`
- Production smoke: `ANION_BASE_URL=https://anion.unalabs.cloud npm run verify:prod`
- Final production call proof: `npm run phase1:evidence` with confirmed role accounts.

## 2. Background Customization

### Current Status: Implemented for in-call blur; production role evidence pending

What is implemented:
- The lesson room exposes in-call background controls: Off, Soft blur, and Strong blur.
- Production Daily calls apply the selected effect through `daily-js` `updateInputSettings()`.
- Local demo video exposes the same control surface for QA and E2E coverage.

What is still missing:
- No profile-level saved background preference.
- No lesson setup background preset.
- No context-specific backgrounds for Math, Science, English, Art, Music, or similar subjects.

Possible implementation paths:
- Profile-level preference: users pick a default background once.
- Lesson-level preference: tutor selects a background for each booking or subject.
- Real-time switcher: participant changes background during the lesson. Initial blur controls are now implemented.

Recommendation:
Keep the in-call blur switcher for handoff, then add lesson-level background selection after Phase 1 production evidence passes. It best matches tutoring context and avoids profile-setting complexity before handover.

## 3. Password Management

### Current Status: Not Applicable

Why passwords are not needed:
- Google OAuth is the primary authentication method.
- No password fields are shown on the login page.
- No "Forgot Password" or password reset flow is needed.
- Users do not create or manage Anion passwords.
- Service-generated links are used only by internal evidence scripts when a service-role key is supplied.

Current flow:
1. User clicks "Continue with Google".
2. Supabase handles OAuth verification.
3. `/auth/callback` exchanges the auth code for a session.
4. User is redirected to the correct role dashboard.

Recommendation:
Keep the user-facing login Google-only. Do not add password creation/reset unless UB explicitly requests password-based accounts.

## Summary Table

| Feature | Status | Notes |
|---------|--------|-------|
| Video Call (Daily) | Implemented; prod evidence pending | Room creation, tokens, join/leave/rejoin |
| Video Room UI | Working | First-party Daily call UI, media tracks, error handling |
| Local Demo Video | Working | Requires `ANION_LOCAL_DEMO=1` |
| Background Customization | In-call blur built | Saved presets still require DB schema and UI |
| Profile Settings | Not built | Optional for future background preferences |
| Password Creation | Not needed | Google OAuth avoids Anion passwords |
| Password Reset | Not needed | No Anion-managed passwords |
| Google OAuth | Working | Primary auth method |
| Magic Link | Internal evidence only | Not exposed on public login |

## Test Commands

```bash
npm run check
npm test
npm run test:e2e
npm run test:local-video
npm run build:worker
ANION_BASE_URL=https://anion.unalabs.cloud npm run prod:doctor
ANION_BASE_URL=https://anion.unalabs.cloud npm run verify:prod
```
