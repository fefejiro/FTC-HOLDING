# Garden Cleaners Credentialed Portal QA Plan

**Workspace:** C:\FTC HOLDING\_restore_repo
**Date:** 2026-04-29

---

## 1. Test Matrix: Roles × Routes

| Role      | /garden-cleaners/portal | /portal | /garden-cleaners/dashboard | /garden-cleaners/admin | /garden-cleaners/worker | /garden-cleaners/customer |
|-----------|------------------------|---------|---------------------------|------------------------|------------------------|---------------------------|
| Customer  | Sign in, see own jobs  | Same    | Forbidden/404             | Forbidden/404          | Forbidden/404          | Allowed (if implemented)  |
| Staff     | Sign in, see queue     | Same    | Allowed (if implemented)  | Forbidden/404          | Allowed                | Forbidden/404             |
| Admin     | Sign in, see all       | Same    | Allowed                   | Allowed                | Allowed                | Allowed                   |

- All routes must be tested both unauthenticated and authenticated (with each role).

---

## 2. Expected Access per Role

- **Customer:**
  - Can view only their own quotes/jobs.
  - Cannot access staff/admin dashboards or queues.
  - Can submit new quote requests and view status.
- **Staff:**
  - Can view assigned jobs/queue.
  - Cannot access admin-only controls or customer-only data.
  - Can update job status, but not reassign or delete jobs.
- **Admin:**
  - Can view and manage all jobs/quotes.
  - Can reassign, update, or delete any job.
  - Can access all dashboards and controls.

---

## 3. Quote/Job Lifecycle Steps

1. Customer submits quote request.
2. Admin/staff see new request in queue.
3. Staff assigned to job; status updated.
4. Customer sees status update in portal.
5. Job marked complete/cancelled; customer notified.
6. Admin can reassign or archive jobs as needed.

---

## 4. Negative Permission Tests

- Attempt to access staff/admin/customer routes with wrong or no credentials.
- Attempt to view or modify jobs not assigned to the current user.
- Attempt to submit duplicate quotes or perform restricted actions.
- Refresh portal after login/logout to check session persistence and access control.

---

## 5. Evidence Capture Format

| Timestamp (ET) | URL | Role | Auth State | Action | Expected | Actual | Pass/Fail | Screenshot/Notes |
|----------------|-----|------|-----------|--------|----------|--------|-----------|------------------|
|                |     |      |           |        |          |        |           |                  |

- Use this table for each tested route/action. Attach screenshots or logs as needed.

---

## 6. Pass/Fail Criteria

- **Pass:** All role-based access, lifecycle, and negative tests behave as expected. No unauthorized access or data leakage. All session and permission boundaries enforced.
- **Fail:** Any unauthorized access, data leakage, or broken role separation. Any critical workflow (quote/job) is blocked or misrouted.

---

## 7. Final Report Template

### Summary
- Overall portal maturity (A-E)
- Key findings by role
- Any critical failures or blockers

### Evidence Table
- (Insert completed evidence table)

### Recommendations
- List fixes, retest order, and any required credential packs or fixtures.

---

> This plan is the QA execution and evidence template for credentialed Garden Cleaners portal testing. No code changes are included.
