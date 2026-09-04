# Una Labs JobAgent Product Architecture

## Decision

JobAgent is a multi-user Una Labs product. Candidate instances such as
`fejiro` and `chukwuma` are isolated pilots, not separate products and not
hard-coded product personas.

Build mobile-ready from the beginning, but do not put the automation engine on
the phone. Use one cloud platform with several clients:

- Responsive web application
- Installable Progressive Web App
- iOS client
- Android client
- Operator/admin console

The web application is the first production client. The initial native source
foundation now wraps that same hosted product and versioned API; store release
still follows device validation of onboarding, consent, approvals, OAuth return,
account controls, and proof workflows.

## Current Reality

JobAgent now has two deliberately separate execution boundaries:

- The existing Windows pilot/operator runtime still owns browser-assisted job
  boards, local resume generation, and the verified Fejiro Gmail workflow.
- The hosted beta foundation owns invite-only accounts, PostgreSQL tenancy,
  private object storage, approvals, proof history, queues, and trusted-runner
  task exchange.
- The Capacitor mobile shell owns only the candidate-facing iOS and Android
  surfaces. It uses system-browser OAuth and exact-origin app links; it does not
  own job-board sessions or automation credentials.

Historical evidence records a dedicated Una Labs Railway topology with separate
web, worker, migration, PostgreSQL, and private-bucket resources. The current
Railway CLI identity cannot access that project. On 2026-08-17 the branded
domain's Cloudflare `/edgez` returned `200`, while `/`, `/healthz`, `/readyz`,
and `/api/v1/release` returned `404`. The hosted origin is therefore unavailable
and no current production deployment is claimed.

Revenue-launch code image `407100eb9d872fc2ee857ad482af4807aa5cfd84`
packages the existing product for a founding launch: public product/pricing,
`/app`, capped registration, acquisition events, entitlements, usage limits,
Stripe-hosted billing contracts, Mailjet delivery contracts, and fail-closed
checkout activation. Transactional delivery, Stripe lifecycle, hosted package
fulfillment, Google production verification, operator MFA, backup/restore, and
channel proof runs remain release gates.

This is not yet:

- Open for broader public invitations
- A certified autonomous job-board submission engine
- A device-tested or distributed native iOS or Android app
- Ready for App Store or Play Store distribution

## Current Pilot Evidence - 2026-08-15

- The local Fejiro operator runtime completed a fresh proof-backed LinkedIn
  submission for Apptoza's **Business Analyst - Order Management &
  Replenishment Systems** role. It has both LinkedIn confirmation and
  Applied-history evidence.
- This validates one candidate-owned visible-browser action only. It does not
  certify LinkedIn as an unattended SaaS connector, establish cloud-to-browser
  trusted-runner delivery, or satisfy broader pilot acceptance criteria.
- The next candidate package, Upshop **Director, Implementation**, is
  `package_ready` but unsubmitted because the authenticated LinkedIn window was
  not safely available in the foreground. The correct SaaS behavior is to retain
  the package and create a manual gate, never to retry with an unknown profile.

## Native Foundation Status - 2026-08-10

- Capacitor 8 iOS and Android source projects use the shared application ID
  `cloud.unalabs.jobagent` and hosted origin `https://jobagent.unalabs.cloud`.
- OAuth authorization opens in the system browser, and return-link handling is
  restricted to the exact JobAgent HTTPS origin.
- Android App Links and iOS Associated Domains are declared in source. Their
  production association files still require deployment and device proof.
- Focused mobile/PWA tests, the full test suite, TypeScript build, lint,
  Capacitor sync, Android doctor, and a signed Android debug APK build pass
  locally. The combined doctor correctly remains nonzero on Windows because
  Xcode is unavailable.
- iOS source generation and synchronization pass on Windows. Simulator, device,
  signing, TestFlight, and App Store evidence require a supported macOS/Xcode host.
- Generated development icons remain placeholders and are not release assets.

## Verified Pilot Status - 2026-07-27

Fejiro's local pilot has been revalidated against the isolated-instance
runtime:

- Gmail OAuth resolves exactly to `fejiro.efiuvwere@gmail.com`.
- Recruiter processing runs in `approval_required` mode with resume
  `auto_send` disabled.
- Low-fit messages below the configured match threshold are skipped without
  creating reply drafts.
- Automated alerts and no-reply newsletters are skipped.
- Recruiter inbox processing is limited to the configurable recent-mail
  window, currently 14 days, so stale labeled backlog cannot generate new
  application packages.
