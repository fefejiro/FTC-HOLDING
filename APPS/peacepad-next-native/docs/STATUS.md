# PeacePad Native V2 status

## Snapshot

- Snapshot date: 2026-08-12
- Branch: `feat/peacepad-v2-supabase-free-staging`
- Verified implementation baseline: `4bde06e651d00de25c30ba48e50e9557619ccb31`
- Ledger evidence applies only to the exact commit listed in each row
- App version: `0.0.1`
- Guarded internal TestFlight candidate: `2.0.0` (`2`)
- Guarded Android store candidate: `2.0.0` (`42`)
- Staging/lab bundle: `ca.peacepad.nextnative.lab`
- Future production bundle: `ca.peacepad.family`
- Runtime boundary: native app lab/staging only; Canada production Edge writes disabled
- Rollback product: live React Web + Capacitor PeacePad

Evidence is current only when it identifies the exact commit, command or
scenario, environment/device, timestamp, result, and artifact. Older evidence
is historical and cannot independently pass a release gate.

## Release verdict

**BLOCKED - Gate 0 is HOSTED VERIFIED and both replacement regional fictional-staging projects are DEPLOYED STAGING VERIFIED for all 20 migrations, the regional Edge API, public boundaries, a managed fictional two-account feature contract, and read-only application-schema logical restoration. Canada now also has a separately deployed production Edge adapter with an empty hardened schema, public health/readiness, and an explicit global write lock; it is not connected to the native app or legacy users. One exact EAS Simulator artifact from source `2fe8ca82b` is now screenshot-backed SIMULATOR VERIFIED against both Canada and U.S. staging: each protected journey authenticated two temporary fictional accounts, mutated native messaging and Calendar state, proved second-account visibility, removed both application/Auth accounts, and destroyed both Simulators. The D:-backed app-only pipeline uploads about 1.7 MB instead of cloning the multi-gigabyte monorepo and requires an explicit accessible pre-auth region choice from the same binary. The Apple team, distribution certificate, and provisioning profile are now configured for existing bundle `ca.peacepad.family`; the current internal TestFlight profile remains fictional staging with production writes disabled. On 2026-08-12, EAS accepted the exact 1.8 MB signed-build upload but refused to queue it because the account's free iOS build allocation is exhausted until 2026-09-01. The same day, the guarded Android `2.0.0` (`42`) profile produced a signed store-distribution AAB for `ca.peacepad.family`, but it retains fictional staging, disabled production writes, and no Play Console upload path. No TestFlight upload, Google Play publication, App Store submission, or production V2 cutover occurred. MacinCloud is past due but is not on the active EAS/GitHub release path. Provider-level Auth/platform snapshot or PITR recovery, a reviewed reversible existing-account migration, invitation/Message Check/deletion/offline native journeys, TURN capacity and live media, real-device journeys, assistive-technology and trust reviews, TestFlight, Google Play, and App Store release remain incomplete.**

### Current signed-build attempt — 2026-08-12

The Apple Developer team is linked to the approved EAS project and its existing
PeacePad App Store record. The local online preflight verified the App Store
record, EAS owner, and all six public fictional-staging variables. The
D:-backed launcher then verified the exact native Git tree, uploaded a 1.8 MB
app-only archive, and passed the configured remote credential selection for
`ca.peacepad.family`. EAS stopped before build creation with its free-plan iOS
quota message: the allocation resets on 2026-09-01. The profile still uses
fictional staging and disables production writes; it contains no auto-submit.
No build ID, TestFlight build, public App Store update, or production data
change exists from this attempt.

### Current Android signed-build attempt -- 2026-08-12

Exact source `4bde06e651d00de25c30ba48e50e9557619ccb31` adds the guarded
`playstore-internal` profile: existing public package `ca.peacepad.family`,
version `2.0.0` / version code `42`, store distribution, diagnostics disabled,
fictional staging runtime, and production API writes disabled. Its local
TypeScript, 46 suites / 341 passed / 1 skipped, 82.69% statement / 76.13%
branch coverage, guardrails, 126-file secret scan, and diff checks passed.
Exact-source Native run `31638564353` and Infrastructure run `31638564516`
passed. Main-controlled run `31640303014` bound that SHA, used the approved
PeacePad Android signing material ephemerally, and completed EAS build
`b9069a81-4bb5-4c37-88de-b1e39bd0b756`; EAS returned a store-distribution AAB
artifact. The preceding identical build `cfd6a1fe-f940-496c-8874-61722d9568e8`
failed before Gradle ran because its remote wrapper download ended unexpectedly;
it is non-qualifying and did not indicate an app or signing defect. No
`PEACEPAD_PLAY_SERVICE_ACCOUNT_JSON` is configured, the workflow has no
Google Play upload step, and no Play Console track, tester, public release, or
production data contact occurred.

### Current legacy-to-V2 cutover rehearsal -- 2026-08-12

Exact commit `e35ec103e` adds an operator-only importer for an approved,
read-only legacy snapshot and proves it on a disposable PostgreSQL target.
The importer requires a reviewed Supabase Auth claim for every legacy user,
timestamped consent evidence or re-consent, explicit partnership scope for
every conversation and event, and text-only retained messages. It fails closed
for missing claims, ambiguous scopes, media/deleted message content, malformed
IDs, or a non-fresh target. The fictional rehearsal imported two claimed
identities, three consent records, one family, two grants, one conversation,
one text message, one Calendar layer, and one event; it then rolled the whole
transaction back. Hosted Native run `31630730421` and Infrastructure rerun
`31630730410` passed on that exact commit; the earlier Infrastructure attempt
failed before code execution while downloading Deno. This is LOCAL + HOSTED
POSTGRES rehearsal evidence only. It does not read, copy, or change production
records, establish a Canada production project, approve cutover, enable V2
production writes, or migrate any existing account.

### Read-only legacy source inventory contract -- 2026-08-12

Exact commit `e7a03d38c` adds a separate operator-run inventory for the legacy
`peacepad` PostgreSQL schema. It requires an explicit legacy database URL and a
new evidence file path, opens the source with both client and SQL-level
read-only protections, and emits only source schema metadata, required-column
gaps, aggregate table counts, a schema fingerprint, and whether an event has
an explicit partnership scope. It emits no IDs, email addresses, message text,
event titles, or other family content; it cannot contact a V2 target and
refuses to overwrite evidence.

Hosted Native run `31634808106` and Infrastructure run `31634808261` passed
the exact static boundary. A separate disposable PostgreSQL 18 legacy-schema
fixture then completed the runner: it emitted the expected content-free JSON,
left the two fixture users and one message unchanged, and created no inventory
tables; its cluster and evidence directory were removed afterward.

On 2026-08-12, an authenticated Railway command supplied the legacy service's
database connection to an equivalent one-transaction read-only inventory
without printing the connection value. It returned only aggregate metadata:
110 users, 54 partnerships, 54 conversations, 108 conversation memberships,
380 messages, and 162 events; all required source columns were present and the
source fingerprint was `a7dd689913cba7031082eb5c4708c52c`. The report contained
no user content. Most importantly, `eventsPartnershipScopeAvailable` was
`false`: legacy events have no explicit partnership identifier, so event import
must remain blocked pending a separately reviewed scope mapping. A second
content-free, read-only ambiguity summary found all 162 legacy events have a
creator and exactly one creator partnership; none had zero or multiple
candidate partnerships. This makes a reviewed derived-scope mapping possible,
but does not convert it into an approved mapping or remove the importer's
fail-closed requirement. No credential is stored in this workspace. This is
real-source read-only inventory evidence, not migration approval,
production-data movement, a recovery rehearsal, or permission to enable V2
writes.

### Canada production database baseline -- 2026-08-12

The empty, isolated Canada Supabase production project
`qzekqjewpugdotskrtni` is ACTIVE_HEALTHY in `ca-central-1`. Its initial
provisioning credentials were intentionally discarded before any application
configuration after they were exposed in an operator terminal. The fresh
database password is held only in the operator's Windows credential vault.

All 20 reviewed V2 schema migrations plus hardening migration
`202608120001_v2_production_search_path_hardening.sql` are applied. A
read-only Management API query verified 20 pre-existing migrations before the
hardening migration, and the final Supabase Security Advisor result is zero
WARN/ERROR findings. Its 20 informational `rls_enabled_no_policy` notices are
intentional: direct `anon` and `authenticated` access is revoked and the
schema is designed to be reached only through a server-side authorization
adapter.

This is an **empty production schema baseline**, not a public Native V2
release. No legacy account or family data was read, copied, or changed; no V2
public/publishable key has been configured; the native app remains hard-coded
to lab/staging and continues to disable production writes. PITR is not enabled
on the current plan, so this database must not receive real family information
until an approved recovery path, a real production runtime, and the reviewed
reversible migration gates are complete.

### Canada production Edge adapter -- 2026-08-12

Exact commit `d61f0cd4c` adds a separate Canada-only deployment runner for
`qzekqjewpugdotskrtni`; it verifies that exact active `ca-central-1` project,
sets the runtime to `production`, allows only `https://peacepad.ca` and
`https://www.peacepad.ca` browser origins, and deploys `peacepad-v2-api`.
The runner explicitly sets `PEACEPAD_PRODUCTION_WRITES_ENABLED=false`; the
function rejects every `POST`, `PATCH`, `PUT`, and `DELETE` before authentication
or a database mutation with `503 PRODUCTION_WRITES_DISABLED`.

After deployment, public `GET /functions/v1/peacepad-v2-api/health` and
`/readyz` both returned `200` with `environment: production`, `region: ca`, and
`writesEnabled: false`; a direct `POST /api/v2/invitations` returned the expected
write-lock response. Hosted Native run `31634029734` and Infrastructure run
`31634029761` passed for the exact source. This is a deployed production
**boundary**, not a user-facing launch: the schema remains empty, no native
release points to it, there is no public key/client configuration, and no
legacy account/data migration or production write enablement has occurred.

## Real production cutover audit — 2026-08-12

The existing public web and API service is reachable again. The verified
Railway origin is workspace `Peace Pad's Projects`, project `lively-simplicity`,
service `@ftc/peacepad`, running from `fefejiro/FTC-HOLDING` at
`ftcpeacepad-production.up.railway.app`. Railway's free-plan custom-domain
limit prevented direct binding of `api.peacepad.ca`, so the zone operator
enabled Cloudflare proxying for the existing API record and the retained
`peacepad-api-origin-proxy` Worker now forwards only to that verified origin.
On 2026-08-12, public `GET https://api.peacepad.ca/api/health` and
`GET https://api.peacepad.ca/v2/health` returned 200; unauthenticated
`GET /api/auth/me` returned the expected 401; and `https://peacepad.ca/`
returned 200. This restores the existing service, not V2.

Native V2 is a separate Expo/Supabase application model. The current public
Capacitor app uses the same bundle ID but a legacy Express/PostgreSQL API and
schema, so changing a runtime environment flag would strand existing accounts
and data. A real V2 release requires: restoring or re-homing the legacy source
of truth; a reviewed, reversible existing-account/data migration or compatible
API bridge; a real Canada production Supabase project with backups and a
non-staging write boundary; and Apple signing/release completion. The one
approved production-source operation so far is the content-free read-only
inventory described above; no records were copied, changed, or deleted.

