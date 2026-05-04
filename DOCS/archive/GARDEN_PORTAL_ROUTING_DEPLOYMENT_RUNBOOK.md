# Garden Portal Routing Deployment Runbook

Date: 2026-04-26
Scope: Persisted routing rollout for Garden portal queue (`service_region`, `assigned_owner`).

## Objective

Deploy and verify schema changes so portal queue controls use first-class persisted routing data with safe fallbacks.

## Included migrations

1. `supabase/migrations/202604260004_garden_queue_routing_fields.sql`
2. `supabase/migrations/202604260005_backfill_garden_routing_fields.sql`
3. `supabase/migrations/202604260006_garden_routing_constraints.sql`

## Pre-flight

1. Confirm branch contains migrations above and portal hardening in `APPS/ftc-site/app/components/garden-cleaners/GardenPortalAccessPanel.tsx`.
2. Confirm build gate passes:
   - `npm --prefix APPS/ftc-site run build`
3. Confirm portfolio gate passes:
   - `npm run qa:portfolio:e2e`

## Deployment order

Run in strict order:

1. `202604260004_garden_queue_routing_fields.sql`
   - Adds nullable columns and indexes.
2. `202604260005_backfill_garden_routing_fields.sql`
   - Backfills historical rows from name/description heuristics.
3. `202604260006_garden_routing_constraints.sql`
   - Adds canonical check constraint for `service_region`.

## Post-deploy verification

Run:

- `scripts/garden-routing-postdeploy-verification.sql`

Pass criteria:

1. Columns exist in `projects` for `service_region` and `assigned_owner`.
2. Constraint `projects_service_region_check` exists.
3. No rows violate canonical region set.
4. Region distribution query returns rows (or zero rows only if `projects` is empty).

## Portal behavior checks

1. Admin session:
   - Can set region and save.
   - Can assign to self.
   - Can mark completed.
2. Staff session:
   - Can triage/schedule and assign to self.
   - Cannot save region.
   - Completed button is disabled.
3. Client session:
   - No queue write controls visible.

## Rollback approach

Data-preserving rollback preferred:

1. Keep columns in place; disable UI writes by temporarily removing operator actions in portal component.
2. If schema rollback is required, drop only the check constraint first:
   - `ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_service_region_check;`
3. Do not drop data columns unless explicitly approved.

## Known non-blocking behavior

- Next.js edge-runtime static-generation warning is expected and does not block release.
