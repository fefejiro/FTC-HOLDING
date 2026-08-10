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
| Supabase regional API adapters | HOSTED VERIFIED / DEPLOYMENT CREDENTIALS BLOCKED |
| Supabase atomic identity/consent/family/invitation transactions | HOSTED VERIFIED / DEPLOYMENT CREDENTIALS BLOCKED |
| Supabase persisted messaging, calendar, and Message Check transactions | HOSTED VERIFIED / DEPLOYMENT CREDENTIALS BLOCKED |
| Authenticated Supabase native runtime and family onboarding | HOSTED VERIFIED / DEPLOYMENT CREDENTIALS BLOCKED |
| Versioned account deletion and local session invalidation | HOSTED VERIFIED / DEPLOYMENT CREDENTIALS BLOCKED |
| Decoupled Auth identity and durable cleanup outbox | HOSTED VERIFIED / DEPLOYMENT CREDENTIALS BLOCKED |
| Deleted-account invitation and regional metadata minimization | HOSTED VERIFIED / DEPLOYMENT CREDENTIALS BLOCKED |
| Connected-member invitation routing | HOSTED VERIFIED for exact active-family selection and atomic accepted-family conversation bootstrap; managed deployment pending |
| Scheduled same-session message recovery | LOCAL VERIFIED at `984b91318`; hosted checks pending |
| Private Case Binder and metadata-only attachment preparation | POSTGRES VERIFIED at `95738a841`: migrations through `202608090013` applied twice and the complete fictional transaction proof passed; managed migration and file transport remain blocked/disabled |
| Owner-private source-linked timeline | HOSTED + POSTGRES VERIFIED at `4fa7ba672`: migrations through `202608100001` applied twice; message/calendar source authorization, content minimization, idempotency, owner isolation, and deletion cleanup passed. No file bytes, arbitrary narrative, legal conclusion, or export capability was added; managed deployment remains blocked |
| Accessible EN/FR/ES localization foundation | LOCAL VERIFIED at `47874810c`: typed locale fallback, secure preference persistence, accessible radio selection, and translated primary navigation/supported More-screen content passed 31 suites with 253 tests and 1 skipped. Full screen translation, linguistic review, and VoiceOver/Dynamic Type device proof remain incomplete |
| Expanded accessible localization foundations | LOCAL VERIFIED at `0800c0d72`: shared native header semantics, locale-aware Calendar and Records dates, and EN/FR/ES staging sign-out/account-deletion controls passed 34 suites with 263 tests and 1 skipped. Full feature translation, professional linguistic review, and VoiceOver/Dynamic Type device proof remain incomplete |
| Localized family invitation journey | LOCAL VERIFIED at `e8b169853`: EN/FR/ES invitation creation, sharing, QR/code guidance, preview, safe known role/permission display labels, accept/decline, connected-family safety, and success passed 34 suites with 265 tests and 1 skipped. Backend identifiers remain unchanged; linguistic review and device accessibility proof remain incomplete |
| Localized onboarding, consent, and staging authentication | LOCAL VERIFIED at `9b6221f21`: EN/FR/ES welcome, required consent, default-off AI consent, legal links, session restore/recovery, staging sign-in, family selection/create/join, and hydration passed 34 suites with 267 tests and 1 skipped. Server identifiers/errors remain unchanged; linguistic review and device accessibility proof remain incomplete |
| Localized messaging and offline recovery | LOCAL VERIFIED at `a82da66be`: EN/FR/ES Messages, default-off Message Check, search/correction, original/suggested send actions, send-state, and explicit queued retry/removal passed 35 suites with 270 tests and 1 skipped. Drafts, backend errors, idempotency, and retry behavior remain unchanged; linguistic review and device accessibility proof remain incomplete |
| Hosted CI | PeacePad-scoped PASS on PR #177 at `4fa7ba672`: native run `31364518669`, infrastructure run `31364518719`. The separate Garden workflow remains outside PeacePad scope |

This is not a production release. The native client remains a staging/lab
build with `ca.peacepad.nextnative.lab` and production writes disabled.
