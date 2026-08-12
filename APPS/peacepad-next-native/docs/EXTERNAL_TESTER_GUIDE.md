# PeacePad Native V2 external tester guide

## Current release boundary

This guide is ready for the first external TestFlight cohort. It is **not** an
invitation to use the current Native V2 staging build for real family, child,
health, court, financial, or safety information.

The current `testflight-internal` profile targets the existing Apple bundle
`ca.peacepad.family`, but intentionally uses the fictional staging runtime and
keeps production writes disabled. It is not an App Store production release.
The release lead must mark a specific build as available before sharing it with
testers.

## Who should test

- Two adult testers who can coordinate a dedicated test family.
- Testers using current iPhones or iPads and the TestFlight app.
- Testers willing to report a reproducible issue with no private content.

Use only dedicated test accounts and clearly fake, non-sensitive content. Do
not reuse production passwords. Do not add children, addresses, case details,
medical information, payment data, legal documents, or photos.

## Install and first launch

1. Open the TestFlight invitation supplied by the release lead and install
   **PeacePad 2.0.0 (build 2)**.
2. Open it once on Wi-Fi, then again using cellular data.
3. Confirm the app opens without a crash, clipped controls, or hidden consent
   actions.
4. Select the shown staging/test region only when the release lead says the
   build is a test build. Confirm the visible label matches the invitation.
5. Sign in only with the dedicated tester account.

Pass: the app opens, controls remain reachable at the device's enlarged text
setting, and the selected test region is visibly correct.

## Two-person coordination test

Perform the following with both testers in the same dedicated test family.

1. **Family invitation** — Tester A creates an invitation; Tester B reviews,
   explicitly accepts, and reaches the shared family. Confirm no acceptance
   occurs merely by opening a link or code.
2. **Messaging** — Send a harmless message from A to B. Confirm B receives it,
   can view it, and that a deliberate correction is displayed as a correction.
3. **Message Check** — Turn Message Check on for one conversation, verify the
   preview is clearly optional, then turn it off and confirm original wording
   is retained.
4. **Calendar** — Create one clearly fake shared event, confirm it is visible
   to the other tester, edit it, and delete it. Confirm private events remain
   private.
5. **Records** — Create a test Case Binder and a minimal metadata-only entry.
   Do not try to upload a file: file transport and evidence export are not
   release-ready features.
6. **Offline recovery** — With a harmless unsent draft, temporarily disable
   network access, verify the app clearly indicates the state, restore access,
   and confirm the tester can decide whether to retry or remove the draft.
7. **Account deletion** — Only at the end, use a dedicated disposable account
   to verify confirmation, sign-out, and loss of its local authorization. Do
   not use a real account for this test.

## Do not test as release-ready

- Audio/video calls: lifecycle and orchestration exist, but TURN capacity and
  audible device media are not production-verified.
- Attachments, evidence files, exports, notifications, professional portal,
  or expense/reimbursement handling.
- Background calling, CallKit, interruption recovery, or legal-record use.
- Existing live-account migration. Existing React Web/Capacitor PeacePad
  remains the rollback product until a separately verified migration exists.

## Accessibility check

On at least one current iPhone, repeat first launch and messaging with larger
text enabled. Report anything clipped, unlabeled, unreachable, or impossible
to dismiss. VoiceOver, Switch Control, Reduce Motion, and professional
English/French/Spanish review remain formal release gates, not optional
tester extras.

## What to report

Send the release lead:

- Build number, iPhone/iPad model, iOS version, selected test region, and
  approximate local time.
- Short reproduction steps and expected versus actual behavior.
- A screenshot only after removing emails, invitation codes, names, messages,
  and other private content.
- Whether the issue blocks sign-in, coordination, deletion, or access to an
  existing test family.

Never send a password, one-time code, access token, service-role key, or
unredacted family content.

## Release-lead exit criteria

The release lead may advance an identified build only when there is exact
evidence for: Apple-signed TestFlight installation, at least two real-device
test accounts, security/privacy/accessibility/localization review, migration
and rollback rehearsal, a seven-day release-candidate soak, and required
product, Privacy, Security, QA, and Release sign-offs. Apple App Review
approval and a verified public App Store release are separate final steps.
