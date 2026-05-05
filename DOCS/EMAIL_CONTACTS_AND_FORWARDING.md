# FTC Email Contacts and Forwarding

**Final State (2026-04-29):**
- Repo-side email consolidation to hello@unalabs.cloud is complete.
- Cloudflare destination address is verified, but Email Routing Rules permission is still missing (403 error).
- Manual dashboard setup or additional API permission is required to finish live forwarding.

## Canonical Contact

Use `hello@unalabs.cloud` as the default operational, admin, public support, legal, privacy, automation, and project contact email for FTC/Una Labs-owned apps unless a product has a documented reason to use a separate mailbox.

This consolidation covers:

- Una Labs admin gates, public metadata, privacy/terms contacts, proposal/project notifications, and Supabase RLS templates.
- FTC Site brand contacts for Garden Cleaners, Polar Anchor, and OG Trades Academy.
- PeacePad public support links, Play/App Store metadata, VAPID defaults, and admin notification defaults.
- SayWetin public support links and admin login defaults.
- Dispatch and ATEAM operational contact headers, runbooks, and defaults.
- GitHub workflow automation identity.

## Forwarding Requirement

`hello@unalabs.cloud` should forward to `fefiuvwere@gmail.com`.

Cloudflare Email Routing DNS for `unalabs.cloud` is present. Destination address `fefiuvwere@gmail.com` was added and verified in Cloudflare on 2026-04-29.

The current Cloudflare API token can inspect DNS and account-level Email Routing destination addresses, but it still cannot read or modify zone-level Email Routing rules for `unalabs.cloud` (`GET /zones/68fc2deb79a7a99f58443b53adcc0505/email/routing/rules` returns HTTP 403). To finish the live forwarding setup, grant the token Zone Email Routing Rules read/edit permission or configure the rule in the Cloudflare dashboard:

1. Create a routing rule for `hello@unalabs.cloud`.
2. Forward matching mail to `fefiuvwere@gmail.com`.
3. Send a live test email to `hello@unalabs.cloud` and confirm delivery.

Expected Cloudflare rule payload after the token has the missing permission:

```json
{
  "name": "Forward hello@unalabs.cloud",
  "enabled": true,
  "matchers": [
    {
      "type": "literal",
      "field": "to",
      "value": "hello@unalabs.cloud"
    }
  ],
  "actions": [
    {
      "type": "forward",
      "value": ["fefiuvwere@gmail.com"]
    }
  ]
}
```

## External Account Follow-Up

Repo references have been consolidated to `hello@unalabs.cloud`, but external dashboards may still need direct account-owner updates:

- Stripe account `acct_1TMK0E5M2AZUCbRe`: verify the primary contact/login email is updated to `hello@unalabs.cloud`.
- Supabase auth/admin users: verify `hello@unalabs.cloud` exists and has the expected admin access before relying on RLS policies that gate by email.
- Cloudflare Access allowlists and deployed worker environment variables: verify live values match the repo defaults.
- App Store / Play Store developer contact settings: verify submitted metadata matches the repo docs.

## Guardrails

Do not replace third-party service-account identities, Firebase/Google service accounts, test placeholders, or client-owned emails unless the operational owner confirms that account is FTC-controlled and should use the Una Labs inbox.
