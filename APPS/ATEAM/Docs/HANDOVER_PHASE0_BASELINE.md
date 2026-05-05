# ATEAM Phase 0 Handover Baseline

Date: 2026-03-07  
Scope: `APPS/ATEAM` only  
Status: **Frozen at Phase 0 (safety + decoupling scaffolds complete)**

## What is complete

1. Runtime safety
- `badRequest(...)` helper exists in `Server/server.js`.
- Undefined helper runtime risk is closed.

2. Environment hygiene
- `.env.example` uses placeholder values for provider keys.
- No key-shaped sample value remains.

3. Storage decoupling scaffold
- `Server/lib/storage/repositories.js` introduced.
- `Server/lib/storage/backends/local.js` introduced.
- `ATEAM_STORAGE_BACKEND=local` wired in `Server/server.js`.

4. Scope boundary scaffold
- `Server/lib/auth/principalScope.js` introduced.
- `ATEAM_AUTH_MODE=local|header` wired in `Server/server.js`.
- Scope middleware mounted for `/task`, `/tasks`, `/agent`, `/command`, `/voice`, `/events`, `/speech`.

5. Planning and extraction docs
- `Docs/CAPABILITY_DECOUPLING_PLAN.md`
- `Docs/STORAGE_DECOUPLING_PLAN.md`
- `Docs/TENANT_BOUNDARY_PLAN.md`
- `Docs/EXTRACTION_ROADMAP.md`

## What is intentionally not done yet

- Token verification auth provider integration
- RBAC model and enforcement
- Supabase/Postgres storage adapter
- Object storage adapter for speech audio
- Capability endpoint contract versioning
- Provider-neutral voice adapter layer

## Official reopen point

Resume at **Phase 1: Speech Clarity Capability extraction** from `Docs/EXTRACTION_ROADMAP.md`.

Execution order on reopen:
1. Implement `supabase` + object storage repository adapters.
2. Add dual-write or parity validation path.
3. Version speech clarity request/response contract.
4. Isolate ATEAM-specific semantics from capability endpoint contract.

## Guardrails during FTC-online-first window

- Do not change ATEAM API surface unless fixing critical runtime safety issues.
- Treat current route groups and middleware behavior as frozen baseline.
- Preserve local mode behavior while adding cloud-ready adapters.