- A Gmail thread can create at most one reply package.
- Sensitive-language or parser-uncertain opportunities require review.
- Resume-tailoring failure stops draft creation instead of attaching a static
  fallback resume.
- BA/BSA jobs use the approved orange golden template; IT-management jobs use
  the approved IT Business Systems Manager template.
- WMS/supply-chain BA roles receive verified domain emphasis from the job
  description while preserving approved career facts.
- Generated DOCX output is audited for malformed titles, empty bullets and
  rows, mojibake, punctuation collisions, and trailing blank pages.
- Recruiter replies cannot send unless a draft is explicitly placed in the
  approved-send label. Both approved-send labels were empty at verification.
- Manually reviewed and sent Gmail drafts are reconciled back into the local
  ledger using the Gmail thread, recipient, draft creation time, sent message
  id, and sent timestamp. Reconciliation records manual approval without
  enabling autonomous sends.

This validates the local Fejiro pilot workflow, not public-product readiness.
Hosted identity, PostgreSQL tenancy, private object storage, queue workers,
encrypted per-user OAuth, self-service onboarding, production deployment, and
the two-week Chukwuma pilot remain release gates.

## SaaS Foundation Status - 2026-07-27

The safe public-beta boundary was implemented and historically deployed. That
deployment is not currently reachable through the branded origin; treat the
following as implemented architecture until the exact current release is
redeployed and independently verified:

- Expiring one-use invitations, verified email, password recovery, rotated
  password sessions, login throttling, CSRF protection, and mandatory operator MFA
- Authenticated user-derived tenant scope on every current `/api/v1` request
- PostgreSQL repositories and forced row-level security
- Runtime refusal of superuser or `BYPASSRLS` database roles in production
- Separate migration-owner and restricted runtime-role deployment credentials
- Tenant-scoped idempotency keys for retry-safe user mutations
- Resume vault, Career Truth Bank, connection, dashboard, approval, application,
  downloadable proof, inbound email, trusted runner, and operator APIs
- Recent-authentication gates for connection revocation, pause, resume, export,
  and deletion
- Versioned consent and automation policies, quiet hours, daily caps, immediate
  pause/revocation, complete metadata export, and password-confirmed deletion
- Live PostgreSQL tests proving cross-tenant read, update, delete, and
  idempotency isolation
- Private S3-compatible storage for resumes and proof with tenant-bound keys,
  short-lived signed downloads, deletion cleanup, and no public bucket access
- PostgreSQL-backed `pg-boss` queues with retries, dead-letter handling,
  deduplication, per-user/channel grouping, quiet hours, and redacted envelopes
- A signed, expiring Windows trusted-runner protocol that keeps browser cookies
  on the candidate device and fails closed on identity, CAPTCHA, authentication,
  legal, sensitive, contradictory, or unknown gates
- A responsive installable PWA covering onboarding, policy, resumes, facts,
  connections, recommendations, approvals, applications, proof, activity, and
  security controls
- A live Railway `/readyz` promotion gate, structured redacted logs, and a
  scheduled external readiness/PWA monitor
- Fejiro dry-run and hosted import with exact identity matching, 12 approved
  facts, 68 content-deduplicated resumes, 96 applications, 65 private evidence
  artifacts, and 31 deliberately downgraded unverified records

Historical hosted evidence does not make the current origin healthy. A public
or paid launch is not declared complete until the dedicated project is restored,
the exact release SHA and schema are live, email and Stripe lifecycles pass,
backup restore and incident drills pass, fresh channel proof runs complete, and
the isolated pilot boundaries remain intact.

## Revenue And Cloud Operations - 2026-08-17

The commercial surface uses configurable server-side plan definitions and an
isolated module in the existing `una-stripe-api` Worker. Stripe-hosted Checkout
and Customer Portal keep card handling outside JobAgent. Tenant access changes
only from verified, idempotent billing events. Live checkout is additionally
guarded by `BILLING_CHECKOUT_ENABLED` so a polished interface cannot collect
money before fulfillment is proven.

Cloud is the durable system of record, but local execution remains useful:

- GitHub owns source, migrations, runbooks, release tags, and review history.
- CI owns reproducible build/test/store artifacts with retention limits.
- Dedicated PostgreSQL and private object storage own customer data and files;
  encrypted off-provider backups require a restore drill.
- Stripe owns payment credentials and records; JobAgent stores identifiers,
  entitlement state, usage, and idempotent event metadata.
- Candidate browser sessions remain on the enrolled runner device.
- Local `D:` worktrees and dependency/build caches are disposable acceleration,
  not the only copy of product or customer state.

