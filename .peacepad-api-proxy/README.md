# PeacePad API origin proxy

This Cloudflare Worker is the no-cost public-hostname recovery rail for the
legacy PeacePad API.

It accepts only `api.peacepad.ca/*` and forwards the request to the Railway
service domain defined in `src/index.js`. It does not connect to the database,
store credentials, or rewrite authentication cookies.

Deployment is intentionally explicit:

```powershell
npx wrangler deploy
```

The DNS record for `api.peacepad.ca` must be Cloudflare-proxied for the route to
receive traffic. Do not replace the upstream with Native V2 until a reversible
existing-account/data migration has been approved and verified.