The legacy Supabase source project `aaaextkrfoqomzmjjkxe` was inactive but
still present. On 2026-08-12, the authenticated Management API accepted its
documented restore request. To release the free active-project slot, the user
authorized pausing (not deleting) the U.S. fictional-staging project
`spmpndalcvwmygznihec`; its data and configuration remain recoverable. During
the legacy restore, the database hostname began resolving again and the direct
running PeacePad service reported `database.reachable: true` from `/v2/health`.
The subsequent approved read-only inventory returned aggregates only; no
production record content was read, copied, changed, or deleted. The legacy
public app no longer has an API-hostname outage. It remains the rollback product
until V2 has a reviewed, reversible migration and release path. During an
earlier provider audit, stored environment secrets were returned to the local
terminal; treat those values as exposed and rotate them before a production
release.

On 2026-08-12, the operator-path public production checks passed against
`https://peacepad.ca` and `https://api.peacepad.ca`: endpoint/ownership checks
confirmed the intentional Cloudflare public edge plus a Railway origin request
identifier, and the self-cleaning guest journey proved consent rejection,
consented guest creation with optional AI off, session access, deletion, and
post-deletion session invalidation. The temporary guest was deleted by that
same run. Hosted production-gate run `31633263453` is non-qualifying: all
public routes returned Cloudflare 403 from the GitHub-hosted runner before the
application, not an application failure. The zone must explicitly permit that
runner or a separately controlled monitoring origin before hosted public-edge
evidence can pass. This evidence concerns the live legacy rollback product,
not Native V2.

### No-cost API-hostname recovery attempt — 2026-08-12

The authenticated Cloudflare account has Workers route-write permission but
only zone-read permission. A minimal `peacepad-api-origin-proxy` Worker was
deployed at route `api.peacepad.ca/*`; it proxies only to the verified Railway
service domain and does not contact the database directly. Public requests
continued to return the existing Railway fallback because the current `api`
record is DNS-only and therefore bypasses Cloudflare. A Worker custom-domain
claim was also attempted and rejected because `api.peacepad.ca` already has an
externally managed A/CNAME record. The Worker route is retained but dormant;
no DNS record, Railway domain, application data, or unrelated domain was
deleted or altered. Restoring the public hostname without paid Railway requires
either DNS-edit permission in the actual `peacepad.ca` zone to proxy or replace
that stale `api` record, or access to the external DNS manager that owns it.
The current Cloudflare token cannot perform that DNS write, so there is no safe
CLI-only bypass of the ownership boundary.

### Public legacy API recovery — 2026-08-12

The zone operator changed the existing `api.peacepad.ca` record to Cloudflare
proxied. The retained `peacepad-api-origin-proxy` Worker route then began
serving the existing hostname without a paid Railway custom-domain upgrade.
At Cloudflare Worker version `c8ea62d5-cb1a-4359-a3d9-67d3912bdf47`, public
`GET https://api.peacepad.ca/api/health` returned 200, authenticated-browser
CORS preflight from `https://peacepad.ca` returned 204 with the exact allowed
origin and credentials, and an unauthenticated `GET /api/auth/me` correctly
returned 401. Public `/v2/health` returned 200 with
`database.reachable: true`. The public web origin also returned 200. This
restores the existing legacy web/Capacitor application backend only; it is not
a Native V2 App Store release, a V2 data migration, a signed iOS build, or
TestFlight/App Store evidence.

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
infrastructure workflows pass at the current hosted baseline `4fa7ba672`
(native run `31364518669`; infrastructure run `31364518719`). The bounded
automatic message-retry scheduler is included in that hosted proof.
Request-bound idempotency receipts and content-free audit events are POSTGRES
VERIFIED at `7e4aeff8e`. Private Case Binder persistence and metadata-only
attachment preparation are POSTGRES VERIFIED at `95738a841`. The owner-private,
metadata-only source timeline is POSTGRES and HOSTED VERIFIED at `4fa7ba672`;
managed-project migrations and the regional API are now deployed to both
replacement fictional-staging projects. A bounded managed two-account proof
now passes independently in both regions for authentication, identity
bootstrap, wrong-region denial, request-bound replay/conflict, invitation
acceptance, message delivery/view, foreground call lifecycle, post-end signal
denial, account deletion, and old-token denial. Temporary fictional Auth
accounts were removed. Fresh read-only managed-source logical restoration of
the `peacepad_v2` application schema now passes independently for Canada and
the U.S. at exact feature commit `638a45e52`, using protected main control
`10cc5a6e`. Runs `31455099468` and `31455203892` restored all 20 migrations
and every application table into isolated ephemeral PostgreSQL 17 targets,
matched deterministic source/restore fingerprints, destroyed the dumps, and
never contacted production. Canada restored 20 tables / 143 fictional rows in
21 seconds; the U.S. restored 20 tables / 82 fictional rows in 34 seconds.
This is not Supabase Auth recovery, provider snapshot/PITR proof, residency
certification, or production disaster recovery.
The exact lab build from Native V2 commit `ac354a878` is now installed and
SIMULATOR VERIFIED on an isolated iOS 26.2 managed runner in run `31459876677`.
Screenshot inspection confirms the welcome and required-consent screens remain
below the system status area, required consent controls are visible, optional
AI assistance is off, and opening consent creates no account or family data.
This proof is limited to install, cold launch, welcome, and consent navigation;
it is not authenticated coordination, accessibility-assistive-technology,
audio, real-device, signing, TestFlight, or production proof.
Current regional Simulator proof is now anchored to exact Native V2 source
`ed109707c`, whose local typecheck, 44 suites / 326 passed / 1 skipped,
82.61% statement / 76.07% branch coverage, guardrails, 117-file secret scan,
and diff checks passed; exact-source native run `31473683027` and
infrastructure run `31473683087` also passed. Canada EAS build
`83c67df2-3507-42cf-967c-6f30873dbf40` (26,647,798 bytes; SHA-256
`179602779ab400db28d769d53875a3aec469cdee89ac90b55353e804ceba3872`)
passed main-controlled Simulator run `31475994805`. U.S. EAS build
`8ef54e01-91bf-4edd-bffe-61074c95ea94` (26,647,758 bytes; SHA-256
`081ebbaedf21941534b721afb0cea35fc97349b56384866200c6ca1051d8849d`)
passed run `31476831202`. Both iOS 26.2 runs verified the exact project
mapping, regional label, staging safety copy, keyboard-reachable sign-in, and
live invalid-credential response using only fictional `@example.test`
credentials; both uploaded screenshots/manifests and destroyed their isolated
Simulators. They created no account, mutated no application data, and never
contacted production. This is not a successful authenticated session,
coordination journey, assistive-technology audit, physical-device, signing,
TestFlight, or production proof.
Exact current source `82cfd5365` fixes verified-session routing by sending the
same fail-closed region and schema headers used by every other native API
request. Local TypeScript, 44 suites / 327 passed / 1 skipped, 82.61%
statement / 76.05% branch coverage, guardrails, a 117-file secret scan, and
diff checks passed; exact-source native run `31518294005` and infrastructure
run `31518294008` also passed. Canada EAS build
`25cf99f0-dafc-4a65-b7e7-d715ea7a82ab` (26,647,675 bytes; SHA-256
`eab39471a4438c918bfa9a54ba16a08a19c76b23c84a3fcfc2da6e1a55dd08f7`)
passed protected run `31525616385`. U.S. EAS build
`51c8250c-426a-4763-a5f5-2414d327de68` (26,647,552 bytes; SHA-256
`0898fba8a4c28ed5893b0e15f25c5ca8b0c78780671ee5430d20cb918043e3a7`)
passed protected run `31528365464`. Each iOS 26.2 run created two temporary
fictional `@example.test` Auth accounts, prepared one shared family and
conversation, proved both native sessions reached the authenticated Home
state, removed both application identities and Auth users, destroyed both
Simulators, retained no credential, captured no private content, and never
contacted production. This hydration proof is not invitation UI, feature
mutation, offline recovery, call media, assistive-technology, physical-device,
signing, TestFlight, or production proof. The same exact builds then advanced
through protected full-cross-account runs. Canada run `31543957169`, under main
control `904ae46e8`, and U.S. run `31546225501`, under corrected main control
`b720ccb7f`, each authenticated two temporary fictional accounts into one
shared family/conversation, sent a native message, created a native shared
Calendar event, and proved the second account could observe the coordination
state. Downloaded manifests and screenshots were independently inspected.
Both runs removed both application identities and Auth users, destroyed both
Simulators, retained no credential or private content, and never contacted
production. U.S. predecessor run `31545264571` is explicitly non-qualifying:
its message mutation passed but an unnecessary cross-flow UI assertion stopped
the Calendar flow; cleanup still passed. PR #221 removed only that stale
viewport dependency and reused the identical U.S. source, build, URL, and
SHA-256. These journeys do not prove invitation, Message Check, deletion,
offline recovery, call media, assistive technology, physical devices, signing,
TestFlight, or production.
The release pipeline now removes the compile-time one-region artifact split.
Exact source `2fe8ca82b` packages only the clean native app Git tree into
`D:\PeacePadRelease`, reuses the existing dependency installation without
copying it to C:, skips only EAS automatic fingerprint traversal after an exact
tree-object check, and uploaded about 1.7 MB to build the dual-region Simulator
artifact `b0ede52e-21db-4f93-8b74-018c6033b1ff`. The resulting 26,653,811-byte
archive has SHA-256
`84155cb8ac234cd8442a17bdbb25daec74ffc7b10881e1bed56406b74209f970`.
Canada protected run `31554747960` under control `3df8d174a` and U.S. protected
run `31557228680` under control `cc2a7121e` each selected the correct staging
region from that same exact artifact, authenticated two temporary fictional
accounts, sent and rendered a message, created and rendered a shared Calendar
event, proved second-account visibility, removed both application/Auth
accounts, and destroyed both Simulators. Downloaded manifests, cleanup records,
and screenshots were independently inspected. No credential or private content
was retained, production was not contacted, and this is not physical-device,
signed, TestFlight, or production proof. The first U.S. attempt
`31555505066` was non-qualifying after a delayed iOS password-save sheet blocked
Calendar navigation; cleanup passed, and PR #225 hardened only the protected
Simulator control before the same-artifact success.
The remaining feature/device journeys remain pending. The
persisted one-to-one foreground audio-call lifecycle is POSTGRES and HOSTED
VERIFIED at `2a8aac813`: exact JWT identity, region, active family grants, and
the locked canonical two-person conversation authorize create, accept,
decline, end, expiry, and current-state operations. This is lifecycle evidence
only. Authenticated server-relayed private signaling authorization is POSTGRES
and HOSTED VERIFIED at `cb92671b8`, included unchanged in descendant hosted
head `d9e7dac47` (infrastructure run `31421433051`; native run
`31421433108`). Every relay rechecks JWT-derived sender identity, region, live
call participation and version, bounded signal schema, rate, and TTL; the
server derives the peer, and SDP/ICE is not persisted or audited. Supabase
caches private-channel authorization for an existing subscription, so this is
not provider-forced disconnect proof; versioned topics plus server-side denial
ensure no subsequent server-relayed message after revocation. The native app
now has a microphone-only Expo development-build configuration, a pinned M124
WebRTC adapter, relay-only authenticated TURN validation, exact private-topic
subscription with current Supabase JWT authorization, and strict live
peer-to-local signal-envelope checks at hosted commit `ab4c28c8b`. The provider
directory still marks this WebRTC package untested on React Native New
Architecture, so it remains an explicit device-test exception rather than a
compatibility claim. Hosted commit `c2b8f7788` now wires an accepted exact-version
call to short-lived TURN retrieval, the authenticated private Realtime topic,
relay-only WebRTC offer/answer/ICE, automatic ringing-state refresh, localized
connection state, and teardown on call/runtime change. This remains automated
orchestration proof: regional TURN authorization is deployed but provider URLs
and secrets remain unconfigured, and
authenticated managed-Realtime delivery, Simulator, device media, audible
audio, interruption, and background/CallKit proof remain absent. The exact-scope SecureStore message outbox
now observes Expo network state at hosted commit `5393be74c`: an explicit
offline state suppresses hydration and scheduled sends without consuming a
retry, and reconnect re-arms the existing bounded backoff for the same identity,
session, region, family, and conversation. This remains automated behavior only,
not SQLite synchronization or Simulator/device recovery proof. The
regional API and native client now also share a fail-closed short-lived TURN
contract at hosted commit `aca95d452`. PostgreSQL rechecks the exact active
call participant, region, grants, and version but receives no TURN material.
The Edge issuer supports only bounded credential-free `turn:`/`turns:` URLs,
derives a five-minute pseudonymous Coturn username, and signs it with a
server-only shared secret; the native request requires the verified call
version. Migration `202608100004` and this Edge route are now deployed to both
fictional-staging projects at exact target `9c423dc5a`; no TURN provider URLs or
shared secrets are configured, so issuance still fails closed and no
relay/media claim is made. The
overall PR remains unstable only because the unrelated Garden workflow cannot
load `@ftc/config/dist/index.js` (run `31360811004`). PR #178 registered the main-controlled
regional deployment workflow at merge commit `2feaf1f3d`; its hosted static
gate passed in run `31347432290`. Both staging environments are restricted to
`main` and require the `fefejiro` reviewer. Distinct maintenance secrets are
configured. Both regional `IDEMPOTENCY_SECRET` slots were securely configured
at `2026-08-10T18:45:45Z`; no secret value was read or recorded. No provider
snapshot/PITR or Supabase Auth restoration occurred. The replacement projects
`rohvkyuxbnqzglaromms` (Canada, `ca-central-1`) and
`spmpndalcvwmygznihec` (U.S., `us-east-2`) are active and healthy under the
company organization. All four protected environment secret slots exist in
each region, and the public regional staging configuration is present. Both
session poolers authenticate. Protected dry-runs passed in runs `31424479269`
(Canada) and `31424590161` (U.S.) against exact Native V2 commit `1ff6f64c7`.
Run `31427636319` deployed and publicly verified the regional-invocation fix in
Canada; run `31428209000` did the same in the U.S. The native client and managed
verifier now explicitly invoke Edge in `ca-central-1` for Canada and `us-east-1`
for the U.S., while the U.S. database remains in `us-east-2`. The complete
bounded managed journey passed in each region with only fictional temporary
accounts and content; cleanup removed both accounts after each run. The later
protected deployments `31453587604` (Canada) and `31453722930` (U.S.) applied
migration `202608100004`, redeployed the exact reviewed Edge digest, and passed
public live boundaries against immutable target `9c423dc5a`. Their non-secret
manifests identify all 20 migration hashes and
`DEPLOYED_STAGING_VERIFIED`. The later
managed-source logical drill proves application-schema recovery only; it does
not prove provider snapshot/PITR, Supabase Auth recovery, residency assurance,
complete Calendar/Records/offline journeys, Realtime media, or real-device
behavior. The earlier project refs
remain paused/recoverable historical evidence, not active runtime targets.

