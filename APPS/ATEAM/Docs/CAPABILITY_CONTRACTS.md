# ATEAM Capability Contracts (Phase 1 Scaffold)

Scope: `APPS/ATEAM` only.

This document defines the Phase 1 contract scaffold added under `/capability/*`.
Legacy routes (`/speech/*`, `/voice/*`, `/events/*`, `/task/*`, `/agent/*`) remain active for compatibility.

## 1. Contract Envelope

Capability routes accept an envelope shape:

```json
{
  "requestId": "req_123",
  "contractVersion": "v1alpha1",
  "scope": {
    "tenant_id": "tenant_a",
    "workspace_id": "workspace_a",
    "user_id": "user_a",
    "role": "member"
  },
  "data": {}
}
```

Compatibility behavior:

- If `data` is omitted, request body is treated as `data`.
- `requestId` can be sent via `x-request-id`.
- `contractVersion` can be sent via `x-ateam-contract-version`.
- If scope is omitted, scope is derived from `req.principal`.

## 2. Response/Errors

Success envelope:

```json
{
  "ok": true,
  "requestId": "req_123",
  "contractVersion": "v1alpha1",
  "scope": {},
  "...payload": "..."
}
```

Error envelope:

```json
{
  "ok": false,
  "requestId": "req_123",
  "contractVersion": "v1alpha1",
  "error": "SCOPE_FORBIDDEN",
  "details": "cross_workspace_resource_access",
  "code": "SCOPE_FORBIDDEN"
}
```

## 3. Capability Routes Added (Scaffold)

- `POST /capability/speech-clarity/session`
- `POST /capability/speech-clarity/session/:id/transcript`
- `POST /capability/speech-clarity/session/:id/analyze`
- `POST /capability/speech-clarity/session/:id/audio`
- `GET /capability/speech-clarity/session/:id`

- `POST /capability/voice/synthesize`
- `GET /capability/voice/capabilities`

- `POST /capability/workflow/events/:sessionId`
- `GET /capability/workflow/events/:sessionId`
- `POST /capability/workflow/tasks/:taskId/status`
- `GET /capability/workflow/tasks/:taskId`

- `POST /capability/context/bundle`

- `POST /capability/agent/respond`
- `POST /capability/agent/respond/stream`

## 4. Auth Modes

Configured through `ATEAM_AUTH_MODE`:

- `local` (synthetic principal)
- `header` (`x-ateam-tenant-id`, `x-ateam-workspace-id`, `x-ateam-user-id`)
- `jwt` (provider-agnostic JWT claims envelope)

JWT required claims (Phase 1 scaffold):

- `tenant_id` (or `tenantId`/`tid`)
- `workspace_id` (or `workspaceId`/`wid`)
- `user_id` (or `userId`/`sub`)
- `role`
- `exp`

Note: Phase 1 JWT mode parses claims envelope and expiry. Signature verification/provider binding is still pending.

## 5. Storage Backends

Configured through `ATEAM_STORAGE_BACKEND`:

- `local` (active)
- `supabase` (scaffold only)

Supabase scaffold currently defines contract surface and required env vars:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET_AUDIO`

The actual Supabase repository implementation remains pending extraction phases.
