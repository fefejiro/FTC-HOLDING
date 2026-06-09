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
- Production provider config is present, but final handover still requires authenticated parent/tutor/student evidence.

How it works:
1. Student or tutor opens `/lesson/[sessionId]`.
2. `LessonRoom` calls `POST /api/daily/room` with the booking ID.
3. The handler validates auth and booking access.
4. Daily API creates or retrieves the room and generates a meeting token.
5. Daily iframe is embedded in the lesson page.

Testing:
- E2E tests: `npm run test:e2e`
- Local video tests: `npm run test:local-video`
- Production smoke: `ANION_BASE_URL=https://anion.unalabs.cloud npm run verify:prod`
- Final production call proof: `npm run phase1:evidence` with confirmed role accounts.

## 2. Background Customization

### Current Status: Not Implemented

What is missing:
- No background selection UI in profile, lesson setup, or video room.
- No background storage in the database.
- No background configuration passed to the Daily API.
- No context-specific backgrounds for Math, Science, English, Art, Music, or similar subjects.

Possible implementation paths:
- Profile-level preference: users pick a default background once.
- Lesson-level preference: tutor selects a background for each booking or subject.
- Real-time switcher: participant changes background during the lesson.

Recommendation:
Start with lesson-level background selection after Phase 1 production evidence passes. It best matches tutoring context and avoids profile-setting complexity before handover.

## 3. Password Management

### Current Status: Not Applicable

Why passwords are not needed:
- Google OAuth is the primary authentication method.
- Secure email magic link is available as a fallback for handoff and QA accounts.
- No password fields are shown on the login page.
- No "Forgot Password" or password reset flow is needed.
- Users do not create or manage Anion passwords.

Current flow:
1. User clicks "Continue with Google" or enters email for a secure link.
2. Supabase handles OAuth or magic-link verification.
3. `/auth/callback` exchanges the auth code for a session.
4. User is redirected to the correct role dashboard.

Recommendation:
Keep Google OAuth primary plus magic-link fallback. Do not add password creation/reset unless UB explicitly requests password-based accounts.

## Summary Table

| Feature | Status | Notes |
|---------|--------|-------|
| Video Call (Daily) | Implemented; prod evidence pending | Room creation, tokens, join/leave/rejoin |
| Video Room UI | Working | Iframe embedded, error handling |
| Local Demo Video | Working | Requires `ANION_LOCAL_DEMO=1` |
| Background Customization | Not built | Requires DB schema, UI, and Daily integration |
| Profile Settings | Not built | Optional for future background preferences |
| Password Creation | Not needed | Google OAuth and magic links avoid Anion passwords |
| Password Reset | Not needed | No Anion-managed passwords |
| Google OAuth | Working | Primary auth method |
| Magic Link | Working | Secure fallback auth method |

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
