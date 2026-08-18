# UnaScout Store Submission Profile

## Identity

- Public product: `UnaScout`
- Store title: `UnaScout: AI Job Search`
- Publisher: `Una Labs`
- Internal product: `JobAgent`
- Bundle/application ID: `cloud.unalabs.jobagent`
- Apple primary category: `Productivity`
- Apple secondary category: `Business`
- Google Play category: `Productivity`
- Default language: `English (U.S.)` for the first global listing; Canadian positioning remains in the product and campaign targeting
- Copyright: `2026 Fejiro Technology Consultancy Inc.`

## Brand Asset Source

- Canonical UnaScout icon: `store/assets/brand/unascout-master-icon.png`
- Generate all iOS, Android, PWA, and store derivatives with
  `npm run store:native-assets`; do not replace an individual store asset by
  hand.
- The Apple Store icon is supplied by the signed iOS build. The generic App
  Store Connect placeholder remains until that build is uploaded and processed.

## Release Account Routing

Use the existing authenticated account/profile that owns each release surface.
This is operational routing information only: never record passwords, API keys,
recovery codes, cookies, or one-time authentication codes here.

| Surface | Account or browser profile | Purpose |
| --- | --- | --- |
| Stripe | `Fejiro.Efiuvwere@gmail.com` | Una Labs billing account and restricted worker keys |
| Railway | `mike.fejiro@gmail.com` | `una-jobagent` production project and service configuration |
| Google Play Console | Chrome profile `Peace Pad` (`peacepad@peacepad.ca`) | Existing Fejiro publisher account used for Android releases |
| App Store Connect | Fejiro Efiuvwere Apple profile | Fejiro Technology Consultancy Inc. iOS record, builds, and review |

Before any irreversible console action, confirm the visible organization and
publisher identity. Treat account switches, two-factor prompts, legal terms,
export attestations, and developer agreements as owner actions; do not bypass
or certify them on the owner's behalf.

The Android release workflow accepts a JobAgent-specific Google Play service
account when one is enrolled. Until then, it may use the existing protected
PeacePad publisher service-account secret because it is attached to the same
approved Fejiro Play publisher account. This is a publishing credential only;
UnaScout continues to use its own Android upload key and package ID.

## Audience And Positioning

UnaScout is for adult job seekers who want explainable matching, truthful resume
tailoring, interview preparation, and organized application tracking. Store copy
must not promise employment, interviews, automatic submissions, or unsupported
qualifications.

## Native Commerce Boundary

The first native release provides free features and sign-in for existing
customers. It contains no Stripe checkout, external purchase link, price,
coupon, or call to buy elsewhere. Web subscriptions are enforced by the shared
server entitlement model. Store-native billing is a later release if Apple or
Google requires it for functionality sold inside the mobile apps.

## Review Notes

- Provide a dedicated review account with non-sensitive sample data.
- The reviewer can inspect matching, career facts, resumes, approvals,
  interview preparation, activity proof, pause, export, revocation, and account
  deletion initiation.
- Gmail and job-board connectors are optional. Their absence does not prevent
  the reviewer from using the core app.
- The app never bypasses authentication or CAPTCHA challenges and never answers
  unknown legal, demographic, or qualification questions affirmatively.
- Resume and job examples shown in review and screenshots must be synthetic and
  labelled as sample data.

## Data Declarations

Confirm the live build and policies before submitting the forms:

- Account identifiers and contact information: collected for account and
  support functionality.
- Resumes, career facts, job preferences, applications, approvals, and proof:
  collected to provide core product functionality.
- Optional Gmail data: processed only after the user connects Gmail and grants
  consent; not sold or used for advertising.
- Product interaction and acquisition events: used for product operation,
  attribution, security, and aggregate conversion measurement.
- Data is encrypted in transit. Users can export data, revoke connections,
  pause processing, and initiate deletion.
- Stripe-hosted payment data is handled by Stripe; UnaScout stores customer,
  subscription, entitlement, and event identifiers rather than card details.

Do not select final App Privacy or Play Data Safety answers from this document
alone. Reconcile them with the exact deployed release and each store's current
form before submission.
