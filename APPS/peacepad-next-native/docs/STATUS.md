# PeacePad Native V2 status

## Snapshot

- Snapshot date: 2026-08-10
- Branch: `feat/peacepad-v2-supabase-free-staging`
- Verified implementation baseline: `7e4aeff8e`
- Ledger evidence applies only to the exact commit listed in each row
- App version: `0.0.1`
- Staging/lab bundle: `ca.peacepad.nextnative.lab`
- Future production bundle: `ca.peacepad.family`
- Runtime boundary: lab/staging only; production API writes disabled
- Rollback product: live React Web + Capacitor PeacePad

Evidence is current only when it identifies the exact commit, command or
scenario, environment/device, timestamp, result, and artifact. Older evidence
is historical and cannot independently pass a release gate.

## Release verdict

**BLOCKED - Gate 0, the fictional database contract, authenticated native runtime, and family onboarding are HOSTED VERIFIED; the regional deployment control is registered and protected, but managed deployment still lacks the required Supabase access token, regional database URLs, and request-bound idempotency secrets.**

Native V2 is implemented partly as a synthetic/staging prototype. It is not
ready for production identity, real family information, TestFlight, or App
Store submission. The reproducible local foundation now passes. The immediate
Gate 1 now has an isolated, no-deploy Terraform foundation for Canadian and
U.S. staging. Its regional mapping, private storage/database defaults, and
credential-free plans passed locally with a mock AWS provider on PR #174. This
is not AWS or residency proof. A local PostgreSQL 18.3 custom-format backup and
restore drill now passes with fictional data, verified migration checksums,
and cleanup of both temporary databases. Both hosted workflows pass on PR #176
for the prerequisite commit. On current draft PR #177, the PeacePad native and
infrastructure workflows pass at the last hosted baseline `461f626d2` (native
run `31348281497`; infrastructure run `31348281515`). The bounded automatic
message-retry scheduler is LOCAL VERIFIED at `984b91318` and awaits hosted
verification. Request-bound idempotency receipts and content-free audit events
are POSTGRES VERIFIED at `7e4aeff8e`; managed-project reset and deployment are
still blocked on private credentials. The
overall PR remains unstable only because the unrelated Garden workflow cannot
load `@ftc/config/dist/index.js` (run `31348281500`). PR #178 registered the main-controlled
regional deployment workflow at merge commit `2feaf1f3d`; its hosted static
gate passed in run `31347432290`. Both staging environments are restricted to
`main` and require the `fefejiro` reviewer. Distinct maintenance secrets are
configured. No cloud deployment or managed restoration occurred because both
environments still lack `SUPABASE_ACCESS_TOKEN`, `DATABASE_URL`, and the new
`IDEMPOTENCY_SECRET` required by the request-bound replay contract.

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
| Gate 1: Canada/U.S. platform | 15% | 80% | HOSTED VERIFIED / DEPLOYMENT BLOCKED | The initial regional boundary schemas are deployed. Migrations `202608090001` through `202608090012` and the Edge adapter are not managed-project verified. Local PostgreSQL proof now separates request-bound encrypted replay receipts from the content-free append-only audit ledger. The main-controlled deployment workflow and protected regional environments are ready, and maintenance secrets are configured. The environments still lack `SUPABASE_ACCESS_TOKEN`, `DATABASE_URL`, and regional `IDEMPOTENCY_SECRET`; managed restoration and residency assurance remain absent | Add the missing environment secrets privately, perform the documented fictional-staging audit reset, dispatch Canadian and U.S. dry runs from `main`, review their evidence, deploy one region at a time, and run live contract checks |
| Gate 2: identity and coordination | 20% | 80% | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Supabase session restore, regional membership discovery, authenticated coordination hydration, family creation/join, invitation preview/acceptance/decline/revoke, strict invitation-link parsing and authenticated prefill, exact active-family selection, atomic accepted-family conversation bootstrap, messaging history, calendar layers/events, Message Check, versioned deletion, durable Auth cleanup, and deleted-account metadata minimization have hosted automated proof. Managed persistence and two-account device proof are absent | Deploy the regional adapter and prove the fictional two-account coordination journey against each managed project |
| Gate 3: records, evidence, exports | 15% | 5% | IMPLEMENTED | Metadata-only attachment intent; bytes and persistence disabled | Encrypted regional object storage, hashing, provenance, timeline, and independently verified export |
| Gate 4: calls, offline, parity | 15% | 12% | LOCAL VERIFIED / INCOMPLETE | A same-session, identity/region/family/conversation-scoped SecureStore message outbox retains transient and needs-action intents without automatic cross-session replay. It now schedules due retries after hydration and after a transient send is queued, preserves stored idempotency, cancels later sends on runtime loss/unmount, prevents overlapping retry batches, and avoids tight retry loops after storage failure. Users can still explicitly retry or remove needs-action intents. It remains bounded: no SQLite durable cache, connectivity listener, device proof, or calling service | Obtain hosted proof, then prove queued-message recovery on Simulator and two fictional real-device accounts before adding SQLite or calls |
| Gate 5: trust, accessibility, localization | 10% | 5% | IMPLEMENTED | Baseline only; no independent audit or translations | Security/privacy/accessibility clearance and EN/FR/ES matrix |
| Gate 6: migration and App Store | 15% | 0% | NOT STARTED | Gates 0-5 are incomplete. MacinCloud RDP access was unavailable on 2026-08-09, remaining at `Initializing`; this is an observed release-host availability failure, not a confirmed server outage or root-cause diagnosis. The credential exposed in operator-supplied evidence must be rotated before reuse | Re-establish and verify a macOS/Xcode release host, document a fallback that does not depend on the same VM, rotate the exposed credential, then complete migration/rollback rehearsal, TestFlight soak, sign-offs, and App Review submission |

