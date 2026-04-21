# Una Labs Test Plan

Generated: 2026-04-21  
Product under test: Una Labs site and worker stack  
Primary domains: `https://unalabs.cloud`, `https://una-stripe-api.fejiro-efiuvwere.workers.dev`  
Status: Execution-ready

---

## 1. Purpose

This plan defines how Una Labs is tested before release, after deploy, and during regression. It is built around the actual shipped surfaces in the repo today:

- Public marketing and proof pages
- Intake and plan-selection funnel
- Stripe checkout handoff
- Auth-gated client views
- Admin operations and billing workflows
- Public status board and worker endpoints

The goal is simple: protect revenue flow, protect trust, and catch regressions before a prospect or client finds them first.

---

## 2. Release Objective

Una Labs is considered launch-safe only if all of the following are true:

1. A prospect can move from public proof page to `/start` to Stripe checkout without confusion or breakage.
2. A client can authenticate and access their portal, proposal, invoice, contract, and report surfaces with the correct guardrails.
3. An admin can view projects, leads, billing state, AutoCollect state, webhooks, and Connect state without data corruption.
4. The public status board reflects live worker status without exposing secrets or PII.
5. Critical failures in auth, payment, routing, or data visibility block release.

---

## 3. Systems Under Test

### 3.1 Frontend routes

Public routes:

- `/`
- `/pricing`
- `/how-it-works`
- `/demo`
- `/contact`
- `/status`
- `/products/dispatch`
- `/products/peacepad`
- `/products/saywetin`
- `/realtor`
- `/start`
- `/start/summary`
- `/confirmation`

Authenticated routes:

- `/login`
- `/portal`
- `/dashboard`
- `/dashboard/proposal`
- `/dashboard/contract`
- `/dashboard/invoice`
- `/dashboard/report`
- `/admin`

### 3.2 Worker endpoints and service behavior

- Public status summary endpoint
- Checkout session creation
- Intake confirmation notification
- Invoice generation after milestone approval
- AutoCollect list, health, sync, and invite flows
- Leads endpoints
- Webhook management and delivery
- Stripe Connect onboarding and sync behavior

### 3.3 Supporting operational assets

- `scripts/update-unalabs-status.mjs`
- `tests/e2e`
- `tests/smoke`
- `tests/integration`
- `tests/security`
- `tests/uat`

---

## 4. Quality Risks To Control

### P0 revenue and trust risks

- Broken intake flow
- Stripe checkout session failure
- Wrong pricing or billing period passed to checkout
- Auth bypass to client or admin data
- Worker endpoint authorization failure
- Invoice or payment-link duplication
- Missing or broken contract, invoice, or proposal rendering

### P1 operational risks

- Leads not appearing in admin
- AutoCollect sync or invite drift
- Status board showing stale or wrong data
- Portal query-parameter handling producing dead-end screens
- Broken case-study to intake attribution links

### P2 quality and polish risks

- Layout regressions on mobile
- Print/PDF layout breakage
- Broken proof links or outdated copy badges on `/how-it-works`
- Accessibility regressions on forms and step flows

---

## 5. Environments

| Environment | Base URL | Purpose | Owner |
|---|---|---|---|
| Production | `https://unalabs.cloud` | Real release verification | Founder / operator |
| Production worker | `https://una-stripe-api.fejiro-efiuvwere.workers.dev` | API and job verification | Founder / operator |
| Local app | `http://localhost:3000` | Fast UI and route validation | Dev |
| Local tests | `tests/` | Automated regression execution | Dev |

### Environment rule

Production verifies the real deploy. Local validates changes faster. A release is not signed off until both are clean where applicable.

---

## 6. Entry Criteria

Do not begin release execution until these checks pass:

1. Frontend build passes from `APPS/una-labs-site` with `npm run build`.
2. Site deploy completes successfully to Cloudflare Pages.
3. Worker deploy completes successfully from `workers/stripe-api` with `npm run deploy`.
4. `npm run status:unalabs:sync` runs cleanly enough to refresh status docs without script failure.
5. Test accounts, Stripe test cards, and any required admin bearer token are available.

