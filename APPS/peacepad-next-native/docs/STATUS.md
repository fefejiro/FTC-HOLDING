# PeacePad Native V2 status

## Snapshot

- Snapshot date: 2026-08-09
- Branch: `feat/peacepad-v2-supabase-free-staging`
- Verified source baseline: commit containing this document
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

**BLOCKED - Gate 0, the fictional database contract, authenticated native runtime, and family onboarding are HOSTED VERIFIED; regional API deployment remains blocked by project role.**

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
| Gate 1: Canada/U.S. platform | 15% | 80% | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Both regional boundary schemas are deployed. Hosted CI typechecks the Edge Function, applies every migration twice, and executes the PostgreSQL transaction proof through persisted calendars and Message Check. The current CLI identity still cannot update Function secrets or deploy. Managed restoration and residency assurance remain absent | Grant the CLI identity Owner/Administrator project access, apply pending migrations through `202608090006`, deploy both adapters, and run live contract checks |
| Gate 2: identity and coordination | 20% | 73% | HOSTED VERIFIED + LOCAL VERIFIED / DEPLOYMENT BLOCKED | Supabase session restore, regional membership discovery, authenticated coordination hydration, family creation/join, invitation preview/acceptance, first-conversation bootstrap, messaging history, calendar layers/events, and Message Check have hosted automated proof. Verified account deletion, optimistic concurrency, receipt validation, duplicate-submit prevention, local session invalidation, decoupled Auth/application identity lifecycle, and a leased regional Auth-cleanup outbox pass locally. Managed persistence and two-account device proof are absent | Deploy the current regional adapter, prove deletion, Auth cleanup, and the fictional two-account coordination journey against each managed project |
| Gate 3: records, evidence, exports | 15% | 5% | IMPLEMENTED | Metadata-only attachment intent; bytes and persistence disabled | Encrypted regional object storage, hashing, provenance, timeline, and independently verified export |
| Gate 4: calls, offline, parity | 15% | 2% | NOT STARTED | No calling service or durable offline database | Regional audio/video call and offline conflict/recovery device suites |
| Gate 5: trust, accessibility, localization | 10% | 5% | IMPLEMENTED | Baseline only; no independent audit or translations | Security/privacy/accessibility clearance and EN/FR/ES matrix |
| Gate 6: migration and App Store | 15% | 0% | NOT STARTED | Gates 0-5 are incomplete | Migration/rollback rehearsal, TestFlight soak, sign-offs, and App Review submission |

Weighted implementation estimate: **about 38% production-ready**. This replaces
the earlier unverified 53% planning estimate.

## Feature dashboard

