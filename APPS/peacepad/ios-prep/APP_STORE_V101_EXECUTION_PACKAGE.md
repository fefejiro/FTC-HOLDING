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
1.0.1.

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
24.13.1. The project declares Node 22.x, so release verification must be rerun
under Node 22 before a build is approved. `npm ci --ignore-scripts` also reported
38 dependency audit findings (2 low, 19 moderate, 13 high, and 4 critical).

These findings were not auto-fixed in this metadata-only branch because
`npm audit fix --force` can introduce breaking production changes. They require
a separate dependency/security triage before version 1.0.1 release approval.

## Current status

| Area | Status |
|---|---|
| Version 1.0 public listing | VERIFIED |
| Exact-name discovery | VERIFIED, rank 1 in CA and US sample |
| Category-intent discovery | WEAK; baseline recorded |
| 1.0 promotional text | SAVED; storefront propagation pending |
| English 1.0.1 metadata | PREPARED AND MACHINE-VALIDATED |
| French Canadian metadata | DRAFT; HUMAN REVIEW REQUIRED |
| Six-screen storyboard | PREPARED |
| Exact-build screenshots | BLOCKED until tested 1.0.1 build exists |
| App Privacy reconciliation | NOT STARTED for 1.0.1 binary |
| Node release runtime | BLOCKED; verify under required Node 22.x |
| Dependency audit | BLOCKED; 4 critical and 13 high findings require triage |
| App Store version 1.0.1 | NOT CREATED |
| Binary upload | NOT AUTHORIZED |
