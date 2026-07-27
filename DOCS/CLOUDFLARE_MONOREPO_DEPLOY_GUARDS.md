# Cloudflare Monorepo Deploy Guards

Cloudflare Pages and Workers Git integrations must build only when their owned
source paths change. Documentation-only pull requests must not consume build
minutes or create unrelated failing checks.

Cloudflare evaluates exclude paths before include paths. A remaining matching
include triggers a build; otherwise Cloudflare skips the deployment.

## Pages projects

| Project | Root | Build command | Output | Includes | Excludes |
| --- | --- | --- | --- | --- | --- |
| `ftc-holding` | `APPS/peacepad` | `npm run build:frontend` | `dist/public` | `APPS/peacepad/*` | `APPS/peacepad/docs/*`, `APPS/peacepad/ios-prep/*`, `APPS/peacepad/*.md` |
| `saywetin` | `APPS/saywetin` | `npm run build:frontend` | `dist/public` | `APPS/saywetin/*` | none |
| `gardencleaners` | repository root | `npm run pages:build:ftc-site` | `APPS/ftc-site/.vercel/output/static` | `APPS/ftc-site/*`, `PACKAGES/*` | none |
| `ftc-site-pages` | repository root | `npm run pages:build:ftc-site` | `APPS/ftc-site/.vercel/output/static` | `APPS/ftc-site/*`, `PACKAGES/*` | none |

The `ftc-holding` Pages settings above were applied and read back from the live
Cloudflare API on 2026-07-26. This prevents PeacePad review notes, handover
documents, and iOS preparation files from launching a web deployment while
preserving builds for client or server source changes.

## Workers Builds

The Git-connected Worker `peacepad` owns only:

```text
workers/peacepadai/*
```

Set this in **Cloudflare Dashboard → Workers & Pages → peacepad → Settings →
Build → Build watch paths**.

As of 2026-07-26, the authenticated Wrangler OAuth session can manage Worker
scripts but receives `403 Forbidden` from the Workers Builds trigger API. A
user-scoped API token with **Workers Builds Configuration Edit** is required to
apply or verify this setting through the API. Until the dashboard setting or
qualified token is used, Worker scoping is **BLOCKED / NOT VERIFIED**.

Do not broaden the Worker include to `APPS/peacepad/*`; the Pages app and Worker
are separate deployable units.

## Local backstop

The ignored-build helper mirrors the Pages watch paths:

```bash
node scripts/cf-pages-ignore-build.mjs --project=ftc-holding
node scripts/cf-pages-ignore-build.mjs --project=saywetin
node scripts/cf-pages-ignore-build.mjs --project=gardencleaners
node scripts/cf-pages-ignore-build.mjs --project=ftc-site-pages
node --test scripts/cf-pages-ignore-build.test.mjs
```

Exit code `0` means skip the build. Any non-zero code means continue. Unknown
projects and indeterminate Git diffs deliberately fail open so the guard cannot
silently suppress a legitimate deployment.

Cloudflare Build watch paths remain the primary control because they skip the
deployment before a build container starts. Configure the ignored-build command
only as a dashboard backstop.

## Verification checklist

- Documentation-only PeacePad changes: Pages skipped.
- `APPS/peacepad/client/**` change: `ftc-holding` Pages proceeds.
- Unrelated monorepo change: `ftc-holding` Pages skipped.
- `workers/peacepadai/**` change: `peacepad` Worker proceeds.
- Any other change: `peacepad` Worker skipped.
- No App Store submission, production bundle ID, or PeacePad runtime behavior
  is changed by this guard.
