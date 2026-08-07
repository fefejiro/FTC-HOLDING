# PeacePad Native V2 status

## Snapshot

- Snapshot date: 2026-08-06
- Branch: `feat/peacepad-v2-staging-prerequisites`
- Verified source baseline: `eb329c278e5bb6f43cfa723f55449ebcc6172220`
- Gate evidence applies to the commit containing this status document
- App version: `0.0.1`
- Staging/lab bundle: `ca.peacepad.nextnative.lab`
- Future production bundle: `ca.peacepad.family`
- Runtime boundary: lab/staging only; production API writes disabled
- Rollback product: live React Web + Capacitor PeacePad

Evidence is current only when it identifies the exact commit, command or
scenario, environment/device, timestamp, result, and artifact. Older evidence
is historical and cannot independently pass a release gate.

## Release verdict

**BLOCKED — Gate 0 is HOSTED VERIFIED; Gate 1 has local PostgreSQL proof only.**

Native V2 is implemented partly as a synthetic/staging prototype. It is not
ready for production identity, real family information, TestFlight, or App
Store submission. The reproducible local foundation now passes. The immediate
Gate 1 now has an isolated, no-deploy Terraform foundation for Canadian and
U.S. staging. Its regional mapping, private storage/database defaults, and
credential-free plans passed locally with a mock AWS provider on PR #174. This
is not AWS or residency proof. A local PostgreSQL 18.3 custom-format backup and
restore drill now passes with fictional data, verified migration checksums,
and cleanup of both temporary databases. Both hosted workflows pass on PR #176
for the prerequisite commit. No cloud deployment or managed restoration occurred.

## Evidence vocabulary

- **IMPLEMENTED:** source exists but has no fresh qualifying verification.
- **LOCAL VERIFIED:** fresh automated proof on the exact commit.
- **HOSTED VERIFIED:** the scoped GitHub workflow executed and passed.
- **LOCAL MOCK-PLAN VERIFIED:** deterministic infrastructure plans passed with
  a mock provider; no cloud account or live service was contacted.
- **POSTGRES VERIFIED:** proof against an isolated real PostgreSQL instance.
- **DEPLOYED STAGING VERIFIED:** proof against the deployed regional staging rail.
- **SIMULATOR VERIFIED:** current screenshot-backed iOS Simulator proof.
- **DEVICE VERIFIED:** current real-device proof.
- **TESTFLIGHT VERIFIED:** current installed TestFlight build proof.
- **PRODUCTION VERIFIED:** observed production proof after an approved release.
- **HISTORICAL EVIDENCE:** valid only for the earlier commit and stated scope.
- **BLOCKED:** implementation or verification cannot proceed until its blocker is removed.
- **NOT STARTED:** no qualifying implementation exists.

## Weighted release gates

Progress is informative; readiness is binary and remains blocked until every
mandatory gate passes.

| Gate | Weight | Implementation | Evidence | Current blocker | Next proof |
| --- | ---: | ---: | --- | --- | --- |
| Gate 0: reproducible foundation | 10% | 100% | HOSTED VERIFIED | None for this gate | Retain hosted logs and keep the workflow green |
| Gate 1: Canada/U.S. platform | 15% | 45% | POSTGRES VERIFIED locally | No approved AWS account topology, regional deployment, managed backup restoration, or residency proof | Approve account topology and cost controls, then deploy isolated staging for regional and restoration tests |
| Gate 2: identity and coordination | 20% | 25% | HISTORICAL EVIDENCE | Current flows use fictional/in-memory adapters | Two fictional accounts against deployed staging, then audited V1 identity migration |
| Gate 3: records, evidence, exports | 15% | 5% | IMPLEMENTED | Metadata-only attachment intent; bytes and persistence disabled | Encrypted regional object storage, hashing, provenance, timeline, and independently verified export |
| Gate 4: calls, offline, parity | 15% | 2% | NOT STARTED | No calling service or durable offline database | Regional audio/video call and offline conflict/recovery device suites |
| Gate 5: trust, accessibility, localization | 10% | 5% | IMPLEMENTED | Baseline only; no independent audit or translations | Security/privacy/accessibility clearance and EN/FR/ES matrix |
| Gate 6: migration and App Store | 15% | 0% | NOT STARTED | Gates 0–5 are incomplete | Migration/rollback rehearsal, TestFlight soak, sign-offs, and App Review submission |

