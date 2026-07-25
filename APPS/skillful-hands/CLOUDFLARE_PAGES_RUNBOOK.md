# Cloudflare Pages launch runbook

This runbook is reusable for static Cloudflare Pages websites with an apex
domain and a `www` redirect.

## Required inputs

- Cloudflare account ID
- Pages project name
- Production branch
- Apex domain
- Registrar access
- A Wrangler login or API token with Pages write access

Never store API tokens, passwords, one-time codes, or registrar credentials in
the repository.

## 1. Build and deploy

```bash
npm run build
npx wrangler pages deploy dist \
  --project-name <project-name> \
  --branch <production-branch> \
  --commit-dirty=true
```

Confirm the generated `*.pages.dev` deployment returns `200` before changing
DNS.

## 2. Activate the Cloudflare zone

1. Add the apex domain to Cloudflare.
2. Copy the two assigned Cloudflare nameservers exactly.
3. Replace the registrar nameservers with the Cloudflare nameservers.
4. Confirm the Cloudflare zone status is `active`.
5. Confirm the registry and public resolvers return the Cloudflare
   nameservers.

Do not continue certificate troubleshooting while a public resolver still
returns the registrar's former nameservers. If Google Public DNS is stale, use
its official cache-flush tool for the apex `NS` and `A` records.

## 3. Attach the apex domain

1. Add the apex domain under the Pages project's Custom domains.
2. Ensure the apex CNAME targets `<project-name>.pages.dev`.
3. Keep the apex CNAME set to **DNS only** while Pages performs initial
   ownership and SSL validation.
4. Wait until the Pages API or dashboard reports all three states as active:
   custom domain, verification, and SSL.
5. Change the apex CNAME to **Proxied**.
6. Recheck HTTPS after proxying.

This DNS-only validation step is important. A proxied apex can remain stuck in
SSL pending even when DNS and HTTP validation appear correct.

### Recovery for an apex stuck in SSL pending

Use this sequence only after the Cloudflare zone is active and public DNS is
correct:

1. Change only the apex CNAME to DNS only.
2. Confirm public DNS resolves to the Pages addresses.
3. Remove and re-add only the apex custom-domain binding.
4. Poll until domain, verification, and SSL are active.
5. Restore the apex CNAME to Proxied.
6. Do not repeatedly delete and recreate bindings while DNS is stale.

Cloudflare manages certificate-validation TXT records for its Universal
certificate. Do not manually duplicate them unless Cloudflare explicitly asks
for manual validation.

## 4. Attach and redirect `www`

1. Add `www.<domain>` as a Pages custom domain.
2. Confirm its CNAME targets `<project-name>.pages.dev`.
3. Wait for its SSL status to become active.
4. Proxy the `www` record.
5. Add a permanent Single Redirect:
   - Match: `https://www.*`
   - Target: `https://${1}`
   - Status: `301`
   - Preserve query string: enabled
6. Test with a non-root path and query string.

Keep the `www` Pages binding. Removing it can remove the certificate used by
the redirect before the zone certificate is ready.

## 5. Production acceptance

Run the application-specific verifier:

```bash
npm run verify:production
```

For another project, override the defaults:

```bash
node scripts/verify-production.mjs \
  --domain=example.org \
  --email=hello@example.org \
  --forbid="Unapproved programme name"
```

Acceptance requires:

- Apex HTTPS returns `200`.
- HTTP redirects to apex HTTPS.
- `www` returns `301` to the apex and preserves path and query string.
- Canonical URL, contact email, security headers, robots, sitemap, manifest,
  and favicon are correct.
- Cloudflare reports domain, verification, and SSL as active.
- A clean production build passes.
- Browser QA passes at the required mobile, tablet, laptop, and desktop
  viewports.

Do not describe the permanent launch as complete while any certificate is
pending or while the apex HTTPS request fails.
