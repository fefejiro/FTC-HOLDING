# App Store Metadata for PeacePad

## Current submission status

Verified in App Store Connect on 2026-07-26:

```text
Version/build: 1.0.9 (1)
Submission: Waiting for Review
Release: Automatically release this version
```

The isolated synthetic reviewer credentials and testing notes were saved, the
Guideline 2.1 response was sent, and the existing binary was resubmitted. See
`IOS_APP_REVIEW_HANDOVER_2026-07-26.md` for the evidence and next-owner actions.
Never add the raw reviewer password to this file.

## App Name (30 character limit)
```
PeacePad Co-Parenting
```

## Subtitle (30 character limit)
```
Calmer co-parenting tools
```

## Keywords (100 character limit, comma separated)
```
co-parenting,coparent,custody,divorce,separated,family,calendar,expenses,communication,shared
```

## Description (4000 character limit)

PeacePad is a co-parenting app that helps separated and divorced parents communicate clearly and reduce conflict, so you can focus on what matters most: your kids.

Whether you are navigating a fresh separation or managing a long-term co-parenting relationship, PeacePad gives you tools to keep conversations calm, organized, and focused on your children.

COMMUNICATE WITH CLARITY
- Message suggestions help you reword difficult messages before you send them
- Tone analysis catches emotional language and suggests calmer alternatives
- Prep Chat lets you practice conversations before talking to your co-parent

STAY ORGANIZED TOGETHER
- Shared custody calendar with conflict detection so you can see when schedules overlap
- Expense tracking with receipt uploads so shared costs are easier to discuss
- Shared to-do lists and child update notes keep both parents on the same page

STRUCTURED CONVERSATIONS
- Conch Mode provides turn-based conversations where both parents get heard without interruption
- Real-time messaging with read receipts and delivery status
- Voice messages when typing is not convenient

FIND SUPPORT WHEN YOU NEED IT
- Locate nearby family support services and domestic violence resources
- Access crisis hotlines and safety planning tools
- Safety planning support for sensitive situations

BUILT FOR REAL LIFE
- Works on phone, tablet, and computer
- Guest mode lets you try calm message help before creating an account
- Designed for practical co-parenting tasks, not drama

PeacePad was built by a co-parent, for co-parents. Every feature exists to make your life a little easier and your communication a little clearer.

Download PeacePad today and start co-parenting with clarity.

## Promotional Text (170 character limit, can be updated without new build)
```
Co-parenting tools for calmer messages, shared schedules, expenses, and practical next steps.
```

## Privacy Policy URL
```
https://peacepad.ca/privacy
```

## Support URL
```
https://peacepad.ca/help
```

## Marketing URL
```
https://peacepad.ca
```

## Category
```
Primary: Lifestyle
Secondary: Productivity
```

## Age Rating
```
Complete in App Store Connect based on the live feature questionnaire. Do not assume final rating until the Apple questionnaire is answered.
```

## Copyright
```
2026 PeacePad
```

## Contact Email
```
peacepad@peacepad.ca
```

## App Review Information

These values are operational instructions for App Store Connect. Never place the
review password, its hash, or any deployment secret in this repository.

### Sign-in required

Select **Sign-in required** for App Review.

### Reviewer credentials

Enter the isolated synthetic reviewer credentials directly in App Store Connect:

```text
Username: <APPLE_REVIEWER_EMAIL_FROM_DEPLOYMENT_SECRET>
Password: <APPLE_REVIEWER_PASSWORD_ENTERED_ONLY_IN_APP_STORE_CONNECT>
```

The reviewer account must be verified before submission as:

- synthetic and free of real family or court information;
- non-admin;
- subject to the same permissions and deletion controls as an ordinary account;
- unable to write to any non-synthetic account or partnership;
- rate-limited at the reviewer-session endpoint.

### Reviewer testing path

```text
1. Launch PeacePad.
2. On the welcome screen, tap "Existing account".
3. Enter the username and password supplied in App Review Information.
4. Tap "Sign in".
5. Use Settings to inspect account privacy controls, export, and
   Settings -> Privacy, data, and help -> Delete my account.
```

Guest-first testing remains available:

```text
1. Launch PeacePad.
2. Tap "Try PeacePad".
3. Explicitly accept the Terms and acknowledge the Privacy Policy.
4. Leave optional AI processing off to verify the rule-based message preview.
5. Open Compose and test a synthetic message.
```

Opening or dismissing the welcome screen does not create a guest session and
does not grant Terms, privacy, or AI consent. Optional third-party AI processing
is separate, is off by default, and is enforced by the server.

The public interface does not offer Google, Supabase, or another social sign-in
option in this review-recovery release. "Existing account" opens only the
isolated PeacePad account-access form. Legacy compatibility routes are not part
of the advertised reviewer path.

### Suggested App Review notes

```text
PeacePad is a co-parenting communication and organization tool. It does not
provide legal advice or determine legal outcomes.

The supplied reviewer account is an isolated, non-admin account containing
synthetic data only. To sign in, launch the app, tap "Existing account", and
enter the credentials supplied above.

Guest-first use is also available. Tap "Try PeacePad", explicitly accept the
Terms and acknowledge the Privacy Policy, then open Compose. Rule-based message
preview works without optional third-party AI processing. AI processing is a
separate, default-off choice.

No Google, Supabase, or other social sign-in option is offered in this release.
The "Existing account" button opens the isolated PeacePad account-access form.

Features that involve a co-parent, including live paired messaging or calls,
require two participating accounts. Do not treat those flows as verified for
review unless the exact two-account synthetic setup has been tested and
described here.

Account deletion is initiated inside the app at:
Settings -> Privacy, data, and help -> Delete my account.
The user must enter the displayed confirmation before permanent deletion.

Privacy: https://peacepad.ca/privacy
Terms: https://peacepad.ca/terms
Support: https://peacepad.ca/support
```

See `APP_REVIEW_RESPONSE_2_1.md` for the rejection reply and
`APP_PRIVACY_DECLARATION_WORKSHEET.md` for the App Privacy answers.