---

## 7. Exit Criteria

Release is approved only if all of the following are true:

1. All P0 scenarios pass.
2. No open Sev-1 or Sev-2 defects remain.
3. Smoke pack passes on production.
4. Manual UAT funnel from proof page to checkout completes.
5. Auth and authorization checks pass for public, client, and admin surfaces.
6. Status board and worker health endpoints return expected data.

Conditional release is allowed only when a failing case is isolated, documented, non-revenue-impacting, and explicitly accepted.

---

## 8. Roles And Ownership

| Lane | Primary owner | Secondary owner |
|---|---|---|
| Smoke and deploy verification | Dev | Founder |
| Conversion and public UX | Founder | Dev |
| Client dashboard and portal | Dev | Founder |
| Admin and billing | Founder | Dev |
| Security and auth | Dev | Founder |
| Final signoff | Founder | None |

---

## 9. Test Data And Accounts

Use stable test fixtures for repeatability.

### Required accounts

- Admin account: `mike.fejiro@gmail.com`
- Client test account with at least one active project
- Client test account with no projects
- Prospect email for intake and lead tests

### Required Stripe data

- Valid price mapping for all supported plans
- Test card: `4242 4242 4242 4242`
- Decline-card test where needed

### Required data states

- Project in `intake`
- Project in `scoped`
- Project in `active`
- Project in `review`
- Project in `complete`
- Project with milestones and proof links
- Project with invoice due and overdue
- Project with Stripe Connect not started
- Project with Stripe Connect completed

---

## 10. Test Cadence

### 10.1 Every code change touching public pages

- Run local build
- Run smoke checks for homepage, pricing, start, summary, status
- Verify affected page manually on desktop and mobile width

### 10.2 Every change touching worker, billing, or auth

- Run local/frontend build as needed
- Re-run worker auth checks
- Validate affected admin or client workflow end-to-end
- Verify no unauthorized access is possible

### 10.3 Before every production release

- Execute full smoke pack
- Execute conversion/UAT pack
- Execute admin/billing regression pack
- Execute status and observability pack
- Record signoff result

### 10.4 Weekly operational QA

- Run status sync script
- Verify live status board
- Verify AutoCollect health snapshot
- Verify leads and webhook management surfaces still load

---

## 11. Test Lanes

### 11.1 Smoke lane

Purpose: confirm production is up and major routes render.

Current automation target:

- `tests/smoke`
- `scripts/update-unalabs-status.mjs`

Minimum smoke routes:

- `/`
- `/pricing`
- `/how-it-works`
- `/products/dispatch`
- `/products/peacepad`
- `/products/saywetin`
- `/start`
- `/start/summary`
- `/confirmation`
- `/status`
- `/portal`
- `/dashboard/proposal`
- `/dashboard/report`
- `/admin`
- `/api/public/status-summary`

### 11.2 Functional regression lane

Purpose: verify business-critical user flows.

Primary focus:

- Intake
- Checkout
- Proposal
- Contract
- Invoice
- Report
- Admin pipeline and leads
- AutoCollect
- Stripe Connect

### 11.3 Security and authorization lane

Purpose: confirm public, client, and admin boundaries hold.

Primary focus:

- Unauthenticated access behavior
- Wrong-user access behavior
- Admin bearer token enforcement
- Public endpoint content safety

### 11.4 UAT lane

Purpose: verify the product feels credible, clear, and usable from a founder/operator perspective.

Primary focus:

- Proof-page credibility
- CTA continuity
- Pricing clarity
- Form clarity
- Mobile usability
- Print and PDF outputs

### 11.5 Performance and resilience lane

Purpose: catch slow or brittle flows before scale increases.

Primary focus:

- Status page refresh stability
- Dashboard loading states
- Worker latency for public summary and admin actions
- Repeat-action idempotency for invoices and reminders

---

## 12. Core Scenarios