Weighted implementation estimate: **about 24% production-ready**. This replaces
the earlier unverified 53% planning estimate.

## Feature dashboard

| Feature | Implementation | Evidence | Notes |
| --- | ---: | --- | --- |
| Home and task navigation | 70% | SIMULATOR VERIFIED | Welcome and consent screens are screenshot-backed on iPhone 17 / iOS 26.5; task shell and real-device proof remain pending |
| Identity, session, consent, deletion | 25% | IMPLEMENTED | Device/staging sessions exist; production identity, migration, and deletion are incomplete |
| Secure invitations | 55% | LOCAL VERIFIED | Explicit preview/acceptance tests pass against fictional adapters; deployed proof is absent |
| Messaging and Message Check | 60% | LOCAL VERIFIED | Rule-based preview, correction, and search tests pass; deployed delivery is unverified |
| Calendar and parenting plans | 55% | LOCAL VERIFIED | Layered views and sharing tests pass against fictional state |
| Expenses and reimbursements | 0% | NOT STARTED | A calendar-layer label is not an expense ledger |
| Records, evidence, and exports | 20% | IMPLEMENTED | Case Binder and metadata intent only; no evidence bytes or verifiable export |
| Audio/video calls | 0% | NOT STARTED | A calendar-layer label is not a call implementation |
| Offline synchronization | 10% | IMPLEMENTED | Bounded local outbox work exists; SQLite/conflict recovery is absent |
| Notifications and reminders | 0% | NOT STARTED | No production push delivery |
| Professional portal | 0% | NOT STARTED | No production portal |
| Accessibility | 25% | IMPLEMENTED | Labels/theme baseline exists; full WCAG/device audit is absent |
| English/French/Spanish | 0% | NOT STARTED | English source strings are not a localization system |
| Migration, TestFlight, and release | 0% | NOT STARTED | Production bundle remains protected |

## Verification ledger

