# PeacePad App Store Submission Packet - 2026-07-22

## Verified current state

- App Store Connect app: PeacePad
- Apple ID: `6793350735`
- Bundle ID: `ca.peacepad.family`
- SKU: `PEACEPAD-IOS-001`
- Team: Fejiro Technology Consultancy Inc.
- Build available for TestFlight: version `1.0.9`, build `1`
- Public TestFlight link: `https://testflight.apple.com/join/7anZvZXj`
- Current state: `testflight_external_ready`
- Public App Store state: not live yet, not verified as submitted for App Review

## Store listing fields

Use the existing metadata source in `ios-prep/APP_STORE_METADATA.md`.

| Field | Value |
| --- | --- |
| App name | PeacePad Co-Parenting |
| Subtitle | Calmer co-parenting tools |
| Primary category | Lifestyle |
| Secondary category | Productivity |
| Keywords | co-parenting,coparent,custody,divorce,separated,family,calendar,expenses,communication,shared |
| Privacy Policy URL | `https://peacepad.ca/privacy` |
| Support URL | `https://peacepad.ca/help` |
| Marketing URL | `https://peacepad.ca` |
| Contact email | `peacepad@peacepad.ca` |
| Copyright | 2026 PeacePad |

Public URL check on 2026-07-22:

- `https://peacepad.ca` returned HTTP 200
- `https://peacepad.ca/privacy` returned HTTP 200
- `https://peacepad.ca/help` returned HTTP 200
- `https://peacepad.ca/support` returned HTTP 200
- `https://peacepad.ca/terms` returned HTTP 200
- `https://api.peacepad.ca/api/health` returned HTTP 200

## Description

```text
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
```

## Promotional text

```text
Co-parenting tools for calmer messages, shared schedules, expenses, and practical next steps.
```

## Review notes draft

```text
PeacePad helps co-parents write calmer messages, prepare difficult conversations, and organize shared parenting tasks.

Review flow:
1. Launch the app.
2. Use guest mode or create/sign in with an account.
3. Open Compose or Prep Chat to test calm-message guidance.
4. Open Messages/Conch Mode to review communication tools.
5. Open Calendar/Expenses/Support to review organization and resource features.

The app may request camera and microphone permissions for optional audio/video call features and media attachments. Location is used only when the user asks for nearby support resources.

No external purchase is required to review the submitted build.
```

## App Privacy draft answers

Do not mark "Data Not Collected." PeacePad stores user-linked records needed to run the app. Use the narrowest truthful Apple categories.

### Tracking

- Tracking: No, unless a third-party advertising or cross-app tracking SDK is added later.

### Sensitive Info

- Do not select Apple's "Sensitive Info" category unless the live build explicitly collects Apple-defined sensitive data beyond ordinary user-generated co-parenting content.
- Court/legal/family topics in user messages are best treated as user-generated content unless Apple asks for a more specific category.

### Likely collected data types

| Apple category | Evidence in repo | Purpose | Linked to user | Tracking |
| --- | --- | --- | --- | --- |
| Contact Info - Email Address | `users.email` | App Functionality, Account Management | Yes | No |
| Contact Info - Name | `users.firstName`, `users.lastName`, `users.displayName` | App Functionality, Account Management | Yes | No |
| Contact Info - Phone Number | `users.phoneNumber`; optional sharing flag | App Functionality | Yes | No |
| User Content - Emails or Text Messages / Other User Content | `messages.content`, `notes`, `tasks`, `childUpdates`, `prepChatSessions` | App Functionality | Yes | No |
| User Content - Photos or Videos | `messages.messageType`, `fileUrl`, `fileName`, receipt/photo upload flows | App Functionality | Yes | No |
| User Content - Audio Data | voice notes, call/audio fields, transcripts | App Functionality | Yes | No |
| Identifiers - User ID | `users.id`, guest IDs, auth tokens | App Functionality, Account Management | Yes | No |
| Usage Data - Product Interaction | `usageMetrics`, `userStats`, `auditLogs`, feature counters | App Functionality, Analytics if enabled for product metrics | Yes | No |
| Diagnostics | feedback/error reporting UI and audit/debug records | App Functionality, Analytics | Yes if stored with user/session | No |
| Location | optional location for nearby support/resources and calendar/task locations | App Functionality, Product Personalization only if location changes recommendations | Yes if stored | No |
| Purchases | subscription tier fields exist, but only select if paid purchase flow is live in the submitted build | App Functionality | Yes if live | No |

### Permission strings already documented

See `ios-prep/INFO_PLIST_PERMISSIONS.md`:

- Camera: video calls and adding photos to conversations, profiles, and receipts.
- Microphone: audio/video calls, voice notes, and guided conversation practice.
- Photo library: attach photos, upload profile images, and add receipt images.
- Location when in use: nearby family support services and resources when the user asks.

## Screenshot assets

Current available assets:

- `store-assets/phone-screenshot-1-welcome.png` through `phone-screenshot-6-support.png`: 1080 x 1920
- `play-store-assets/screenshots/01-welcome.png` through `04-organize.png`: 1080 x 1920
- `store-assets/tablet-10inch-*.png`: 1200 x 1920
- `store-assets/tablet-7inch-*.png`: 600 x 960

Possible blocker: these are not the newest App Store iPhone or iPad screenshot slot sizes. Apple's App Store Connect screenshot specification page lists 6.9-inch iPhone portrait sizes of `1260 x 2736`, `1290 x 2796`, or `1320 x 2868`, and 13-inch iPad portrait sizes of `2064 x 2752` or `2048 x 2732` if the app runs on iPad.

Source checked 2026-07-22: `https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/`

If App Store Connect rejects the current assets, capture or generate compliant screenshots from the simulator/exported app before submission.

## App Store Connect work order

1. Open App Store Connect > PeacePad > Distribution.
2. Create or continue the `1.0.9` app version.
3. Select build `1.0.9 (1)`.
4. Paste metadata from this packet.
5. Upload screenshots; if rejected, produce Apple-compliant screenshots from simulator.
6. Complete age rating questionnaire truthfully.
7. Complete export compliance.
8. Complete App Privacy using the draft categories above.
9. Set pricing and availability.
10. Stop before Submit for Review unless the account holder confirms final metadata/privacy/review answers.

## Current blocker

On 2026-07-22, the visible MacInCloud RDP session showed App Store Connect on the PeacePad TestFlight public beta page, but Safari did not accept remote click/keyboard input from Codex into the Distribution tab. The page is visible; input routing is the blocker, not the PeacePad build.
