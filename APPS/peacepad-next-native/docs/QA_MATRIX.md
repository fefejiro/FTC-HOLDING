# PeacePad Next Native QA Matrix

Last updated: 2026-07-24

## Purpose

This matrix defines what must be checked before any PeacePad Premium lab feature can be treated as migration-ready.

The current app is still a React Native / Expo lab. Passing this matrix does not authorize replacing the submitted Capacitor App Store build.

## Current verified baseline

| Check | Status | Evidence |
| --- | --- | --- |
| Lab guardrails | Pass | `npm --workspace=@ftc/peacepad-next-native run guardrails` |
| TypeScript | Pass | `npm --workspace=@ftc/peacepad-next-native run typecheck` |
| Standalone Expo Doctor on Windows | Pass | `.sim/peacepad-next-native-ios`, `18/18 checks passed` |
| Standalone Expo Doctor on Mac | Pass | MacInCloud `.sim/peacepad-next-native-ios`, `18/18 checks passed` |
| Mac iOS Simulator render | Pass | Premium dashboard rendered on iPhone 17 simulator |
| Evidence Vault render | Pass | Vault metadata screen rendered on iPhone 17 simulator |
| Production API writes | Blocked by design | `app.json` extra must keep `productionApiWritesEnabled: false` |
| App Store submission | Not allowed | Lab bundle ID remains `ca.peacepad.nextnative.lab` |

## Latest simulator QA run

Run date: 2026-07-24  
Device: MacInCloud iPhone 17 simulator  
Evidence folder: `.local/peacepad-rn-sim/qa-2026-07-24` on the Windows workstation

Captured screenshots:

- `01-dashboard.png`
- `02-onboarding.png`
- `03-binder.png`
- `04-compose.png`
- `05-logs.png`
- `06-vault.png`
- `08-timeline.png`
- `09-export.png`
- `contact-sheet.png`

## Screen-by-screen QA

| Area | Current test target | Pass signal | Risk covered | Status |
| --- | --- | --- | --- | --- |
| Premium dashboard | Open the app on simulator | Hero, tabs, metrics, and actions render without blank screen | Basic iOS rendering and layout | Visual pass |
| Goal onboarding | Tap `Start premium flow`, select each goal | Selection state changes and continue route matches goal | Early value routing | Initial visual pass; goal variants still need interaction retest |
| Case Binder setup | Edit binder name, child label, support contact, source types | Invalid data shows clear errors; valid data routes to Vault | User setup quality before evidence flow | Visual pass; validation interaction still needs retest |
| Calm Compose | Edit draft text | Mock rewrite remains visible; no send action exists | No accidental messaging or automation | Visual pass; edit interaction still needs retest |
| Parenting/contact logs | Select each outcome | Active state changes and copy remains factual | Neutral record language | Visual pass; outcome interaction still needs retest |
| Evidence Vault | Edit source metadata and status | Metadata form renders; valid data opens Evidence Detail | Context-first evidence intake | Visual pass; metadata interaction still needs retest |
| Evidence Detail | Open from Vault | Source context, status, and AI-summary gate are visible | Review-before-summary guardrail | Not completed in latest pass; remote scroll/input control blocked reaching detail button |
| Source-linked timeline | Open Timeline tab | Timeline cards show source counts and non-legal safety labels | Avoid legal conclusions | Visual pass |
| Export preview | Toggle checklist items | Included state changes; export warning remains visible | No unreviewed package sharing | Visual pass; checklist toggle still needs retest |

## Device and accessibility matrix

| Device condition | Required before migration? | Current status |
| --- | --- | --- |
| iPhone 17 simulator | Yes | Dashboard, Onboarding, Binder, Compose, Logs, Vault, Timeline, and Export visual pass |
| Small iPhone simulator | Yes | Not tested |
| Large iPhone simulator | Yes | Not tested |
| iPad simulator | Yes | Not tested |
| Dark mode | Yes | Not tested |
| Large text | Yes | Not tested |
| Reduced motion / accessibility basics | Yes | Not tested |
| Real iPhone via TestFlight or dev install | Yes | Not tested for RN lab |
| Offline start | Yes | Not implemented |
| Slow network | Yes | Not implemented |

## Data and privacy gates

| Gate | Rule | Status |
| --- | --- | --- |
| Private documents | No real court, child, or family records in the lab | Active rule |
| Storage | No private evidence storage until architecture is approved | Not implemented |
| AI summaries | Must be draft-only and source-linked | Copy exists; flow not implemented |
| Legal boundary | No legal advice, legal representation, or court outcome guarantees | Guardrail checked |
| Account deletion | Required before production | Not implemented in RN lab |
| Backend writes | No production writes from lab | Guardrail checked |

## Promotion checklist

React Native PeacePad can become a serious migration candidate only when all of these are true:

1. The current submitted PeacePad iOS release is approved or Apple review issues are resolved.
2. Current Capacitor PeacePad is tested end to end on a real iPhone.
3. This lab passes every screen in the screen-by-screen QA table on simulator.
4. This lab passes the device and accessibility matrix.
5. Backend contracts are documented for auth, binder, evidence metadata, timeline, and export.
6. Private storage architecture is approved before real upload work begins.
7. A rollback plan exists.
8. App Store privacy, child-related, user-generated-content, and AI disclosures are reviewed.

## Next QA run

Recommended next run:

1. Evidence Detail path from Vault.
2. Goal selection variants.
3. Binder validation errors.
4. Vault metadata validation errors.
5. Compose text editing.
6. Log outcome toggles.
7. Export checklist toggles.

Capture one screenshot for each passed screen and record failures in `docs/STATUS.md`.
