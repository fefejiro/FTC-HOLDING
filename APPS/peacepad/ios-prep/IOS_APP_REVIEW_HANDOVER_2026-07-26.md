# PeacePad iOS App Review Handover - 2026-07-26

## Outcome

PeacePad iOS version `1.0.9`, build `1`, was resubmitted to Apple on
2026-07-26 at approximately 17:55 EDT. App Store Connect showed:

```text
Submission status: Waiting for Review
Item status:       Waiting for Review
Release method:    Automatically release this version
Bundle ID:         ca.peacepad.family
```

This was a metadata and hosted-runtime recovery of the existing Capacitor
binary. No replacement binary, second App Store record, bundle-ID change, or
React Native migration was performed.

## Approval update - 2026-07-29

Apple completed review and approved PeacePad for distribution. App Store
Connect subsequently showed:

```text
Marketing version: 1.0
Approved binary: 1.0.9 (1)
App status: Ready for Distribution
Apple ID: 6793350735
Submission ID: 94d3acfa-f54d-4aad-a741-16bfeabaf6ee
Product URL: https://apps.apple.com/app/peacepad/id6793350735
```

This approval closes the Guideline 2.1 reviewer-access recovery and the later
Guideline 2.3.3 screenshot correction. It does not by itself prove that every
storefront has completed propagation or that a public-device install has
passed.

The post-approval App Store optimization package is documented in
`APP_STORE_ASO_2026-07-29.md`. The approved binary remains frozen while its
public listing is verified.

## Reason for the recovery

Apple's automated Guideline 2.1 check detected account-based functionality but
did not have a functional demo account. The recovery supplied a secret-backed,
synthetic reviewer account and clear review instructions while retaining the
guest-first path.

## Verified actions

- App Review sign-in was marked required.
- The isolated reviewer username was entered in App Store Connect.
- The reviewer password was entered only in Apple's protected password field.
- The password hash was stored only in the production deployment secret.
- The production reviewer endpoint accepted the final rotated credential.
- The returned reviewer identity matched the synthetic reviewer user.
- The successful reviewer response established two session cookies.
- App Review notes documented:
  - the existing-account path;
  - guest-first Compose;
  - explicit Terms and Privacy acknowledgement;
  - separate, default-off third-party AI consent;
  - the in-app deletion path;
  - public Privacy, Terms, and Support URLs.
- The Resolution Center reply was sent without the unverified two-user
  placeholder.
- Existing build `1.0.9 (1)` was resubmitted successfully.
- App Store Connect displayed `Waiting for Review` after resubmission.

## Production evidence

```text
Reviewer API: https://api.peacepad.ca/api/auth/reviewer-session
Reviewer deployment ID: be3c7b6c-cc1b-4fb8-bd72-93e1390085e3
Reviewer deployment result: SUCCESS
Reviewer login result: SUCCESS
Reviewer email identity: MATCH
Reviewer synthetic user ID: MATCH
Session cookies returned: 2
```

The raw reviewer password is intentionally absent from this repository,
handover, shell history, screenshots, and logs.

## Source and commit record

The recovery source was developed on `release/peacepad-ios-1.0` and merged
through:

```text
PR #152  Harden PeacePad iOS review recovery flow
PR #153  Correct final PeacePad privacy claims
PR #154  Align PeacePad production consent smoke
```

The corresponding feature commits are:

```text
5f3bb51d  feat(peacepad): harden iOS review recovery flow
269add93  fix(peacepad): remove unsupported privacy claims
827f9273  test(peacepad): verify consented guest deletion smoke
```

The release branch was fast-forwarded to the merged `origin/main` state before
this handover was written.

## Post-handover verification

Run from `APPS/peacepad` after updating this handover:

```text
npm run check: PASS
npm run guard:openai-secrets:all: PASS
Focused iOS review/privacy test files: 6 passed
Focused iOS review/privacy tests: 46 passed
git diff --check: PASS
```

The focused suite covered the iOS recovery contract, latest privacy hardening,
reviewer authentication and reviewer-session integration, privacy release
guard, and account-deletion safety guard.

## Security cleanup

During remote entry, Safari autofill and a reflowed field briefly exposed part
of an obsolete credential. The credential was rotated before submission, the
replacement was deployed and verified, and only the replacement was saved in
App Store Connect. The obsolete credential is invalid.

Credential-bearing local screenshots were deleted and the Windows clipboard
was cleared after resubmission. Keep all future screenshots cropped or redacted
so the App Review password field is never visible.

## Current completion

| Area | Status | Completion |
| --- | --- | ---: |
| Privacy and review hardening source | MERGED | 100% |
| Production reviewer account | VERIFIED | 100% |
| App Review credentials and notes | SAVED | 100% |
| Resolution Center response | SENT | 100% |
| Existing-binary resubmission | COMPLETE | 100% |
| Apple review | APPROVED | 100% |
| Ready for Distribution | VERIFIED | 100% |
| Public App Store propagation | VERIFICATION PENDING | External |
| Version 1.0 promotional text | READY TO APPLY | 90% |
| Version 1.0.1 ASO package | STAGED | 80% |

## Known limits

- This handover does not claim a current two-account paired-call test.
- No real family, court, or evidence document was used.
- App Privacy answers were not re-edited during the Guideline 2.1 resubmission.
- A new Xcode privacy report was not required to resubmit the existing binary.
- The separate React Native lab remains isolated at
  `ca.peacepad.nextnative.lab` and was untouched.

## Next owner actions

1. Confirm the public product URL is downloadable from a signed-out iPhone in
   an enabled storefront.
2. Do not upload a replacement build, revoke signing credentials, or change the
   bundle ID during the launch acceptance window.
3. Record the complete live metadata baseline before changing App Store text or
   assets.
4. Apply only the approved promotional-text change to version 1.0. Stage the
   name, subtitle, keywords, description, and screenshot package for version
   1.0.1.
5. Perform a short production acceptance pass and record:
   listing URL, version/build, install result, first launch, reviewer/ordinary
   account access, guest Compose, privacy links, deletion entry point, and any
   crash or review feedback.
6. Never paste the reviewer password into chat, tickets, analytics, screenshots,
   or source control.

## Stop conditions

Stop before:

- replacing build `1.0.9 (1)` without an Apple or native-runtime requirement;
- creating a second App Store record;
- changing `ca.peacepad.family`;
- adding real court or family documents;
- merging the React Native lab into the submitted application;
- claiming public availability before a storefront and public-device check
  confirms it.
