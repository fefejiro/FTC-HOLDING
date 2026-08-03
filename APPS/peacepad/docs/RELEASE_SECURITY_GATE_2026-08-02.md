# PeacePad release security gate — 2026-08-02

## Scope

This gate covers dependency metadata for the current PeacePad React Web + Capacitor application only. It does not change application behavior, production data, the App Store record, the iOS bundle identifier, or the separate React Native lab.

## Verified baseline

- The initial full dependency audit reported 38 findings: 2 low, 19 moderate, 13 high, and 4 critical.
- A production-focused audit reported 35 findings: 3 low, 15 moderate, 13 high, and 4 critical.
- TypeScript passed under Node.js 22.23.2 before the lockfile remediation.
- Dependency ownership was traced for the direct and transitive critical/high findings before any version changes were selected.

## Safe remediation applied

The lockfile was regenerated without lifecycle scripts and without `--force`. Compatible patch/minor updates include:

- `jspdf` 4.2.1
- `multer` 2.2.0
- `express` 4.22.2
- `postcss` 8.5.25
- `vite` 7.3.6
- `ws` 8.21.1
- patched transitive releases for Axios, FormData, ProtobufJS, tar, websocket-driver, DOMPurify, body-parser, qs, brace-expansion, and related tooling

The direct dependency ranges were raised to the verified compatible minimums so a future clean install cannot silently select the known-vulnerable versions.

## Current audit result

`npm audit --package-lock-only --workspaces=false` now reports:

| Severity | Before | Current |
| --- | ---: | ---: |
| Critical | 4 | 0 |
| High | 13 | 2 |
| Moderate | 19 | 9 |
| Low | 2 | 0 |
| Total | 38 | 11 |

This is a 71% reduction in total findings, complete removal of critical findings, and an 85% reduction in high findings.

## Deliberately deferred breaking upgrades

The remaining high findings require semver-major changes in pre-1.0 packages and must not be forced into a release lockfile without application tests:

1. `drizzle-orm` 0.39.3 → 0.45.2 or newer. The database query layer needs compile, migration, authorization, and integration regression coverage.
2. `sharp` 0.34.5 → 0.35.3 or newer. Image upload, metadata removal, resizing, and output-format behavior need fixture-based tests.

The remaining moderate findings are in Firebase Admin / Google Cloud transport and UUID dependency chains. Their available remediation crosses a Firebase Admin major version or produces an unsafe ExcelJS downgrade recommendation, so they remain in the controlled migration backlog.

## Verification boundary

- Verified: lockfile consistency, registry resolution, package-lock-only audit, exact resolved versions, and no forced upgrades.
- Previously verified on this source baseline: TypeScript under Node.js 22.23.2.
- Still required in CI after these dependency changes: clean install, typecheck, unit/API tests, production build, secret scan, and Capacitor sync validation.
- Still required before merging breaking dependency work: Drizzle database integration tests and Sharp media-pipeline tests.

## Release decision

This patch-only dependency batch is suitable for isolated CI review. Do not merge the Drizzle or Sharp major upgrades into this batch, and do not change the live App Store binary solely to consume this lockfile until CI and a controlled TestFlight regression pass are green.