## Evidence vocabulary

- **IMPLEMENTED:** source exists but has no fresh qualifying verification.
- **LOCAL VERIFIED:** fresh automated proof on the exact commit.
- **HOSTED VERIFIED:** the scoped GitHub workflow executed and passed.
- **LOCAL MOCK-PLAN VERIFIED:** deterministic infrastructure plans passed with
  a mock provider; no cloud account or live service was contacted.
- **POSTGRES VERIFIED:** proof against an isolated real PostgreSQL instance.
- **DEPLOYED STAGING VERIFIED:** proof against the deployed regional staging rail.
- **MANAGED LOGICAL RESTORATION VERIFIED:** read-only managed application-schema
  source data restored into a separate ephemeral PostgreSQL target with exact
  migration, table, row-count, and deterministic content-fingerprint proof.
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
| Gate 1: Canada/U.S. platform | 15% | 95% | DEPLOYED STAGING + MANAGED LOGICAL RESTORATION VERIFIED / PROVIDER RECOVERY PENDING | Active mappings target replacement projects `rohvkyuxbnqzglaromms` in `ca-central-1` and `spmpndalcvwmygznihec` in database region `us-east-2`; old refs fail closed. Native/API calls explicitly pin supported Edge regions `ca-central-1` and `us-east-1`. Protected deployments `31453587604` and `31453722930` applied all 20 migrations through `202608100004`, deployed the same reviewed Edge digest, and passed public regional boundaries at exact target `9c423dc5a`. Fresh protected drills `31455099468` and `31455203892` independently restored the complete 20-migration application schema from each read-only managed source into ephemeral PostgreSQL 17, matched deterministic fingerprints, and destroyed the dumps. Supabase Auth/platform snapshot or PITR recovery and formal residency assurance remain absent | Document and prove the provider-level Auth/platform backup or PITR recovery path available to the selected plan, then retain periodic application-schema restoration drills |
| Gate 2: identity and coordination | 20% | 97% | DEPLOYED STAGING + ONE-ARTIFACT DUAL-REGION NATIVE COORDINATION SIMULATOR + MANAGED API JOURNEY VERIFIED | Both managed projects independently pass identity bootstrap, replay/conflict, invitation acceptance with canonical conversation creation, message delivery/view, default-off Message Check and explicit opt-in/preview, shared Calendar visibility, deletion, and old-token denial. Exact source `2fe8ca82b` and EAS build `b0ede52e-21db-4f93-8b74-018c6033b1ff` now prove the same hash-verified binary can require an explicit pre-auth region choice, authenticate two temporary fictional accounts per region, mutate a message and shared Calendar event, and expose the resulting coordination state to the second account on isolated iOS 26.2 Simulators, followed by complete application/Auth cleanup and Simulator destruction in runs `31554747960` and `31557228680`. Invitation, Message Check, deletion, offline, and recovery interactions were not exercised through the native UI; real-device journeys remain absent | Extend the protected two-Simulator journey through invitation, Message Check, deletion, offline, and recovery, then repeat the critical path on two real devices |
| Gate 3: records, evidence, exports | 15% | 38% | MANAGED PRIVATE-RECORD CONTRACT VERIFIED / FILE PIPELINE ABSENT | Both regions independently pass owner-private Case Binder isolation, disabled metadata-only attachment preparation, content-minimized message timeline linking, and owner-deletion cleanup. Object storage, malware scanning, file bytes, evidence integrity, export, Simulator, and device proof remain absent | Separately design and approve encrypted object storage, malware-scanned upload, integrity receipts, and verifiable export |
| Gate 4: calls, offline, parity | 15% | 60% | DEPLOYED TURN AUTHORIZATION + MANAGED LIFECYCLE + HOSTED NATIVE MEDIA/OFFLINE CONTRACTS / PROVIDER AND DEVICE JOURNEYS INCOMPLETE | The same-session exact-scope outbox suppresses sends while explicitly offline and re-arms bounded retry after reconnect. Both managed regions proved call lifecycle/post-end signal denial. The native client has accessible EN/FR/ES controls, microphone-only M124 WebRTC, authenticated private-topic signaling, exact envelope checks, relay-only ICE, and active-call media orchestration. Migration `202608100004` and the updated Edge issuer are deployed in both regions; exact-version authorization is live but intentionally fails closed because no regional TURN provider URLs or shared secrets are configured. SQLite, New Architecture compatibility, and native recovery/media require device proof | Select and configure regional TURN capacity, verify short-lived relay allocation and managed Realtime delivery, then prove accessible audible audio and queued-message recovery on Simulator and two devices |
| Gate 5: trust, accessibility, localization | 10% | 80% | LOCAL + FOUNDATION MAX-TEXT/DARK + AUTHENTICATED FEATURE SIMULATOR VERIFIED / DEVICE AND REVIEW BLOCKED | Semantic navigation, shared screen-heading roles, persisted locale selection, and EN/FR/ES code-level coverage span welcome/consent/authentication, family invitations, messaging/offline recovery, Calendar sharing/events, Records binders/metadata/timeline/archive, Home task actions/summaries, Foundation compose, and account/session recovery. Current iOS 26.2 screenshots verify standard and dark welcome/consent layouts, default-off optional AI, maximum-system-category text under the explicit 200% app cap, keyboard-reachable CA/U.S. staging sign-in, and authenticated messaging/Calendar screens. VoiceOver, Switch Control, Reduce Motion, real-device journeys, independent WCAG/privacy/security, and professional linguistic review remain absent | Run VoiceOver, Switch Control, Reduce Motion, and real-device proof, then obtain independent trust and professional EN/FR/ES review |
| Gate 6: migration and App Store | 15% | 38% | GUARDED INTERNAL TESTFLIGHT CONTRACT + D:-BACKED ONE-ARTIFACT DUAL-REGION SIMULATOR VERIFIED / EAS BUILD QUOTA, MIGRATION, AND RELEASE GATES BLOCKED | Gates 0-5 are incomplete. Exact source `2fe8ca82b` produced one hash-verified EAS Simulator artifact through an app-only D:-backed upload; protected runs `31554747960` and `31557228680` selected Canada and U.S. respectively from that identical artifact and proved authenticated native messaging/Calendar coordination across two fictional accounts per region plus complete cleanup. The exact store profile resolves to PeacePad `2.0.0` build `2`, existing bundle `ca.peacepad.family`, and existing Apple ID `6793350735`; the six reviewed CA/U.S. public staging variables remain value-contract verified, with production writes disabled. On 2026-08-12 the approved `official_fejiro` account successfully configured the Apple distribution certificate and provisioning profile for Apple team `G6UNC88GQ5`, then EAS accepted the 1.8 MB signed-build upload but refused to queue a build because the free iOS allocation is exhausted until 2026-09-01. No signed artifact, submit, TestFlight, device, or production proof exists. MacinCloud is past due and optional; EAS plus protected GitHub macOS remains the active path | On or after the EAS reset, rerun the signed build with the configured Apple credentials, inspect the candidate before submitting it to the existing App Store record, then install through internal TestFlight, complete migration/rollback and device journeys, soak, sign-offs, and App Review |

Weighted implementation estimate: **about 72% implemented across the weighted
gates**. Release readiness remains binary and blocked; this corrects the stale
estimate after the managed regional, restoration, localization, call, offline,
and dual-region native coordination slices advanced.

## Feature dashboard

