# PeacePad App Privacy Declaration Worksheet

Status: release worksheet, not evidence of a submitted App Store Connect answer.

Exact native archive evidence is recorded in
`IOS_V101_ARCHIVE_PRIVACY_INVENTORY.md`. The signed `1.0.1 (2)` archive contains
two embedded SDK privacy manifests with empty collection/tracking/API arrays
and no app-level manifest. That inventory does not replace this worksheet:
App Store answers must still cover the hosted web view, server processing, and
optional feature flows.

The focused privacy, reviewer-session, consent, notification, and account
deletion regression suite passed `7/7` files and `51/51` tests on 2026-08-04.
This is automated contract evidence; device and production-data lifecycle
checks remain separate gates.

Complete this worksheet against the deployed production runtime and the exact
submitted binary. App Privacy answers must cover PeacePad, its hosted web view,
server processing, and every included or invoked third-party SDK. When a row is
not verified, do not guess and do not submit it as final.

## Release-level answers

| App Store Connect question | Proposed answer | Verification required |
| --- | --- | --- |
| Does this app collect data? | Yes | Confirm the category table below against production |
| Is data used to track users across apps or websites owned by other companies? | No | Confirm no advertising SDK, cross-app identifier, data broker sharing, Google Analytics, or PostHog traffic |
| Is data linked to the user's identity? | Yes, for account and paired features | Confirm guest-only records are not incorrectly described as unlinked |
| Is third-party advertising used? | No | Confirm exact binary and hosted page network traffic |
| Is analytics used for this release? | No | Confirm Google Analytics is absent and PostHog is a no-op in production |

Do not use the word "tracking" to describe ordinary first-party account,
security, or feature processing. Do not claim "not collected" merely because a
processor receives the data only after an optional feature is invoked.

## Data category worksheet

The proposed answers are intentionally conservative. Finalize them only after
the production network, storage, retention, and deletion checks are complete.

| Apple data type | Collect? | Linked? | Tracking? | Purpose | PeacePad examples and release note |
| --- | --- | --- | --- | --- | --- |
| Contact Info - Name | Yes | Yes | No | App Functionality; Account Management | Profile/display name and synthetic reviewer name |
| Contact Info - Email Address | Yes | Yes | No | App Functionality; Account Management; Developer Communications | Account email, reviewer email, support correspondence |
| Contact Info - Phone Number | Verify | If collected, Yes | No | App Functionality; Developer Communications | Declare only if the current profile or support flow stores it |
| Contact Info - Physical Address | Verify | If collected, Yes | No | App Functionality | Shared family/contact fields may include an address; confirm storage before final answer |
| Contact Info - Other User Contact Info | Verify | If collected, Yes | No | App Functionality | Co-parent or emergency-contact details, if stored |
| Financial Info - Payment Info | No for this release | N/A | No | N/A | No billing or in-app purchase work is in this release |
| Financial Info - Other Financial Info | Yes | Yes | No | App Functionality | Shared expense amounts, payment status, and receipt context; no card-number claim |
| Precise Location | Yes, feature-initiated | Yes | No | App Functionality | User-authorized device coordinates for nearby resources; no IP-based fallback |
| Coarse Location | Verify | If collected, Yes | No | App Functionality | User-entered city/address or reduced location, if retained or transmitted |
| Sensitive Info | Verify conservatively | If collected, Yes | No | App Functionality | Safety-plan or support-resource inputs may be sensitive; inspect exact fields |
| Contacts | No unless system contacts are accessed | N/A | No | N/A | A co-parent entered by the user is Contact Info, not the device address book |
| User Content - Emails or Text Messages | Yes | Yes | No | App Functionality | Compose drafts, paired messages, notes, and optional AI-selected text |
| User Content - Photos or Videos | Yes when used | Yes | No | App Functionality | Profile and receipt/photo uploads; verify each live upload flow and do not claim that live video is stored without evidence |
| User Content - Audio Data | Yes when used | Yes | No | App Functionality | Voice-note and explicit transcription flows; optional AI message consent is required before audio is sent to OpenAI, while external live-call AI is unavailable in this release |
| User Content - Customer Support | Yes | Yes | No | App Functionality; Developer Communications | Messages sent to support |
| User Content - Other User Content | Yes | Yes | No | App Functionality | Family information, child updates, calendars, tasks, user attachments, and consent records |
| Search History | Verify | If collected, Yes | No | App Functionality | Nearby support/resource queries; distinguish transient request data from retained history |
| Browsing History | No | N/A | No | N/A | PeacePad does not claim to collect general web-browsing history |
| Identifiers - User ID | Yes | Yes | No | App Functionality; Account Management | Account, guest, partnership, and reviewer identifiers |
| Identifiers - Device ID | Yes when notifications enabled | Yes | No | App Functionality | Push token/subscription endpoint; do not call it an advertising identifier |
| Purchases | No for this release | N/A | No | N/A | No billing or IAP in this release |
| Usage Data - Product Interaction | No for this release | N/A | No | N/A | GA, PostHog, and web-update interaction transmission are disabled in the shipped client; the server ingestion route returns 404 in production |
| Usage Data - Advertising Data | No | N/A | No | N/A | No advertising |
| Diagnostics - Crash Data | Verify | Verify | No | App Functionality | Declare only if the exact binary or runtime sends crash reports |
| Diagnostics - Performance Data | Verify | Verify | No | App Functionality | Check hosting, native, and SDK diagnostics |
| Diagnostics - Other Diagnostic Data | Verify | Verify | No | App Functionality; Fraud Prevention or Security | Operational errors and security logs must exclude message bodies |
| Other Data | Yes | Yes where account-scoped | No | App Functionality; Account Management | Terms/privacy/AI-consent state, sessions, export/deletion records |

