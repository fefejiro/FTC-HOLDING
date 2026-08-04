# PeacePad App Store version 1.0.1 execution package

Updated: 2026-08-02

## Decision

This package prepares the next App Store metadata release without creating an
App Store version, changing the approved binary, or touching the React Native
lab. The source of truth for paste-ready fields is
`app-store-v1.0.1-metadata.json`.

The package must remain `prepared-not-submitted` until the exact Capacitor build
passes release QA. The production bundle ID remains `ca.peacepad.family`.

## Measured discovery baseline

The baseline was recorded through Apple's public Search and Lookup APIs on
2026-08-02. Search results can change over time, so these values are evidence
for prioritization rather than permanent rankings.

| Search term | Canada | United States |
|---|---:|---:|
| PeacePad | 1 | 1 |
| co parenting | 59 | Not in top 200 |
| coparenting | 62 | Not in top 200 |
| co parent communication | 50 | Not in top 200 |
| parenting calendar | 84 | Not in top 200 |
| custody communication | 39 | Not in top 200 |

Public lookup also confirmed version 1.0, Lifestyle category, zero displayed
ratings, and the July 29, 2026 release in both storefronts.

## Metadata strategy

The exact-match brand result is healthy. Category-intent discovery is weak,
especially in the United States. Version 1.0.1 therefore uses:

- `Co-Parenting` in the app name;
- distinct `Messages` and `Planning` concepts in the subtitle;
- calendar, expense, communication, custody, and coordination concepts in the
  keyword field;
- concise copy that describes only shipped behavior;
- no competitor names, court-approval language, guaranteed outcomes, or legal
  service claims.

Promotional text is useful for conversion but is not an App Store search-ranking
field. The saved 145-character text remains appropriate for version 1.0 and
1.0.1. Apple's public Canada and United States storefront pages showed the new
promotional opening and the subtitle `Calmer co-parenting tools` on 2026-08-02.

## Localization gate

- English (Canada): paste-ready after exact-build QA.
- English (United States): paste-ready after exact-build QA.
- French (Canada): draft only. A native French product/support review and
  confirmation of an adequately supported French user journey are required.
- Spanish: not included. Do not publish localized marketing before the product
  and support experience can serve that language accurately.

## Screenshot capture gate

The JSON package defines six concise screenshot stories. Each final asset must:

1. come from the exact submitted 1.0.1 build;
2. use synthetic names, messages, schedules, expenses, and account data;
3. show a populated success state rather than an empty, disabled, or error
   screen;
4. match the visible feature and wording in the submitted build;
5. preserve the PeacePad conch branding without covering the actual interface;
6. contain no court documents, legal conclusions, unshipped premium features,
   or guarantees;
7. be verified at every uploaded iPhone and iPad size.

The first three images are the search-result conversion set:

1. Pause before you send.
2. Find clearer words.
3. Prepare at your pace.

## App Store Connect sequence

Do not begin this sequence until release QA approves the exact build.

1. Create iOS version 1.0.1 under the existing PeacePad record.
2. Keep bundle ID `ca.peacepad.family` and the existing App Store ID.
3. Paste the validated English (Canada) and English (United States) metadata.
4. Set the canonical Support URL to `https://peacepad.ca/support`.
5. Upload current exact-build screenshots for every required device size.
6. Review suggested App Store tags and retain only shipped-function tags.
7. Reconcile App Privacy answers against the exact binary and embedded SDKs.
8. Confirm category choice using the final feature set; do not change it solely
   for search positioning.
9. Run `npm run verify:app-store-metadata` and the full release checks.
10. Perform one controlled TestFlight pass and archive the evidence.
11. Submit only after review credentials, notes, URLs, deletion, and privacy
    paths are reverified.

## Ratings and visibility

PeacePad currently has no displayed ratings. Version 1.0.1 may include an honest
system rating prompt only after a completed useful action. It must not appear
during onboarding, a safety flow, an error, or a tone warning; must not ask for
a positive rating; and must never offer an incentive.

After release, measure impressions, product-page views, conversion, first-time
downloads, sources, crash-free sessions, deletion friction, and support themes.
Do not start Product Page Optimization until traffic is sufficient to evaluate
one screenshot hypothesis at a time.

## Verification commands

```text
npm run verify:app-store-metadata
npm run guard:openai-secrets
git diff --check
```

## Release-environment findings

The isolated verification checkout installed the existing lockfile with Node
24.13.1, while PeacePad's production-gate workflow standardizes Node 22. A
second typecheck run under Node 22.23.2 passed. `npm ci --ignore-scripts` also
reported 38 dependency audit findings (2 low, 19 moderate, 13 high, and 4
critical).

These findings were not auto-fixed in this metadata-only branch because
`npm audit fix --force` can introduce breaking production changes. The isolated
security triage is now in draft PR #167. Its proposed lockfile reports 0
critical, 2 high, and 9 moderate findings. The two remaining high findings are
the deliberately deferred Drizzle ORM and Sharp semver-major migrations. PR
#167 now passes the equivalent clean Node 22 release gate locally: dependency
threshold, secret guards, TypeScript, 181 unit/contract tests with coverage,
production build, and Capacitor inventory. GitHub-hosted execution remains
blocked before runner allocation by the account billing lock, so #167 stays
draft and does not yet clear version 1.0.1 for release.

## Current status

| Area | Status |
|---|---|
| Version 1.0 public listing | VERIFIED |
| Exact-name discovery | VERIFIED, rank 1 in CA and US sample |
| Category-intent discovery | WEAK; baseline recorded |
| 1.0 promotional text | VERIFIED on public Canada and US storefronts |
| English 1.0.1 metadata | PREPARED AND MACHINE-VALIDATED |
| French Canadian metadata | DRAFT; HUMAN REVIEW REQUIRED |
| Six-screen storyboard | PREPARED |
| Signed 1.0.1 (2) archive | VERIFIED on Xcode 26.5 at commit `e513851363c2ae9fe903404c426774020a9af6a0` |
| First-run regression | AUTOMATED VERIFIED; 42 files / 185 tests, preview and live synthetic browser smoke pass |
| Production web shell | VERIFIED on Cloudflare Pages asset `/assets/index-DQd33p3p.js`; stale 1.0.9 modal no longer interrupts the returning simulator session |
| Exact-build screenshots | PARTIAL; iPhone 17 / iOS 26.5 compose evidence exists; one iPad Pro 13-inch / iOS 26.5 attempt booted but timed out before screenshot capture |
| Archive privacy inventory | AUTOMATED VERIFIED at commit `e513851363c2`; two empty SDK manifests, five native frameworks, and camera/microphone/photo purpose strings recorded |
| Privacy behavior contracts | AUTOMATED VERIFIED; focused privacy, reviewer-session, consent, notification, and deletion suite passes 7 files / 51 tests |
| App Privacy reconciliation | PARTIAL; deterministic archive inventory exists, but hosted-web/server answers and Apple's GUI-only Organizer PDF remain open |
| Node release runtime | VERIFIED; typecheck passes under CI-standard Node 22 |
| Dependency audit | LOCALLY VERIFIED in draft PR #167; proposed lock has 0 critical and 2 high; hosted CI is billing-blocked before runner allocation |
| App Store version 1.0.1 | NOT CREATED |
| Binary upload | NOT AUTHORIZED |
