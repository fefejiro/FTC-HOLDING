# Deployment Decisions

Last updated: 2026-04-02

This document records the intended lean production setup for FTC HOLDING / Una Labs.

## Why Railway is runtime only

Railway is the expensive and failure-prone part of the stack relative to Cloudflare Pages and Workers. To stay within a lean Hobby plan:

- static marketing and product shell pages belong on Cloudflare
- branded public hostnames should terminate at Cloudflare whenever possible
- Railway should only run services that actually need server compute, database access, scheduled jobs, or private API behavior

This keeps always-on spend focused on the pieces that cannot be served statically.

## Why Cloudflare owns public entry

Cloudflare is the right home for:

- DNS
- SSL
- branded domains
- static/public sites
- edge routing between public surfaces and runtime APIs

That is why:

- `peacepad.ca`, `unalabs.cloud`, and `saywetin.app` are Cloudflare-first web properties
- Dispatch and ATEAM use Cloudflare workers as the public entry layer even when Railway still runs the backend

This reduces the need for extra Railway custom domains and keeps domain ownership legible.

## Why Supabase stays shared

Supabase remains the shared data layer because it gives the stack:

- one managed Postgres home
- one place for auth/storage where needed
- lower operational sprawl than product-by-product database choices

The direction is not "more app-specific infra." The direction is "fewer runtimes, shared data."

## Why stale services were removed or paused

### ftc-site

`ftc-site` is a static/public site concern. Keeping a stale Railway service for it creates dashboard clutter and suggests a runtime dependency that does not belong there. It should be removed from Railway and treated as Cloudflare Pages only.

### sunny-acceptance

SayWetin is not the primary always-on runtime priority right now. Leaving `sunny-acceptance` broken or half-configured is worse than marking it intentionally paused. The repo keeps a valid reactivation path, but the default operating posture should be "paused until needed."

### Duplicate deploy paths

The repo had a root-level duplicate Dispatch Dockerfile path that encouraged the wrong deploy mental model. Lean infrastructure depends on one clear deploy path per service, so duplicate root-level runtime paths are removed instead of documented as "also works."

## Intended steady-state setup

### Keep active

- `FTC-HOLDING` on Railway for PeacePad API
- `ateam-api` on Railway for ATEAM runtime behind Cloudflare workers
- `dispatch-api` on Railway for Dispatch runtime behind the Dispatch worker

### Keep paused but documented

- `sunny-acceptance` for SayWetin API

### Remove from Railway

- any stale `ftc-site` service

## Operational rule going forward

Each product should have:

- one public/static owner
- one runtime owner, only if needed
- one canonical app root
- one health endpoint
- one documented env contract

If a service cannot answer those questions clearly, it should not stay "half-live" in Railway.
