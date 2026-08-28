# Android audio gate evidence

Date: 2026-08-27  
Native source reviewed: `2156908936e57476f8f7675bfbb82e5e16e474b8`  
Native worktree: `D:\PeacePadRelease\worktrees\peacepad-2.0.1-main-integration`  
Installed package: `ca.peacepad.family`  

## Device and binary

- Device: Google Pixel 7, Android 17 / API 37.
- ADB transport used: USB serial `2B260DLH2000C8` (a second Wi-Fi entry was
  ignored so the evidence is tied to one physical transport).
- Installed binary: PeacePad `2.0.1`, Android version code `48`.
- The installed binary was already on the phone; it is not a build of source
  `2156908936e`. No store artifact was uploaded or replaced during this gate.
- `RECORD_AUDIO` was initially denied. It was granted with `adb pm grant` for
  this device-only permission check. `POST_NOTIFICATIONS` remains denied.

## Checks performed

1. `npm run verify:audio-config` passed: microphone-only native audio
   configuration is valid.
2. Focused audio tests passed: 5 suites / 19 tests.
3. The installed package was launched after clearing Logcat. Home and More
   screens rendered, including the `PeacePad conch logo` accessibility label.
4. The Family connection screen rendered with `Invite someone`, `Enter a
   code`, and `Not connected` state. It explicitly explains that messages and
   calls become available after the other parent accepts an invitation.
5. After the microphone grant, Logcat showed WebRTC native initialization,
   48 kHz audio, hardware echo cancellation/noise suppression, and audio
   record/track module construction. No `FATAL EXCEPTION`, app-specific
   React error, or WebRTC/audio error was found.

Captured artifacts:

- `D:\PeacePadRelease\evidence\android-audio-gate-2026-08-27\screen-launch.png`
- `D:\PeacePadRelease\evidence\android-audio-gate-2026-08-27\screen-more.png`
- `D:\PeacePadRelease\evidence\android-audio-gate-2026-08-27\screen-family-connection.png`
- `D:\PeacePadRelease\evidence\android-audio-gate-2026-08-27\screen-family-after-mic-grant.png`
- `D:\PeacePadRelease\evidence\android-audio-gate-2026-08-27\ui-launch.xml`
- `D:\PeacePadRelease\evidence\android-audio-gate-2026-08-27\ui-more.xml`
- `D:\PeacePadRelease\evidence\android-audio-gate-2026-08-27\ui-family-connection.xml`
- `D:\PeacePadRelease\evidence\android-audio-gate-2026-08-27\logcat-family-after-mic.txt`

## Gate result

**Pass:** native audio configuration, WebRTC module loading, permission
state transition, app launch, and fail-closed connection gating.

**Not proven:** audible two-party media, authenticated signaling delivery,
TURN relay, reconnect, background/locked-screen audio, notification delivery,
or teardown after a real call. The call surface is unavailable by design while
the account is `Not connected`; testing it would require two authorized
accounts and a second physical participant. No production account, invitation,
message, or other user data was created or mutated during this check.

The installed code 48 must not be described as evidence for the newer parity
source until a new artifact is built and installed. The next qualifying audio
gate is a signed/internal build from the approved source with two existing
authorized test accounts, followed by a real Pixel-to-iPhone call and a
separate TURN/background/termination check.
