# PeacePad App Store ASO and Metadata Plan

Date: 2026-07-29
Live audit refreshed: 2026-08-02

## Outcome

PeacePad version 1.0 is **Ready for Distribution**. This package improves
discoverability and conversion without changing the approved binary or making
claims that exceed the shipped product.

Apple ID: `6793350735`

Public product URL:
`https://apps.apple.com/app/peacepad/id6793350735`

## Live storefront baseline

Verified from Apple's Canadian public product page and catalog API on
2026-07-29:

| Field | Live value |
|---|---|
| Name | PeacePad |
| Subtitle | Calmer co-parenting tools |
| Version | 1.0 |
| Price | Free |
| Primary category | Lifestyle |
| Secondary category | Not exposed by the public storefront |
| Age rating | 13+ |
| Minimum iOS | 14.0 |
| Seller | Fejiro Technology Consultancy Inc |
| Bundle ID | `ca.peacepad.family` |

The product URL returned HTTP 200 and resolved to the Canadian storefront. The
owner confirmed a successful public App Store installation and launch on a
real iPhone.

The live product page now exposes two iPhone screenshots. Both show almost the
same Compose state; the first has an empty draft and disabled action. This is a
conversion weakness because Apple may show up to three screenshots directly in
search results. The public social image still resolves through Apple's
placeholder asset, so owned PeacePad links should use the website's current
Open Graph image rather than relying on the storefront social card.

The listing currently has zero displayed ratings and only English metadata.
The public App Privacy summary is also very broad: it declares analytics,
health, financial, precise/coarse location, contact, user-content, identifier,
and usage data. Reconcile those answers against observed version 1.0 network
and storage behaviour before removing or retaining any category. Accuracy is
the objective; a shorter privacy label is not a marketing exercise.

### Authenticated metadata audit — 2026-08-02

The distributed 1.0 record was inspected in App Store Connect before any edit.
The observed values were:

| Field | Value before edit | Edit state |
|---|---|---|
| Promotional text | `Co-parenting tools for calmer messages, shared schedules, expenses, and practical next steps.` | Separately editable |
| Keywords | `co-parenting,coparent,custody,divorce,separated,family,calendar,expenses,communication,shared` | Locked on distributed 1.0 |
| Support URL | `https://peacepad.ca/help` | Locked on distributed 1.0 |
| Marketing URL | `https://peacepad.ca` | Locked on distributed 1.0 |

The 145-character promotional text in this document was saved successfully.
The saved App Store Connect field now reads:

```text
Pause before you send. PeacePad helps co-parents check tone, prepare for difficult conversations, and keep practical parenting details organized.
```

The public Canadian product page still exposed the prior text immediately after
the save, so storefront propagation remains pending. The Support URL was not
forced or changed; set `/support` when version 1.0.1 makes that field editable.

## Change boundary

### Safe to update now

- Promotional text, because Apple permits this field to change without a new
  app submission.
- Privacy Policy URL and App Privacy answers when they need to remain accurate.
- Availability, pricing, and relevant App Store tags.
- The PeacePad website's Smart App Banner, App Store links, and structured app
  metadata.

### Stage for version 1.0.1

- App name
- Subtitle
- Keywords
- Description
- Screenshot replacement or reordering
- Additional metadata localizations

Do not upload a replacement 1.0 binary merely to change metadata. Do not change
the bundle ID `ca.peacepad.family`.

## Search positioning

Primary intent:

> A co-parent communication app that helps a parent pause, check message tone,
> prepare for difficult conversations, and stay focused on practical parenting
> matters.

Primary search themes:

- co-parent communication
- custody calendar
- parenting schedule
- divorce communication
- shared parenting
- calm messaging
- parenting expenses

Avoid:

- competitor names;
- claims of guaranteed conflict prevention;
- legal-advice or court-outcome language;
- unsupported encryption, compliance, or AI-training guarantees;
- describing optional AI processing as required for the core compose flow.

## Category recommendation for version 1.0.1

Set **Productivity** as the primary category and retain **Lifestyle** as the
secondary category, subject to App Review confirming the shipped coordination
flows. On the Canadian storefront, AppClose, OurFamilyWizard, and several other
co-parenting coordination products currently use Productivity as their primary
category. PeacePad's current Lifestyle placement separates it from the most
relevant browse/filter context. Categories are indexed, so this is a search
alignment change, not cosmetic positioning.

Do not change category independently of the 1.0.1 metadata review. Reconfirm
that Compose, Prep, and calendar context remain easy for reviewers to find.

## Paste-ready metadata

### App name for version 1.0.1

Limit: 30 characters

