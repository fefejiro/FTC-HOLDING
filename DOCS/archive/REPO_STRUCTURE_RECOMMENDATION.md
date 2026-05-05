# Repo Structure Recommendation

Last updated: 2026-03-10
Canonical repo root: `C:\FTC HOLDING`

## Purpose

This document recommends a cleaner long-term repo shape for the active FTC / Unalabs ecosystem. It is intentionally documentation-first. Existing folders should stay in place unless a later cleanup pass has a clear low-risk migration plan.

## Current Top-Level Structure

Observed at `C:\FTC HOLDING`:

- `.github/`
- `.vscode/`
- `.wrangler/`
- `APPS/`
- `client/`
- `DOCS/`
- `FTC-HOLDING/` (nested duplicate tree, non-canonical)
- `Git/`
- `PACKAGES/`
- `scripts/`
- `test-results/`
- `workers/`
- root docs and workspace files

## App Inventory Under `APPS/`

- `ATEAM`
- `ftc-site`
- `peacepad`
- `peacepad-extension`
- `saywetin`
- `_local_run_logs`

## Recommended Target Structure

```text
C:\FTC HOLDING
├── APPS
│   ├── peacepad
│   ├── saywetin
│   ├── peacepad-extension
│   ├── ateam
│   └── ftc-site
├── PACKAGES
│   └── shared workspace packages
├── INFRA
│   ├── railway
│   ├── cloudflare
│   └── deployment-scripts
├── DOCS
│   ├── architecture
│   ├── releases
│   ├── policies
│   └── operations
├── BRAND
│   └── unalabs
├── workers
└── scripts
```

## Why this recommendation differs slightly from the simplified target

The conceptual target was useful, but the real repo already depends on two additional top-level categories:

1. `PACKAGES/`
- This is an active workspace dependency layer used by apps such as `ftc-site`.
- It should remain top-level for now because moving it would break workspace references.

2. `workers/`
- This contains Cloudflare Worker code that is neither a normal app nor pure documentation.
- It should remain top-level until each worker is clearly classified as product-facing, infra-facing, or experimental.

## Keep / Move-Later / Document-Only Mapping

### Keep as-is for now

#### `APPS/`
- Already matches the intended product grouping.
- No safe reason to move product folders in this pass.

#### `PACKAGES/`
- Keep top-level.
- It is part of the workspace dependency graph and should be treated as shared platform code.

#### `scripts/`
- Keep top-level for now.
- Multiple npm scripts already assume this location.
- Later: selectively move infra-oriented scripts into `INFRA/deployment-scripts/` after references are updated.

#### `workers/`
- Keep top-level until ownership classification is explicit.
- Later: either leave top-level or split into product workers vs infra workers.

#### `DOCS/`
- Keep the existing flat doc set intact for now.
- It already contains active operational references used by current work.

### Document now, move later

#### `client/`
- Current ownership is unclear from this pass.
- It appears mixed relative to the main `APPS/` convention.
- Recommendation: document its purpose first, then either absorb it into a product or archive it.

#### `APPS/ATEAM`
- The directory exists and has working code, but current root tracking / ownership is still documented as pending.
- Recommendation: formally decide whether ATEAM is part of this root monorepo before broader structural cleanup.

#### `DOCS/` categorization
- Recommended future logical buckets:
  - `DOCS/architecture/`
  - `DOCS/releases/`
  - `DOCS/policies/`
  - `DOCS/operations/`
- Do not move existing docs yet because many handovers and references likely point to current paths.

### Create later only if needed

#### `INFRA/`
- Recommended as a future organizational bucket, not an immediate move target.
- It becomes useful once deployment scripts, Railway notes, and Cloudflare notes need stricter separation from product docs.

#### `BRAND/`
- Recommended for future brand system assets, naming standards, product-positioning references, and umbrella narrative materials.
- Do not create a large brand folder until there is enough material to justify it.

## Product-to-Structure Mapping

### PeacePad
- Stay in `APPS/peacepad`
- Product-owned app surface

### Saywetin
- Stay in `APPS/saywetin`
- Product-owned app surface

### PeacePad extension
- Stay in `APPS/peacepad-extension`
- Product-adjacent channel surface

### ATEAM
- Stay in `APPS/ATEAM` physically for now
- Ownership/tracking decision should happen before any move or rename

### ftc-site
- Keep current folder location for now
- Treat it operationally as the current Unalabs site codebase
- Later rename only if there is a compelling reason and migration plan

## Safe Immediate Improvements Completed in this pass

- Documentation only
- No product folders moved
- No deploy files changed
- No imports or npm workspaces changed

## Recommended Rule For Future Cleanup

Only perform physical repo moves when all three are true:
1. ownership is clear
2. references are enumerable
3. migration can be done with immediate verification and minimal blast radius