## 12.1 Public marketing and proof surfaces

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| PUB-01 | Homepage renders | Open `/` | Hero, CTA, navigation, footer render with no obvious layout breakage | P1 |
| PUB-02 | Pricing page renders | Open `/pricing` | Pricing content loads, CTA works | P1 |
| PUB-03 | How It Works credibility | Open `/how-it-works` | Live modules show `LIVE`, incomplete modules show `COMING SOON`, no false claims | P0 |
| PUB-04 | Case studies render | Open each `/products/{slug}` | Case-study content, live URL, and CTA load correctly | P1 |
| PUB-05 | Case study attribution link | Click primary conversion CTA from each case study | URL includes `source=case_study_*` and correct `product=*` param | P0 |
| PUB-06 | Contact page lead path | Open `/contact` and submit valid lead | Lead is accepted and appears in admin lead list | P1 |

## 12.2 Conversion funnel

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| CONV-01 | Start flow step 1 validation | Open `/start`, leave required fields empty | Validation blocks progression | P0 |
| CONV-02 | Start flow step advance | Complete step 1 with valid values | User proceeds to plan-selection step | P0 |
| CONV-03 | Plan-card selection | Switch between plans and billing cycles | Summary block updates correct plan and price | P0 |
| CONV-04 | Case-study referral hint | Open `/start?source=case_study_dispatch&product=dispatch` | Referral banner displays correct product name | P1 |
| CONV-05 | Tracking persistence | Complete `/start` and move to summary | `sessionStorage` contains intake payload including source/product when present | P1 |
| CONV-06 | Summary page redirect guard | Open `/start/summary` with no stored intake | User is returned to `/start` cleanly | P0 |
| CONV-07 | Summary page content | Load summary after start flow | Selected plan, billing cycle, user details, and CTA render correctly | P0 |
| CONV-08 | Checkout session creation | Click `Start free trial` on summary | Worker returns checkout URL and browser redirects | P0 |
| CONV-09 | Stripe checkout plan integrity | Review Stripe checkout screen | Price, frequency, and email match selected plan | P0 |
| CONV-10 | Confirmation path | Complete checkout or simulate success route | Confirmation page loads without dead end | P1 |

## 12.3 Login and client access

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| AUTH-01 | Login redirect | Attempt protected route while signed out | User is sent to login with redirect param preserved | P0 |
| AUTH-02 | Portal no-id guard | Open `/portal` without `id` | Friendly error state is shown, not a crash | P1 |
| AUTH-03 | Portal valid project | Open `/portal?id={validProject}` as correct user | Project and milestones load | P0 |
| AUTH-04 | Portal wrong project | Open `/portal?id={otherUsersProject}` | Access denied or safe error, no foreign data exposure | P0 |
| AUTH-05 | Proposal route auth | Open `/dashboard/proposal` while signed out | Login is required | P0 |
| AUTH-06 | Report route auth | Open `/dashboard/report` while signed out | Login is required | P0 |
| AUTH-07 | Report valid data | Signed-in client opens `/dashboard/report` | Only their projects and milestones appear | P0 |
| AUTH-08 | Empty report state | Signed-in client with no projects opens report | Empty state renders cleanly | P1 |

## 12.4 Proposal, contract, invoice, and milestone workflows

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| OPS-01 | Proposal render | Open `/dashboard/proposal` for valid project | Proposal content, pricing, and print action render | P0 |
| OPS-02 | Proposal print | Click print/PDF action | Browser print dialog opens and layout is readable | P1 |
| OPS-03 | Contract render | Open `/dashboard/contract` for valid project | Contract displays current status and signing UI/state | P0 |
| OPS-04 | Contract sign flow | Complete signing action | Status updates to signed and duplicate insert does not occur | P0 |
| OPS-05 | Report render | Open `/dashboard/report` | Project report renders with milestones and completion rate | P1 |
| OPS-06 | Invoice render | Open `/dashboard/invoice` for generated invoice | Invoice number, amount, status, and print action render | P0 |
| OPS-07 | Milestone approval | Approve milestone from portal review state | Status changes and invoice generation is triggered | P0 |
| OPS-08 | Request changes path | Request changes with notes | Milestone status updates and notification path fires without client-side failure | P1 |
| OPS-09 | Proof-link visibility | Load milestone with proof URL or note | Proof content is visible and link opens | P1 |

