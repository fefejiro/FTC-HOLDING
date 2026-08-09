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
| Supabase regional API adapters | HOSTED VERIFIED / DEPLOYMENT BLOCKED BY PROJECT ROLE |
| Supabase atomic identity/consent/family/invitation transactions | HOSTED VERIFIED / DEPLOYMENT BLOCKED BY PROJECT ROLE |
| Supabase persisted messaging, calendar, and Message Check transactions | HOSTED VERIFIED / DEPLOYMENT BLOCKED BY DEPLOYMENT IDENTITY |
| Authenticated Supabase native runtime and family onboarding | HOSTED VERIFIED / DEPLOYMENT BLOCKED BY PROJECT ROLE |
| Versioned account deletion and local session invalidation | HOSTED VERIFIED / DEPLOYMENT BLOCKED BY PROJECT ROLE |
| Decoupled Auth identity and durable cleanup outbox | HOSTED VERIFIED / DEPLOYMENT BLOCKED BY PROJECT ROLE |
| Deleted-account invitation and regional metadata minimization | HOSTED VERIFIED / DEPLOYMENT BLOCKED BY PROJECT ROLE |
| Connected-member invitation routing | HOSTED VERIFIED for exact active-family selection and atomic accepted-family conversation bootstrap; managed deployment pending |
| Hosted CI | PeacePad-scoped PASS on PR #177 at `5bd6c2c4f`: native run `31341847067`, infrastructure run `31341847077`. The separate Garden workflow remains outside PeacePad scope |

This is not a production release. The native client remains a staging/lab
build with `ca.peacepad.nextnative.lab` and production writes disabled.
