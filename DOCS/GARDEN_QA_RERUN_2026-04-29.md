# Garden Cleaners Live QA Rerun (2026-04-29)

## 1. EXECUTIVE SUMMARY
- **Overall status:** PASS WITH ISSUES
- **Portal maturity:** PARTIAL (live auth shell + role-lane intent, limited verified role execution due no credentials)
- **Deepest verified lifecycle reached:** public visitor -> quote form validation -> successful submission acknowledgement message on live site
- **Top 3 risks:**
  1. `/garden-cleaners/staff` resolves to Una Labs content (cross-brand route leakage).
  2. No supplied customer/staff/admin credentials, so role-level access controls cannot be fully validated.
  3. Live Playwright quote success assertion drift (11/12 pass): test expects a fixed confirmation text timing that did not appear in that run.

## 2. DISCOVERED LIVE STRUCTURE
| Area | Route/Page | Status | Notes |
|---|---|---|---|
| Home | `/garden-cleaners` and `/` | Live | Both return Garden homepage (200). |
| About | `/garden-cleaners/about` | Live | Loads correctly (200). |
| Services | `/garden-cleaners/services` | Live | Loads correctly (200). |
| Contact | `/garden-cleaners/contact` | Live | Loads correctly (200). |
| Get a Quote | `/garden-cleaners/quote` | Live | Form present and interactive. |
| Regional Portal | `/garden-cleaners/portal` and `/portal` | Live | Both load same portal page (200). |
| Login entry | In-portal sign-in form | Partial | Email/password form visible inside portal page; no standalone `/login` route. |
| Dashboard route | `/garden-cleaners/dashboard`, `/dashboard` | Missing | 404 responses. |
| Role routes | `/garden-cleaners/admin`, `/garden-cleaners/customer`, `/garden-cleaners/worker` | Missing | 404 responses. |
| Staff route | `/garden-cleaners/staff` | Live (incorrect target) | Loads Una Labs page (cross-brand routing issue). |

## 3. PUBLIC SITE FINDINGS
| ID | Area | Severity | Repro | Expected | Actual | Recommended Fix |
|---|---|---|---|---|---|---|
| PUB-001 | Route integrity | High | Open `https://gardencleaners.ca/garden-cleaners/staff` | Garden route should resolve to Garden staff lane or 404 | Returns Una Labs page (title: Una Labs Rough Request...) | Add explicit host/path rule so Garden domain cannot resolve non-Garden brand routes. |
| PUB-002 | Quote form validation | Low | Submit invalid email on `/garden-cleaners/quote` | Clear validation error | Error shown: "Please provide a valid email address." | Keep as-is. |
| PUB-003 | Empty required fields | Low | Click submit on empty quote form | Browser/form should block and point required field | Native validation shown ("Please fill out this field.") | Keep as-is. |
| PUB-004 | Quote success UX | Medium | Fill valid quote payload, wait >3s dwell, submit | Success acknowledgment shown | Success shown: "Thanks. Garden Cleaners received your quote request..." | Keep as-is; align automated tests with current live message/timing. |
| PUB-005 | Mobile nav | Low | Playwright mobile flow from menu to quote | Menu and route should work | Pass in live test run | Keep as-is. |
| PUB-006 | Link health | Low | Crawl homepage internal links | No broken internal links | All sampled internal links returned 200 | Keep as-is. |
| PUB-007 | Form polish | Polish | Inspect phone placeholder on quote form | Placeholder should match current phone standard | Placeholder still `(905) 000-0000` | Update placeholder to `+1 289 200 0631` format (or neutral example). |

## 4. CUSTOMER PORTAL FINDINGS
| ID | Area | Severity | Repro | Expected | Actual | Recommended Fix |
|---|---|---|---|---|---|---|
| CUS-001 | Access state | Medium | Open `/garden-cleaners/portal` unauthenticated | Clear customer access guidance | "Sign in required" state shown with portal sign-in form | Keep; add explicit "how to get access" text for customers. |
| CUS-002 | Customer data visibility | Access restricted | No credentials provided | Verify customer sees only own records | Could not verify due missing credentials | Provide test customer credentials or magic-link mailbox for QA. |
| CUS-003 | Self-service actions | Missing | Explore portal unauthenticated | Reschedule/cancel/notes if implemented | No verified self-service actions visible unauthenticated | Mark as planned; implement customer self-service in authenticated lane. |