Moving the existing PostgreSQL, pg-boss, private-storage, auth, and trusted-runner
contracts to a different free platform would be a replatform, not a storage
cleanup. Recovering the original dedicated Railway account/project is the
lowest-risk path before considering paid replacement hosting.

## Target Platform

### Client layer

The responsive web and mobile clients provide:

- Account registration and sign-in
- Guided onboarding and resume upload
- Career Truth Bank review
- Job preferences and compensation floor
- Gmail and job-platform connection status
- Job recommendations
- Resume/package previews
- Approval requests and sensitive-question review
- Application and recruiter-response timelines
- Daily digest and push notification preferences
- Pause, revoke, export, and delete controls

Clients never receive raw OAuth refresh tokens, browser cookies, worker
credentials, or another user's artifacts.

### API layer

Expose a versioned API such as `/api/v1` with authenticated tenant ownership on
every request. Initial resources:

- `/users/me`
- `/profile`
- `/career-facts`
- `/job-preferences`
- `/automation-policy`
- `/connections`
- `/resumes`
- `/job-matches`
- `/application-packages`
- `/applications`
- `/approval-requests`
- `/agent-runs`
- `/audit-logs`

Mutating actions use idempotency keys. Sensitive actions require recent
authentication and explicit consent checks.

### Worker layer

Background workers own:

- Gmail synchronization and recruiter classification
- Job discovery and deduplication
- Match scoring
- Resume and cover-letter generation
- Document audit and render verification
- Approved recruiter sends
- Controlled application assistance
- Proof reconciliation
- Digests, reminders, and notifications

Browser automation remains a controlled worker capability. CAPTCHA,
authentication challenges, legal declarations, unknown answers, and identity
mismatches create manual gates.

External ATS submission uses a visible pre-submit human-gate check. A CAPTCHA
provider, challenge badge, or human-verification control pauses the application
with its tailored package and completed answers preserved. Only one automatic
submit click is allowed. Once a CAPTCHA gate is recorded, scheduled and
single-job runs cannot retry that application until the candidate completes the
challenge from the preserved checkpoint.

### Data and security

Move from filesystem instances and SQLite to:

- PostgreSQL with tenant ownership on every user-owned row
- Private object storage with short-lived signed URLs
- Encrypted OAuth and platform credentials
- Queue-backed workers with per-user concurrency and rate limits
- Immutable audit events for external actions
- Central consent and policy version history
- Export, deletion, token revocation, and account pause controls

Never use a user-selectable `instance_id` as authorization. The authenticated
user or authorized operator relationship determines tenant scope server-side.

## Mobile Strategy

### Phase 1: responsive web and PWA

Ship onboarding, job review, approvals, status, and account controls as a
responsive web application. Make it installable on iOS and Android home
screens. Use push notifications where platform support permits and email as a
reliable fallback.

### Phase 2: native clients

The first Capacitor iOS and Android source clients now use the same hosted
product and API. Native-only capabilities should remain limited to secure
credential storage, push notifications, file upload, camera/document capture,
deep links, and biometric re-authentication when a validated workflow requires
them. Only system-browser OAuth and deep-link return are enabled in the first
foundation.

Do not embed Gmail credentials, job-board cookies, resume generation, or
autonomous browser workers in the mobile binary.

### Phase 3: richer mobile assistance

Add review queues, document previews, interview preparation, application
history, and one-tap human-gate continuation. Keep final proof and external
action status authoritative on the server.

## Migration Boundary

Pilot contracts map to product records:

| Pilot contract | Product record |
| --- | --- |
| `UserInstanceConfig` | user, tenant membership, connections |
| `CareerTruthBank` | career facts and provenance |
| `ApplicationAnswerProfile` | approved application answers |
| `JobPreferencePolicy` | job preferences |
| `AutomationPolicy` | consent and action authority |
| `ApplicationProof` | applications, evidence, audit events |

All new pilot work must preserve this mapping and avoid adding candidate names,
mailboxes, paths, or answer defaults to shared business logic.

## Product Gates

Before public onboarding:

1. Replace filesystem tenant selection with authenticated user ownership. **Implemented.**
2. Replace SQLite with PostgreSQL and private object storage. **Implemented for the product API.**
3. Add account authentication, recovery, and session management. **Implemented.**
4. Add per-user OAuth connections and encrypted token storage. **Implemented;
   hosted Gmail reconnection and Google verification remain external gates.**