| Verification | Commit | Environment | Date | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| Standalone clean dependency install | this commit | isolated D: copy | 2026-08-06 | LOCAL VERIFIED | `npm ci --workspaces=false`; 994 packages installed from 1,006 locked records without repository-root dependencies |
| Secret and production-boundary scans | this commit | Windows local | 2026-08-06 | LOCAL VERIFIED | 73 files scanned; lab bundle and disabled production writes confirmed |
| TypeScript | this commit | Windows local | 2026-08-06 | LOCAL VERIFIED | `npm run typecheck` exited 0 |
| Jest/RNTL coverage | this commit | Windows local | 2026-08-06 | LOCAL VERIFIED | 24 suites, 139 tests; 79.60% branch and 86.00% statement coverage |
| Expo config and Doctor | this commit | isolated D: copy | 2026-08-06 | LOCAL VERIFIED | Safe public config; Expo Doctor 1.20.1 passed 18/18 checks |
| Standalone iOS export | this commit | isolated D: copy | 2026-08-06 | LOCAL VERIFIED | 952 modules, 17 assets, 2.58 MB Hermes bundle in D: verification cache |
| Dual-region infrastructure source scan | this commit | Windows local | 2026-08-06 | LOCAL VERIFIED | 26 platform files scanned; no credential patterns found |
| Terraform formatting and validation | this commit | Windows local, no backend | 2026-08-06 | LOCAL VERIFIED | Terraform 1.15.8; pinned signed AWS provider 6.58.0; module and both staging roots valid |
| Canadian/U.S. regional plans | this commit | Terraform mock provider | 2026-08-06 | LOCAL MOCK-PLAN VERIFIED | `ca-central-1` and `us-east-2` plans passed 2/2; no AWS credentials or API calls |
| PostgreSQL lifecycle contract | this commit | Windows local plus loopback PostgreSQL | 2026-08-06 | POSTGRES VERIFIED | A new client is required after close; migrations use a transaction-scoped advisory lock, SHA-256 checksums, and rollback on drift; 25 suites and 144 tests pass |
| Real PostgreSQL migration/restart | this commit | PostgreSQL 18.3, loopback-only D: cluster | 2026-08-06 | POSTGRES VERIFIED | Fictional `peacepad_v2_staging`; two distinct `pg.Pool` lifecycles; 2 migrations persisted with valid SHA-256 checksums; focused tests 9/9 |
| Local PostgreSQL backup restoration | this commit | PostgreSQL 18.3, loopback-only D: cluster | 2026-08-06 | POSTGRES VERIFIED | Custom-format dump restored into a separate temporary database; 2 fictional records, 2 migration checksums, `ca` and `us` labels, and dump SHA-256 verified; temporary databases removed; evidence written outside source on D: |
| Staging deployment prerequisites | this commit | Windows local, no cloud access | 2026-08-06 | LOCAL VERIFIED | Approval manifest is fail-closed; deployment, account topology, budget, owners, and six governance approvals remain unset; remote-state templates contain placeholders only |
| Dependency audit | this commit | npm audit, app-local lockfile | 2026-08-06 | BLOCKED | 0 critical, 1 transitive high, 11 moderate; high is PostCSS through Expo/Metro and npm proposes an unapproved Expo major upgrade |
| Hosted native quality gates | `769c0220` | GitHub Actions, PR #175 | 2026-08-06 | HOSTED VERIFIED | Standalone native quality gates completed successfully |
| Hosted infrastructure static gates | `cb6ca7c6` | GitHub Actions, PR #174 | 2026-08-06 | HOSTED VERIFIED | Secret scan, Terraform formatting, validation, and both regional mock plans completed successfully |
| Hosted prerequisite and native gates | `b047615d` | GitHub Actions, PR #176 | 2026-08-06 | HOSTED VERIFIED | Infrastructure format/validate/mock-plan and standalone native quality workflows both completed successfully |
| macOS native automated gates | `d938c4c5` | MacinCloud macOS 26.3.1, Node 22 | 2026-08-07 | LOCAL VERIFIED | Clean app-local install; guardrails; 75-file secret scan; TypeScript; 25 suites/144 tests; public Expo config; Expo Doctor 18/18 |
| Foundation simulator smoke | `d938c4c5` | iPhone 17 Simulator, iOS 26.5, Maestro | 2026-08-07 | SIMULATOR VERIFIED / BLOCKED | Welcome, required consent, and AI default-off passed with current screenshots. Guest compose correctly failed closed because staging is not deployed; no session or production fallback was created |
| Focused staging smokes | earlier PR #172 commits | Windows local, fictional adapters | Historical | HISTORICAL EVIDENCE | `STAGING_RUNTIME_SMOKE_PASS`, `STAGING_RESTART_SMOKE_PASS`, `TWO_ACCOUNT_HTTP_SMOKE_PASS`, `SYNTHETIC_COORDINATION_JOURNEY_PASS`, `STAGING_AUTHORIZATION_SMOKE_PASS` |
| Current-branch Terraform execution | this commit | Windows local after laptop restart | 2026-08-06 | BLOCKED | Terraform binary hung even on `terraform -version`; orphaned process was stopped. PR #174 hosted Terraform proof remains valid only for its earlier commit |
| Deployed regional staging, managed restoration, simulator, device, TestFlight, production | n/a | n/a | n/a | NOT STARTED | No current qualifying evidence |

## Mandatory release gates

1. Reproducible clean install and complete automated suite.
2. Deployed Canadian and U.S. staging with real PostgreSQL persistence and tested restoration.
3. Two-real-device invitation, messaging, calendar, records, call, offline, deletion, and recovery journeys.
4. Security, privacy, accessibility, localization, and dependency clearance.
5. Existing-account migration and rollback rehearsals.
6. Internal and external TestFlight verification with a seven-day release-candidate soak.
7. Product, Privacy, Security, QA, and Release sign-off before App Store submission.
