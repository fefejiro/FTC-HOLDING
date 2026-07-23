# PeacePad Repository Audit

Status: Phase 1 audit only  
Date: 2026-07-23  
Scope: local FTC monorepo state under `C:\FTC HOLDING`; no production code changes; no App Store state changes; no private court documents inspected.

## Proof labels

- VERIFIED: confirmed from files, Git history, or previous release evidence in this repo.
- INFERRED: reasonable conclusion from partial evidence.
- PROPOSED: product/architecture recommendation, not implemented.
- BLOCKED: cannot be confirmed without missing credentials, unavailable remote state, or a human/system dependency.
- STALE: was true or claimed in older docs/history but needs revalidation.
- UNKNOWN: no reliable evidence found in this audit.

## Executive finding

VERIFIED: The canonical active PeacePad implementation is `APPS/peacepad`, a React + Vite web app with a Node/Express/TypeScript API, PostgreSQL/Drizzle data model, Capacitor iOS and Android wrappers, and production deployment split across `peacepad.ca` and `api.peacepad.ca`.

VERIFIED: PeacePad iOS v1 is already submitted to Apple App Review. The submitted build must remain frozen while Apple reviews it. Do not rewrite, withdraw, replace, resubmit, configure Xcode Cloud, revoke certificates, or change the bundle ID unless Apple raises a specific issue or the founder explicitly authorizes a replacement submission.

VERIFIED: `APPS/peacepad-extension` is a sibling browser extension focused on pre-send message intervention for WhatsApp/Gmail/Slack-like composers. It is useful for communication-guardrail ideas but is not the core app and is not evidence-vault infrastructure.

VERIFIED: `APPS/fefejiro` is a portfolio/profile repo. It references PeacePad in public-facing product copy, including a React Native claim, but this audit did not find a local PeacePad React Native/Expo source tree. Treat that claim as STALE/UNVERIFIED until a separate RN codebase is found.

VERIFIED: There are local Git branches related to PeacePad/iOS: `consolidate/peacepad-canonical-ios`, `fix/peacepad-gate-path-scope`, `fix/peacepad-merge`, `peacepad-docs-closure-main`, `peacepad-ios-testflight`, `release/peacepad-ios-1.0`, and `origin/release/peacepad-ios-1.0`.

## Sources inspected

| Source | Label | Evidence | What it is |
| --- | --- | --- | --- |
| `APPS/peacepad` | VERIFIED | `package.json`, `ARCHITECTURE.md`, `capacitor.config.ts`, `client/src`, `server`, `shared/schema.ts`, `ios`, `android` | Active PeacePad app and API. |
| `APPS/peacepad-extension` | VERIFIED | `manifest.json`, `src/localRules.ts`, `src/content.ts`, `src/adapters.ts`, tests | Browser extension for external composer tone/preflight help. |
| `APPS/fefejiro` | VERIFIED | `README.md` | Portfolio/profile content; not an app implementation. |
| Git history for `APPS/peacepad` | VERIFIED | `git log --oneline --all -- APPS/peacepad` | Shows release, TestFlight, premium-delta, guest compose, CallEngine, Stripe, v2 orchestrator history. |
| Historical private GitHub repos mentioned in existing premium-delta docs | STALE | `docs/premium-delta/REUSABLE_FEATURE_AUDIT.md` | Earlier audit notes mention `fefejiro/fefejiro-PeacePadAI` and `fefejiro/PeacePad-`, but they were not freshly cloned in this Phase 1 local pass. |

## Canonical current repo: `APPS/peacepad`

### Framework and runtime

| Area | Label | Evidence |
| --- | --- | --- |
| React web client | VERIFIED | `package.json` depends on `react`, `react-dom`, `vite`, `@vitejs/plugin-react`; `client/src/App.tsx` defines web routes. |
| Express API | VERIFIED | `package.json` scripts build `server/index.ts`; `ARCHITECTURE.md` lists Node/Express/TypeScript backend. |
| PostgreSQL/Drizzle | VERIFIED | `ARCHITECTURE.md`; `shared/schema.ts`; `drizzle.config.ts`; migrations under `migrations`. |
| Capacitor iOS | VERIFIED | `capacitor.config.ts` has `appId: ca.peacepad.family`; `ios/App/App.xcworkspace`; `ios/App/App/Info.plist`; release docs in `ios-prep`. |
| Capacitor Android | VERIFIED | `android/`, Android docs, `@capacitor/android`, Android `MainActivity.java`. |
| React Native/Expo | UNKNOWN for PeacePad | No local PeacePad RN/Expo package found. Nearby RN/Expo apps exist for other products, e.g. `APPS/anion-mobile` and `APPS/saywetin-native`. |

### Production and release status

