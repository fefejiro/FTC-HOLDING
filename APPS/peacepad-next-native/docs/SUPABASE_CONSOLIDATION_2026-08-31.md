# PeacePad Supabase consolidation — 2026-08-31

PeacePad Native V2 uses one Canadian backend. The proven Canadian staging data
plane is promoted in place for production so there is no second live PeacePad
database to drift, pause, or consume another project slot.

## Retained projects

| Purpose | Project | Reference | Region | Provider state at consolidation |
| --- | --- | --- | --- | --- |
| Native V2 production target | `peacepad-v2-staging-ca-mike` | `rohvkyuxbnqzglaromms` | `ca-central-1` | Active; production promotion is guarded by exact SHA and confirmation |
| Historical production | `peacepad-v2-production-ca` | `qzekqjewpugdotskrtni` | `ca-central-1` | Paused and removed from current runtime/release routing |

## Permanently deleted projects

The following paused staging projects were verified in the Supabase dashboard
and permanently deleted with owner approval:

- `peacepad-v2-staging-us-mike` (`spmpndalcvwmygznihec`)
- `peacepad-v2-staging-ca` (`ftdqnhlesqrkstnqgfxr`)
- `peacepad-v2-staging-us` (`kgechdqdtryktfahyqez`)

The second Supabase organization is now empty. No production project, SayWetin
project, generic project, user account, or local source tree was deleted.

## Runtime contract

- The single approved runtime project is `rohvkyuxbnqzglaromms` in Canada.
- Staging uses that project only with staging runtime mode and writes disabled.
- Production uses that project only with production runtime mode and explicit
  production-write authorization.
- The deleted United States project is rejected by the native coordination
  client and has no Edge invocation-region mapping.
- A runtime directory must resolve to exactly one backend. The app no longer
  presents a Canada/United States data-region chooser.
- The paused historical `qzekqjewpugdotskrtni` project is rejected by current
  production routing.
- EAS readiness requires only the protected Canadian staging variable names;
  no secret values are recorded in this document.

## Verification

- TypeScript: passed.
- Native guardrails: passed.
- Secret scan: passed (`190` files checked).
- Jest: `69` suites passed; `487` tests passed and `1` skipped.
- Static iOS release preflight: passed; no build or submission started.

The guarded production promotion lane dry-runs all migrations from the exact
reviewed Native V2 commit before apply, deploys the production runtime with
writes explicitly enabled, then requires public health and readiness evidence.