```text
PeacePad: Co-Parenting
```

Count: 22 characters

Reason: preserves the distinctive PeacePad brand while adding the clearest
category phrase.

### Subtitle for version 1.0.1

Limit: 30 characters

```text
Calmer Messages & Planning
```

Count: 26 characters

Reason: adds two distinct, high-intent concepts without repeating the
`Co-Parenting` phrase already present in the proposed name.

### Promotional text for version 1.0

Limit: 170 characters

```text
Pause before you send. PeacePad helps co-parents check tone, prepare for difficult conversations, and keep practical parenting details organized.
```

Count: 145 characters

This is the first live metadata change to make after confirming the public
product page. It describes the approved compose and preparation experience and
does not claim legal, therapeutic, or guaranteed outcomes.

### Keywords for version 1.0.1

Limit: 100 bytes

```text
custody,divorce,separation,calendar,schedule,expense,communication,shared family,organizer,clarity
```

Count: 98 ASCII bytes

The list does not repeat `PeacePad`, `Co-Parenting`, `Messages`, `Planning`, or
the Lifestyle category. It contains no competitor names or unsupported court,
therapy, or legal-service claims.

### Description for version 1.0.1

```text
PeacePad helps separated parents pause before sending difficult messages. Check how your wording may land, explore calmer alternatives, and keep communication focused on children and practical next steps.

COMMUNICATE WITH MORE CLARITY

- Draft messages before sharing them with your co-parent
- Use rule-based tone guidance without enabling optional third-party AI
- Opt in separately if you want AI-assisted rewrite suggestions
- Prepare for difficult conversations with Prep Chat

KEEP PARENTING DETAILS ORGANIZED

- View shared scheduling context
- Track parenting tasks and expenses
- Add child-focused updates
- Invite a co-parent when you are ready

START AT YOUR OWN PACE

- Try the core compose experience before creating an account
- Review clear privacy choices before guest or account data is stored
- Manage data export and account deletion controls inside the app
- Open support, privacy, and terms information whenever needed

PeacePad is designed to support calmer communication and everyday co-parenting organization. It does not provide legal advice, legal representation, or determine parenting outcomes.

Some shared features require both participants to use PeacePad. Optional AI features require separate consent and an internet connection.
```

The opening paragraph leads with the strongest user benefit. The remaining copy
uses readable feature groups, states the AI boundary, and keeps the legal
boundary explicit.

## URLs

Verified with HTTP requests on 2026-07-29:

| Field | Canonical URL | Result |
|---|---|---|
| Marketing | `https://peacepad.ca` | HTTP 200 |
| Privacy Policy | `https://peacepad.ca/privacy` | HTTP 200 |
| Terms | `https://peacepad.ca/terms` | HTTP 200 |
| Support | `https://peacepad.ca/support` | HTTP 200 |
| Legacy help route | `https://peacepad.ca/help` | HTTP 200 |

Use `/support` as the canonical App Store Support URL so the store metadata,
review notes, and in-app support destination use one route. Keep `/help`
functional as a compatibility route.

## Screenshot conversion plan for version 1.0.1

The current approved screenshots remain valid version 1.0 evidence. Replace or
reorder them only with current screenshots from the submitted 1.0.1 build.

The first three screenshots are most important because Apple may show them in
search results:

1. **Pause before you send** -- Compose with a realistic synthetic draft.
2. **Find a calmer way to say it** -- Tone guidance and rewrite choice.
3. **Start privately, at your pace** -- Guest-first entry and concise privacy
   choice.
4. **Prepare for difficult conversations** -- Prep Chat.
5. **Keep parenting details organized** -- Schedule, tasks, or expenses.
6. **Stay in control of your data** -- Privacy, export, and deletion controls.

Requirements:

- Use actual in-app UI from the exact submitted build.
- Use synthetic names, messages, schedules, and family information.
- Include the PeacePad conch identity inside the app UI, not as a misleading
  replacement for missing interface branding.
- Keep overlay copy concise and readable at search-result size.
- Do not show unimplemented premium, legal, evidence, or calling features.
- Capture both supported iPhone and iPad sizes.
- Never use the current empty/disabled Compose state as screenshot one.
- Keep overlay headlines under roughly six words so they remain legible in
  search results.

## Rating and review acquisition

Ratings and reviews are search inputs, but PeacePad must never gate, reward, or
filter reviews. The current rating prompt already waits for tenure and positive
actions; its iOS destination was a placeholder App Store ID. Version 1.0 can
load the corrected web destination after the website release because the
Capacitor shell uses the PeacePad web application.

Use this sequence:

