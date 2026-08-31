# PeacePad Supabase consolidation — 2026-08-31

PeacePad Native V2 now uses one Canadian staging backend and one Canadian
production backend. The earlier Canada/United States staging split was removed
to reduce free-plan pressure, configuration drift, and release ambiguity.

## Retained projects

| Purpose | Project | Reference | Region | Provider state at consolidation |
| --- | --- | --- | --- | --- |
| Native V2 staging | `peacepad-v2-staging-ca-mike` | `rohvkyuxbnqzglaromms` | `ca-central-1` | Active and healthy on 2026-08-31 |
| Production | `peacepad-v2-production-ca` | `qzekqjewpugdotskrtni` | `ca-central-1` | Paused; not modified during staging work |

## Permanently deleted projects

The following paused staging projects were verified in the Supabase dashboard
and permanently deleted with owner approval:

- `peacepad-v2-staging-us-mike` (`spmpndalcvwmygznihec`)
- `peacepad-v2-staging-ca` (`ftdqnhlesqrkstnqgfxr`)
- `peacepad-v2-staging-us` (`kgechdqdtryktfahyqez`)

The second Supabase organization is now empty. No production project, SayWetin
project, generic project, user account, or local source tree was deleted.

## Runtime contract

- Staging accepts only `EXPO_PUBLIC_PEACEPAD_REGION=ca` and project
  `rohvkyuxbnqzglaromms`.
- The deleted United States project is rejected by the native coordination
  client and has no Edge invocation-region mapping.
- A runtime directory must resolve to exactly one backend. The app no longer
  presents a Canada/United States data-region chooser.
- Production remains pinned to `qzekqjewpugdotskrtni` with explicit production
  write authorization.
- EAS readiness requires only the protected Canadian staging variable names;
  no secret values are recorded in this document.

## Verification

- TypeScript: passed.
- Native guardrails: passed.
- Secret scan: passed (`190` files checked).
- Jest: `69` suites passed; `487` tests passed and `1` skipped.
- Static iOS release preflight: passed; no build or submission started.

The retained Canadian staging project is active. The guarded deployment lane
must dry-run all migrations from the exact reviewed Native V2 commit before an
apply. Production remains paused and must not be contacted by staging tests.