| Item | Label | Evidence |
| --- | --- | --- |
| iOS submitted to Apple | VERIFIED | `ios-prep/APP_STORE_SUBMISSION_PACKET_2026-07-22.md` records App Review submission and Gmail confirmation. |
| Public TestFlight link | VERIFIED | `https://testflight.apple.com/join/7anZvZXj` recorded in release packet. |
| Version/build | VERIFIED | `package.json` version `1.0.9`; release packet says App Store version `1.0`, build `1.0.9 (1)`. |
| Public URLs | VERIFIED as of 2026-07-23 release packet | `peacepad.ca`, `/privacy`, `/help`, `/support`, `/terms`, and `api.peacepad.ca/api/health` returned HTTP 200 in prior release check. |
| Live App Store availability | BLOCKED/UNKNOWN | Apple review must approve; current audit did not re-authenticate App Store Connect. |

### Routes and exposed screens

VERIFIED from `client/src/App.tsx`: routed pages include `/compose`, `/chat`, `/onboarding`, `/scheduling`, `/prep-chat`, `/settings`, `/help`, `/support`, `/terms`, `/privacy`, `/delete-account`, `/resources`, and `/join/:code`.

VERIFIED but not routed in `App.tsx`: pages such as `calls.tsx`, `call-preferences.tsx`, and `audit-trail.tsx` exist in `client/src/pages`, but this audit did not find active routes for them in `App.tsx`. Treat as reusable code/UX reference, not confirmed reachable product surface.

## Sibling repo: `APPS/peacepad-extension`

VERIFIED: The extension contains:

- `src/localRules.ts`: local preflight rules including parenting insults, legal escalation phrases, profanity, and child-focus signals.
- `src/content.ts`: injected UI/modal/handoff behavior for composer intervention.
- `src/adapters.ts`: supported-site adapters for `whatsapp`, `gmail`, and `slack`.
- `tests/localRules.test.ts`, `tests/adapters.test.ts`, `tests/debugTrace.test.ts`: unit coverage for local rules and adapter behavior.

Recommendation: reuse rules and UX lessons for PeacePad's communication module; do not treat extension code as secure storage, document vault, or mobile-native implementation.

## Portfolio repo: `APPS/fefejiro`

VERIFIED: `README.md` lists PeacePad as a co-parenting communication and family case management platform and claims a stack of `React Native, Node.js, Supabase, Cloudflare`.

STALE/UNKNOWN: That stack description does not match the canonical local implementation currently submitted to Apple, which is React web + Express + Drizzle/PostgreSQL + Capacitor. It may be historical, aspirational, or portfolio shorthand.

Recommendation: update portfolio copy later so it does not misrepresent the active production architecture.

## Historical Git branches

VERIFIED: Current Git history includes commits for:

- iOS TestFlight and App Store release prep.
- guest compose and copy-to-send conversion flow.
- intervention-first compose flow.
- v2 orchestrator/module foundations.
- CallEngineV2 and WebRTC work.
- Stripe billing in an older commit message.
- retention feedback loop/instrumentation.

Important: a commit message is not proof that a feature is live, routed, secure, or product-ready. Every major feature still needs current route/API/test verification.

## Historical/private repo references

STALE: Existing docs under `APPS/peacepad/docs/premium-delta/REUSABLE_FEATURE_AUDIT.md` report prior inspection of older GitHub repos:

- `fefejiro/fefejiro-PeacePadAI`
- `fefejiro/PeacePad-`
- `fefejiro/PeacePad`
- `fefejiro/peacepad-privacy`

INFERRED from that prior doc: older repos likely contain useful call/WebRTC diagnostics and call UI references, but their operational state is not verified in this Phase 1 pass.

Recommendation: before any code reuse from those repos, clone or fetch the exact repo/branch/commit into a private audit workspace, verify file paths and tests, and never import old uploaded media or private materials.

## Key risks found

| Risk | Label | Notes |
| --- | --- | --- |
| Submitted iOS release can be accidentally disturbed | VERIFIED | Release packet explicitly says freeze submitted build. |
| Call code exists but direct call endpoints are disabled | VERIFIED | `server/routes.ts` marks `/api/calls`, accept/decline/missed/end/followup as disabled/501 for MVP. |
| Sensitive uploads are currently local/static pattern, not Premium-grade evidence vault | VERIFIED | multer paths under `/uploads`; static serving in `server/index.ts`; some authenticated file serving exists but design is not a durable private object-store vault. |
| "Court-ready" copy exists in audit export UI | VERIFIED | `client/src/pages/audit-trail.tsx` contains "court-ready audit trail" language. Must be softened before premium/legal-prep expansion. |
| React Native claim mismatch | VERIFIED/STALLED | Portfolio copy differs from current app evidence. |
| App Review status could change | BLOCKED | Requires fresh App Store Connect auth to verify current status. |

## Audit conclusion

PROPOSED: Keep `APPS/peacepad` as the authoritative production app and post-review evolution base. Build PeacePad Next as governed, incremental modules inside the current React/Express/Capacitor stack first. Use historical code as lesson/reference only until each component is revalidated with current dependencies, tests, privacy review, and mobile behavior.

