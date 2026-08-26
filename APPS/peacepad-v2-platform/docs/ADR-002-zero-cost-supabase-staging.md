# ADR-002: Zero-cost Supabase staging bridge

## Decision

Use two isolated Supabase Free projects as temporary fictional staging data
planes: `ca-central-1` for Canada and `us-east-2` for the United States. Keep the
mobile client behind the existing versioned `/api/v2` HTTP contract. A
server-side adapter (Supabase Edge Functions or Cloudflare Workers) owns database
credentials, authorization, region binding, idempotency, and audit writes.

This replaces the immediate paid AWS staging dependency; it does not replace the
long-term production architecture decision or prove institutional readiness.

## Non-negotiable boundaries

- Existing Supabase projects are not reused without a data and ownership audit.
- Canadian and U.S. records use separate project references and never replicate
  automatically.
- Only fictional accounts and records are permitted.
- The Expo app receives an HTTPS API URL, never a service-role key or database
  connection string.
- Direct `anon` and `authenticated` access to the `peacepad_v2` schema is denied.
- `ca.peacepad.nextnative.lab` and `productionApiWritesEnabled: false` remain.
- Project pausing, quotas, backups, and restoration limits are recorded as
  staging limitations rather than described as production guarantees.

## Activation sequence

1. Create two new empty Supabase projects in the required regions.
2. Copy the example configuration outside source control and insert only public
   project references and API adapter URLs.
3. Run `validate-supabase-free-staging.ps1`.
4. Apply the migration independently to each empty project.
5. Deploy the same `/api/v2` adapter code to each region with server-side secrets.
6. Verify wrong-region and direct-client access fail closed.
7. Run two fictional accounts through the two-device staging matrix.

No existing project is deleted, restored, linked, or mutated by this change.
