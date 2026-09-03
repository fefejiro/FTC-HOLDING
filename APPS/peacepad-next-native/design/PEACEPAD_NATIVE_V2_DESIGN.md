# PeacePad Native V2 — family-first design direction

Status: design direction locked and implemented in the Native V2 shell

Figma working file: [PeacePad Native V2](https://www.figma.com/design/yCX2cRek5AIiZcY2NvlyQc/Untitled)

The Figma file contains the verified Native V2 board with five mobile screen
directions, the colour rhythm, reusable action patterns, and the experience
rules that must stay true on Android and iOS.

The first implementation pass is now applied to the shared React Native
screens and verified on the connected Pixel: Home, Messages, Calendar,
Records, More, and the call header use the shared icon/header language. The
same source feeds Android and iOS; no store artifact was uploaded in this
design pass.

## What is changing

- The app opens in a useful solo mode. A parent can plan, message, save a
  record, or browse support without creating a family or sending an invite.
- Purple remains the trust anchor, but coral, sun, aqua, cream, and white carry
  the experience so it feels warm and human rather than like an office
  dashboard.
- Headings are shorter and lighter. Cards are compact enough that the primary
  actions are visible without a long scroll.
- All visible symbols use real native icon components. Emoji and Unicode glyphs
  are not product icons.
- Empty states explain what to do next. Records show ownership and privacy;
  Messages shows the Coach purpose; Calendar surfaces the selected day and
  weather-aware activity ideas.
- Calls, Conch mode, local support, personality insights, and settings are
  first-class destinations in More, not hidden experiments.

## Screen contracts

| Screen | Primary job | Required visible states |
| --- | --- | --- |
| Home | Start a useful action immediately | solo-ready, plan time, message calmly, save a record, support near me |
| Messages | Communicate without escalation | recent threads, Coach-on state, speak/type entry, review-before-send |
| Calendar | Coordinate parenting time | month navigation, today/selected day, visitation details, weather/activity ideas |
| Records | Keep an organised private trail | Case Binder explanation, add record, dated timeline, export/privacy affordance |
| More | Reach the whole product | calls, Conch mode, local support, parenting profile, settings/privacy |

## Tokens

```text
background  #FFF8F2    surface  #FFFFFF    ink   #26153A
plum        #6B4A86    plumSoft #F3E7F1    coral #F26B5E
sun         #F7C948    aqua     #2E9D91    aquaSoft #E6F5F1
cream       #FFF1DF    line     #E8DFD5    muted #6E6275
```

Use an 8pt spacing rhythm, 24px card radius, 44px minimum touch targets, and
large accessible text. Coral is reserved for the main action or an important
current-day marker; it is not an error colour by default.

## Implementation sequence

1. Replace emoji/Unicode navigation and feature symbols with
   `@expo/vector-icons` (or the project’s equivalent native icon set).
2. Add shared `ScreenHeader`, `IconTile`, `ActionCard`, `EmptyState`, and
   `SectionLabel` primitives to the Native V2 component layer.
3. Apply the screen contracts above to Home, Messages, Calendar, Records, and
   More. Preserve existing API/auth/call behaviour while changing presentation.
4. Add regression coverage for solo entry, no-family-name gate, empty states,
   selected calendar day, Coach entry, and More destinations.
5. Re-run the same Android/iOS visual and interaction matrix before any store
   build. This board is the visual source of truth for both platforms because
   they share the React Native source.

## Verification record

- Pixel visual pass: Home, Messages, Calendar, Records, and More captured from
  the native dev client on 2026-08-30.
- `npm run typecheck --workspace APPS/peacepad-next-native`: passed.
- `npm test --workspace APPS/peacepad-next-native -- --runInBand`: 62 suites,
  465 passed, 1 skipped.
- Lab guardrails, secret scan, and microphone-only audio configuration: passed.

## Guardrails

- Do not add a new backend or duplicate product surface for this visual pass.
- Do not make a parent invent a family name to use the app.
- Do not claim Figma parity from code screenshots alone; compare the device
  render against the Figma board after implementation.
- Do not ship placeholder data, emoji icons, or an empty-looking form as a
  finished screen.
