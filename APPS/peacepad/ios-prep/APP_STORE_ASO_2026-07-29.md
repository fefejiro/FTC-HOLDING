# PeacePad App Store ASO and Metadata Plan

Date: 2026-07-29

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
| Secondary category | Productivity |
| Age rating | 12+ |
| Minimum iOS | 14.0 |
| Seller | Fejiro Technology Consultancy Inc |
| Bundle ID | `ca.peacepad.family` |

The product URL returned HTTP 200 and resolved to the Canadian storefront. A
public-device install remains a separate acceptance check.

Apple's public catalog API initially returned zero iPhone and iPad screenshots,
and the public page's social image used a placeholder while App Store Connect
showed approved screenshots. Treat this as launch propagation until the
24-hour window expires. If screenshots or the social image remain absent after
that window, investigate the public listing before changing screenshot content.

## Change boundary

### Safe to update now

- Promotional text, because Apple permits this field to change without a new
  app submission.
- Privacy Policy URL and App Privacy answers when they need to remain accurate.
- Availability, pricing, and relevant App Store tags.

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
Calm Co-Parent Communication
```

Count: 28 characters

Reason: communicates the central benefit and adds a high-intent phrase without
repeating the full app name.

### Promotional text for version 1.0

Limit: 170 characters

```text
Pause before you send. PeacePad helps co-parents check message tone, prepare for difficult conversations, and keep parenting communication focused.
```

Count: 147 characters

This is the first live metadata change to make after confirming the public
product page. It describes the approved compose and preparation experience and
does not claim legal, therapeutic, or guaranteed outcomes.

### Keywords for version 1.0.1

Limit: 100 bytes

```text
custody,calendar,divorce,separation,parenting,messaging,schedule,expenses,shared,family,conflict
```

Count: 96 ASCII bytes

The list does not repeat `PeacePad` or the exact co-parent wording already used
by the name and subtitle.

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
3. **Start privately, at your pace** -- Guest-first entry and clear privacy
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

## App Store tags

When App Store Connect presents suggested U.S. tags, retain only tags that
describe shipped functionality. Prefer communication, family organization,
calendar, and productivity concepts. Deselect legal-service, therapy, dating,
social-network, or other misleading tags.

## Localization order

1. English (Canada): authoritative launch copy.
2. English (United States): next high-value localization.
3. English (United Kingdom): after U.S. metadata is stable.
4. French (Canada): only after a native-speaker content and support review.

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
- [ ] Confirm version 1.0 installs from the public App Store on a real iPhone.
- [x] Record the current live name, subtitle, description, categories,
      version, rating, seller, and minimum iOS version.
- [ ] Record the non-public keyword field and current promotional text from App
      Store Connect before editing.
- [ ] Recheck public screenshot and social-image propagation after 24 hours.
- [ ] Record the remaining live URLs and tags before editing.
- [ ] Update only the 147-character promotional text for version 1.0.
- [ ] Set the canonical Support URL to `https://peacepad.ca/support` if the
      current field is editable without a new version.
- [ ] Review App Store tags and keep only accurate shipped-function tags.
- [ ] Save and verify the public product page after Apple's propagation window.
- [ ] Create version 1.0.1 only when the tested premium UI build is ready.
- [ ] Apply the staged name, subtitle, keywords, description, localization, and
      screenshot package to 1.0.1.
- [ ] Reconcile App Privacy answers against the exact 1.0.1 binary before review.

## Verification status

| Area | Status |
|---|---|
| Apple approval | VERIFIED |
| Ready for Distribution | VERIFIED |
| Public product page | VERIFIED, HTTP 200 |
| Public-device installation | NOT YET VERIFIED |
| Public screenshots/social image | PROPAGATION PENDING |
| Public URLs | VERIFIED, HTTP 200 |
| Character limits | VERIFIED |
| Promotional copy | READY TO APPLY |
| Live metadata field audit | BLOCKED by authenticated browser-control handoff |
| Live App Store save | NOT PERFORMED |
| Version 1.0.1 metadata | STAGED, NOT SUBMITTED |
| Screenshot replacement | NOT STARTED |
| Product Page Optimization | DEFERRED pending traffic baseline |
