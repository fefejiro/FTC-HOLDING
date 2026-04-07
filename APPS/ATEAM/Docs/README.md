# ATEAM Docs Index

This folder mixes current operating docs and older planning notes. Use this file as the boundary between what is still active and what is only historical context.

## Current Source Of Truth

- [`../README.md`](../README.md): product/runtime overview and canonical scripts
- [`product-v1/README.md`](product-v1/README.md): canonical ATEAM V1 product direction
- [`product-v1/product-scope-v1.md`](product-v1/product-scope-v1.md): finalized scope matrix and guardrails
- [`product-v1/request-object-spec.md`](product-v1/request-object-spec.md): immutable request model
- [`product-v1/state-machine.md`](product-v1/state-machine.md): V1 state and transition model
- [`product-v1/eval-rubric.md`](product-v1/eval-rubric.md): V1 evaluation model
- [`product-v1/architecture-v1.md`](product-v1/architecture-v1.md): practical V1 architecture
- [`product-v1/implementation-plan.md`](product-v1/implementation-plan.md): phased build status
- [`product-v1/handover-log.md`](product-v1/handover-log.md): continuation log for future sessions
- [`funding-positioning/README.md`](funding-positioning/README.md): funding-positioning memo pack for ATEAM, Una Labs, and PeacePad
- [`../RUNBOOK.md`](../RUNBOOK.md): install, startup, testing, and cleanup commands
- [`ARCHITECTURE.md`](ARCHITECTURE.md): system structure
- [`MIGRATION_READINESS.md`](MIGRATION_READINESS.md): platform and deployment gaps
- [`CAPABILITY_EXTRACTION.md`](CAPABILITY_EXTRACTION.md): extraction direction
- [`CAPABILITY_DECOUPLING_PLAN.md`](CAPABILITY_DECOUPLING_PLAN.md): current decoupling work
- [`STORAGE_DECOUPLING_PLAN.md`](STORAGE_DECOUPLING_PLAN.md): storage migration shape
- [`TENANT_BOUNDARY_PLAN.md`](TENANT_BOUNDARY_PLAN.md): auth/tenant boundary work
- [`current_phase.md`](current_phase.md): active phase note
- [`production_core_dod.md`](production_core_dod.md): production definition of done
- [`acceptance_tests.md`](acceptance_tests.md): validation checklist

## Archive Notes

Older phase-specific planning that is no longer the active source of truth lives in `Docs/archive/`.

Historical cross-repo handoff note:

- `C:\FTC HOLDING\DOCS\ATEAM_PUBLIC_OPERATOR_HANDOVER_2026-03-24.md`

Treat that file as historical context only. The new `product-v1/` folder is the active source of truth for the ATEAM V1 product direction.

- `archive/phase-10-elevenlabs-replace-plan.md`
- `archive/phase-7-speaker-analytics-plan.md`

## Local Runtime Boundary

These do not belong in docs or source review:

- `../memory/` for local state
- `../Server/.local/` for local server logs/pids
- `../telegram-gateway/.local/` for Telegram local state
- `../Public/tmpclaude-*` for transient cwd markers

If those start cluttering the app tree again, run:

```powershell
npm run clean:local
```
