---
name: ftc-portal-qa-audit
description: Founder-facing QA workflow for live public websites, portals, role-based dashboards, service operations products, and client microsites. Use when asked to test, audit, review, QA, verify, or produce an operational readiness report for a live site, portal, quote flow, booking flow, regional workflow, customer/staff/admin access, or end-to-end service lifecycle.
---

# FTC Portal QA Audit

## Core Rule

Discover what is live before judging the product. Do not assume a portal, route, role, or workflow exists. If a flow is missing or intentionally gated, mark it as missing, partial, placeholder, or access restricted rather than calling it a failed test.

## Workflow

1. Start with live discovery:
   - Open the primary URL.
   - Inventory visible navigation, CTAs, forms, linked routes, auth entry points, and dashboards.
   - Probe clean routes, prefixed routes, role routes, and refresh behavior.
   - Capture the deepest truthful lifecycle reached.

2. Separate findings:
   - public website issues
   - portal issues
   - customer role issues
   - worker/staff role issues
   - admin/operator/regional issues
   - missing or partial modules
   - polish issues

3. Test practically:
   - Use public visitor, customer, worker/staff, and admin/operator perspectives.
   - Submit forms only with clearly marked QA data.
   - Run negative tests that make sense for what is live.
   - Check mobile navigation, layout clipping, broken media, placeholder copy, route refresh, and direct URL access.

4. Report founder-facing:
   - Lead with status, maturity, lifecycle depth, and top risks.
   - Use tables for actionable findings.
   - Add simple charts when helpful, such as severity counts, lifecycle progress, or module maturity.
   - Add a roadmap ordered by risk and dependency.

## Status Labels

Use these route/module status labels:

- Live
- Partial
- Placeholder
- Missing
- Access restricted

Use these severity labels:

- Blocker
- High
- Medium
- Low
- Polish

## Required Report Shape

Use this structure unless the user requests another format:

1. EXECUTIVE SUMMARY
   - overall status: PASS / PASS WITH ISSUES / FAIL
   - portal maturity: LIVE / PARTIAL / PLACEHOLDER / NOT FOUND
   - deepest verified lifecycle reached
   - top 3 risks

2. DISCOVERED LIVE STRUCTURE
   - Table: Area, Route/Page, Status, Notes

3. PUBLIC SITE FINDINGS
   - Table: ID, Area, Severity, Repro, Expected, Actual, Recommended Fix

4. CUSTOMER PORTAL FINDINGS
   - Same table shape

5. WORKER PORTAL FINDINGS
   - Same table shape

6. ADMIN / REGIONAL FINDINGS
   - Same table shape

7. MISSING OR PARTIAL MODULES
   - List intended but not functional modules

8. CHARTS / SNAPSHOT
   - Severity counts, module maturity, or lifecycle progress

9. RECOMMENDED NEXT TEST / BUILD ORDER
   - Ordered roadmap with build dependencies first

## Roadmap Guidance

Order fixes by operational dependency:

1. Routing/domain correctness
2. Intake/form persistence
3. Auth and role gates
4. Admin/operator queue
5. Customer status visibility
6. Worker assignment/status tools
7. Completion proof, invoice, follow-up
8. Polish, analytics, reporting, and regression automation

## Evidence Hygiene

Save raw evidence when possible, but keep the user-facing report concise. Include enough route/status details that another developer can reproduce findings without rereading screenshots.
