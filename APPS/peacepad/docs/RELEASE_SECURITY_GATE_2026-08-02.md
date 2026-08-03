# PeacePad release security gate - 2026-08-02

## Scope

This gate covers dependency metadata and pull-request validation for the current PeacePad React Web + Capacitor application only. It does not change application behavior, production data, the App Store record, the iOS bundle identifier, or the separate React Native lab.

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

`npm run verify:dependency-audit` reports:

| Severity | Before | Current |
| -------- | -----: | ------: |
| Critical |      4 |       0 |
| High     |     13 |       2 |
| Moderate |     19 |       9 |
| Low      |      2 |       0 |
| Total    |     38 |      11 |

This is a 71% reduction in total findings, complete removal of critical findings, and an 85% reduction in high findings.

## Pull-request validation repair

The PeacePad workflow now runs a clean Node.js 22 install, the dependency regression gate, tracked-source secret scanning, TypeScript, unit/contract tests with V8 coverage, a production web/API build, and a Capacitor configuration check.

The first local coverage run found two CI defects and both are repaired in this branch:

1. `@vitest/coverage-v8` was missing even though the workflow requested coverage. It is now pinned to 4.1.5 to match Vitest exactly.
2. An iOS review source-contract test depended on Linux line endings. Source reads now normalize CRLF to LF without weakening the reviewer-session assertions.

## Local Node.js 22 verification - 2026-08-02

| Gate                | Result             | Evidence                                                                                                                                                                  |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean install       | PASS               | `npm ci --workspaces=false` completed from the exact lockfile after the coverage-provider repair; fresh-tree package manifests confirm Vitest 4.1.5 and coverage-v8 4.1.5 |
| Dependency baseline | PASS               | 0 critical, 2 high, 9 moderate, 0 low; total 11                                                                                                                           |
| Secret scan         | PASS               | tracked-source scan and guard self-test both passed                                                                                                                       |
| TypeScript          | PASS               | `npm run check` under Node.js 22.23.2                                                                                                                                     |
| Tests               | PASS               | 41/41 files and 181/181 tests                                                                                                                                             |
| Coverage            | MEASURED           | 12.20% statements, 12.84% branches, 14.19% functions, 12.38% lines                                                                                                        |
| Production build    | PASS WITH WARNINGS | web and API bundles built; no stale `REPLIT_DOMAINS` output                                                                                                               |
| Capacitor config    | PASS               | iOS and Android each list App 7.1.2, Push Notifications 7.0.6, and Status Bar 7.0.6                                                                                       |

The coverage number is a baseline measurement, not a production-readiness claim. The generated main web chunk is 813.07 kB, which is 30.88 kB above the current soft target. Both coverage expansion and bundle reduction remain explicit follow-up work.

## Hosted CI status

GitHub Actions run [30782193745](https://github.com/fefejiro/FTC-HOLDING/actions/runs/30782193745) did not allocate a runner. GitHub reported: `The job was not started because your account is locked due to a billing issue.` The job has `runner_id=0` and no executed steps, so the red check is an external account/billing block rather than a code or test failure.

No attempt was made to bypass GitHub billing or misrepresent the hosted check. PR #167 remains draft until an independent clean runner completes successfully or the GitHub account lock is resolved.

## Deliberately deferred breaking upgrades

The remaining high findings require semver-major changes in pre-1.0 packages and must not be forced into a release lockfile without application tests:

1. `drizzle-orm` 0.39.3 to 0.45.2 or newer. The database query layer needs compile, migration, authorization, and integration regression coverage.
2. `sharp` 0.34.5 to 0.35.3 or newer. Image upload, metadata removal, resizing, and output-format behavior need fixture-based tests.

The remaining moderate findings are in Firebase Admin / Google Cloud transport and UUID dependency chains. Their available remediation crosses a Firebase Admin major version or produces an unsafe ExcelJS downgrade recommendation, so they remain in the controlled migration backlog.

## Verification boundary

- Verified locally: lockfile consistency, registry resolution, dependency regression threshold, exact resolved versions, secret guards, TypeScript, 181 unit/contract tests, V8 coverage generation, production web/API build, and Capacitor plugin discovery.
- Externally blocked: GitHub-hosted runner execution because of the account billing lock.
- Not performed in this dependency-only batch: production deployment, App Store changes, a replacement iOS binary, or a controlled TestFlight regression pass.
- Still required before breaking dependency work: Drizzle database integration tests and Sharp media-pipeline tests.

## Release decision

This patch-only dependency batch is suitable for isolated review but must remain draft while hosted CI is externally unavailable. Do not merge the Drizzle or Sharp major upgrades into this batch. Do not change the live App Store binary solely to consume this lockfile; first obtain an independent clean-runner result and complete a controlled TestFlight regression pass.
