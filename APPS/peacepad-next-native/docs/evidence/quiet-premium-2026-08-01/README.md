# Quiet-Premium Simulator Evidence

Captured on 2026-08-01 from an iPhone 17 simulator running iOS 26.5.

- Source commit: `02d19cf50b04d94dba398642067bb8b1323cb612`
- Bundle identifier: `ca.peacepad.nextnative.lab`
- Production API writes: disabled
- Test content: fictional and session-only
- Live Capacitor app and App Store record: untouched

## Screenshots

1. `01-home.png` - task-based Home with honest empty-state actions
2. `02-invitation-preview.png` - identity, family, role, and access preview
3. `03-invitation-accepted.png` - explicit acceptance result
4. `04-calendar-month.png` - Month selection
5. `05-calendar-week.png` - Week selection
6. `06-calendar-day.png` - Day selection
7. `07-message-check-opt-in.png` - per-conversation Message Check enabled
8. `08-suggestion-review.png` - original draft and rule-based suggestion review
9. `09-explicit-send.png` - explicitly selected suggestion sent

## Honest limitation

Calendar layer sharing is automated-verified but not Simulator verified in this
pass. The control was visible; remote pointer input did not activate it after
the permitted retry. No screenshot is claimed for that interaction.

Expo's automatic `--ios` launcher also encountered a Mac host AppleScript
activation error. Metro was started independently on localhost and the current
project URL was opened with `simctl`; the app then rendered and operated
normally. This is a host-launch issue, not an observed application runtime
failure.
