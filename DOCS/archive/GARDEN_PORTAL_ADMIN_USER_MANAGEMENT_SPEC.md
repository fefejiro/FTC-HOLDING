# Garden Cleaners Portal Admin User Management Spec

**Last updated:** 2026-04-29

## Decision
Garden Cleaners needs real admin user management inside the portal UI. The provisioning script is only an operator fallback for QA, recovery, and repeatable setup. It is not the desired day-to-day admin experience.

## Expected Admin Capabilities

Admins should be able to:

- Create portal users.
- Read/search users by name, email, role, status, and assigned region.
- Edit user profile details.
- Change user role: client, staff, admin.
- Assign staff to Garden queue records.
- Reassign regional ownership.
- Disable users without deleting audit history.
- Hard-delete users only from an owner/operator-confirmed danger zone.

## Roles

| Role | Intended access |
| --- | --- |
| Client | Can view own request/job records only. |
| Staff | Can view Garden operational queue records, claim jobs, update allowed statuses, and add operational notes once notes exist. |
| Admin | Can manage users, roles, assignments, queue status, regions, and staff access. |

## Product UX Direction

The admin area should feel like a modern local service operations console, not a generic template.

Required UI qualities:

- Clean dashboard layout with queue/user tabs.
- Search-first user management.
- Clear role chips and status indicators.
- Slide-over or modal create/edit user flow.
- Confirmation dialog for disabling users.
- Separate danger-zone confirmation for hard delete.
- Smooth loading, empty, success, and error states.
- Mobile usable, but optimized for operator desktop/tablet use.

## Secure Architecture

Never expose the Supabase service-role key in browser code.

Required architecture:

1. Browser portal signs in with Supabase Auth.
2. Browser sends the Supabase access token to a Garden admin API route.
3. API route verifies the caller.
4. API route checks whether caller is admin.
5. API route performs privileged Auth/user/role work using `SUPABASE_SERVICE_ROLE_KEY`.

## Data Model Needed

Create a dedicated role table instead of relying only on public env vars:

```sql
garden_portal_users
- id uuid primary key
- auth_user_id uuid nullable
- email text unique not null
- display_name text
- role text check role in ('client', 'staff', 'admin')
- service_region text
- is_active boolean default true
- created_by text
- updated_by text
- created_at timestamptz
- updated_at timestamptz
```

Bootstrap admin:

- `hello@unalabs.cloud`

Staff shortcut:

- `@gardencleaners.ca` emails may default to staff during bootstrap, but should still be stored in the role table once created.

## API Surface

Recommended routes:

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/garden-cleaners-admin/users` | GET | List/search portal users. |
| `/api/garden-cleaners-admin/users` | POST | Create Auth user and role row. |
| `/api/garden-cleaners-admin/users/:id` | PATCH | Update name, role, region, active status. |
| `/api/garden-cleaners-admin/users/:id` | DELETE | Hard delete only after explicit confirmation. |
| `/api/garden-cleaners-portal/session` | GET | Resolve current user role from role table. |

## QA Acceptance Criteria

Admin user management is not complete until:

- Admin can create a client user from the portal UI.
- Admin can create a staff user from the portal UI.
- Admin can promote/demote roles.
- Admin can disable a user and the disabled user cannot access portal data.
- Staff cannot access admin user management.
- Client cannot access staff/admin data by direct URL.
- User creation does not expose service-role secrets in the browser bundle.
- All role decisions come from the database/API, not only public env vars.

## Relationship To Provisioning Script

`npm run qa:garden:provision` remains useful for:

- Creating QA users quickly.
- Re-seeding test records.
- Recovery when UI access is broken.
- Automated smoke setup.

It should not replace the portal admin UI.
