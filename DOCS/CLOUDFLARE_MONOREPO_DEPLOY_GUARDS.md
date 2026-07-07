# Cloudflare Monorepo Deploy Guards

Cloudflare Pages Git builds must not run every project for every repository change.
Set Build watch paths on each Git-connected Pages project so unrelated app work does
not create failing preview checks.

Cloudflare evaluates excludes first, then includes. A matching include triggers a
build; otherwise the build is skipped.

## Project Settings

| Cloudflare project | Root directory | Build command | Output directory | Include paths |
| --- | --- | --- | --- | --- |
| `ftc-holding` | `APPS/peacepad` | `npm run build:frontend` | `dist/public` | `APPS/peacepad/*` |
| `saywetin` | `APPS/saywetin` | `npm run build:frontend` | `dist/public` | `APPS/saywetin/*` |
| `gardencleaners` | repo root | `npm run pages:build:ftc-site` | `APPS/ftc-site/.vercel/output/static` | `APPS/ftc-site/*`, `PACKAGES/*` |
| `ftc-site-pages` | repo root | `npm run pages:build:ftc-site` | `APPS/ftc-site/.vercel/output/static` | `APPS/ftc-site/*`, `PACKAGES/*` |

Leave exclude paths empty unless a project needs a narrower rule later.

## Workers Builds

The Git-connected Worker named `peacepad` must use the Wrangler config in
`workers/peacepadai/wrangler.toml`. Its `name` must remain `peacepad` because
Cloudflare Workers Builds require the dashboard Worker name to match the
Wrangler config name.

Set the Worker Build watch paths:

| Cloudflare Worker | Include paths |
| --- | --- |
| `peacepad` | `workers/peacepadai/*` |

## Local Backstop

The repo also has an ignored-build helper for Cloudflare Pages:

```bash
npm run cf:ignore-build -- --project=ftc-holding
npm run cf:ignore-build -- --project=saywetin
npm run cf:ignore-build -- --project=gardencleaners
npm run cf:ignore-build -- --project=ftc-site-pages
```

This follows Cloudflare's ignored-build convention: exit code `0` means skip the
build, and non-zero means continue building.

Prefer Cloudflare Build watch paths as the primary control because they skip the
deployment before the build container starts. Use the ignored-build command only
as a dashboard backstop.

Do not append `@cloudflare/next-on-pages` to `pages:build:ftc-site`; the
`APPS/ftc-site` build already packages the static output and the extra wrapper
is deprecated.
