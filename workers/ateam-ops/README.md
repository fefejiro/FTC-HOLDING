# ATEAM Ops Worker

Private operator edge proxy for ATEAM.

## Purpose

- terminates the private operator host: `https://ops.unalabs.cloud`
- expects Cloudflare Access to authenticate the browser first
- allowlists the operator email
- injects trusted proxy scope headers to the shared Railway ATEAM runtime

## Routes

- `/` -> redirects to `/ateam/operator/office`
- `/ateam/operator/*` -> full private Mission Control shell
- `/api/operator/session` -> returns the derived operator identity
- `/api/operator/ateam/*` -> private JSON proxy into the shared Railway runtime

## Required environment

Set these in `wrangler.toml` / Worker secrets:

- `ATEAM_UPSTREAM_ORIGIN`
- `OPS_ALLOWED_EMAILS`
- `ATEAM_PROXY_TENANT_ID`
- `ATEAM_PROXY_WORKSPACE_ID`
- `ATEAM_PROXY_USER_ID`
- `ATEAM_PROXY_ROLE`
- `CANONICAL_OPS_ORIGIN`
- `CF_ACCESS_TEAM_DOMAIN`
- `CF_ACCESS_AUD`
- secret: `ATEAM_TRUSTED_PROXY_KEY`

Set these in Railway:

- `ATEAM_AUTH_MODE=trusted_proxy`
- `ATEAM_PUBLIC_SERVICE_MODE=false`
- `ATEAM_TRUSTED_PROXY_KEY=<same secret as worker>`

## Access requirement

Cloudflare Access must protect `ops.unalabs.cloud/*` and allowlist `mike.fejiro@gmail.com`.
The worker validates the `CF-Access-Jwt-Assertion` against the Access signing keys from
`CF_ACCESS_TEAM_DOMAIN` and checks the configured `CF_ACCESS_AUD`.
Without that configuration, the worker returns `access_validation_not_configured`.
