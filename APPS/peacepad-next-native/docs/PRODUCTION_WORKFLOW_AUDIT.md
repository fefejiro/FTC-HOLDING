# PeacePad V2 production workflow audit

Snapshot: 2026-08-22  
Scope: customer workflow, mobile release configuration, store identity, and
handover readiness. This audit is a release-control document; it does not by
itself prove App Store or Google Play publication.

## Immediate finding fixed

The Expo configuration had no top-level `icon` field. App Store Connect was
therefore showing the blank default artwork even though the in-app auth screen
already used the existing PeacePad conch mark. The release config now points to
`assets/icon.png`, a 1024x1024 opaque PNG generated from the maintained source
asset `src/foundation/peacepad-conch.png`. This preserves the existing brand
mark for both iOS and Android instead of introducing a second logo.

Required follow-up: rebuild the exact iOS and Android candidates after this
change. Store metadata may continue showing the old blank artwork until the
new binary is processed; an upload alone is not public-availability proof.

## End-to-end customer workflow matrix

| Journey | Source status | Release evidence still required |
| --- | --- | --- |
| First launch, three-slide intro, Skip/Next/Get started | Implemented in `PublicOnboardingAuth` | Real iPhone and Android visual/accessibility pass |
| Returning user and session restoration | Implemented in session provider | Two-device sign-out/restart/restore proof |
| Email create, verification, sign-in, reset | Implemented | Production-shaped mail delivery and recovery proof |
| Sign in with Apple | Implemented for iOS | Real-device success, cancellation, revoked credential, relink |
| Google sign-in | Not implemented in the current native auth surface | Web/iOS/Android OAuth clients, Supabase callback, ID-token exchange, duplicate-account/linking matrix |
| Family create/join/invitation | Implemented and covered by automated contracts | Real two-parent production canary and invitation UX pass |
| Messaging, Message Check, offline retry | Implemented in the current coordination surface | Real-device offline/reconnect and notification proof |
| Shared Calendar | Implemented in the current coordination surface | Time-zone, recurrence, reminder, and two-device proof |
| Case Binder and attachment metadata | Metadata workflow implemented; real file transport remains gated | Private storage upload/download, checksum reconciliation, export |
| Sign out, account deletion, local cleanup | UI/API paths and automated deletion tests exist | Provider/Auth deletion receipt, session/device-token cleanup, retention disclosure |
| Foreground 1:1 audio lifecycle/signaling | Server and orchestration contracts exist | TURN/provider configuration, audible media on two physical phones, interruption/background/reconnect |
| Video calling | Not a launch feature | Separate release gate after audio stability |
| Conch facilitator | Not enabled | Separate consent, cost-cap, privacy, and real-device release gate |
| EN/FR/ES and accessibility | Broad automated/localized foundation exists | Professional linguistic review, VoiceOver/TalkBack, Switch Control, max text, reduced motion |

## Freeze-and-release procedure

1. Freeze the candidate commit, runtime variables, store metadata, and icon
   assets. No feature edits during the audit.
2. Run the matrix above on one physical iPhone and one physical Android
   device, using fictional accounts and a production-shaped Canada backend.
3. Record each result as PASS, FAIL, or NOT RUN with build number, artifact
   hash, device/OS, timestamp, and evidence path.
4. Fix only release-blocking failures in one bounded batch, then rerun the
   complete matrix from a new candidate commit.
5. Submit that frozen candidate to TestFlight/Internal Testing, then App Store
   review/Play closed testing. Do not call an upload a public release.
6. After approval, use phased rollout and retain the V1 rollback rail until
   the agreed stability window is complete.

## Current release boundary

The current V2 worktree contains a staging-safe and production-guarded Expo
application. Automated/hosted evidence is valuable but does not replace real
device media, provider backup/recovery, migration rehearsal, OAuth setup, or
store availability evidence. Video and Conch remain explicitly out of the
first public core release so they cannot silently expand the release surface.