## 5. WORKER PORTAL FINDINGS
| ID | Area | Severity | Repro | Expected | Actual | Recommended Fix |
|---|---|---|---|---|---|---|
| WRK-001 | Worker route model | Missing | Probe `/garden-cleaners/worker` | Worker lane route or gated redirect | 404 | Keep as Missing unless intentionally embedded-only in shared portal. |
| WRK-002 | Worker queue controls | Access restricted | Portal indicates role lanes; no worker creds available | Validate worker-only queue/actions | Not verifiable | Provide staff test credentials for QA. |
| WRK-003 | Role separation | Access restricted | Attempt lane validation without auth | Worker should not see admin controls | Cannot verify without auth | Add QA role accounts + scriptable fixtures. |

## 6. ADMIN / REGIONAL FINDINGS
| ID | Area | Severity | Repro | Expected | Actual | Recommended Fix |
|---|---|---|---|---|---|---|
| ADM-001 | Regional portal shell | Low | Open `/garden-cleaners/portal` | Regional coverage + routing guidance | Present and functioning | Keep as-is. |
| ADM-002 | Admin route | Missing | Probe `/garden-cleaners/admin` | Gated admin access path | 404 | If admin stays inside shared portal auth lane, document this clearly in portal UX and docs. |
| ADM-003 | Authenticated admin controls | Access restricted | Portal component contains admin/staff logic, but no credentials supplied | Validate queue updates/assignment controls | Not verifiable in this run | Provide admin QA credentials and seeded records. |
| ADM-004 | Refresh stability | Low | Reload portal page unauthenticated | Session state stable after refresh | "Sign in required" persisted after reload | Keep as-is. |

## 7. MISSING OR PARTIAL MODULES
- Standalone login/dashboard routes are not live (`/login`, `/dashboard`, role-specific pages are 404).
- Portal appears to be a **shared regional portal with embedded auth panel**, not fully separated customer/worker/admin route surfaces.
- Role-based queue/actions are coded in portal UI but could not be executed without credentials.
- End-to-end durability of quote submission into admin queue/database cannot be confirmed in this run without DB/admin visibility.

## 8. RECOMMENDED NEXT TEST / BUILD ORDER
1. **Fix route isolation first (High):** prevent Garden domain from serving Una Labs on `/garden-cleaners/staff`.
2. **QA credential pack:** create disposable test users (client/staff/admin) and share secure access procedure for QA runs.
3. **Portal verification pass (credentialed):** validate role separation, record visibility, queue actions, and unauthorized blocking.
4. **Quote durability proof:** confirm submitted quote appears in ops queue/Supabase with trace ID and timestamp.
5. **Test drift fix:** update `garden-cleaners-public.spec.ts` success assertion timing/text to match live behavior.
6. **Polish pass:** replace quote form phone placeholder `(905) 000-0000` with production-consistent value.

---

## Exact Routes Tested
- `/garden-cleaners`
- `/`
- `/garden-cleaners/about`
- `/garden-cleaners/services`
- `/garden-cleaners/contact`
- `/garden-cleaners/quote`
- `/garden-cleaners/portal`
- `/portal`
- `/garden-cleaners/login`
- `/garden-cleaners/dashboard`
- `/garden-cleaners/admin`
- `/garden-cleaners/staff`
- `/garden-cleaners/customer`
- `/garden-cleaners/worker`
- `/login`
- `/dashboard`
- Quote region variants:
  - `/garden-cleaners/quote?region=Whitby`
  - `/garden-cleaners/quote?region=Ajax`
  - `/garden-cleaners/quote?region=Pickering`
  - `/garden-cleaners/quote?region=Courtice`
  - `/garden-cleaners/quote?region=Durham%20Region`

## Playwright Rerun Summary (Live Base URL)
- Command: `PLAYWRIGHT_BASE_URL=https://gardencleaners.ca npx playwright test tests/garden-cleaners-public.spec.ts tests/garden-portal.spec.ts --reporter=list`
- Result: **11 passed / 1 failed**
- Failing test: `Garden Cleaners public QA › quote form accepts a valid lead`
- Observed drift: failure was due expected confirmation text visibility in that run; manual rerun with longer dwell verified success message appears.

## Credential / Access Limitation Statement
- No customer/staff/admin credentials were supplied for this rerun.
- Therefore role-level authorization, data-scoping, assignment controls, and admin-only operations are **access restricted** in this report rather than marked as functional failures.
