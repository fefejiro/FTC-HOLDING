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

## Notification and phone-audio policy audit — 2026-08-28

The same Pixel was queried over the USB transport immediately before the
notification policy fix:

- `zen_mode=0` (Do Not Disturb off).
- Ring and notification volume were both `5` on the device's scale.
- Android reported `POST_NOTIFICATIONS: granted=false` for
  `ca.peacepad.family` and package notification importance `NONE`.
- The app's `peacepad-calls` channel was not observable because notification
  permission had not been granted and the app had not completed registration.

The source handler previously returned `shouldPlaySound: false`. That value
overrides Android channel sound while the app is in the foreground, so it
could suppress an incoming-call sound even with normal phone settings. The
handler now returns `shouldPlaySound: true`; Android channel settings, the
ringer/notification volume, Silent mode, and Do Not Disturb remain authoritative
and can still suppress sound. The Android channel remains MAX importance with
default sound, private lock-screen visibility, and a short vibration pattern.

The notification regression suite now passes 10/10 tests, including the
foreground presentation policy and channel sound/vibration assertions. This is
source/test evidence only; code 48 on the phone predates this fix. No updated
store artifact was built or uploaded in this audit.

**Notification gate remains open:** grant notifications on the qualifying
binary, enable the channel, deliver a real authenticated incoming-call push,
and repeat in Normal, Silent, Do Not Disturb, background, and locked-screen
states. The Native V2 repository currently contains device registration and
revocation contracts but no production push-dispatch worker, so a delivered
incoming-call notification cannot yet be claimed from this checkout.

## Second-participant compatibility

The legacy Capacitor/web client is not a valid second endpoint for a Native V2
audio proof. Legacy calls use `/api/calls` and the legacy WebSocket signaling
path; Native V2 uses `/api/v2/calls` and authenticated Supabase Realtime
signaling. Their call records, authorization checks, and media handshakes are
not interoperable. A Pixel plus the legacy iPhone/web client can be used for a
separate legacy regression check, but it cannot prove a Native V2 call.

The qualifying two-party gate is therefore the same Native V2 production
binary on the Pixel and iPhone/TestFlight, with two existing authorized
accounts in one family/conversation. It must be run only after production
push dispatch and TURN credentials are configured. No production fixture or
dummy account should be created to make this test pass.

The native checkout also has no notification-response listener or cold-start
response handoff into `AudioCallScreen`. Until that route is implemented and
covered, a received notification can be displayed by the operating system but
cannot be claimed to open the in-app incoming-call experience.
