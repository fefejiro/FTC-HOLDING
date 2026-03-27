# ATEAM Docs Index

This folder mixes current operating docs and older planning notes. Use this file as the boundary between what is still active and what is only historical context.

## Current Source Of Truth

- [`../README.md`](../README.md): product/runtime overview and canonical scripts
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
