# Native V2 staging progress

> Historical staging progress record. The authoritative current dashboard is
> [STATUS.md](STATUS.md).

Branch: `agent/peacepad-native-staging-clean`  
Draft PR: [#172](https://github.com/fefejiro/FTC-HOLDING/pull/172)  
Latest staging branch commit: `eb329c27`

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
| PostgreSQL migration and restart persistence | NOT STARTED |
| Superseded Railway staging configuration | NOT STARTED |
| AWS Canada/U.S. staging configuration | DEFERRED - funding unavailable |
| Supabase Canada/U.S. free staging boundary | LOCAL VERIFIED |
| Supabase Canadian regional project and boundary schema | DEPLOYED STAGING VERIFIED |
| Supabase U.S. regional project and boundary schema | DEPLOYED STAGING VERIFIED |
| Supabase regional API adapters | HOSTED VERIFIED / DEPLOYMENT BLOCKED BY PROJECT ROLE |
| Supabase atomic identity/consent/family/invitation transactions | HOSTED VERIFIED / DEPLOYMENT BLOCKED BY PROJECT ROLE |
| Supabase persisted messaging, calendar, and Message Check transactions | HOSTED VERIFIED / DEPLOYMENT BLOCKED BY PROJECT ROLE |
| Authenticated Supabase native runtime and family onboarding | HOSTED VERIFIED / DEPLOYMENT BLOCKED BY PROJECT ROLE |
| Versioned account deletion and local session invalidation | LOCAL VERIFIED / DEPLOYMENT BLOCKED BY PROJECT ROLE |
| Decoupled Auth identity and durable cleanup outbox | LOCAL VERIFIED / DEPLOYMENT BLOCKED BY PROJECT ROLE |
| Hosted CI | PASS - PR #177, runs `31333087206` and `31333087208` on `fcbb7ce8c` |

This is not a production release. The native client remains a staging/lab
build with `ca.peacepad.nextnative.lab` and production writes disabled.
