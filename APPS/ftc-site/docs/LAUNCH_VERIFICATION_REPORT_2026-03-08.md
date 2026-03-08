# Una Labs Rebrand and Domain Cutover Verification (2026-03-08)

## Scope

- Rebrand FTC studio UI/content to Una Labs (routes unchanged).
- Preserve compatibility for intake API, route contract, and redirects.
- Keep Phase A canonical host on `https://ftc.peacepad.ca`.
- Prepare Phase B migration to `https://unalabs.cloud` (pending nameserver activation).

## Code verification baseline

- Canonical route contract unchanged:
  - `/`, `/capabilities`, `/work`, `/work/[slug]`, `/products`, `/about`, `/work-with-ftc`
- Legacy redirects unchanged:
  - `/services -> /capabilities`
  - `/case-studies -> /work`
  - `/contact -> /work-with-ftc`
- Intake contract unchanged:
  - `name`, `email`, `projectIdea`, `budgetRange`, `timeline`, anti-spam fields
- Rebrand compatibility aliases added:
  - `UNALABS_INTAKE_WEBHOOK_URL` with fallback to `FTC_INTAKE_WEBHOOK_URL`
  - `UNALABS_SMOKE_BASE_URL` / `UNALABS_SMOKE_PAGES_URL` with fallback to FTC smoke vars

## Validation results

- `npm --workspace=@ftc/ftc-site run build`: pass
- `npm --workspace=@ftc/ftc-site run test:e2e`: pass (12/12)
- `npm --workspace=@ftc/ftc-site run smoke:prod`: pass
- `npm --workspace=@ftc/ftc-site run smoke:prod` with
  `UNALABS_SMOKE_BASE_URL` + `UNALABS_SMOKE_PAGES_URL`: pass

### Production smoke summary (Phase A)

- `200`: `/`, `/capabilities`, `/work`, `/products`, `/about`, `/work-with-ftc`,
  `/robots.txt`, `/sitemap.xml`
- `308`: `/services -> /capabilities`, `/case-studies -> /work`,
  `/contact -> /work-with-ftc`
- `308`: `https://ftc-site-pages.pages.dev/ -> https://ftc.peacepad.ca/`
- Robots and sitemap canonical references validated on active host

## Phase A host behavior

- Active canonical remains `https://ftc.peacepad.ca`.
- `*.pages.dev` requests redirect to canonical host.
- `robots.txt` and `sitemap.xml` emit canonical URLs from runtime host configuration.

## Phase B readiness (pending external propagation)

- `unalabs.cloud` zone added in Cloudflare.
- DNS resolves on Cloudflare, but Pages custom-domain binding is not active yet.
- Current live checks:
  - `https://unalabs.cloud` returns `522` (origin not serving for this host yet)
  - `https://www.unalabs.cloud` returns `525` (TLS handshake not ready)
- `wrangler pages project list` still shows `ftc-site-pages` bound only to:
  - `ftc-site-pages.pages.dev`
  - `ftc.peacepad.ca`
- After activation:
  1. Bind `unalabs.cloud` + `www.unalabs.cloud` to `ftc-site-pages`.
  2. Set canonical env `UNALABS_SITE_URL=https://unalabs.cloud`.
  3. Set legacy redirect env `UNALABS_REDIRECT_FROM_HOSTS=ftc.peacepad.ca`.
  4. Redeploy and verify `ftc.peacepad.ca -> 308 -> https://unalabs.cloud`.

## Non-goals in this pass

- No changes to `peacepad.ca`, `www.peacepad.ca`, `api.peacepad.ca`, or mail records.
- SayWetin root `404` remediation remains deferred to the next phase.