## Third-party and infrastructure flow inventory

| Recipient or SDK | Potential data | Release purpose | Required release answer/evidence |
| --- | --- | --- | --- |
| OpenAI | Message content sent while AI message consent is enabled; Prep Chat topic, prompts, message history, and personality-style selection; audio or voice notes deliberately submitted for transcription | Optional tone/rewrite, Prep Chat, and transcription processing | AI message consent is default-off; external call/Conch AI, court-log AI, event/location AI, v2 AI, and pattern learning are disabled or unavailable in this release; do not promise universal non-training unless contractually verified |
| Cloudflare | Request metadata such as IP address and user agent for delivery and security | Hosting, delivery, security | Confirm retention and processor wording in the public policy |
| Railway and database infrastructure | Account, session, message, family, media metadata, consent, and operational records | Core hosting and storage | Confirm production region/retention if disclosed; do not claim universal encryption details without evidence |
| Firebase / Apple push delivery | Push token and generic notification metadata | User-requested notifications | Confirm notifications contain no message excerpt and permission is requested in context |
| Web Push | Browser subscription endpoint and generic notification metadata | User-requested notifications | Confirm only active subscriptions are stored and deleted with the account |
| Mailjet | Destination email and transactional/support message metadata when email is sent | Service communication | Confirm which release flows actually invoke it |
| Supabase and legacy OIDC compatibility | Authentication token, user ID, email, and profile claims only if a legacy route is separately configured and deliberately invoked | Legacy authentication compatibility, not the advertised reviewer or guest path | Public social sign-in is hidden, not removed; verify deployment configuration and network traffic, and disclose actual use if either path remains callable |
| OpenStreetMap Nominatim, geocoder.ca, and Open-Meteo | User-entered address/postal code or permission-based coordinates needed for a requested location or weather result | User-initiated location features | Confirm the exact live providers and disclose precise/coarse location consistently |
| WebRTC connectivity providers, including configured STUN/TURN services | IP address and call-connection metadata needed to establish a call | User-initiated calling | Google STUN and optional Twilio TURN configuration exist; verify the exact production path and do not claim call media is stored without evidence |
| Google Analytics | None in this release | Disabled | Confirm no `gtag`, loader, measurement ID, or network request |
| PostHog | None in this release | Disabled | Confirm analytics adapter remains a no-op and no network request occurs |

An installed dependency is not automatically a collection event, but any data
the app or embedded web view actually transmits must be included. Network-test
the exact release rather than relying only on package names.

## Privacy behavior declarations to verify

- [ ] Welcome display or dismissal creates no session and records no consent.
- [ ] Terms agreement and Privacy Policy acknowledgment are explicit before
      guest or account data is stored.
- [ ] Optional third-party AI processing is separate and off by default.
- [ ] Every enabled external-AI route either rejects requests without current
      server-side AI consent or is unavailable behind a release feature gate.
- [ ] Message sending with AI consent, Prep Chat, and explicit transcription
      are the only release flows documented as sending content to OpenAI.
- [ ] `PEACEPAD_ENABLE_V2_EXTERNAL_AI` and
      `PEACEPAD_ENABLE_PATTERN_LEARNING` remain unset or `false` in production.
- [ ] Rule-based message preview remains available without third-party AI.
- [ ] Camera, microphone, notification, and location prompts appear only from
      the related feature.
- [ ] Google Analytics is absent.
- [ ] PostHog emits no events or network traffic.
- [ ] Public Google/Supabase/OIDC sign-in entry points are hidden, and any
      configured legacy compatibility traffic is included in the final answer.
- [ ] Public social-auth build/server variables are unset unless a retained
      compatibility use has been explicitly tested and disclosed.
- [ ] Logs exclude message bodies, audio/transcripts, credentials, tokens, and
      family details.
- [ ] Push notification title/body is generic and contains no message excerpt.
- [ ] No IP-geolocation HTTP fallback remains.
- [ ] Account export works for an ordinary synthetic account.
- [ ] In-app deletion removes user-owned records, uploads, tokens, sessions, and
      profile data immediately.
- [ ] Only shared records that cannot safely be deleted are anonymized.
- [ ] The public deletion instructions describe deletion, not deactivation.

## Public URLs

Verify unauthenticated `200` responses, current copy, mobile layout, and valid
TLS immediately before resubmission:

On 2026-08-04 all four routes below returned unauthenticated HTTP `200`
responses with valid TLS. Rendered route-content verification remains open in
this evidence pass because the in-app browser runtime was unavailable; the HTTP
result must not be treated as visual/mobile proof.

```text
Privacy: https://peacepad.ca/privacy
Terms:   https://peacepad.ca/terms
Support: https://peacepad.ca/support
Help:    https://peacepad.ca/help
```

The versioned first-party Privacy Policy must cover:

- guest and account data;
- messages and family information;
- optional AI processing;
- location, media, and notifications;
- processors and disclosures;
- retention;
- export and deletion;
- security limitations.

Remove or avoid unsupported statements about universal encryption at rest,
local conflict prediction, guaranteed non-training, or unverified GDPR
compliance.

Apple references:

- [App Privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Adding a privacy manifest](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk)
