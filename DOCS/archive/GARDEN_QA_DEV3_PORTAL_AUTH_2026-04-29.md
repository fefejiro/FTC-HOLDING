# Garden Cleaners Portal/Auth/Permissions QA (Dev 3)

**Test timestamp:** 2026-04-29 ET
**Primary URL tested:** https://gardencleaners.ca/garden-cleaners

## Portal Maturity Case

**Classification:** B - Live portal with partial role handling.

The regional portal is live at `/garden-cleaners/portal` and `/portal`. It exposes public regional content and an embedded authentication panel for client/staff/admin lane direction. Full role execution was not verified because no QA credentials were available.

## Customer Perspective Reachable State

- `/garden-cleaners/portal`: Live.
- `/portal`: Live.
- Customer portal content is sign-in gated.
- No customer test credentials were provided, so personal request visibility, status timelines, notes, reschedule/cancel, invoice, and proof flows are access restricted.

## Worker Perspective Reachable State

- No standalone `/garden-cleaners/worker` route is live.
- Staff/operations lane intent is visible inside the shared portal.
- Worker queue visibility, assignment controls, and status updates could not be verified without staff credentials.

## Admin Perspective Reachable State

- No standalone `/garden-cleaners/admin` route is live.
- Admin/operations functionality appears intended inside the shared authenticated portal lane.
- Admin queue visibility, reassignment, and privileged updates could not be verified without admin credentials.

## Missing/Partial Modules

- QA credential pack is missing for customer/staff/admin.
- Standalone role routes are missing by design or not yet implemented.
- Authenticated role separation and record scoping remain unverified.
- Full lifecycle proof from quote intake to admin queue to worker assignment remains blocked by missing credentials/admin access.

## Risks + Next Build/Test Order

1. Fix Garden route isolation so `/garden-cleaners/staff` cannot leak non-Garden content.
2. Provide disposable QA credentials for customer, staff, and admin roles.
3. Verify authenticated portal data scoping and role-specific controls.
4. Confirm quote records persist into the ops queue/Supabase with a traceable test submission.
5. Add automated coverage for blocked role routes and authenticated portal lanes once credentials/fixtures exist.

## Credential / Access Limitation

No customer, staff, or admin credentials were provided. Role-level behavior is therefore marked **Access restricted**, not failed.