5. Add consent versioning and revocation. **Implemented.**
6. Add background queues, retries, rate limits, and quiet hours. **Implemented.**
7. Add responsive user and admin experiences. **Implemented as a PWA.**
8. Pass cross-tenant isolation and authorization tests. **Local and live
   PostgreSQL tests pass; final CI run remains required on the release commit.**
9. Complete privacy, retention, export, deletion, and incident procedures.
   **Product controls and public pages are implemented. A daily encrypted
   private-bucket backup and same-cluster full restore drill pass on Railway
   Hobby; replacement-infrastructure restore and incident drills remain.**
10. Run the first-friend pilot reliably for at least two weeks. **Not started.**

## Near-Term Build Order

1. Finish `jobagent.unalabs.cloud`, Resend, hosted Gmail OAuth, operator MFA,
   monitoring, backups, and restore/incident drills.
2. Complete Fejiro Gmail, LinkedIn, Indeed, and Dice proof runs without
   submitting a poor-fit role; keep Monster `manual_only` until proof exists.
3. Cut local schedules over one channel at a time after shadow comparison.
4. Run Chukwuma as an isolated first-friend pilot for 14 reliable days.
5. Open broader invitations only after privacy and Google verification.
6. Complete iOS and Android device validation, signing, store assets, privacy
   declarations, internal testing, and store review for the implemented native
   source foundation.

## Customer Intelligence Increment - 2026-09-03

UnaScout remains the customer-facing command centre over the existing
Opportunity Engine -> Application Engine -> Response Engine. This increment
adds customer guidance and review boundaries without moving job-board sessions,
Gmail credentials, or browser automation into the client.

| Area | Status | Evidence boundary |
|---|---|---|
| Guided onboarding and saved progress | Implemented | Seven steps persist through the existing product API; final consent remains explicit. |
| Resume fact review | Partial | Migration and review-required proposal contract are implemented; trusted PDF/DOCX extraction is the next increment. |
| Recommendation explanation and feedback | Implemented | Customer-language reasons and tenant-owned rejection feedback are stored without changing verified facts. |
| Review and Assisted control | Implemented | Existing approval policy is retained; Auto remains unavailable/controlled. |
| Privacy-conscious funnel events | Implemented | New events store step/decision metadata only, not resume text or credentials. |
| Live migration/deployment proof | Not deployed | Migration 012 and routes require hosted rollout and live tenant proof. |
| Store submission | Out of scope | Native clients remain thin hosted-product clients; no store claim is made here. |

The resume proposal endpoint deliberately treats extracted or entered facts as
`review_required`. Proposed and rejected facts must not be consumed by package
generation, job answers, or recruiter replies until a customer-approved fact
path is connected and verified.

### Guided value-to-payment journey - 2026-09-03

UnaScout's customer value path is now an explicit, bounded sequence over the
existing product engines:

`approved profile + default resume` -> `job fit/ATS analysis` -> `customer job
brief` -> `tailored application package` -> `Review or Assisted policy` ->
`approval and tracking`.

The package is stored in `product_application_packages` (migration 013) and is
owned by the same tenant as its job match, resume, application, evidence facts,
usage event, and approval request. Its output records the source resume ID and
version, approved evidence IDs, supported requirements, missing-information
flags, and a truth guard. This is intentionally a product-scoped table because
the older package tables use a different job graph.

Generated output also contains interview preparation prompts tied to approved
fact IDs. Customer edits are limited to package copy, are separately audited,
and force approval-required status; they never rewrite the normalized Career
Truth records or provenance.

The package route consumes the existing `tailored_package` entitlement only
after authentication, verification, pause, ownership, and idempotency checks.
Exhausted allowances return `402 PLAN_LIMIT` with the public plan catalog and a
tenant-scoped `paywall_viewed` event. No browser connector, Gmail credential,
job-board session, or autonomous submission worker is moved into the client.

The customer-facing promise is therefore truthful: UnaScout prepares a
reviewable, role-specific application package from verified customer material;
it does not claim an autonomous submission occurred merely because a package was
generated.

### Repair state

The 2026-09-03 repair expands the journey to nine stages and makes consent,
proposal, feedback, and control-mode contracts explicit. It is implemented in
source and locally smoke-tested, but is **not deployed** and has no external
verification receipt. Migration 012 is the normalized proposal model for this
branch; no deployed-migration receipt was found requiring a follow-up 013.
PostgreSQL isolation, queue behavior, and hosted release proof remain paused
until a controlled deployment. Full local suite/typecheck are blocked by
incomplete dependency hydration in the isolated worktree.