## 12.5 Admin operations

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| ADM-01 | Admin access control | Open `/admin` signed out or as non-admin | Access is denied safely | P0 |
| ADM-02 | Admin dashboard load | Open `/admin` as admin | Projects, milestones, contracts, invoices, leads, and widgets load | P0 |
| ADM-03 | Pipeline stage update | Change project stage in admin | Stage persists and ordering updates | P1 |
| ADM-04 | Lead ingestion | Submit contact-form lead | Lead appears in admin list | P1 |
| ADM-05 | Instant bill min validation | Create instant bill below minimum | Validation rejects request | P0 |
| ADM-06 | Instant bill happy path | Create valid instant bill | Payment link is returned and usable | P0 |
| ADM-07 | Instant bill duplicate safety | Retry same action unintentionally | No broken duplicate state or unclear result | P1 |
| ADM-08 | Billing snapshot load | Billing panels and subscription state load | Accurate status badges and dates show | P1 |
| ADM-09 | Branding save | Save per-project branding | Settings persist and success message is shown | P2 |
| ADM-10 | Webhook create | Add webhook endpoint | Endpoint is saved and secret handling is safe | P1 |
| ADM-11 | Webhook failure handling | Trigger failed webhook delivery | Failure is logged without UI crash | P1 |
| ADM-12 | Stripe Connect start | Start onboarding for eligible project | Redirect to Stripe onboarding occurs | P1 |
| ADM-13 | Stripe Connect sync | Refresh status after onboarding | Charges and payout state persist back to project | P1 |

## 12.6 AutoCollect and worker-managed flows

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| AUTO-01 | AutoCollect auth guard list | Call list endpoint without auth | `401` or `403` | P0 |
| AUTO-02 | AutoCollect auth guard health | Call health endpoint without auth | `401` or `403` | P0 |
| AUTO-03 | AutoCollect list authenticated | Call list endpoint with valid admin bearer | `200` and structured queue data | P1 |
| AUTO-04 | AutoCollect health authenticated | Call health endpoint with valid admin bearer | `200` and usable health snapshot | P1 |
| AUTO-05 | AutoCollect sync | Trigger sync endpoint | Eligible overdue invoices populate queue | P1 |
| AUTO-06 | AutoCollect send invite | Trigger invite for one eligible item | Reminder path fires and attempt metadata updates | P1 |
| AUTO-07 | AutoCollect rate limiting | Repeat send beyond allowed cadence | Request is blocked or ignored safely | P1 |
| AUTO-08 | Cron verification | Review scheduled run after expected window | Scheduled job executes without fatal error | P2 |

## 12.7 Status and observability

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| OBS-01 | Public status endpoint | Call `/api/public/status-summary` | `200`, structured JSON, no secrets | P0 |
| OBS-02 | Status page render | Open `/status` | Cards, module table, testing lanes, and connection health render | P1 |
| OBS-03 | Status auto-refresh | Keep page open for more than 60 seconds | Refresh occurs without breaking UI | P2 |
| OBS-04 | Status-doc sync script | Run `npm run status:unalabs:sync` | Status docs update without crashing | P1 |

## 12.8 Mobile, accessibility, and presentation quality

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| UX-01 | Mobile start flow | Test `/start` at 375px width | No clipped cards, buttons, or horizontal scroll | P1 |
| UX-02 | Mobile how-it-works | Test `/how-it-works` at 375px width | Module cards stack cleanly | P1 |
| UX-03 | Keyboard navigation | Navigate form and step UI using keyboard only | Focus states visible and flow usable | P1 |
| UX-04 | Color and badge clarity | Review live vs coming-soon badges and statuses | Meaning remains clear without confusion | P2 |
| UX-05 | Print views | Print proposal, invoice, and report | Layout remains legible and professional | P1 |

---

## 13. Security Checks

These checks are mandatory before signoff.