1. Correct the App Store review URL to Apple ID `6793350735`.
2. Ask only after a completed user action, never during onboarding, a safety
   flow, an error, or a tense-message warning.
3. Keep **Rate PeacePad**, **Remind Me Later**, and **No Thanks** equally honest;
   do not ask whether the user is happy before opening Apple's review sheet.
4. Invite an initial group of real users to try the app and leave an honest
   review. Do not request a five-star review or offer an incentive.
5. Monitor review themes and respond factually through App Store Connect.

## Owned-web discovery

The live website already has useful title, description, canonical, Open Graph,
and SoftwareApplication markup. The 2026-08-02 audit found three missing or
incorrect connections:

- no Apple Smart App Banner;
- SoftwareApplication `operatingSystem` omitted iOS and iPadOS;
- the in-app rating prompt linked to placeholder Apple ID `1234567890`.

The visibility branch corrects those links and adds the App Store URL to the
Organization and SoftwareApplication structured data. It deliberately does
not invent an aggregate rating while the public listing displays none.

## App Store tags

When App Store Connect presents suggested U.S. tags, retain only tags that
describe shipped functionality. Prefer communication, family organization,
calendar, and productivity concepts. Deselect legal-service, therapy, dating,
social-network, or other misleading tags.

## Localization order

1. English (Canada): authoritative launch copy.
2. English (United States): next high-value localization with U.S.-appropriate
   wording and keywords.
3. French (Canada): only after a native-speaker product and support review.
4. English (United Kingdom): after Canadian and U.S. metadata are stable.

Do not machine-publish unsupported localizations.

## Measurement

Record a baseline after the listing has accumulated enough traffic:

- product page impressions;
- product page views;
- first-time downloads;
- conversion rate;
- source type;
- search terms where available;
- crashes and deletion/support friction.

Do not start a Product Page Optimization test until the baseline has enough
first-time downloads to make a treatment useful. Test one major hypothesis at a
time, beginning with the first three screenshots.

## App Store Connect execution checklist

- [x] Confirm version 1.0 has a public product page.
- [x] Confirm version 1.0 installs from the public App Store on a real iPhone.
- [x] Record the current live name, subtitle, description, categories,
      version, rating, seller, and minimum iOS version.
- [x] Record the non-public keyword field and current promotional text from App
      Store Connect before editing.
- [x] Recheck public screenshot propagation; two iPhone images are public.
- [ ] Replace the two-image set with a six-screen, exact-build conversion set
      in version 1.0.1.
- [ ] Record the remaining live URLs and tags before editing.
- [x] Update only the 145-character promotional text for version 1.0.
- [x] Confirm the Support URL is locked on distributed version 1.0; stage
      `https://peacepad.ca/support` for version 1.0.1.
- [ ] Review App Store tags and keep only accurate shipped-function tags.
- [ ] Save and verify the public product page after Apple's propagation window.
- [ ] Create version 1.0.1 only when the tested premium UI build is ready.
- [ ] Apply the staged name, subtitle, keywords, description, localization, and
      screenshot package to 1.0.1.
- [ ] Set Productivity primary and Lifestyle secondary for 1.0.1.
- [ ] Reconcile App Privacy answers against the exact 1.0.1 binary before review.

## Verification status

| Area | Status |
|---|---|
| Apple approval | VERIFIED |
| Ready for Distribution | VERIFIED |
| Public product page | VERIFIED, HTTP 200 |
| Public-device installation | VERIFIED by owner on real iPhone |
| Public screenshots | VERIFIED, two near-duplicate Compose images |
| Public social image | PLACEHOLDER still observed |
| Public URLs | VERIFIED, HTTP 200 |
| Character limits | VERIFIED |
| Promotional copy | SAVED IN APP STORE CONNECT; PUBLIC PROPAGATION PENDING |
| Smart App Banner and store links | DEPLOYED AND LIVE VERIFIED, commit `eba4ddd3` |
| Rating prompt destination | DEPLOYED; unit contract verified before publication |
| Public ratings | ZERO DISPLAYED |
| Metadata languages | ENGLISH ONLY |
| App Privacy answers | RECONCILIATION REQUIRED |
| Live metadata field audit | VERIFIED, 2026-08-02 |
| Live App Store save | PROMOTIONAL TEXT ONLY; VERIFIED |
| Support URL | `/help` LOCKED ON 1.0; `/support` STAGED FOR 1.0.1 |
| Version 1.0.1 metadata | STAGED, NOT SUBMITTED |
| Screenshot replacement | NOT STARTED |
| Product Page Optimization | DEFERRED pending traffic baseline |
