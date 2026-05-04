# Una Labs Delivery System Closeout

## 1. How Una Labs Should Run Future Client Projects

- **Intake:**
  - Use a structured intake form to capture client requirements, contacts, and constraints.
- **Scope:**
  - Define deliverables, acceptance criteria, and technical boundaries up front.
  - Document all scope decisions in a single source-of-truth doc.
- **Build:**
  - Use a reproducible, version-controlled build process.
  - Keep all code, infra, and config changes in the repo.
- **QA:**
  - Run automated and manual QA before any client walkthrough.
  - Record all test results and blockers in a QA log.
- **Client Walkthrough:**
  - Schedule a live walkthrough only after QA passes and handoff docs are complete.
  - Use a checklist to ensure all features and flows are demoed.
- **Handoff:**
  - Provide clear, up-to-date handoff docs (admin setup, support, known issues, rollback plan).
  - Confirm client acceptance in writing.
- **Post-Handoff Support:**
  - Define a support window and escalation path.
  - Track post-handoff issues in a shared system.

## 2. Garden Cleaners Case Study

- **What Was Delivered:**
  - Full client portal (quote, job, assignment, status flows)
  - Supabase Auth, RLS, admin/staff/customer roles
  - Cloudflare Pages frontend, Railway backend
  - QA, migration, and production handoff docs
- **What Worked:**
  - Clear migration/apply plan
  - Early RLS and role seeding
  - Documented admin account setup
  - QA logs and blockers tracked
- **What Slowed Us Down:**
  - Supabase shared project branding limitations
  - Email sender display-name issues
  - Playwright test path/context issues
  - Manual dashboard steps for email templates
- **What Should Be Repeated:**
  - Source-of-truth handoff docs
  - Explicit QA and migration checklists
  - Role/credential setup before walkthrough
- **What Should Never Be Repeated:**
  - Using QA/test credentials as production credentials
  - Sending invites before email branding is correct
  - Allowing secrets in docs or handoff

## 3. Documentation Standards

- **Source-of-Truth Docs:**
  - All critical docs live in the DOCS/ folder in the repo.
  - Use a single doc per major process (migration, handoff, QA, support).
- **Avoiding Duplicates/Stale Docs:**
  - Link to source-of-truth docs from all checklists and handoff notes.
  - Archive or delete outdated/duplicate docs after handoff.
- **Handoff Docs Required Before Walkthrough:**
  - Admin account setup
  - Email/SMS branding status
  - Migration/apply plan
  - QA/test log
  - Known issues and rollback plan

## 4. Metrics

- **Live QA Result:** All critical flows pass, with known email sender display-name limitation.
- **Test Pass/Fail:** Playwright E2E: pass (public, portal, credentialed); manual QA: pass.
- **Blockers Resolved:** All but sender display-name (pending custom SMTP or owner acceptance).
- **Remaining Handoff Gates:** Custom SMTP or written acceptance of sender limitation.
- **Velocity Notes:** Most blockers were external (branding, infra), not code.

## 5. Lessons Learned

- **Repo Context Issues:**
  - Always work in the correct repo root; avoid context drift.
- **Auth/Email Branding Issues:**
  - Plan for branding constraints early; do not assume sender can be changed last-minute.
- **Supabase Shared Project Implications:**
  - Shared projects limit branding and sender flexibility; use project-per-client if needed.
- **Railway/Cloudflare/Supabase Ownership Clarity:**
  - Document who owns each surface and how to access/transfer ownership.

## 6. Do/Do-Not List

- **Do:**
  - Complete all QA and handoff docs before client sees product
  - Use only production credentials for production
  - Remove all QA/test credentials before go-live
  - Keep secrets out of docs and handoff
- **Do Not:**
  - Send invites or walkthrough links before branding and sender are correct
  - Use QA/test credentials as production credentials
  - Leave secrets, keys, or passwords in any documentation

_No secrets or credentials in this document._