| ID | Check | Expected |
|---|---|---|
| SEC-01 | Public status endpoint contains no secrets, tokens, or client emails | Pass |
| SEC-02 | Admin worker routes reject unauthenticated access | Pass |
| SEC-03 | Client report and portal never reveal another client's data | Pass |
| SEC-04 | Login redirect does not create open redirect risk | Pass |
| SEC-05 | Webhook configuration does not expose secrets after creation | Pass |

---

## 14. Performance Checks

Performance does not need enterprise benchmarking yet, but these practical checks matter:

| ID | Check | Target |
|---|---|---|
| PERF-01 | Homepage visible load on production broadband | Feels immediate, no blank-screen hang |
| PERF-02 | `/start` step transitions | Under 1 second perceived response |
| PERF-03 | Status summary endpoint | Stable response, no repeated timeout |
| PERF-04 | Admin dashboard initial load | Data appears without prolonged indefinite spinner |
| PERF-05 | Repeated polling pages | No visible memory-leak or refresh breakage over 3 minutes |

---

## 15. Defect Severity

| Severity | Definition | Release impact |
|---|---|---|
| Sev-1 | Revenue, auth, payment, or data-exposure failure | No-go |
| Sev-2 | Critical workflow blocked with workaround weak or unclear | Normally no-go |
| Sev-3 | Important regression with workable fallback | Conditional release possible |
| Sev-4 | Cosmetic or low-risk issue | Does not block release |

Examples of automatic Sev-1:

- Checkout does not open
- Wrong customer can access another project
- Admin endpoints work without authorization
- Invoice generation duplicates or corrupts billing state

---

## 16. Execution Order For Release Day

Run the packs in this order:

1. Build and deploy verification
2. Production smoke pack
3. Conversion funnel pack
4. Client access and dashboard pack
5. Admin and billing pack
6. Status and observability pack
7. Mobile and print-quality spot checks
8. Final signoff note

---

## 17. Evidence To Capture

For each release, keep lightweight evidence:

- Build success output
- Pages deploy URL
- Worker deploy version ID
- Smoke results
- Screenshots for `/start`, `/start/summary`, `/status`, `/admin`
- Stripe checkout screenshot with plan and price
- One signed or rendered client document screenshot
- Open defects with severity and disposition

---

## 18. Automation Plan

Current repo state shows placeholder test structure but not meaningful coverage yet. Build automation in this order.

### Phase 1: smoke

Implement in `tests/smoke`:

- Homepage route check
- Start route check
- Summary route guard check
- Status route check
- Public status endpoint check
- Case-study CTA attribution presence

### Phase 2: e2e Playwright

Implement in `tests/e2e`:

- `/start` step validation and plan selection
- Redirect guard from `/start/summary`
- Case-study to start attribution flow
- Login redirect behavior for protected pages

### Phase 3: integration

Implement in `tests/integration`:

- Worker endpoint auth guards
- Status summary response contract
- AutoCollect sync and validation behavior

### Phase 4: security

Implement in `tests/security`:

- Unauthorized access attempts
- Public endpoint content inspection
- Wrong-project client access checks

### Phase 5: UAT scripts

Implement in `tests/uat`:

- Founder acceptance journey from case study to checkout
- Admin review of leads, billing, AutoCollect, and status board

---

## 19. Immediate Next Test Work

After this plan is approved, execute these next actions in order:

1. Replace placeholder specs in `tests/smoke`, `tests/e2e`, `tests/integration`, `tests/security`, and `tests/uat` with real Una Labs coverage.
2. Add a documented test-data setup for one admin, one client, and one overdue invoice scenario.
3. Create a repeatable release checklist using Sections 16 through 18 of this plan.

---

## 20. Signoff Template

Use this block for each release:

```md
Release date:
Frontend deploy URL:
Worker version:
Smoke pack:
Conversion pack:
Client pack:
Admin pack:
Status pack:
Open defects:
Release decision:
Signed off by:
```

---

## Bottom Line

Una Labs does not need a bloated QA process. It needs a disciplined one.

The release bar is:

1. Public proof is credible.
2. Conversion path works.
3. Payments and auth are safe.
4. Admin operations do not drift.
5. Production status is observable.

If those five stay true, the site can sell with confidence.