Weighted implementation estimate: **about 42% production-ready**. This replaces
the earlier unverified 53% planning estimate.

## Feature dashboard

| Feature | Implementation | Evidence | Notes |
| --- | ---: | --- | --- |
| Home and task navigation | 70% | SIMULATOR VERIFIED | Welcome and consent screens are screenshot-backed on iPhone 17 / iOS 26.5; task shell and real-device proof remain pending |
| Identity, session, consent, deletion | 77% | HOSTED VERIFIED | Supabase SDK session ownership, secure chunked device storage, restore/refresh/sign-out, JWT-derived runtime bootstrap, versioned identity binding, active-membership discovery, append-only consent, audited deletion, strict deletion-receipt validation, duplicate-submit prevention, immediate local authorization removal, a content-free leased Auth-cleanup outbox, destroyed invitation secrets, removed attempt metadata, and regional-binding cleanup are implemented. Managed execution, final shared-record retention policy, and device proof remain absent |
| Secure invitations | 87% | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Hashed creation, rate-limited preview, explicit accept/decline/revoke, single-use version checks, recent code-proof enforcement, atomic participant-grant and canonical-conversation creation, exact accepted-family activation, explicit multi-family selection, strict staging-only deep-link parsing, cold/live-link race protection, cross-account code clearing, and authenticated route/prefill pass hosted automated proof. Managed deployment and two-device proof remain absent |
| Messaging and Message Check | 87% | LOCAL VERIFIED / HOSTED BASELINE | Regional conversations, immutable messages/corrections, delivery/view receipts, search, persisted per-identity/per-conversation Message Check preferences, default-off behavior, explicit opt-in/out, rule-based preview authorization, original-draft preservation, AI-consent separation, and authorization pass executable PostgreSQL proof. Idempotency is now bound to the verified identity and canonical operation/request; replay ciphertext is short-lived and encrypted, while immutable audit rows contain no response bodies or private metadata. The bounded outbox preserves original and selected drafts, keeps terminal failures visible as needs-action, prevents cross-session automatic send, supports exact-scope explicit retry/removal, and schedules bounded due retries without requiring a remount. Managed deployment and two-device delivery remain unverified |
| Calendar and parenting plans | 75% | HOSTED VERIFIED | Persisted private-by-default layers, explicit family sharing, recurrence, event visibility restriction, optimistic concurrency, idempotency, soft deletion, audit, and cross-region denial pass PostgreSQL 16 proof; deployed and device proof remain absent |
| Expenses and reimbursements | 0% | NOT STARTED | A calendar-layer label is not an expense ledger |
| Records, evidence, and exports | 20% | IMPLEMENTED | Case Binder and metadata intent only; no evidence bytes or verifiable export |
| Audio/video calls | 0% | NOT STARTED | A calendar-layer label is not a call implementation |
| Offline synchronization | 35% | LOCAL VERIFIED / HOSTED BASELINE | SecureStore queue is capped at 5 messages / 800 characters, exactly scoped to identity, auth session, region, family, and conversation, and preserves idempotency and original drafts. Due waiting entries retry after verified hydration and after later transient sends; retries obey backoff, stop at the attempt limit, serialize per runtime, cancel later sends on runtime loss/unmount, and do not tight-loop after storage failure. Terminal/auth/conflict/exhausted entries remain needs-action, explicit retry/removal remains available, and queued content clears before sign-out or after verified deletion. No SQLite cache, connectivity-triggered retry, Simulator, or real-device proof exists |
| Notifications and reminders | 0% | NOT STARTED | No production push delivery |
| Professional portal | 0% | NOT STARTED | No production portal |
| Accessibility | 25% | IMPLEMENTED | Labels/theme baseline exists; full WCAG/device audit is absent |
| English/French/Spanish | 0% | NOT STARTED | English source strings are not a localization system |
| Migration, TestFlight, and release | 0% | NOT STARTED / RELEASE HOST BLOCKED | Production bundle remains protected. Current MacinCloud access is unavailable and no fallback Xcode release host is verified |

