# Native V2 staging progress

Branch: `agent/peacepad-native-staging-clean`  
Draft PR: [#172](https://github.com/fefejiro/FTC-HOLDING/pull/172)  
Latest commit: `b48ee14e`

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
| PostgreSQL migration and restart persistence | NOT STARTED |
| Railway staging configuration | NOT STARTED |
| Hosted CI | HOSTED CI BLOCKED BEFORE EXECUTION when monorepo workflow is scoped incorrectly |

This is not a production release. The native client remains a staging/lab
build with `ca.peacepad.nextnative.lab` and production writes disabled.
