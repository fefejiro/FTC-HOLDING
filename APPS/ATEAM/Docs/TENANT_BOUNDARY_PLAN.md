# ATEAM Tenant Boundary Plan

Scope: `APPS/ATEAM` only.  
This plan defines boundary rules; it does not implement auth yet.

## 1. Required Modes

## Mode A: Single-user local mode

- Identity source: synthetic local principal (`local_user`, `local_workspace`)
- Auth requirement: none (dev/offline)
- Storage scope: single local workspace namespace

## Mode B: Authenticated user mode

- Identity source: authenticated user token
- Auth requirement: required for non-health APIs
- Storage scope: user-scoped resources inside one workspace

## Mode C: Multi-tenant platform mode

- Identity source: tenant + workspace + user claims
- Auth requirement: strict
- Storage scope: tenant/workspace partition + RBAC for user roles

## 2. Resource Ownership Boundaries

| Resource | Required owner keys | Notes |
|---|---|---|
| Session | `tenant_id`, `workspace_id`, `user_id`, `session_id` | Session id alone is insufficient in multi-tenant mode |
| Task | `tenant_id`, `workspace_id`, `task_id` | Optional `assigned_user_id` / `assigned_agent` |
| Thread message | `tenant_id`, `workspace_id`, `task_id`, `thread_id` | Must not be queryable across workspaces |
| Memory (global/task) | `tenant_id`, `workspace_id`, (`task_id` nullable) | Global memory belongs to workspace; task memory belongs to task |
| Event log | `tenant_id`, `workspace_id`, `session_id`, `event_id` | Dedupe must include owner scope, not only event fields |
| Audio artifact | `tenant_id`, `workspace_id`, `session_id`, `artifact_id` | Signed URL access and retention policy required |

## 3. API Boundary Rules

Minimum boundary rules for all non-health endpoints:

1. Resolve principal (`tenant_id`, `workspace_id`, `user_id`) from auth context or local-mode defaults.
2. Derive effective scope before any store read/write.
3. Reject resource IDs that do not belong to principal scope.
4. Ensure dedupe and lock keys include scoped ownership fields.

## 4. Endpoint Access Policy Targets

- Public (no auth): `GET /health` only
- Authenticated user:
  - `/agent/*`
  - `/task/*`
  - `/events/*`
  - `/speech/*`
  - `/voice/*` (or internal with broker)
- Internal-only (recommended later):
  - provider-facing voice synthesis internals
  - background summary generation workers

## 5. Session and Event Isolation Requirements

- `sessionId` must be scoped by tenant/workspace and never globally trusted alone.
- Event dedupe keys should include:
  - `tenant_id`
  - `workspace_id`
  - `session_id`
  - event type + dedupe key or turn id

## 6. Local Compatibility Strategy

To preserve local mode while preparing for auth mode:

- Add a lightweight principal resolver:
  - Local mode: fixed synthetic principal
  - Auth mode: token-derived principal
- Keep same route surface, but enforce ownership checks through a shared scope middleware.

## 7. Uncertainty Notes

- Role model (owner/admin/member/viewer) is not defined in current ATEAM code and should be set before multi-tenant rollout.
- Token issuer and auth provider are undecided in current codebase.

## 8. Current Implementation Status (this pass)

Implemented in ATEAM backend:

- Principal scope middleware with two modes:
  - `local` (default synthetic principal)
  - `header` (requires `x-ateam-tenant-id`, `x-ateam-workspace-id`, `x-ateam-user-id`)
- Scoped ID normalization helper supporting optional `workspace::resourceId` format.
- Route-level scope guards wired for:
  - task/thread routes
  - agent command routes
  - event routes
- Scope middleware is mounted on API route groups only (`/task`, `/tasks`, `/agent`, `/command`, `/voice`, `/events`, `/speech`), so `/health` and static app shell remain public-compatible.

Not implemented yet:

- Full auth token verification
- RBAC role checks
- Scope-aware filtering for aggregate list routes such as `/tasks`