| Feature | Implementation | Evidence | Notes |
| --- | ---: | --- | --- |
| Home and task navigation | 90% | DUAL-REGION AUTHENTICATED + FOUNDATION ACCESSIBILITY SIMULATOR VERIFIED | Exact source `82cfd5365` reached the authenticated Home state for two temporary fictional accounts in each region in runs `31525616385` and `31528365464`; inspected screenshots show the Home task shell, Today section, primary navigation, and Audio call action. Foundation standard/dark/maximum-text evidence remains anchored to run `31463447618`. Native task mutations, assistive technology, and real-device proof remain pending |
| Identity, session, consent, deletion | 90% | DUAL-REGION AUTHENTICATED SIMULATOR + MANAGED FICTIONAL JOURNEY VERIFIED | Both regions independently passed API-level Auth sign-in, identity bootstrap, application deletion, Auth deletion, and old-token denial. Exact source `82cfd5365` now proves two successful authenticated native session hydrations per region into the same verified family/conversation, followed by deletion of all four temporary application identities and Auth users and destruction of all Simulators. Native deletion UI and real-device proof remain incomplete |
| Secure invitations | 91% | MANAGED TWO-ACCOUNT API VERIFIED / DEVICE PENDING | Both regions independently passed invitation creation/acceptance and canonical-conversation bootstrap with temporary fictional accounts. Native Simulator and two-device journeys remain absent |
| Messaging and Message Check | 94% | DUAL-REGION NATIVE MESSAGE SIMULATOR + MANAGED MESSAGE CHECK VERIFIED / DEVICE PENDING | Protected runs `31543957169` and `31546225501` sent a fictional native message and proved the shared coordination state on the second Simulator in each region. Both managed regions also pass replay/conflict, send/deliver/view, default-off Message Check, explicit opt-in, and authorized preview. Corrections/search and the bounded outbox retain hosted contracts; native Message Check, offline recovery, and physical-device proof remain unverified |
| Calendar and parenting plans | 86% | DUAL-REGION NATIVE SHARED CALENDAR SIMULATOR + MANAGED API VERIFIED / DEVICE PENDING | Protected runs `31543957169` and `31546225501` created a fictional native shared Calendar event and proved it visible on the second Simulator in each region. Recurrence, privacy override, concurrency, deletion, and audit retain hosted/PostgreSQL proof; full native lifecycle and physical-device proof remain absent |
| Expenses and reimbursements | 0% | NOT STARTED | A calendar-layer label is not an expense ledger |
| Records, evidence, and exports | 55% | MANAGED PRIVATE-RECORD CONTRACT VERIFIED / FILE PIPELINE ABSENT | Both regions independently passed owner-private binder isolation, disabled metadata-only attachment intent, content-minimized source linking, and owner-deletion cleanup. No bytes, object storage, malware scanning, evidence hashing, integrity receipt, or export exists |
| Audio/video calls | 75% | DEPLOYED AUTHORIZATION + MANAGED LIFECYCLE + HOSTED NATIVE MEDIA ORCHESTRATION / LIVE MEDIA JOURNEY ABSENT | Both regions independently passed authenticated call lifecycle and post-end signaling denial. The native client maps strictly versioned lifecycle, TURN, and offer/answer/ICE operations and exposes accessible EN/FR/ES controls. A microphone-only Expo development build, M124 adapter, exact private Supabase subscription, strict signal validation, automatic acceptance refresh, exact-version TURN retrieval, caller/callee offer-answer orchestration, ICE relay, connection-state UI, and teardown pass hosted checks. The deployed Edge contract derives five-minute pseudonymous Coturn credentials only after fresh active-call authorization and never stores TURN material in PostgreSQL. Regional TURN capacity, URLs/secrets, relay allocation, managed Realtime delivery, reconnection/interruption, Simulator, audible device audio, background/CallKit, and video remain absent |
| Offline synchronization | 45% | HOSTED VERIFIED / DEVICE PROOF ABSENT | SecureStore queue is capped at 5 messages / 800 characters, exactly scoped to identity, auth session, region, family, and conversation, and preserves idempotency and original drafts. Expo Network now prevents hydration/scheduled attempts while explicitly offline and re-arms the same bounded queue after reconnect; unknown reachability preserves the prior fail-operational behavior. Retries obey backoff, stop at the attempt limit, serialize per runtime, cancel on runtime loss/unmount, and do not tight-loop after storage failure. Terminal/auth/conflict/exhausted entries remain needs-action, explicit retry/removal remains available, and queued content clears before sign-out or verified deletion. No SQLite cache, Simulator, or real-device recovery proof exists |
| Notifications and reminders | 0% | NOT STARTED | No production push delivery |
| Professional portal | 0% | NOT STARTED | No production portal |
| Accessibility | 60% | FOUNDATION MAX-TEXT/DARK SIMULATOR + LOCAL VERIFIED / DEVICE PROOF ABSENT | Existing roles, state, large-text layout, dark-mode palettes, and WCAG AA contrast tests now include one screen-reader target per primary tab, a labelled tablist, shared native header semantics across onboarding/runtime/primary screens, an assertive modal alert for destructive account confirmation, and 48-point language radio controls with checked state. iOS 26.2 visual evidence verifies standard/dark welcome and consent plus the maximum system accessibility text category under a 200% app cap, with horizontally contained words/controls and scroll-reachable actions. VoiceOver, Switch Control, Reduce Motion, authenticated screens, and real-device audits remain absent |
| English/French/Spanish | 92% | LOCAL + HOSTED VERIFIED / HUMAN REVIEW ABSENT | Typed EN/FR/ES catalogues translate navigation, welcome/consent/authentication, the pre-auth regional data choice, family setup/invitations, messaging/recovery, Calendar sharing/privacy/layers/events, Records binders/attachment metadata/timeline/archive, Home task actions/summaries, Foundation compose/preview/retry, account and session recovery, locale-aware dates, and staging account controls. Canonical domain values, user-authored content, server-returned errors, identifiers, filenames/media types, and the pre-localization boot boundary remain intentionally unchanged. Mechanical source inventory found no further release-critical catalogue gap; professional linguistic review is absent |
| Migration, TestFlight, and release | 40% | GUARDED INTERNAL TESTFLIGHT CONTRACT + D:-BACKED ONE-ARTIFACT DUAL-REGION SIMULATOR VERIFIED / EAS BUILD QUOTA AND RELEASE GATES BLOCKED | Exact source `2fe8ca82b` packages the clean native app Git tree on D:, avoids copying dependencies or cloning the multi-gigabyte monorepo, and produced one exact Simulator artifact that passed authenticated Canada and U.S. coordination journeys. The current store-distribution candidate resolves to version `2.0.0` (`2`), existing bundle `ca.peacepad.family`, and Apple ID `6793350735`, while retaining fictional dual-region staging, disabled diagnostics, and disabled production writes. The approved EAS account now has the Apple distribution certificate and provisioning profile for team `G6UNC88GQ5`; EAS accepted the app-only signed-build upload on 2026-08-12 but refused to queue it until its free iOS allocation resets on 2026-09-01. No signed artifact, physical-device install, TestFlight, submit, migration, or production proof exists. MacinCloud is past due and optional; EAS plus protected GitHub macOS is the active path |

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
| Native media dependency audit | `ab4c28c8b` | npm audit, app-local lockfile plus Expo Doctor 1.20.1 | 2026-08-10 | HOSTED VERIFIED / DEPENDENCY CLEARANCE BLOCKED | The isolated native workflow installed the pinned Expo 54 / M124 WebRTC stack and passed Expo Doctor 18/18 under the explicit `react-native-webrtc` React Native Directory exception. Local `npm audit` reports 0 critical, 11 high, and 11 moderate transitive advisories; no breaking `audit fix --force` was applied. The package remains untested in the directory on New Architecture, so successful native build/device media proof and release dependency review are still mandatory. |
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
| Connected-member invitation routing | `99b0cd8af` | Windows local and GitHub Actions native/PostgreSQL 16/Deno, PR #177 | 2026-08-09 | HISTORICAL HOSTED VERIFIED | Runs `31338952256` and `31338952270` proved the contract at that commit. The surface is now deployed in both replacement regions, but an authenticated managed journey remains unverified |
| Invitation code-proof and connected-family safety | `4bd5649c1` | Windows local and GitHub Actions native/PostgreSQL 16/Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Native run `31340381110` and infrastructure run `31340381106` passed: TypeScript, guardrails, 29 suites with 203 passing tests and 1 skipped, 78.71% branch coverage, secret scan, Expo/iOS checks, Edge typecheck, repeatable migrations, and executable transaction proof. Acceptance now requires a recent code-resolution attempt; connected multi-family acceptance fails closed; a failed decline remains reviewable. The unrelated Garden run `31340381137` still fails its anonymous Playwright job because `@ftc/config/dist/index.js` is missing |
| Atomic invitation acceptance and exact family switching | `5bd6c2c4f` | Windows local and GitHub Actions native/PostgreSQL 16/Deno, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Invitation acceptance creates or reuses one canonical direct conversation in the same database transaction as the grant, returns a typed composite result, switches only after the refreshed session proves the exact accepted family and conversation, and requires explicit selection when multiple memberships exist. Native run `31341847067` and infrastructure run `31341847077` passed isolated install, TypeScript, guardrails, 29 suites with 204 passing tests and 1 skipped, 77.78% branch coverage, secret scan, Expo Doctor, iOS export, Edge typecheck, migrations applied twice, and executable transaction proof. Managed migration and two-device proof remain absent |
| Bounded offline message recovery | `d2a98075a` | Windows local and GitHub Actions native/Terraform mock, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Native run `31343203497` and infrastructure run `31343203496` passed. Local proof: TypeScript; 30 suites with 215 passing tests and 1 skipped; 78.28% branch and 84.32% statement coverage; guardrails; 85-file secret scan; Expo Doctor 18/18; public Expo config; and a 1,005-module / 3.22 MB Hermes iOS export. Exact session and family scope prevents stale-device auto-send; needs-action entries are retained; original drafts survive suggested sends; sign-out and verified deletion clear queued content. This is not SQLite-backed production offline synchronization and has no Simulator/device proof |
| Explicit queued-message recovery | `0dc68c746` | Windows local and GitHub Actions native/Terraform mock, PR #177 | 2026-08-09 | HOSTED VERIFIED / DEPLOYMENT BLOCKED | Native run `31345914279` and infrastructure run `31345914358` passed. Local proof: TypeScript; 30 suites with 233 passing tests and 1 skipped; 78.34% branch and 84.94% statement coverage; guardrails; 84-file secret scan; Expo Doctor 18/18; public Expo config; and a 1,005-module / 3.23 MB Hermes iOS export. Exact-scope retry reuses the stored idempotency key, double taps produce one request, terminal failures remain actionable, removal is explicitly device-local, canonical messages are reconciled after ambiguous timeouts, and refresh failures cannot misreport successful mutations. This is not SQLite-backed production offline synchronization and has no Simulator/device proof |
| Current hosted PR #177 baseline | `461f626d2` | GitHub Actions, PR #177 | 2026-08-09 | HOSTED VERIFIED / UNRELATED MONOREPO CHECK FAILED | Native run `31348281497` and infrastructure run `31348281515` passed at this exact head. The overall PR remains unstable only because Garden run `31348281500` cannot load `@ftc/config/dist/index.js`; no Garden code was changed |
| Scheduled same-session message recovery | `984b91318` | Windows local with temporary/cache files on D: | 2026-08-09 | LOCAL VERIFIED / HOSTED PENDING | TypeScript passed; all 30 Jest suites passed with 239 tests and 1 skipped; guardrails, the 84-file secret scan, and diff checks passed. Exact-scope due retries run after hydration or later enqueue, preserve idempotency/backoff, serialize per runtime, stop later sends on runtime loss/unmount, and do not tight-loop after an unhandled storage failure. This remains a bounded SecureStore staging mechanism with no Simulator/device proof |
| Connectivity-aware same-session message recovery | `5393be74c` | Windows local plus GitHub Actions isolated native workspace; automated only | 2026-08-10 | HOSTED VERIFIED / DEVICE PROOF ABSENT | Expo Network 8.0.8 is pinned to the Expo 54-compatible version. An explicitly offline state suppresses initial and scheduled sends without consuming the waiting entry's retry; reconnect re-arms only the existing exact identity/session/region/family/conversation scope and retains its stored idempotency/backoff. Unknown reachability does not permanently block recovery. Local typecheck; 43 suites with 316 passed and 1 skipped; 83.61% statements and 76.91% branches; guardrails; 114-file secret scan; Expo Doctor 18/18; microphone-only introspection; 1,019-module / 3.32 MB iOS export; and diff checks passed. Exact-head [native run `31436509279`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31436509279) and [infrastructure run `31436509288`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31436509288) passed. This is still a bounded SecureStore mechanism, not SQLite synchronization, background execution, or Simulator/device proof. |
| Request-bound replay and content-free audit | `7e4aeff8e` | Windows local plus isolated PostgreSQL 18.3, loopback-only D: cluster | 2026-08-10 | POSTGRES VERIFIED / DEPLOYMENT BLOCKED | Every migration applied twice; the complete fictional transaction proof passed. Client keys and canonical requests are HMAC-bound to identity and operation, identical retries replay while changed requests conflict, invitation codes remain deterministic across retries, response ciphertext expires after 24 hours, and append-only audit rows contain no response bodies or private metadata. Edge/static boundary validation, free-tier config validation, TypeScript, guardrails, 84-file secret scan, and all 30 native suites with 239 passing tests and 1 skipped passed. Managed reset/deployment and Deno runtime typecheck remain pending. |
| Private Case Binder metadata persistence | `95738a841` | Windows local plus isolated PostgreSQL 18.3, loopback-only D: cluster; fictional-only | 2026-08-10 | POSTGRES VERIFIED / DEPLOYMENT BLOCKED | TypeScript, the Supabase static boundary validator, and 48 focused app/Records/API tests passed. The complete native run passed 30 suites with 242 tests and 1 skipped; coverage passed at 82.56% statements and 75.70% branches; guardrails, 84-file secret scan, public Expo config, Expo Doctor 18/18, and the Hermes iOS export passed. Every migration through `202608090013` applied twice, then the complete fictional transaction proof passed. The contract enforces owner-private regional binders, optimistic archive, metadata constraints, disabled upload transport, and deletion cleanup. Native run `31360810916` and infrastructure run `31360810922` passed at this exact head. Managed deployment, file bytes, object storage, timeline, and export remain unverified/absent. |
| Owner-private source-linked timeline | `4fa7ba672` | Windows local, isolated PostgreSQL 18.3, and GitHub Actions PostgreSQL/Deno; fictional-only | 2026-08-10 | HOSTED + POSTGRES VERIFIED / DEPLOYMENT BLOCKED | Native run `31364518669` and infrastructure run `31364518719` passed at the exact commit. Locally, all 30 Jest suites passed with 244 tests and 1 skipped; coverage passed at 82.51% statements and 75.34% branches; TypeScript, guardrails, the 84-file secret scan, public Expo config, Expo Doctor, the 1,005-module iOS export, and static Edge validation passed. Every migration through `202608100001` applied twice in an explicit disposable database and the complete fictional transaction proof passed. Timeline entries are owner-private metadata references to authorized canonical message/calendar rows; they contain no source body, title, filename, arbitrary narrative, file bytes, legal conclusion, or export capability. Managed deployment and current Simulator/device evidence remain absent. |
| Secure foreground audio-call lifecycle | `2a8aac813` | Windows local PostgreSQL 18.3 plus GitHub Actions PostgreSQL 16/Deno/native; fictional-only | 2026-08-10 | HOSTED + POSTGRES VERIFIED / DEPLOYMENT BLOCKED | Locally, all 18 migrations applied twice in a fresh loopback-only disposable database; the complete fictional transaction proof and focused `AUDIO_CALL_LIFECYCLE_POSTGRES_VERIFIED` proof passed. Static Edge validation, Deno check, native TypeScript, 28 focused API tests, guardrails, the 94-file native secret scan, the 833-file platform scan, YAML parsing, and diff checks passed. [Infrastructure run `31419736829`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31419736829) and [native run `31419736905`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31419736905) passed on the exact commit; the hosted transaction job executed both complete and focused call proofs. Authorization derives participants from the locked active canonical two-person conversation and closes calls after expiry, grant revocation, conversation archive, or account deletion. No signaling, SDP/ICE persistence, media, TURN, native call UI, managed deployment, Simulator, or device proof exists. |
| Authenticated private call-signaling relay | `cb92671b8` | Windows local PostgreSQL 18.3 plus descendant GitHub Actions PostgreSQL 16/Deno/native; fictional-only | 2026-08-10 | HOSTED + POSTGRES VERIFIED / DEPLOYMENT BLOCKED | All 19 migrations applied twice on disposable PostgreSQL; complete transaction, lifecycle, and focused signaling proofs passed. Static Edge validation, Deno check, all 3 signaling tests, YAML parsing, the 837-file platform secret scan, and diff checks passed. The code commit is included unchanged in descendant hosted head `d9e7dac47`; [infrastructure run `31421433051`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31421433051) and [native run `31421433108`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31421433108) passed. Each relay rechecks JWT-derived sender, exact region, live participant state and call version; derives the peer; applies strict offer/answer/ICE byte, rate, and TTL bounds; and persists neither SDP/ICE nor a content-bearing audit. Existing subscriptions retain cached provider authorization, so forced disconnect is not claimed; versioned topics plus relay denial prevent any later server-relayed signal after revocation. No managed Realtime deployment, media, TURN, native call UI, Simulator, or device proof exists. |
| Initial replacement regional staging deployment | `1ff6f64c7`; hardened main control `9975e4778` | Supabase Free plus protected GitHub environments; fictional staging only | 2026-08-10 | HISTORICAL DEPLOYED STAGING VERIFIED | Active native and platform mappings targeted Canada `rohvkyuxbnqzglaromms` (`ca-central-1`) and U.S. `spmpndalcvwmygznihec` (`us-east-2`); old refs failed closed. Exact-SHA protected dry-runs `31424479269` and `31424590161` passed. Canada deploy `31424695462` and U.S. deploy `31424817202` each applied all 19 migrations, deployed `peacepad-v2-api`, and passed public health/readiness verification. Later managed proof is recorded in the next row. |
| Managed dual-region two-account contract | `df6ed38de` regional pin; `2c1c4a308` Auth boundary; `172723a57` expanded proof | Supabase Free CA/U.S.; temporary fictional accounts only | 2026-08-10 | DEPLOYED STAGING VERIFIED / MANAGED FEATURE API JOURNEY VERIFIED | Native and verifier requests pin Canada Edge `ca-central-1` and U.S. Edge `us-east-1`; U.S. database remains `us-east-2`. Hosted native/infrastructure runs `31427335593`/`31427335775`, `31427956926`/`31427956997`, and `31428931102`/`31428931142` passed. Protected dry-runs and deployments remain `31427516196`, `31427518536`, `31428115334`, `31427636319`, and `31428209000`. Each region independently passed Auth, bootstrap, wrong-region denial, replay/conflict, invitation acceptance, message delivery/view, Message Check, shared Calendar visibility, private Records isolation/minimization/deletion cleanup, call lifecycle, post-end signal denial, deletion, and old-token denial. Test accounts were removed and no credentials, IDs, message bodies, filenames, or private timeline content were logged. This is not restoration, file transport, media, Simulator, device, TestFlight, or production proof. |
| Historical 19-migration managed application-schema restoration | `1dc3bf937`; protected main control `86961431f` | Supabase Free CA/U.S. read-only sources; isolated ephemeral PostgreSQL 17 targets; fictional-only | 2026-08-10 | HISTORICAL MANAGED LOGICAL RESTORATION VERIFIED | Protected runs `31430532674` (Canada) and `31430697958` (U.S.) each validated the exact project and feature SHA, confirmed all 19 managed migrations, dumped only the `peacepad_v2` application schema in a read-only source transaction, rebuilt an ephemeral target, restored every application table, and matched deterministic source/restore fingerprints. Canada restored 20 tables / 143 rows in 22 seconds; U.S. restored 20 tables / 82 rows in 19 seconds. Both dumps were destroyed and only non-secret JSON evidence was retained. This historical row is superseded by the current 20-migration proof below. |
| Current 20-migration managed application-schema restoration | `638a45e52`; protected main control `10cc5a6e` | Supabase Free CA/U.S. read-only sources; isolated ephemeral PostgreSQL 17 targets; fictional-only | 2026-08-10 | MANAGED LOGICAL RESTORATION VERIFIED / PROVIDER RECOVERY PENDING | Protected runs [`31455099468`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31455099468) (Canada) and [`31455203892`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31455203892) (U.S.) validated the exact project and feature SHA, confirmed all 20 managed migrations through `202608100004`, dumped only the `peacepad_v2` application schema in a read-only source transaction, rebuilt an ephemeral PostgreSQL 17 target, restored all 20 application tables, and matched deterministic source/restore fingerprints. Canada restored 143 fictional rows in 21 seconds; the U.S. restored 82 fictional rows in 34 seconds. Both dumps were destroyed, production was not contacted, and only non-secret JSON evidence was retained. The earlier run `31454966532` stopped before database proof because the control and feature scripts still asserted 19 migrations; PR #193 and feature commit `638a45e52` corrected those stale proof assertions. This does not restore Supabase Auth identities, provider configuration, storage objects, or Realtime state and is not snapshot/PITR, residency, production, or real-family recovery proof. |
| Native foreground audio-call API contract | `766574da8` | Windows local plus GitHub Actions isolated native workspace; no device or media | 2026-08-10 | HOSTED VERIFIED / UI AND MEDIA ABSENT | Typed native models and client methods now cover current call, create, accept, decline, end, and exact-version offer/answer/ICE relay receipts. Synthetic tests cover duplicate-live denial, stale version denial, active signaling, decline, caller cancellation, and terminal transitions without claiming microphone or peer media. Local typecheck; 37 suites with 291 passed and 1 skipped; 83.32% statements and 76.01% branches; guardrails; 98-file secret scan; and diff checks passed. Exact-head [native run `31432703309`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31432703309) and [infrastructure run `31432703360`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31432703360) passed, including Expo Doctor/config/iOS export and all platform transaction proofs. No call screen, Realtime subscription, microphone permission, WebRTC peer connection, TURN, audio media, Simulator, or device proof exists. |
| Accessible native foreground call controls | `82cb449e5` | Windows local plus GitHub Actions isolated native workspace; automated render only | 2026-08-10 | HOSTED VERIFIED / MEDIA AND DEVICE PROOF ABSENT | A dedicated Calls route uses the authenticated runtime conversation and API contract for refresh/start/accept/decline/cancel/end. EN/FR/ES state and action copy, semantic headings/live status, hydration gating, duplicate-mutation prevention, incoming/outgoing presentation, and an explicit media-unavailable boundary have automated proof. Local typecheck; 39 suites with 294 passed and 1 skipped; 83.34% statements and 75.93% branches; guardrails; 103-file secret scan; and diff checks passed. Exact-head [native run `31433573836`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31433573836) and [infrastructure run `31433573512`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31433573512) passed. No Realtime subscription, microphone permission, native WebRTC, TURN, audio media, Simulator, or device proof exists. |
| Native foreground audio media foundation | `ab4c28c8b` | Windows local plus GitHub Actions isolated native workspace; no native runtime/device | 2026-08-10 | HOSTED VERIFIED / TURN AND DEVICE PROOF ABSENT | The Expo 54 app pins `react-native-webrtc` 124.0.6 and `expo-dev-client` 6.0.21. A local config plugin generates an explicit foreground microphone disclosure, disables bitcode, adds audio/network permissions, and forbids camera permission and iOS background modes. The native adapter captures audio only, forces authenticated `turn:`/`turns:` relay ICE, creates and applies bounded offer/answer/ICE primitives, and tears down local tracks. The current Supabase JWT authenticates an exact private `peacepad:call:<id>:v<version>` topic; only live, correctly addressed peer envelopes pass. The signal type was corrected to match the already-deployed Edge `{kind,payload:{sdp}}` contract. Local typecheck; 42 suites with 312 passed and 1 skipped; 83.45% statements and 76.60% branches; guardrails; 112-file secret scan; Expo Doctor 18/18; microphone-only introspection; 1,015-module / 3.32 MB iOS export; and diff checks passed. Exact-head [native run `31435475768`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31435475768) and [infrastructure run `31435475772`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31435475772) passed. The WebRTC directory exception, absent regional TURN issuer, absent call-state wiring, and absent Simulator/device proof prevent any media claim. |
| Short-lived regional TURN authorization contract | `aca95d452` | Windows local PostgreSQL 18.3 plus GitHub Actions PostgreSQL 16/Deno/native; no provider or media | 2026-08-10 | HOSTED + POSTGRES VERIFIED / UNDEPLOYED AND UNCONFIGURED | Migration `202608100004` rechecks the exact active call, participant, region, grants, conversation, and version while returning only call/version/region metadata. The Edge issuer accepts at most four credential-free `turn:`/`turns:` URLs, requires a 32+ character server-only shared secret, derives a five-minute pseudonymous username, and creates the Coturn-compatible HMAC-SHA1 credential; neither identity UUID nor TURN material enters PostgreSQL. Native requests require the verified call version; demo mode fails closed. Locally, all 20 migrations applied twice; lifecycle, signaling, and TURN proofs passed; six Deno tests, TypeScript, 43 suites/316 passed/1 skipped, 83.64% statements/76.93% branches, guardrails, 114-file native and 845-file platform secret scans, Expo Doctor/config/audio introspection/iOS export, and diff checks passed. Exact-head [native run `31438165014`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31438165014) and [infrastructure run `31438165009`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31438165009) passed, including Linux Terraform and all 20 migrations twice. No managed deployment, TURN service, URL/secret configuration, relay allocation, native wiring, Simulator, or device media is claimed. |
| Foreground audio media orchestration | `c2b8f7788` | Windows local plus GitHub Actions isolated native workspace; automated only | 2026-08-10 | HOSTED VERIFIED / PROVIDER AND DEVICE PROOF ABSENT | An accepted exact-version call now retrieves short-lived TURN authorization, authenticates the current Supabase JWT to the exact private versioned topic, lazily loads microphone-only WebRTC, and serializes caller offer/callee answer/ICE handling. Early signals queue until peer creation; ringing calls refresh every 2.5 seconds; media and subscriptions close on call/version/runtime change; missing auth/TURN and failed peer state fail closed. UI copy distinguishes lifecycle acceptance from secure-audio connecting/connected/failed in EN/FR/ES. Local TypeScript; 44 suites with 319 passed and 1 skipped; 82.74% statements and 75.94% branches; guardrails; 116-file secret scan; Expo Doctor 18/18; microphone-only config; 1,068-module / 3.47 MB Hermes iOS export; and diff checks passed. Exact-head [native run `31440933027`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31440933027) and [infrastructure run `31440933075`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31440933075) passed. This is not managed migration/Edge deployment, TURN allocation, managed Realtime delivery, microphone-permission UX, audible audio, Simulator/device, interruption/reconnect, background/CallKit, TestFlight, or production proof. |
| Guarded lab-only EAS build profiles | `14aa2f91a` | Windows local plus GitHub Actions isolated native workspace; configuration only | 2026-08-10 | HOSTED VERIFIED / EAS PROJECT UNLINKED | `eas.json` defines only `lab-simulator` and `lab-device`, both internal and pinned to the non-diagnostic local lab boundary. Guardrails and tests reject production/unknown profiles, submit configuration, production bundle use, or a device profile mislabelled as Simulator. Local TypeScript; 44 suites with 320 passed and 1 skipped; 82.74% statements and 75.94% branches; guardrails; 117-file secret scan; and microphone-only config passed. Exact-head [native run `31442428011`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31442428011) and [infrastructure run `31442427987`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31442427987) passed. `eas config` parsed the request then stopped because no EAS project is linked; it reported `official_fejiro` as an available owner, but no owner was selected and no project, credentials, build, artifact, credit, Simulator/device, TestFlight, or production action occurred. |
| Dual-region short-lived TURN authorization deployment | `9c423dc5a`; hardened main control `86961431f` | Supabase Free CA/U.S. plus protected GitHub environments; fictional staging only | 2026-08-10 | DEPLOYED STAGING VERIFIED / TURN PROVIDER UNCONFIGURED | Exact-target dry-runs [Canada `31442629622`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31442629622) and [U.S. `31452023377`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31452023377) passed. Protected deployments [Canada `31453587604`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31453587604) and [U.S. `31453722930`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31453722930) each applied all 20 migrations, deployed Edge digest `1a465cc34a7ab43ab3747f9a44a16a844ba0c5bdfcea73749dd0e1b06e6975d8`, passed public regional boundaries, and emitted a non-secret `DEPLOYED_STAGING_VERIFIED` manifest. No TURN URLs or shared secrets are configured, so credential issuance remains fail-closed; no allocation, media, Simulator, device, TestFlight, or production proof is claimed. |
| Guarded EAS linkage and cloud iOS Simulator compile | `5c0084e78` | EAS Build macOS/Xcode; lab-only archive | 2026-08-10 | CLOUD IOS BUILD VERIFIED / INSTALLATION ABSENT | The app is linked to `@official_fejiro/peacepad-next-native-lab` with an exact guarded project ID, isolated slug, lab bundle `ca.peacepad.nextnative.lab`, production writes disabled, and no submit profile. Exact-head [native run `31454199981`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31454199981) and [infrastructure run `31454199916`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31454199916) passed. EAS build [`21f97870-d921-407c-ad18-e625055bf25f`](https://expo.dev/accounts/official_fejiro/projects/peacepad-next-native-lab/builds/21f97870-d921-407c-ad18-e625055bf25f) finished successfully and produced a 26,646,969-byte Simulator archive with SHA-256 `EBA69109E56A968E28C6B1EDF23AD89C19F32ECA3EE79734B04B56537F8D3FA5`. Archive inspection verified `PeacePad.app`, WebRTC/Hermes frameworks, privacy manifest, microphone disclosure, and `ITSAppUsesNonExemptEncryption=false`. The first upload attempt stopped before creating a build because EAS tried to shallow-clone the 2.75 GB monorepo object store; the successful retry explicitly scoped the upload to the clean app directory. No installation, UI/runtime, signing, device, TestFlight, or App Store evidence is claimed. |
| Current lab Simulator foundation journey | `ac354a878` | GitHub-hosted macOS, iOS 26.2 Simulator, Maestro 2.8.0; lab-only | 2026-08-11 | SIMULATOR VERIFIED / SCOPE LIMITED | EAS build `1954a130-3433-40d4-b66a-7a0eaef2aa91` came from the exact target commit. Main-controlled [run `31459876677`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31459876677) verified artifact SHA-256 `7384224C5C5BAF852BB6795B9CD6276C978CAAF7F0EF5F5E4A3C954C3AF9ABE5`, guarded lab boundaries, installed and cold-launched bundle `ca.peacepad.nextnative.lab`, and passed welcome/consent navigation. Independent inspection of `01-welcome.png` and `02-consent.png` confirms both screens remain below the status area, all required consent choices are visible, and optional AI is off. The workflow repair that preserved app state between screenshot segments is merged as PR #197. No account/family data or production endpoint was used. This is not authenticated coordination, VoiceOver, Switch Control, maximum Dynamic Type, audio, real-device, signing, TestFlight, or production proof. |
| Foundation maximum-text and dark-mode repair | `2370a1a61` | Windows automated render plus GitHub-hosted macOS, iOS 26.2 Simulator, Maestro 2.8.0; lab-only | 2026-08-11 | LOCAL + HOSTED + SIMULATOR VERIFIED / SCOPE LIMITED | Foundation text now uses an explicit 200% cap, scroll-safe wrapping, vertical button padding, wrapped legal links, and shared native header semantics. Local `npm run typecheck`, all 44 suites with 322 passed and 1 skipped, 82.58% statements / 75.87% branches, guardrails, the 117-file secret scan, and diff checks passed; exact-source native run [`31463015240`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31463015240) and infrastructure run [`31463015285`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31463015285) passed. EAS build `3878a080-e584-4edd-b755-aa6e3ca7b8be` produced a 26,647,331-byte archive with SHA-256 `1421BEE312553764D4418D24F4ACDAA15A8FF68EB8E50850B8647A31948D4C14`. Main-controlled [run `31463447618`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31463447618) verified the hash and source binding, installed the lab bundle, and passed standard, maximum-system-accessibility-category, and dark welcome/consent navigation. Independent comparison of `03`-`05` with the failed predecessor confirms previously fragmented/clipped text is now horizontally contained and required actions remain reachable by vertical scrolling; `06`-`07` render cleanly in dark mode. No account/family data or production endpoint was used. This is not authenticated feature, VoiceOver, Switch Control, Reduce Motion, device, signing, TestFlight, professional review, or production proof. |
| Dual-region staging sign-in and live Auth boundary | `ed109707c`; main control `b91afc212` | Windows local/hosted CI plus EAS Build and GitHub-hosted macOS, iOS 26.2 Simulator, Maestro 2.8.0; fictional staging only | 2026-08-11 | LOCAL + HOSTED + CA/U.S. SIMULATOR VERIFIED / AUTHENTICATED JOURNEY ABSENT | The current source keeps the sign-in form reachable with the software keyboard and directly inlines exact CA/U.S. public staging configuration. Local typecheck; 44 suites / 326 passed / 1 skipped; 82.61% statements / 76.07% branches; guardrails; 117-file secret scan; and diff checks passed. Exact-source native run [`31473683027`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31473683027) and infrastructure run [`31473683087`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31473683087) passed. Canada EAS build `83c67df2-3507-42cf-967c-6f30873dbf40` produced 26,647,798 bytes with SHA-256 `179602779AB400DB28D769D53875A3AEC469CDEE89AC90B55353E804CEBA3872`; [run `31475994805`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31475994805) verified the Canada mapping, label, safety copy, keyboard-reachable sign-in, and live invalid-auth response. U.S. build `8ef54e01-91bf-4edd-bffe-61074c95ea94` produced 26,647,758 bytes with SHA-256 `081EBBAEDF21941534B721AFB0CEA35FC97349B56384866200C6CA1051D8849D`; [run `31476831202`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31476831202) passed the equivalent U.S. proof. Downloaded manifests and screenshots were independently inspected. Both used only fictional `@example.test` credentials, retained no credential, created no account, mutated no application data, contacted no production service, uploaded evidence, and destroyed the isolated Simulator. This is not a successful authenticated session, coordination, assistive-technology, physical-device, signing, TestFlight, or production proof. |
| Accessible localization foundation | `47874810c` | Windows local; automated React Native render only | 2026-08-10 | LOCAL VERIFIED / DEVICE PROOF ABSENT | TypeScript passed; all 31 Jest suites passed with 253 tests and 1 skipped; coverage passed at 82.75% statements and 75.47% branches; lab guardrails passed; the 86-file secret scan passed. EN/FR/ES locale resolution, secure preference persistence, immediate supported-shell switching, translated accessibility labels, selected tab/radio state, 48-point language targets, dark-mode palette structure, and WCAG AA contrast contracts are automated. This is not full translation, professional linguistic review, VoiceOver, maximum Dynamic Type, Switch Control, or device proof. |
| Expanded accessible localization foundations | `0800c0d72` | Windows local; automated React Native render only | 2026-08-10 | LOCAL VERIFIED / DEVICE PROOF ABSENT | `npm run typecheck`; `npm run test:coverage` (34 suites, 263 passed, 1 skipped; 82.83% statements and 75.52% branches); `npm run guardrails`; `npm run secret-scan` (92 files); and `git diff --check` passed. Shared native heading semantics cover onboarding, staging runtime, and primary screens. Calendar navigation/dates and Records timeline dates use EN/FR/ES-aware UTC formatting. Staging sign-out and destructive account deletion controls are translated, and the confirmation exposes automated assertive modal-alert and header semantics. This is not complete translation, professional linguistic review, VoiceOver, maximum Dynamic Type, Switch Control, Simulator, or device proof. |
| Localized family invitation journey | `e8b169853` | Windows local; automated React Native render only | 2026-08-10 | LOCAL VERIFIED / DEVICE PROOF ABSENT | `npm run typecheck`; `npm run test:coverage` (34 suites, 265 passed, 1 skipped; 82.90% statements and 75.46% branches); `npm run guardrails`; `npm run secret-scan` (92 files); and `git diff --check` passed. EN/FR/ES copy covers invitation creation, access explanation, code and QR guidance, localized sharing, cancellation, review, known role/permission display labels, connected-family safety, explicit accept/decline, and success. Backend role and permission identifiers remain unchanged, with unknown identifiers displayed safely rather than translated as contracts. This is automated localization/accessibility evidence only, not linguistic, VoiceOver, Dynamic Type, Simulator, or device proof. |
| Localized onboarding, consent, and staging authentication | `9b6221f21` | Windows local; automated React Native render only | 2026-08-10 | LOCAL VERIFIED / DEVICE PROOF ABSENT | `npm run typecheck`; `npm run test:coverage` (34 suites, 267 passed, 1 skipped; 82.93% statements and 75.48% branches); `npm run guardrails`; `npm run secret-scan` (92 files); and scoped app diff checks passed. EN/FR/ES copy covers welcome, unavailable existing-account guidance, required Terms/Privacy consent, default-off optional AI consent, legal links, guest-session restore/recovery, staging sign-in, family selection/create/join, and hydration. Automated FR/ES tests prove opening consent creates no session and AI consent remains unchecked. Server errors and identifiers remain unchanged and fail closed. This is not professional linguistic, VoiceOver, Dynamic Type, Simulator, or device proof. |
| Localized messaging and offline recovery | `a82da66be` | Windows local; automated React Native render only | 2026-08-10 | LOCAL VERIFIED / DEVICE PROOF ABSENT | `npm run typecheck`; `npm run test:coverage` (35 suites, 270 passed, 1 skipped; 82.96% statements and 75.48% branches); `npm run guardrails`; `npm run secret-scan` (94 files); and scoped native diff checks passed. EN/FR/ES copy covers Messages, default-off Message Check, search, correction, original/suggested send actions, send status, needs-attention recovery, explicit retry/removal, and removal warnings. Confirmation is exposed as an assertive alert. Stored drafts, backend errors, idempotency keys, and retry state transitions are unchanged. This is not professional linguistic, VoiceOver, Dynamic Type, Simulator, or device proof. |
| Localized Calendar and Records workflows | `3035d316e` | Windows local; automated React Native render only | 2026-08-10 | LOCAL VERIFIED / DEVICE PROOF ABSENT | `npm run typecheck`; `npm run test:coverage` (36 suites, 273 passed, 1 skipped; 82.99% statements and 75.56% branches); `npm run guardrails`; `npm run secret-scan` (96 files); and scoped native diff checks passed. EN/FR/ES display copy covers calendar sharing/privacy, layer visibility, event creation/deletion, binder validation, private timelines, locale-aware timestamps, attachment metadata preparation, disabled-upload explanation, archive, retry, and navigation. Automated tests preserve canonical layer names while localizing surrounding actions. Backend enums, source identifiers, media types, versions, and server errors remain unchanged. This is not professional linguistic, VoiceOver, Dynamic Type, Simulator, or device proof. |
| Localized Home and shared recovery states | `c9f508fe8` | Windows local; automated React Native render only | 2026-08-10 | LOCAL VERIFIED / DEVICE PROOF ABSENT | `npm run typecheck`; `npm run test:coverage` (37 suites, 276 passed, 1 skipped; 83.04% statements and 75.59% branches); `npm run guardrails`; `npm run secret-scan` (98 files); and scoped native diff checks passed. EN/FR/ES copy covers Home task actions, Today summaries, family connection state, session restoration, authorization opening/loading/unavailable states, device-check guidance, and sign-out recovery. Automated tests verify localized page and section header semantics. Runtime authorization behavior and server identifiers remain unchanged. This is not professional linguistic, VoiceOver, maximum Dynamic Type, Simulator, or device proof. |
| Final code-level localization inventory | `070f524fe` | Windows local; automated React Native render and mechanical source scan only | 2026-08-10 | LOCAL VERIFIED / DEVICE AND HUMAN REVIEW ABSENT | `npm run typecheck`; `npm run test:coverage` (37 suites, 282 passed, 1 skipped; 83.07% statements and 75.59% branches); `npm run guardrails`; `npm run secret-scan` (98 files); scoped native diff checks; and literal scans passed. EN/FR/ES copy now covers Foundation compose, preview loading/results/retry/reset, session restore/expiry/sign-in/sign-out failure, conversation-empty invitation recovery, and duplicate account-deletion confirmation. Automated tests verify localized header, alert, checkbox, input, and recovery-action semantics. Brand text, user-authored values, examples, canonical domain/server identifiers, server-returned errors, and the earliest pre-localization boot fallback remain intentionally unchanged. This is not professional linguistic, VoiceOver, Switch Control, Reduce Motion, maximum Dynamic Type, Simulator, or device proof. |
| Dual-region authenticated native session hydration | `82cfd5365` | EAS cloud iOS compile, protected GitHub macOS iOS 26.2 Simulators, replacement CA/U.S. Supabase fictional staging | 2026-08-11 | DUAL-REGION SIMULATOR VERIFIED / DEVICE AND FEATURE MUTATION PROOF PENDING | Local TypeScript, 44 suites / 327 passed / 1 skipped, 82.61% statements / 76.05% branches, guardrails, 117-file secret scan, and diff checks passed; exact-source native `31518294005` and infrastructure `31518294008` passed. CA EAS `25cf99f0-dafc-4a65-b7e7-d715ea7a82ab`, SHA-256 `EAB39471A4438C918BFA9A54BA16A08A19C76B23C84A3FCFC2DA6E1A55DD08F7`, passed protected run `31525616385`. U.S. EAS `51c8250c-426a-4763-a5f5-2414d327de68`, SHA-256 `0898FBA8A4C28ED5893B0E15F25C5CA8B0C78780671EE5430D20CB918043E3A7`, passed protected run `31528365464`. Each run verified two fictional authenticated native sessions in one shared family/conversation and guaranteed application/Auth cleanup and Simulator destruction. Production was not contacted; credentials/private content were not retained. This is not full feature mutation, assistive technology, physical-device, signing, TestFlight, or production proof. |
| Dual-region authenticated native message and Calendar coordination | `82cfd5365` | Exact EAS artifacts, protected GitHub macOS iOS 26.2 Simulators, replacement CA/U.S. Supabase fictional staging | 2026-08-11 | DUAL-REGION CROSS-ACCOUNT SIMULATOR VERIFIED / DEVICE PROOF PENDING | CA artifact `25cf99f0-dafc-4a65-b7e7-d715ea7a82ab` with SHA-256 `EAB39471A4438C918BFA9A54BA16A08A19C76B23C84A3FCFC2DA6E1A55DD08F7` passed [run `31543957169`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31543957169) under control `904ae46e8`. U.S. artifact `51c8250c-426a-4763-a5f5-2414d327de68` with SHA-256 `0898FBA8A4C28ED5893B0E15F25C5CA8B0C78780671EE5430D20CB918043E3A7` passed [run `31546225501`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31546225501) under control `b720ccb7f`. Each run authenticated two temporary fictional accounts, prepared one shared family/conversation, sent and rendered a native message, created and rendered a shared Calendar event, verified second-account coordination visibility, deleted both application identities and Auth users, destroyed both Simulators, retained no credential/private content, and never contacted production. U.S. run `31545264571` is non-qualifying because an unnecessary cross-flow viewport assertion stopped before Calendar; its cleanup passed, and PR #221 removed only that test dependency before the successful identical-artifact rerun. This is not invitation, Message Check, deletion, offline recovery, call media, assistive technology, physical-device, signing, TestFlight, or production proof. |
| Dual-region runtime directory and pre-auth selection | `89d579fd9` | Windows local and GitHub Actions, PR #177; no EAS build or deployment | 2026-08-11 | HOSTED VERIFIED / STAGING ONLY | A future single binary can carry the exact approved Canada and U.S. public staging configurations, require an explicit accessible EN/FR/ES region confirmation before creating a Supabase client, and persist only `ca` or `us` in device-only SecureStore. Partial, mixed, swapped-project, secret, and legacy-JWT configurations fail closed; verified single-region EAS profiles retain their existing direct path. Local TypeScript; 45 suites / 335 passed / 1 skipped; 82.52% statements / 76.03% branches; guardrails; 119-file secret scan; and diff checks passed. Exact-head [native run `31549069222`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31549069222) and [infrastructure run `31549069240`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31549069240) passed, including Expo Doctor, iOS export, Deno, PostgreSQL, and no-deploy assertions. No new EAS artifact, production profile, Apple signing, device, TestFlight, or production proof is claimed. |
| Guarded internal TestFlight pipeline | `8b1f3bf6b`; main control `e956b2012` | Windows local, EAS configuration, Apple public lookup, and GitHub Actions; no build or submit | 2026-08-11 | HOSTED + EAS CONFIG + FAIL-CLOSED CONTROL VERIFIED / EAS TOKEN AND APPLE TEAM BLOCKED | Dynamic config and the `testflight-internal` store profile resolve to PeacePad `2.0.0` build `2`, existing bundle `ca.peacepad.family`, and existing Apple ID `6793350735`, with fictional dual-region staging, diagnostics off, and production writes disabled. All six reviewed CA/U.S. public runtime variables were copied from verified regional EAS environments into EAS production and value-contract checked without logging values. Local TypeScript; 46 suites / 339 passed / 1 skipped; 82.68% statements / 76.10% branches; guardrails; 123-file secret scan; default lab config; injected production runtime; and diff checks passed. Exact-head [native run `31550923589`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31550923589) and [infrastructure run `31550923584`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31550923584) passed. PR [#222](https://github.com/fefejiro/FTC-HOLDING/pull/222) merged the exact-source, no-auto-submit control; main static run [`31551672095`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31551672095) passed. Boundary run [`31551715228`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31551715228) passed source binding, isolation, and dependency installation, then correctly stopped before config/build because the repository `EXPO_TOKEN` is not `official_fejiro` and the approved local account has no Apple team. Its uploaded manifest records `EAS_TESTFLIGHT_BUILD_NOT_VERIFIED`, empty build ID/status, `autoSubmitAttempted: false`, and no TestFlight/device/production proof. |
| D:-backed app-only dual-region Simulator pipeline | `2fe8ca82b` | Windows D: release scratch, EAS Build, and GitHub Actions; internal Simulator only | 2026-08-11 | HOSTED + CLOUD IOS BUILD VERIFIED / SIGNING ABSENT | Commits `5305a8516`, `f7890b1d4`, `6e409aaad`, and `2fe8ca82b` add a guarded `staging-simulator-dual` profile, package only the exact clean native app Git tree, place source/cache/evidence under `D:\PeacePadRelease`, and reuse the existing dependency installation without copying it to the nearly full C: drive. An exact tree-object equality check remains authoritative while only EAS automatic fingerprint traversal is skipped to avoid following the Windows dependency junction. Exact-head [native run `31554139237`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31554139237) and [infrastructure run `31554139216`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31554139216) passed. EAS build [`b0ede52e-21db-4f93-8b74-018c6033b1ff`](https://expo.dev/accounts/official_fejiro/projects/peacepad-next-native-lab/builds/b0ede52e-21db-4f93-8b74-018c6033b1ff) uploaded about 1.7 MB and produced a 26,653,811-byte archive with SHA-256 `84155CB8AC234CD8442A17BDBB25DAEC74FFC7B10881E1BED56406B74209F970`. This is an internal unsigned Simulator artifact, not a device, TestFlight, submit, or production build. |
| One-artifact Canada/U.S. authenticated native coordination | `2fe8ca82b`; main controls `3df8d174a` and `cc2a7121e` | One exact EAS artifact, protected GitHub macOS iOS 26.2 Simulators, replacement CA/U.S. fictional staging | 2026-08-11 | ONE-ARTIFACT DUAL-REGION CROSS-ACCOUNT SIMULATOR VERIFIED / DEVICE PROOF PENDING | The same build ID `b0ede52e-21db-4f93-8b74-018c6033b1ff`, artifact URL, and SHA-256 passed Canada [run `31554747960`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31554747960) and U.S. [run `31557228680`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31557228680). Each run selected the expected region before client creation, authenticated two temporary fictional accounts, prepared one shared family/conversation, sent and rendered a native message, created and rendered a shared Calendar event, verified second-account visibility, removed both application identities and Auth users, destroyed both Simulators, retained no credential/private content, and never contacted production. Downloaded manifests, cleanup records, and screenshots were independently inspected. Initial U.S. run `31555505066` is non-qualifying because a delayed iOS password-save sheet blocked Calendar navigation after message success; cleanup passed, and PR #225 hardened only the orchestration before the same-artifact success. This is not invitation, Message Check, deletion, offline recovery, call media, assistive technology, physical-device, signing, TestFlight, submit, or production proof. |
| Registered regional deployment control | `9975e4778` | GitHub Actions and GitHub environments, `main` | 2026-08-10 | HOSTED VERIFIED | PR #181 rebound the protected projects; PR #183 aligned project-region validation with Supabase CLI 2.113.0. The workflow binds control and target commits, defaults to dry-run, deploys one region at a time, keeps secrets step-scoped, and requires reviewer approval. It successfully controlled both regional deployments from exact target `1ff6f64c7`. |
| macOS release-host recheck | n/a | MacinCloud RDP, encrypted browser client, provider billing, and support | 2026-08-11 | BLOCKED / ACCOUNT PAST DUE | RDP reaches the host but terminates with `0x904` / socket-closed behavior. The official browser client reaches macOS login, but the exposed provider-issued credential is rejected, and the provider account is now visibly past due. No retry loop was run. The exposed credential must be reset/rotated before reuse. The verified EAS/protected GitHub macOS path is now the active compile and Simulator route, so MacinCloud is not a blocker for those steps; it still does not prove production signing, App Store Connect, or TestFlight access. |
| Canadian Supabase fictional staging | `bcef6852` | Supabase Free, `ca-central-1` | 2026-08-07 | DEPLOYED STAGING VERIFIED (SCHEMA ONLY) | Healthy project; PostgreSQL 17.6; boundary schema applied; append-only triggers present; direct `anon`/`authenticated` table privileges absent; fictional write rolled back. API adapter, restoration, device, and production proof remain absent |
| U.S. Supabase fictional staging | `5f1ca58d` | Supabase Free, `us-east-2` | 2026-08-07 | DEPLOYED STAGING VERIFIED (SCHEMA ONLY) | Healthy company-owned project; PostgreSQL 17.6; boundary schema applied; append-only triggers present; direct `anon`/`authenticated` table privileges absent; fictional write rolled back. API adapter, restoration, device, and production proof remain absent |
| Focused staging smokes | earlier PR #172 commits | Windows local, fictional adapters | Historical | HISTORICAL EVIDENCE | `STAGING_RUNTIME_SMOKE_PASS`, `STAGING_RESTART_SMOKE_PASS`, `TWO_ACCOUNT_HTTP_SMOKE_PASS`, `SYNTHETIC_COORDINATION_JOURNEY_PASS`, `STAGING_AUTHORIZATION_SMOKE_PASS` |
| Current-branch Terraform execution | `b047615d` | Windows local after laptop restart | 2026-08-06 | BLOCKED | Terraform binary hung even on `terraform -version`; orphaned process was stopped. PR #174 hosted Terraform proof remains valid only for its earlier commit |
| Apple credential configuration and signed-build quota boundary | n/a | Windows local EAS CLI, Apple Developer portal, and EAS Build | 2026-08-12 | APPLE CREDENTIALS VERIFIED / EAS BUILD QUOTA BLOCKED | The approved `official_fejiro` EAS project now has the active Apple distribution certificate and provisioning profile for bundle `ca.peacepad.family` under team `G6UNC88GQ5`; this supersedes the earlier no-team preflight result. EAS accepted the 1.8 MB app-only signed-build upload but refused to queue a build because the free iOS allocation is exhausted until 2026-09-01. No build ID, TestFlight upload, submit, device, or production proof exists. The earlier static preflight source `25c9a6358` remains HOSTED VERIFIED in [native run `31611086473`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31611086473) and [infrastructure run `31611087586`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31611087586). |
| Non-qualifying Canadian invitation/Message Check Simulator attempt | `6f93b3407` | Protected GitHub macOS Simulator; Canadian fictional staging only | 2026-08-12 | NOT VERIFIED / FIXTURE CLEANUP UNVERIFIED | Run [`31608414991`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31608414991) accepted the exact artifact and source, provisioned two temporary fictional `@example.test` accounts, and destroyed both Simulators. Native journey verification failed; the fixture cleanup request then received HTTP 500, so application/Auth cleanup is not claimed. No credentials or private content were retained in evidence and production was not contacted. This is not a reason to dispatch further regional Simulator work before the TestFlight signing blocker is cleared. |
| Temporary Simulator fixture cleanup transport hardening | Protected main control `c561383e8` (PR [#234](https://github.com/fefejiro/FTC-HOLDING/pull/234)) | GitHub Actions control workflow; no dispatch | 2026-08-12 | IMPLEMENTED / NOT YET RERUN | The two Supabase API-key metadata fetches used only to obtain a temporary service-role key for fictional fixture provisioning or cleanup now retry up to three times on transient curl failures, with bounded connection and total timeouts. The workflow remains fail-closed if the lookup cannot succeed; it does not mark cleanup as verified without the existing identity/Auth deletion receipts. YAML formatting/parser validation and diff checks passed before merge. No Simulator, fixture, deployment, TestFlight, or production action was started by this control-only change. |
| External Native V2 tester guide | `3967385b6` | Documentation only | 2026-08-12 | IMPLEMENTED / RELEASE NOT YET AVAILABLE | [`EXTERNAL_TESTER_GUIDE.md`](EXTERNAL_TESTER_GUIDE.md) defines the first external-TestFlight cohort, two-person invitation/messaging/Message Check/Calendar/Records/offline/deletion checks, accessibility observations, privacy-safe reporting, unsupported-call/file boundaries, and release-lead exit criteria. It explicitly prohibits real family or sensitive information because the current signed-candidate profile remains fictional staging with production writes disabled. No TestFlight or public release is claimed. |
| Guarded Android signed store candidate | `4bde06e651d00de25c30ba48e50e9557619ccb31`; main control `d4b58fd80c6135eb779887bb156dd5c61130ff9f` | EAS Build and GitHub Actions; no Google Play API or Play Console action | 2026-08-12 | HOSTED + EAS ANDROID AAB VERIFIED / PLAY PUBLICATION AND PRODUCTION CUTOVER BLOCKED | The `playstore-internal` profile resolves to the existing package `ca.peacepad.family`, Android `2.0.0` / `42`, local approved signing credentials, store distribution, diagnostics off, fictional staging, and production writes disabled. Local TypeScript, 46 suites / 341 passed / 1 skipped, 82.69% statements / 76.13% branches, guardrails, 126-file scan, and diff checks passed; [Native run `31638564353`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31638564353) and [Infrastructure run `31638564516`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31638564516) passed. Main-controlled [run `31640303014`](https://github.com/fefejiro/FTC-HOLDING/actions/runs/31640303014) bound the exact source, accepted the ephemeral local signing configuration, and completed EAS Android build [`b9069a81-4bb5-4c37-88de-b1e39bd0b756`](https://expo.dev/accounts/official_fejiro/projects/peacepad-next-native-lab/builds/b9069a81-4bb5-4c37-88de-b1e39bd0b756). The earlier EAS build `cfd6a1fe-f940-496c-8874-61722d9568e8` is non-qualifying: its Gradle wrapper download ended unexpectedly before Gradle executed. The workflow deliberately does not contain a Play upload and `PEACEPAD_PLAY_SERVICE_ACCOUNT_JSON` is absent; no Play track, tester, public release, device, real-family data, or V2 production contact is claimed. |
| Provider restoration, file/media journeys, simulator, device, TestFlight, production | `82cfd5365` current Simulator scope | managed staging plus hosted macOS Simulator | 2026-08-11 | APPLICATION LOGICAL RESTORATION + DUAL-REGION NATIVE COORDINATION SIMULATOR VERIFIED / REMAINING PROOF INCOMPLETE | The expanded two-account managed API journey and application-schema logical restoration passed in both regions; connectivity-aware queued-message recovery retains hosted automated proof; and exact CA/U.S. builds now pass authenticated native message/Calendar mutation plus second-account visibility with inspected screenshots and guaranteed cleanup on iOS 26.2. Supabase Auth/platform snapshot or PITR recovery, actual file transport, invitation/Message Check/deletion/offline native journeys, call media, assistive-technology and real-device audits, signing, TestFlight, and production proof have not run |

## Mandatory release gates

1. Reproducible clean install and complete automated suite.
2. Deployed Canadian and U.S. staging with real PostgreSQL persistence and tested restoration.
3. Two-real-device invitation, messaging, calendar, records, call, offline, deletion, and recovery journeys.
4. Security, privacy, accessibility, localization, and dependency clearance.
5. Existing-account migration and rollback rehearsals.
6. Internal and external TestFlight verification with a seven-day release-candidate soak.
7. Product, Privacy, Security, QA, and Release sign-off before App Store submission.
