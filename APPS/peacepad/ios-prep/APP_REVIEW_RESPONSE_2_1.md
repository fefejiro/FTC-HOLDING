# PeacePad App Review Response - Guideline 2.1

Use this response only after the production deployment, reviewer login, account
deletion, and public URLs have all been verified. Replace angle-bracketed
placeholders in App Store Connect. Never commit reviewer credentials.

## Proposed Resolution Center Reply

```text
Hello App Review,

Thank you for identifying the reviewer-access issue. We corrected the
server-side account access and review information for PeacePad.

A functional isolated reviewer account is now available. It is a non-admin
account containing synthetic data only and has the same privacy, export, and
deletion controls as an ordinary PeacePad account.

Testing path:
1. Launch PeacePad.
2. Tap "Existing account" on the first screen.
3. Enter the username and password supplied in the App Review Information
   section.
4. Tap "Sign in".

Guest-first path:
1. Launch PeacePad.
2. Tap "Try PeacePad".
3. Explicitly accept the Terms and acknowledge the Privacy Policy.
4. Leave optional AI processing off if you want to test the rule-based message
   preview without third-party AI.
5. Open Compose and enter synthetic text.

Opening or dismissing the welcome screen does not create a session and does not
grant consent. Third-party AI processing is a separate, optional choice that is
off by default and enforced by the server.

No Google, Supabase, or other social sign-in option is offered in the public
interface for this release. "Existing account" opens only the isolated
PeacePad account-access form described above.

Some paired communication and calling features require two participating
accounts. The primary welcome, consent, guest Compose, reviewer account,
privacy/export settings, and deletion paths can be reviewed with the supplied
account. <IF A VERIFIED SECOND SYNTHETIC ACCOUNT IS SUPPLIED, DESCRIBE THE EXACT
TWO-USER PATH HERE. OTHERWISE REMOVE THIS PLACEHOLDER AND DO NOT CLAIM THAT LIVE
TWO-USER TESTING WAS COMPLETED.>

In-app account deletion:
Settings -> Privacy, data, and help -> Delete my account

Public information:
Privacy Policy: https://peacepad.ca/privacy
Terms: https://peacepad.ca/terms
Support: https://peacepad.ca/support

No real family or court information is present in the reviewer account.

Kind regards,
PeacePad
```

## App Review Information Fields

Enter these values directly in App Store Connect:

```text
Sign-in required: Yes
Username: <APPLE_REVIEWER_EMAIL_FROM_DEPLOYMENT_SECRET>
Password: <APPLE_REVIEWER_PASSWORD_ENTERED_ONLY_IN_APP_STORE_CONNECT>
Contact first name: <CURRENT REVIEW CONTACT FIRST NAME>
Contact last name: <CURRENT REVIEW CONTACT LAST NAME>
Contact phone: <CURRENT REACHABLE PHONE>
Contact email: <CURRENT REACHABLE EMAIL>
```

The password hash and deployment-secret values must not appear in App Review
notes, support messages, screenshots, source control, logs, or test artifacts.

## Binary Decision

### Preferred path: resubmit 1.0.9 (1)

Use the existing submitted binary when App Store Connect permits it and all
corrections are limited to:

- App Review credentials and instructions;
- App Privacy answers or other editable metadata;
- production web/API/privacy behavior loaded by the existing Capacitor shell;
- server-side reviewer access and account deletion.

Before using this path, prove that build `1.0.9 (1)` still opens
`https://peacepad.ca` and exercises the corrected production behavior.

### Replacement path: 1.0.10, build 2

Create and upload a replacement binary only when:

- App Store Connect or App Review requires a new binary;
- the existing binary does not load the corrected production behavior;
- Xcode's privacy report identifies a native SDK or manifest issue;
- a native permission, entitlement, SDK, or Capacitor shell change is required.

If a replacement binary is required:

- keep bundle ID `ca.peacepad.family`;
- set marketing version `1.0.10`;
- set build number `2`;
- generate and review Xcode's privacy report;
- add `PrivacyInfo.xcprivacy` when required by the APIs or SDKs detected;
- repeat the controlled TestFlight acceptance pass before resubmission.

Do not create another App Store record or change the production bundle ID.

## Submission Gate

Do not send the reply or resubmit until every item is checked:

- [ ] Production deployment is healthy.
- [ ] Valid reviewer credentials succeed on build `1.0.9 (1)`.
- [ ] Invalid credentials fail without revealing account existence.
- [ ] Rate limiting has been exercised.
- [ ] Reviewer account contains synthetic data only and is non-admin.
- [ ] Welcome, guest consent, and default-off AI behavior were verified.
- [ ] No Google, Supabase, OIDC, or other social sign-in entry point is visible.
- [ ] Legacy auth configuration and network behavior were checked and accurately
      reflected in the privacy disclosure.
- [ ] Account export was verified with the reviewer account.
- [ ] Permanent in-app deletion was verified with a disposable synthetic account.
- [ ] Privacy, Terms, and Support URLs return current public pages.
- [ ] App Privacy answers match the final production runtime and included SDKs.
- [ ] The exact binary decision is recorded in the release checklist.

Apple references:

- [Manage a submission with unresolved issues](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/manage-a-submission-with-unresolved-issues)
- [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [App Privacy details](https://developer.apple.com/app-store/app-privacy-details/)
