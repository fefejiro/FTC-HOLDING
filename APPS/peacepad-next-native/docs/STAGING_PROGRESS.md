# Native V2 staging progress

> Historical staging progress record. The authoritative current dashboard is
> [STATUS.md](STATUS.md).

Branch: `agent/peacepad-native-staging-clean`  
Draft PR: [#172](https://github.com/fefejiro/FTC-HOLDING/pull/172)  
Latest staging branch commit: `eb329c27`

Current successor: `feat/peacepad-v2-supabase-free-staging`, draft PR
[#177](https://github.com/fefejiro/FTC-HOLDING/pull/177). The authoritative
current state is maintained in [STATUS.md](STATUS.md); the rows below retain the
historical #172 baseline plus explicitly labelled successor evidence.

| Gate | Status |
| --- | --- |
| Staging environment rejects non-staging runtime | LOCAL VERIFIED |
| Fictional family and actor configuration | LOCAL VERIFIED |
| Constant-time hashed session authentication | LOCAL VERIFIED |
| Strict staging-origin CORS | LOCAL VERIFIED |
| Health and injectable readiness endpoints | LOCAL VERIFIED |
| Authenticated `/api/v2/session` | LOCAL VERIFIED |
| Idempotent staging schema contract | LOCAL VERIFIED |
| Migration failure is surfaced fail-closed | LOCAL VERIFIED |
| Runtime migrates before listen | LOCAL VERIFIED |
| Runtime stops and closes database client | LOCAL VERIFIED |
| Simulated restart verification routine | LOCAL VERIFIED |
| Typed staging session client | LOCAL VERIFIED |
| Two-fictional-account session registry | LOCAL VERIFIED |
| Two-account HTTP session handshake | LOCAL VERIFIED |
| Staging coordination client guard | LOCAL VERIFIED |
| Explicit family/permission authorization guard | LOCAL VERIFIED |
| PostgreSQL migration and restart persistence | HISTORICAL NOT STARTED - later POSTGRES VERIFIED; see STATUS.md |
| Superseded Railway staging configuration | NOT STARTED |
| AWS Canada/U.S. staging configuration | DEFERRED - funding unavailable |
| Supabase Canada/U.S. free staging boundary | LOCAL VERIFIED |
| Supabase Canadian regional project and boundary schema | DEPLOYED STAGING VERIFIED |
| Supabase U.S. regional project and boundary schema | DEPLOYED STAGING VERIFIED |
| Supabase regional API adapters | DEPLOYED STAGING VERIFIED with explicit Edge invocation pinning: Canada deploy `31427636319`, U.S. deploy `31428209000`; managed fictional journeys pass in both regions |
| Supabase atomic identity/consent/family/invitation transactions | MANAGED FICTIONAL TWO-ACCOUNT API VERIFIED independently in Canada and the U.S.; device proof pending |
| Supabase persisted messaging, calendar, and Message Check transactions | MANAGED VERIFIED in both regions for send/deliver/view, replay/conflict, default-off Message Check with explicit opt-in/preview, and shared Calendar event visibility |
| Authenticated Supabase native runtime and family onboarding | MANAGED API VERIFIED for Auth, bootstrap, wrong-region denial, invitation acceptance, and canonical conversation in both regions; native device journey pending |
| Versioned account deletion and local session invalidation | MANAGED API VERIFIED for application deletion, Auth deletion, and old-token denial in both regions; device UI proof pending |
| Decoupled Auth identity and durable cleanup outbox | DEPLOYED STAGING VERIFIED for backend surface; maintenance execution proof pending |
| Deleted-account invitation and regional metadata minimization | DEPLOYED STAGING VERIFIED for backend surface; live deletion/minimization proof pending |
| Connected-member invitation routing | MANAGED API VERIFIED for invitation acceptance and atomic canonical-conversation bootstrap in both regions; connected native routing/device UI proof pending |
| Scheduled same-session message recovery | LOCAL VERIFIED at `984b91318`; hosted checks pending |
| Private Case Binder and metadata-only attachment preparation | POSTGRES VERIFIED at `95738a841`: migrations through `202608090013` applied twice and the complete fictional transaction proof passed; managed migration and file transport remain blocked/disabled |
| Owner-private source-linked timeline | MANAGED + HOSTED + POSTGRES VERIFIED: both regions independently passed private binder isolation, disabled metadata-only attachment preparation, content-minimized message source linking, and deletion cleanup. No file bytes, arbitrary narrative, legal conclusion, or export capability was added |
| Secure foreground audio-call lifecycle | MANAGED API + HOSTED + POSTGRES VERIFIED: both regions independently passed authenticated create/accept/end with two temporary fictional accounts. Earlier `2a8aac813` proof covers grants, idempotency, concurrency, expiry, cleanup, direct-role denial, and content-free audit. Media, TURN, native call UI, Simulator, and device proof remain absent |
| Authenticated private call-signaling relay | HOSTED + POSTGRES VERIFIED at `cb92671b8`, included unchanged in descendant hosted head `d9e7dac47`: all 19 migrations applied twice on disposable PostgreSQL 18.3; complete transaction, lifecycle, and focused signaling proofs passed. Every server relay rechecks JWT-derived sender, exact region, live participant state and call version, derives the peer, and enforces strict offer/answer/ICE byte, rate, and TTL bounds. SDP/ICE is not persisted or audited. Existing Supabase private-channel authorization is cached for a connected subscription, so provider-forced disconnect is not claimed; versioned topics plus fresh relay denial ensure no post-revocation server relay. Managed Realtime deployment, media, TURN, native call UI, Simulator, and device proof remain absent |
| Native foreground audio-call API contract | HOSTED VERIFIED at `766574da8`: typed current/create/accept/decline/end and exact-version offer/answer/ICE relay operations passed 37 native suites with 291 tests and 1 skipped, 83.32% statement and 76.01% branch coverage, guardrails, secret scan, Expo checks, and iOS export in native run `31432703309`; infrastructure run `31432703360` also passed. Synthetic lifecycle tests do not claim call UI, microphone, WebRTC media, TURN, Simulator, or device proof |
| Accessible native foreground call controls | HOSTED VERIFIED at `82cb449e5`: an EN/FR/ES Calls route binds refresh/start/accept/decline/cancel/end to the authenticated runtime conversation, blocks pre-hydration and duplicate mutations, exposes semantic state, and explicitly reports media unavailable. Native run `31433573836` and infrastructure run `31433573512` passed after local typecheck, 39 suites / 294 tests / 1 skipped, 83.34% statement / 75.93% branch coverage, guardrails, and 103-file secret scan. No Realtime subscription, microphone permission, native WebRTC, TURN, audio media, Simulator, or device proof is claimed |
| Regional managed deployment | DEPLOYED STAGING VERIFIED with regional pinning at `df6ed38de`/`2c1c4a308`: hosted gates `31427335593`/`31427335775` and `31427956926`/`31427956997`; protected dry-runs `31427516196`/`31427518536`/`31428115334`; deployments `31427636319` Canada and `31428209000` U.S. All 19 migrations, `peacepad-v2-api`, public boundaries, and the bounded managed two-account contract pass. Application-schema logical restoration is verified separately below; provider Auth/platform snapshot or PITR recovery remains pending |
| Managed dual-region fictional two-account contract | MANAGED FEATURE API JOURNEY VERIFIED at `172723a57` independently in Canada and the U.S.: Auth, bootstrap, wrong-region denial, replay/conflict, invitation acceptance, message delivery/view, Message Check, shared Calendar visibility, private Records isolation/minimization/deletion cleanup, call lifecycle, post-end signal denial, deletion, and old-token denial passed. Hosted native `31428931102` and infrastructure `31428931142` passed. Temporary accounts were removed; credentials, IDs, and private content were not logged. This is not restoration, file transport, media, Simulator, device, TestFlight, or production proof |
| Managed dual-region application-schema logical restoration | MANAGED LOGICAL RESTORATION VERIFIED at `1dc3bf937` under protected main control `86961431f`: Canada run `31430532674` restored 20 tables / 143 fictional rows in 22 seconds; U.S. run `31430697958` restored 20 tables / 82 fictional rows in 19 seconds. Each read-only managed source matched its isolated ephemeral PostgreSQL 17 restore fingerprint across all 19 migrations; dumps were destroyed and only non-secret JSON evidence was retained. This is not Supabase Auth/platform, storage, Realtime, snapshot/PITR, residency, production, or real-family recovery proof |
| Accessible EN/FR/ES localization foundation | LOCAL VERIFIED at `47874810c`: typed locale fallback, secure preference persistence, accessible radio selection, and translated primary navigation/supported More-screen content passed 31 suites with 253 tests and 1 skipped. Full screen translation, linguistic review, and VoiceOver/Dynamic Type device proof remain incomplete |
| Expanded accessible localization foundations | LOCAL VERIFIED at `0800c0d72`: shared native header semantics, locale-aware Calendar and Records dates, and EN/FR/ES staging sign-out/account-deletion controls passed 34 suites with 263 tests and 1 skipped. Full feature translation, professional linguistic review, and VoiceOver/Dynamic Type device proof remain incomplete |
| Localized family invitation journey | LOCAL VERIFIED at `e8b169853`: EN/FR/ES invitation creation, sharing, QR/code guidance, preview, safe known role/permission display labels, accept/decline, connected-family safety, and success passed 34 suites with 265 tests and 1 skipped. Backend identifiers remain unchanged; linguistic review and device accessibility proof remain incomplete |
| Localized onboarding, consent, and staging authentication | LOCAL VERIFIED at `9b6221f21`: EN/FR/ES welcome, required consent, default-off AI consent, legal links, session restore/recovery, staging sign-in, family selection/create/join, and hydration passed 34 suites with 267 tests and 1 skipped. Server identifiers/errors remain unchanged; linguistic review and device accessibility proof remain incomplete |
| Localized messaging and offline recovery | LOCAL VERIFIED at `a82da66be`: EN/FR/ES Messages, default-off Message Check, search/correction, original/suggested send actions, send-state, and explicit queued retry/removal passed 35 suites with 270 tests and 1 skipped. Drafts, backend errors, idempotency, and retry behavior remain unchanged; linguistic review and device accessibility proof remain incomplete |
| Localized Calendar and Records workflows | LOCAL VERIFIED at `3035d316e`: EN/FR/ES calendar sharing/events and private binder/metadata/timeline/archive actions passed 36 suites with 273 tests and 1 skipped. Canonical layer names, backend enums, source IDs, media types, versions, and server errors remain unchanged; linguistic review and device accessibility proof remain incomplete |
| Localized Home and shared recovery states | LOCAL VERIFIED at `c9f508fe8`: EN/FR/ES Home task actions, Today summaries, family connection state, session restore, authorization loading/unavailable states, and device-check guidance passed 37 suites with 276 tests and 1 skipped. Automated page/section heading semantics passed; professional linguistic review and VoiceOver/maximum Dynamic Type device proof remain incomplete |
| Final code-level localization inventory | LOCAL VERIFIED at `070f524fe`: EN/FR/ES Foundation compose/preview/retry/reset, session and account recovery, conversation-empty invitation recovery, and duplicate deletion confirmation passed 37 suites with 282 tests and 1 skipped. Mechanical literal inventory found no additional release-critical catalogue gap; brand/user-authored/example/canonical/server-returned values and the pre-localization boot fallback remain intentional. Professional linguistic review and VoiceOver/Switch Control/Reduce Motion/maximum Dynamic Type device proof remain absent |
| Hosted CI | PeacePad-scoped PASS on PR #177 at `4fa7ba672`: native run `31364518669`, infrastructure run `31364518719`. The separate Garden workflow remains outside PeacePad scope |
| Hosted secure audio-call lifecycle CI | PeacePad-scoped PASS on PR #177 at `2a8aac813`: [native run `31419736905`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31419736905) and [infrastructure run `31419736829`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31419736829). The separate Garden workflow remains outside PeacePad scope |
| Hosted authenticated private call-signaling CI | PeacePad-scoped PASS on PR #177 for code `cb92671b8`, included unchanged in descendant head `d9e7dac47`: [native run `31421433108`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31421433108) and [infrastructure run `31421433051`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31421433051). This is hosted static, Deno, native, and PostgreSQL proof; it is not managed deployment, media, TURN, UI, Simulator, or device proof. The separate Garden workflow remains outside PeacePad scope |

This is not a production release. The native client remains a staging/lab
build with `ca.peacepad.nextnative.lab` and production writes disabled.