## Verification ledger

| Verification | Commit | Environment | Date | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| Standalone clean dependency install | `f8451701` | isolated D: copy | 2026-08-06 | LOCAL VERIFIED | `npm ci --workspaces=false`; 994 packages installed from 1,006 locked records without repository-root dependencies |
| Secret and production-boundary scans | `cabd548f` | Windows local | 2026-08-06 | LOCAL VERIFIED | 73 files scanned; lab bundle and disabled production writes confirmed |
| TypeScript | `cabd548f` | Windows local | 2026-08-06 | LOCAL VERIFIED | `npm run typecheck` exited 0 |
| Jest/RNTL coverage | `cabd548f` | Windows local | 2026-08-06 | LOCAL VERIFIED | 24 suites, 139 tests; 79.60% branch and 86.00% statement coverage |
| Expo config and Doctor | `f8451701` | isolated D: copy | 2026-08-06 | LOCAL VERIFIED | Safe public config; Expo Doctor 1.20.1 passed 18/18 checks |
| Standalone iOS export | `f8451701` | isolated D: copy | 2026-08-06 | LOCAL VERIFIED | 952 modules, 17 assets, 2.58 MB Hermes bundle in D: verification cache |
| Dual-region infrastructure source scan | `cb6ca7c6` | Windows local | 2026-08-06 | LOCAL VERIFIED | 26 platform files scanned; no credential patterns found |
| Terraform formatting and validation | `cb6ca7c6` | Windows local, no backend | 2026-08-06 | LOCAL VERIFIED | Terraform 1.15.8; pinned signed AWS provider 6.58.0; module and both staging roots valid |
| Canadian/U.S. regional plans | `cb6ca7c6` | Terraform mock provider | 2026-08-06 | LOCAL MOCK-PLAN VERIFIED | `ca-central-1` and `us-east-2` plans passed 2/2; no AWS credentials or API calls |
| PostgreSQL lifecycle contract | `769c0220` | Windows local plus loopback PostgreSQL | 2026-08-06 | POSTGRES VERIFIED | A new client is required after close; migrations use a transaction-scoped advisory lock, SHA-256 checksums, and rollback on drift; 25 suites and 144 tests pass |
| Real PostgreSQL migration/restart | `769c0220` | PostgreSQL 18.3, loopback-only D: cluster | 2026-08-06 | POSTGRES VERIFIED | Fictional `peacepad_v2_staging`; two distinct `pg.Pool` lifecycles; 2 migrations persisted with valid SHA-256 checksums; focused tests 9/9 |
| Local PostgreSQL backup restoration | `b047615d` | PostgreSQL 18.3, loopback-only D: cluster | 2026-08-06 | POSTGRES VERIFIED | Custom-format dump restored into a separate temporary database; 2 fictional records, 2 migration checksums, `ca` and `us` labels, and dump SHA-256 verified; temporary databases removed; evidence written outside source on D: |
| Staging deployment prerequisites | `b047615d` | Windows local, no cloud access | 2026-08-06 | LOCAL VERIFIED | Approval manifest is fail-closed; deployment, account topology, budget, owners, and six governance approvals remain unset; remote-state templates contain placeholders only |
| Dependency audit | `769c0220` | npm audit, app-local lockfile | 2026-08-06 | BLOCKED | 0 critical, 1 transitive high, 11 moderate; high is PostCSS through Expo/Metro and npm proposes an unapproved Expo major upgrade |
| Hosted native quality gates | `769c0220` | GitHub Actions, PR #175 | 2026-08-06 | HOSTED VERIFIED | Standalone native quality gates completed successfully |
| Hosted infrastructure static gates | `cb6ca7c6` | GitHub Actions, PR #174 | 2026-08-06 | HOSTED VERIFIED | Secret scan, Terraform formatting, validation, and both regional mock plans completed successfully |
| Hosted prerequisite and native gates | `b047615d` | GitHub Actions, PR #176 | 2026-08-06 | HOSTED VERIFIED | Infrastructure format/validate/mock-plan and standalone native quality workflows both completed successfully |
| macOS native automated gates | `d938c4c5` | MacinCloud macOS 26.3.1, Node 22 | 2026-08-07 | LOCAL VERIFIED | Clean app-local install; guardrails; 75-file secret scan; TypeScript; 25 suites/144 tests; public Expo config; Expo Doctor 18/18 |
| Foundation simulator smoke | `d938c4c5` | iPhone 17 Simulator, iOS 26.5, Maestro | 2026-08-07 | SIMULATOR VERIFIED / BLOCKED | Welcome, required consent, and AI default-off passed with current screenshots. Guest compose correctly failed closed because staging is not deployed; no session or production fallback was created |
| macOS release-host availability | n/a | MacinCloud RDP | 2026-08-09 | BLOCKED | RDP remained at `Initializing` and presented an unknown-publisher warning. This does not establish the root cause or a server outage. No current Xcode, archive, TestFlight, or upload verification occurred. Rotate the credential exposed in operator evidence and verify both a primary release host and an independent fallback before Gate 6 |
| Supabase free staging boundary | `ad0cd258` | Windows local, no Supabase mutation | 2026-08-07 | LOCAL VERIFIED | Two-project regional config validates; production writes and secrets are rejected; migration denies direct mobile roles and makes audit events append-only |
| Supabase regional Edge Function boundary | `dc2f9d27` | Windows local, no cloud mutation | 2026-08-07 | LOCAL VERIFIED / DEPLOYMENT BLOCKED | JWT-derived identity, project/region checks, public health/readiness, protected session route, request IDs, safe error envelope, service-role-only RPCs, and no-content logging validated. Both regional deployment preflights pass; current Supabase CLI identity lacks project permissions |
| Supabase identity/family authorization schema | `6e45ac45` | Windows local, no cloud mutation | 2026-08-07 | LOCAL VERIFIED / DEPLOYMENT BLOCKED | Typed identity, append-only consent history, family circles, participant grants, hashed expiring invitation state, immutable identity region, indexes, and fail-closed RLS validate locally. Migration has not been applied remotely |
| Supabase atomic family/invitation transactions | `5d1d9f2e` | GitHub Actions PostgreSQL 16, no cloud mutation | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Service-role-only idempotent RPCs implement identity bootstrap, consent history, family ownership, hashed invitation lifecycle, and audited deletion. Executable PostgreSQL proof passes; managed-project execution remains blocked |
| Supabase hosted transaction contract | `7123ca4e7` | GitHub Actions PostgreSQL 16 and Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED | Run `31327985728`: Edge Function typecheck; migrations applied twice; fictional family invitation acceptance, conversation, send/deliver/view/correct/search, idempotent replay, account deletion, and revoked-access assertions passed; workflow proved it cannot deploy |
| Supabase persisted calendar contract | `a6a1f8d28` | GitHub Actions PostgreSQL 16 and Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Runs `31329165230` and `31329165250`: every migration applied twice; private layer isolation, explicit family sharing, stale-write rejection, recurrent event creation, privacy override, deletion, cross-region denial, Edge Function typecheck, native tests, Expo checks, and iOS export passed; workflow has no deployment capability |
| Supabase persisted Message Check contract | `6c90a7cde` | GitHub Actions PostgreSQL 16 and Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Runs `31330073246` and `31330073217`: every migration applied twice; Message Check default-off, explicit opt-in/out, participant isolation, account-deletion cleanup, operation-scoped idempotency, stale-write rejection, per-conversation preview authorization, third-party AI denial, Edge Function typecheck, native tests, Expo checks, and iOS export passed; workflow has no deployment capability |
| Authenticated native runtime and family onboarding | `fcbb7ce8c` | GitHub Actions native, Deno, and PostgreSQL 16, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Runs `31333087206` and `31333087208`: exact-project Supabase configuration, secure session composition, verified membership/conversation discovery, authenticated hydration, family creation/join, invitation acceptance, first-conversation creation, 183 passing tests, 77.34% branch coverage, Expo checks, iOS export, migrations applied twice, and transaction proof passed; workflows cannot deploy |
| Verified staging account lifecycle | `1ced5d914` | Windows local and GitHub Actions native, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Native run `31334389876`: TypeScript; 29 suites with 195 passing tests and 1 skipped; 78.09% branch coverage; guardrails; secret scan; Expo config; Expo Doctor 18/18; and iOS export passed. Deletion requires confirmation and identity-version concurrency, validates the receipt before sign-out, suppresses duplicate submits, remains available without a family/conversation, and fails closed without authenticated staging composition. Managed execution is unverified |
| Durable Supabase Auth cleanup lifecycle | `86e6abe0c` | GitHub Actions PostgreSQL 16 and Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Run `31335437500`: application identity no longer cascades from `auth.users`; completed-cleanup tombstones prevent migration replay from resurrecting jobs; account deletion queues one regional content-free request; wrong-region and wrong-lease attempts fail; leases expire safely; retries reschedule; successful cleanup removes operational metadata while anonymized consent/audit provenance survives Auth-principal deletion. The Edge adapter typechecks with a constant-time-secret bounded retry route and aggregate-only responses. The workflow cannot deploy |
| Deleted-account metadata minimization | `c88130981` | GitHub Actions PostgreSQL 16 and Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Run `31336096567`: every migration applied twice; account deletion revoked outstanding invitations, replaced their low-entropy code hashes with random 32-byte values, removed invitation-attempt and regional-binding metadata, retained anonymized shared/audit anchors, and passed executable transaction proof. The workflow cannot deploy |
| Warning-free authenticated runtime reloads | `0a72b2a18` | GitHub Actions native and PostgreSQL 16/Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Runs `31336812170` and `31336812147`: authenticated family creation and invitation acceptance wait for observable runtime rehydration; the native suite is free of React `act(...)` warnings; all native and infrastructure gates passed. Workflows cannot deploy |
| Explicit invitation lifecycle controls | `6aadbff92` | GitHub Actions native and PostgreSQL 16/Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Runs `31336979617` and `31336979609`: create, preview, accept, decline, and revoke invitation controls passed native and infrastructure gates. The concurrent Garden Portal workflow failure is an unrelated monorepo workflow-scoping defect and no Garden code was changed |
| Secure staging invitation links | `5b1d338d8` | Windows local and GitHub Actions native/PostgreSQL 16/Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Runs `31338156309` and `31338156303`: canonical `peacepadnextlab://invite/<code>` parsing, explicit review, live-over-cold URL ordering, listener cleanup, cross-account code clearing, 200 passing native tests with 1 skipped, guardrails, secret scan, Expo config/Doctor, iOS export, Edge validation/typecheck, repeatable migrations, and transaction proof passed. Existing-member invitation presentation and managed-project deployment remain unverified |
| Connected-member invitation routing | `99b0cd8af` | Windows local and GitHub Actions native/PostgreSQL 16/Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Runs `31338952256` and `31338952270`: an authenticated member receiving a staging invitation is routed exactly once to the prefilled invitation screen, still must select Review invitation, and cannot accept implicitly. TypeScript, 29 suites with 201 passing tests and 1 skipped, 78.64% branch coverage, guardrails, secret scan, Expo Doctor 18/18, public config, iOS export, Edge validation/typecheck, repeatable migrations, and transaction proof passed. Managed deployment remains blocked |
| Invitation code-proof and connected-family safety | `4bd5649c1` | Windows local and GitHub Actions native/PostgreSQL 16/Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Native run `31340381110` and infrastructure run `31340381106` passed: TypeScript, guardrails, 29 suites with 203 passing tests and 1 skipped, 78.71% branch coverage, secret scan, Expo/iOS checks, Edge typecheck, repeatable migrations, and executable transaction proof. Acceptance now requires a recent code-resolution attempt; connected multi-family acceptance fails closed; a failed decline remains reviewable. The unrelated Garden run `31340381137` still fails its anonymous Playwright job because `@ftc/config/dist/index.js` is missing |
| Atomic invitation acceptance and exact family switching | `5bd6c2c4f` | Windows local and GitHub Actions native/PostgreSQL 16/Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Invitation acceptance creates or reuses one canonical direct conversation in the same database transaction as the grant, returns a typed composite result, switches only after the refreshed session proves the exact accepted family and conversation, and requires explicit selection when multiple memberships exist. Native run `31341847067` and infrastructure run `31341847077` passed isolated install, TypeScript, guardrails, 29 suites with 204 passing tests and 1 skipped, 77.78% branch coverage, secret scan, Expo Doctor, iOS export, Edge typecheck, migrations applied twice, and executable transaction proof. Managed migration and two-device proof remain absent |
| Bounded offline message recovery | `d2a98075a` | Windows local and GitHub Actions native/Terraform mock, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Native run `31343203497` and infrastructure run `31343203496` passed. Local proof: TypeScript; 30 suites with 215 passing tests and 1 skipped; 78.28% branch and 84.32% statement coverage; guardrails; 85-file secret scan; Expo Doctor 18/18; public Expo config; and a 1,005-module / 3.22 MB Hermes iOS export. Exact session and family scope prevents stale-device auto-send; needs-action entries are retained; original drafts survive suggested sends; sign-out and verified deletion clear queued content. This is not SQLite-backed production offline synchronization and has no Simulator/device proof |
| Explicit queued-message recovery | `0dc68c746` | Windows local and GitHub Actions native/Terraform mock, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Native run `31345914279` and infrastructure run `31345914358` passed. Local proof: TypeScript; 30 suites with 233 passing tests and 1 skipped; 78.34% branch and 84.94% statement coverage; guardrails; 84-file secret scan; Expo Doctor 18/18; public Expo config; and a 1,005-module / 3.23 MB Hermes iOS export. Exact-scope retry reuses the stored idempotency key, double taps produce one request, terminal failures remain actionable, removal is explicitly device-local, canonical messages are reconciled after ambiguous timeouts, and refresh failures cannot misreport successful mutations. This is not SQLite-backed production offline synchronization and has no Simulator/device proof |
| Current hosted PR #177 baseline | `461f626d2` | GitHub Actions, PR #177 | 2026-08-09 | HOSTED VERIFIED / UNRELATED MONOREPO CHECK FAILED | Native run `31348281497` and infrastructure run `31348281515` passed at this exact head. The overall PR remains unstable only because Garden run `31348281500` cannot load `@ftc/config/dist/index.js`; no Garden code was changed |
| Scheduled same-session message recovery | `984b91318` | Windows local with temporary/cache files on D: | 2026-08-09 | LOCAL VERIFIED / HOSTED PENDING | TypeScript passed; all 30 Jest suites passed with 239 tests and 1 skipped; guardrails, the 84-file secret scan, and diff checks passed. Exact-scope due retries run after hydration or later enqueue, preserve idempotency/backoff, serialize per runtime, stop later sends on runtime loss/unmount, and do not tight-loop after an unhandled storage failure. This remains a bounded SecureStore staging mechanism with no Simulator/device proof |
| Request-bound replay and content-free audit | `7e4aeff8e` | Windows local plus isolated PostgreSQL 18.3, loopback-only D: cluster | 2026-08-10 | POSTGRES VERIFIED / DEPLOYMENT BLOCKED | Every migration applied twice; the complete fictional transaction proof passed. Client keys and canonical requests are HMAC-bound to identity and operation, identical retries replay while changed requests conflict, invitation codes remain deterministic across retries, response ciphertext expires after 24 hours, and append-only audit rows contain no response bodies or private metadata. Edge/static boundary validation, free-tier config validation, TypeScript, guardrails, 84-file secret scan, and all 30 native suites with 239 passing tests and 1 skipped passed. Managed reset/deployment and Deno runtime typecheck remain pending. |
| Registered regional deployment control | `2feaf1f3d` | GitHub Actions and GitHub environments, `main` | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT CREDENTIALS BLOCKED | PR #178 merged; static run `31347432290` passed. The workflow binds its control checkout to the dispatch commit and its detached target checkout dynamically to the exact reviewed PR #177 branch head, defaults to dry-run, exposes one region at a time, and keeps secrets step-scoped. Both environments are `main`-only with required reviewer `fefejiro`; distinct maintenance secrets are configured. `SUPABASE_ACCESS_TOKEN` and `DATABASE_URL` remain absent in each environment |
| Canadian Supabase fictional staging | `bcef6852` | Supabase Free, `ca-central-1` | 2026-08-07 | DEPLOYED STAGING VERIFIED (SCHEMA ONLY) | Healthy project; PostgreSQL 17.6; boundary schema applied; append-only triggers present; direct `anon`/`authenticated` table privileges absent; fictional write rolled back. API adapter, restoration, device, and production proof remain absent |
| U.S. Supabase fictional staging | `5f1ca58d` | Supabase Free, `us-east-2` | 2026-08-07 | DEPLOYED STAGING VERIFIED (SCHEMA ONLY) | Healthy company-owned project; PostgreSQL 17.6; boundary schema applied; append-only triggers present; direct `anon`/`authenticated` table privileges absent; fictional write rolled back. API adapter, restoration, device, and production proof remain absent |
| Focused staging smokes | earlier PR #172 commits | Windows local, fictional adapters | Historical | HISTORICAL EVIDENCE | `STAGING_RUNTIME_SMOKE_PASS`, `STAGING_RESTART_SMOKE_PASS`, `TWO_ACCOUNT_HTTP_SMOKE_PASS`, `SYNTHETIC_COORDINATION_JOURNEY_PASS`, `STAGING_AUTHORIZATION_SMOKE_PASS` |
| Current-branch Terraform execution | `b047615d` | Windows local after laptop restart | 2026-08-06 | BLOCKED | Terraform binary hung even on `terraform -version`; orphaned process was stopped. PR #174 hosted Terraform proof remains valid only for its earlier commit |
| Deployed regional staging, managed restoration, simulator, device, TestFlight, production | n/a | n/a | n/a | NOT STARTED | No current qualifying evidence |

## Mandatory release gates

1. Reproducible clean install and complete automated suite.
2. Deployed Canadian and U.S. staging with real PostgreSQL persistence and tested restoration.
3. Two-real-device invitation, messaging, calendar, records, call, offline, deletion, and recovery journeys.
4. Security, privacy, accessibility, localization, and dependency clearance.
5. Existing-account migration and rollback rehearsals.
6. Internal and external TestFlight verification with a seven-day release-candidate soak.
7. Product, Privacy, Security, QA, and Release sign-off before App Store submission.