| Feature | Implementation | Evidence | Notes |
| --- | ---: | --- | --- |
| Home and task navigation | 70% | SIMULATOR VERIFIED | Welcome and consent screens are screenshot-backed on iPhone 17 / iOS 26.5; task shell and real-device proof remain pending |
| Identity, session, consent, deletion | 74% | HOSTED VERIFIED + LOCAL VERIFIED | Supabase SDK session ownership, secure chunked device storage, restore/refresh/sign-out, JWT-derived runtime bootstrap, versioned identity binding, active-membership discovery, append-only consent, audited deletion, strict deletion-receipt validation, duplicate-submit prevention, immediate local authorization removal, and a content-free leased Auth-cleanup outbox are implemented. Managed execution, final shared-record retention policy, and device proof remain absent |
| Secure invitations | 78% | HOSTED VERIFIED | Hashed creation, rate-limited preview, explicit accept/decline/revoke, single-use version checks, family creation/join UI, authorization, and audit pass hosted native and executable PostgreSQL proof; deployed proof is absent |
| Messaging and Message Check | 80% | HOSTED VERIFIED | Regional conversations, immutable messages/corrections, delivery/view receipts, idempotency, search, persisted per-identity/per-conversation Message Check preferences, default-off behavior, explicit opt-in/out, rule-based preview authorization, original-draft preservation, AI-consent separation, authorization, and audit pass executable PostgreSQL proof. Managed deployment and two-device delivery remain unverified |
| Calendar and parenting plans | 75% | HOSTED VERIFIED | Persisted private-by-default layers, explicit family sharing, recurrence, event visibility restriction, optimistic concurrency, idempotency, soft deletion, audit, and cross-region denial pass PostgreSQL 16 proof; deployed and device proof remain absent |
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
| Supabase free staging boundary | this commit | Windows local, no Supabase mutation | 2026-08-07 | LOCAL VERIFIED | Two-project regional config validates; production writes and secrets are rejected; migration denies direct mobile roles and makes audit events append-only |
| Supabase regional Edge Function boundary | this commit | Windows local, no cloud mutation | 2026-08-07 | LOCAL VERIFIED / DEPLOYMENT BLOCKED | JWT-derived identity, project/region checks, public health/readiness, protected session route, request IDs, safe error envelope, service-role-only RPCs, and no-content logging validated. Both regional deployment preflights pass; current Supabase CLI identity lacks project permissions |
| Supabase identity/family authorization schema | this commit | Windows local, no cloud mutation | 2026-08-07 | LOCAL VERIFIED / DEPLOYMENT BLOCKED | Typed identity, append-only consent history, family circles, participant grants, hashed expiring invitation state, immutable identity region, indexes, and fail-closed RLS validate locally. Migration has not been applied remotely |
| Supabase atomic family/invitation transactions | this commit | GitHub Actions PostgreSQL 16, no cloud mutation | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Service-role-only idempotent RPCs implement identity bootstrap, consent history, family ownership, hashed invitation lifecycle, and audited deletion. Executable PostgreSQL proof passes; managed-project execution remains blocked |
| Supabase hosted transaction contract | `7123ca4e7` | GitHub Actions PostgreSQL 16 and Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED | Run `31327985728`: Edge Function typecheck; migrations applied twice; fictional family invitation acceptance, conversation, send/deliver/view/correct/search, idempotent replay, account deletion, and revoked-access assertions passed; workflow proved it cannot deploy |
| Supabase persisted calendar contract | `a6a1f8d28` | GitHub Actions PostgreSQL 16 and Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Runs `31329165230` and `31329165250`: every migration applied twice; private layer isolation, explicit family sharing, stale-write rejection, recurrent event creation, privacy override, deletion, cross-region denial, Edge Function typecheck, native tests, Expo checks, and iOS export passed; workflow has no deployment capability |
| Supabase persisted Message Check contract | `6c90a7cde` | GitHub Actions PostgreSQL 16 and Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Runs `31330073246` and `31330073217`: every migration applied twice; Message Check default-off, explicit opt-in/out, participant isolation, account-deletion cleanup, operation-scoped idempotency, stale-write rejection, per-conversation preview authorization, third-party AI denial, Edge Function typecheck, native tests, Expo checks, and iOS export passed; workflow has no deployment capability |
| Authenticated native runtime and family onboarding | `fcbb7ce8c` | GitHub Actions native, Deno, and PostgreSQL 16, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Runs `31333087206` and `31333087208`: exact-project Supabase configuration, secure session composition, verified membership/conversation discovery, authenticated hydration, family creation/join, invitation acceptance, first-conversation creation, 183 passing tests, 77.34% branch coverage, Expo checks, iOS export, migrations applied twice, and transaction proof passed; workflows cannot deploy |
| Verified staging account lifecycle | this commit | Windows local, isolated `C:\pp-v2-rc1` | 2026-08-09 | LOCAL VERIFIED / DEPLOYMENT BLOCKED | TypeScript; 29 suites with 195 passing tests and 1 skipped; 78.09% branch coverage; guardrails; 83-file secret scan; Expo config; Expo Doctor 18/18; iOS export; Edge boundary validation; migration static checks; Terraform validation and both regional mock plans passed. Deletion requires confirmation and identity-version concurrency, validates the receipt before sign-out, suppresses duplicate submits, remains available without a family/conversation, and fails closed without authenticated staging composition. React test output still contains non-failing `act(...)` warnings; managed execution is unverified |
| Durable Supabase Auth cleanup lifecycle | this commit | Windows local, isolated `C:\pp-v2-rc1` | 2026-08-09 | LOCAL VERIFIED / DEPLOYMENT BLOCKED | Application identity no longer cascades from `auth.users`; anonymized record anchors remain available for retained audit/shared-record provenance. Account deletion queues one regional content-free cleanup request atomically. The Edge adapter attempts cleanup immediately and exposes a separate constant-time-secret maintenance route with bounded leases, capped retry backoff, aggregate-only responses, and a free operator script. Static Edge, secret, Terraform, and regional mock-plan gates pass; executable PostgreSQL/Deno hosted proof is pending |
| Canadian Supabase fictional staging | this commit | Supabase Free, `ca-central-1` | 2026-08-07 | DEPLOYED STAGING VERIFIED (SCHEMA ONLY) | Healthy project; PostgreSQL 17.6; boundary schema applied; append-only triggers present; direct `anon`/`authenticated` table privileges absent; fictional write rolled back. API adapter, restoration, device, and production proof remain absent |
| U.S. Supabase fictional staging | this commit | Supabase Free, `us-east-2` | 2026-08-07 | DEPLOYED STAGING VERIFIED (SCHEMA ONLY) | Healthy company-owned project; PostgreSQL 17.6; boundary schema applied; append-only triggers present; direct `anon`/`authenticated` table privileges absent; fictional write rolled back. API adapter, restoration, device, and production proof remain absent |
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
