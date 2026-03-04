# PeacePad v2 Module Engine

## Purpose
This document defines the `v2` boundary and the phased implementation plan for a safe rollout that does not alter existing `v1` behavior.

## v2 Boundary
- New API prefix: `/v2/*`
- New server code root: `server/v2/*`
- Existing `v1` routes remain in `server/routes.ts` and are left unchanged.
- `v2` mounts as an additional router from the main server route registration.

## Current Baseline (Phase 0 inspection)
- Main route registration: `server/routes.ts` via `registerRoutes(app)`.
- Server bootstrap: `server/index.ts`.
- Validation tooling in use: `zod` and `drizzle-zod` (`shared/schema.ts`).
- DB tooling in use: `drizzle-orm`, `drizzle-kit`, SQL migrations in `migrations/` and operational SQL scripts in `server/migrations/`.
- Reusable services identified:
  - Conflict and safety signals: `server/emotionAnalyzer.ts`, `server/services/aiBoundaries.ts`
  - Rewrite support: `server/services/prepChatService.ts`
  - Support discovery: `server/services/ontario211.ts`, `storage.getSupportResources(...)`

## Implementation Plan
1. Phase 1: Module registry + intent router + `/v2/health`
   - Add `server/v2` router mount and schemas.
   - Implement canonical module registry and intent routing endpoint.
   - Add minimal unit tests and docs updates.
2. Phase 2: Conflict check module
   - Add `/v2/modules/conflict-check`.
   - Reuse `analyzeConflict` and boundaries logic.
   - Add strict input/output schemas and tests.
3. Phase 3: Rewrite message module
   - Add `/v2/modules/rewrite-message`.
   - Reuse `analyzeDraftTone` and safe rewrite generation patterns.
   - Include calm/neutral/boundary variants with personality-aware phrasing.
4. Phase 4: Support discovery module
   - Add `/v2/modules/support-discovery`.
   - Reuse support resource storage and Ontario 211 integration.
   - Add ranking and crisis-first safety gating.
5. Data + handover
   - Add `pp_v2_module_runs` and `pp_v2_launcher_state` tables through shared schema + migration SQL.
   - Complete `docs/v2/*` handover docs.
   - Run lint/tests/smoke checks and verify `v1` endpoints still respond.

## Phase 1 Delivered
- `server/v2/registry/moduleRegistry.ts` with stable module IDs and metadata.
- `POST /v2/router/intent` with strict request/response validation.
- `GET /v2/health` with versioned payload and dependency checks.
- New `v2` mount added in `server/routes.ts` as `app.use("/v2", ...)`.
- Unit tests added for intent routing behavior in `tests/unit/v2/intentRouter.test.ts`.

## Phase 2 Delivered
- `POST /v2/modules/conflict-check` implemented in `server/v2/modules/conflictCheck.ts`.
- Conflict analysis refactor service added in `server/v2/services/conflictService.ts`.
- Strict schemas added in `server/v2/schemas/conflictCheck.ts`.
- Unit test added in `tests/unit/v2/conflictCheck.test.ts`.

## Phase 3 Delivered
- `POST /v2/modules/rewrite-message` implemented in `server/v2/modules/rewriteMessage.ts`.
- Rewrite refactor service added in `server/v2/services/rewriteService.ts` using `prepChatService`.
- Strict schemas added in `server/v2/schemas/rewriteMessage.ts`.
- Unit test added in `tests/unit/v2/rewriteMessage.test.ts`.
