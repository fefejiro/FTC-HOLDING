# FTC Portfolio Evidence Ledger

Last refreshed: 2026-08-10

This is the current public portfolio status source. It separates implementation, automated proof, public reachability, and release readiness. A public HTTP 200 is recorded as **LIVE SURFACE** only; it is not proof of authentication, persistence, payments, mobile delivery, or a complete customer journey.

## Evidence vocabulary

- **IMPLEMENTED:** source exists, but there is no fresh qualifying verification.
- **LOCAL VERIFIED:** automated proof passed locally on an identified revision.
- **HOSTED VERIFIED:** the scoped GitHub workflow passed on an identified revision.
- **LIVE SURFACE:** the named public URL responded successfully during this audit.
- **STAGING VERIFIED:** the stated staging boundary was exercised; this is not production proof.
- **DEVICE / TESTFLIGHT / PRODUCTION VERIFIED:** explicit proof at that release level.
- **DEGRADED:** part of the public product is reachable while a required dependency or journey is failing.
- **BLOCKED:** a named gate cannot pass until its blocker is removed.
- **UNVERIFIED:** no current qualifying evidence was found.

## Current portfolio

| Product | Current status | Evidence checked 2026-08-10 | Current boundary / next proof |
| --- | --- | --- | --- |
| Una Labs | **LIVE SURFACE** | `https://unalabs.cloud` returned 200 | Re-run authenticated intake, checkout, delivery, and admin journeys before claiming production-verified platform operation |
| Garden Cleaners | **LIVE SURFACE / QA BLOCKED** | `https://gardencleaners.ca` returned 200; current GitHub PR runs show the credentialed lane passing and anonymous Playwright lane failing | Diagnose the scoped anonymous failure, then retain client acceptance and security evidence |
| PeacePad Web | **LIVE SURFACE / ROLLBACK PRODUCT** | `https://peacepad.ca` returned 200; API root returned 404, which is not a valid health proof | Keep the existing web/Capacitor product isolated from Native V2 promotion; add a dedicated API health contract |
| PeacePad Native V2 | **HOSTED + POSTGRES VERIFIED / RELEASE BLOCKED** | Draft PR #177 native and infrastructure gates pass at the current hosted baseline; regional schema-only staging exists | Approximately 45% production-ready by the Native V2 gate model. Managed regional deployment secrets, live contract checks, restoration, two-device evidence, accessibility/localization review, TestFlight, and production approval remain open |
| SayWetin | **DEGRADED** | `https://saywetin.app` returned 200; `https://api.saywetin.app/health` returned 404 | Restore the canonical API health route, then run recognition and Android real-device proof |
| Anion | **LIVE SURFACE / RELEASE HARDENING** | `https://anion.unalabs.cloud/api/health` returned 200 | Preserve production health evidence while completing remaining payment, classroom, operational, and handover gates |
| CapSigma Growth Desk | **LIVE SURFACE / CONTROLLED OPERATIONS** | `https://capsigma-growth-desk.pages.dev` returned 200 | Keep real sends, imports, and client mutations approval-gated; verify each connector and proof ledger before turnkey claims |
| OG Trades Academy | **LIVE SURFACE / INTEGRATIONS UNVERIFIED** | `https://www.ogtradesacademy.com` returned 200 | Re-verify lead webhook, confirmation delivery, and enrollment journey before declaring the funnel production-ready |
| Dispatch | **DEMO ONLY / CANONICAL HOST BLOCKED** | Una Labs demo and status pages returned 200; `dispatch.unalabs.cloud` and `/health` returned 404 | Reconcile DNS/runtime ownership, deploy a valid health contract, and verify auth, database, and token flows |
| ATEAM | **INTERNAL / CANONICAL HOST BLOCKED** | Una Labs status page returned 200; `ateam.unalabs.cloud` returned 404 | Restore or retire the canonical host, then prove managed runtime and private operations separately |
| Gidi Dashers | **PUBLIC HOST UNAVAILABLE / UNVERIFIED** | `gidi-dashers.pages.dev` did not resolve | Confirm the canonical deployment and store listing before restoring public availability claims |
| Just Checking In Game | **UNVERIFIED / NOT LOCATED** | No matching implementation, repository path, build artifact, or deployment record was found in the current `main` tree | Add or link the canonical source and record its first build/runtime proof |
| Job Reply Agent | **ACTIVE INTERNAL AUTOMATION / RELEASE GATED** | Repository workflows and product work exist; no public SaaS readiness claim was re-verified in this audit | Count applications only with authoritative platform proof; keep authentication, immutable release, and external-provider failures explicit |

## Audit notes

- Probe time: 2026-08-10, from the operator workspace, following redirects with a 20-second timeout.
- Reachability is volatile. Re-run the portfolio checks before using this ledger for a release or sales claim.
- Draft PR status is not merged production state. PeacePad Native V2 remains staging-only even where its scoped checks pass.
- The May 2026 content in `FTC_MASTER.md` is retained as a historical strategy snapshot, not as operational truth.

## Maintenance rule

Every status update must include the date, exact surface or revision checked, evidence level, blocker, and next proof. Never convert a build, HTTP status, mock plan, or staging result into a broader production claim.
