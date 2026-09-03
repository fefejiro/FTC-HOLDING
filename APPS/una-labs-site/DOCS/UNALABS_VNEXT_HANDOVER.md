# Una Labs VNext handover

Updated: 2026-08-23  
Branch: `fix/una-social-premium-newsroom`

## Release scope

The VNext public site is now a shorter, product-led funnel. The homepage is
organized as: living hero, capability framing, Watch/Try system, shipped
products, how we work, and one final intake CTA. The existing auth, dashboard,
admin, Supabase, Stripe, proposal, and ATEAM surfaces were preserved.

## What changed

- Added the reusable shipped-product registry in `lib/site-content.ts`.
- Added `LivingHeroSection`, `TrySystemSection`, `ShippedProductsSection`, and
  `HowWeWorkSection`.
- Simplified `app/page.tsx`, feature carousel copy, demo copy, and final CTA.
- Demo modes now distinguish product footage, synthetic previews, and opening a
  product; previews disclose that they use no private data or production
  actions.
- Intake now asks only for name, email, company, and description first; extra
  context remains available under an optional disclosure.
- Workflow animation respects `prefers-reduced-motion`.
- Product pages include release-track and platform-state context for PeacePad,
  Just Checking In, Dispatch, SayWetin, UnaScout, and JobAgent.

## Product registry snapshot

| Product | Maturity | Current evidence-led surface |
| --- | --- | --- |
| PeacePad | Improving | Web live, Android listing available, iOS release track |
| Just Checking In | Store submission pending | iOS and Android release tracks |
| Dispatch | Live | Web live |
| SayWetin | Available | Web live |
| UnaScout | Improving | iOS release track, web product operations |
| JobAgent | Preview | Qualified web workflow reviews |

These labels intentionally separate a listing/release track from public
availability. They are not a substitute for store-console or real-user proof.

## QA and release evidence

- `npm run build` compiles and exports all 94 static pages, but strict Next.js
  type checking is blocked by a pre-existing `app/admin/AdminClient.tsx`
  status-colour type mismatch. The admin file was not changed.
- An export build with the temporary TypeScript error bypass completed; the
  config was restored immediately afterward.
- `npm run lint` completed with the repository's existing warnings.
- `git diff --check` passed (CRLF warnings only).
- Browser QA covered approximately 390px and 1440px widths with no horizontal
  overflow. `/`, `/demo/`, `/start/`, and product routes rendered exported
  content; the intake optional-context disclosure was visible.

## Known follow-up work

1. Fix the pre-existing AdminClient type mismatch, then make strict build the
   only release path.
2. Reconcile pricing copy before changing any checkout behavior. Current
   pricing constants expose Solo/Studio/Agency/Enterprise, while intake uses
   Starter/Professional/Agency/Enterprise and different amounts.
3. Replace synthetic previews with approved real product footage/screenshots
   as evidence becomes available.
4. Keep ATEAM/provider operations and store status claims backed by fresh
   console evidence.

## Deployment

The site is published through Cloudflare Pages project `ftc-site-pages`, which
serves `unalabs.cloud` and `www.unalabs.cloud`. Deployments are made from the
generated `out` directory; verify the public smoke URLs after each release:

- `https://unalabs.cloud/`
- `https://unalabs.cloud/demo/`
- `https://unalabs.cloud/start/`
- `https://unalabs.cloud/products/peacepad/`
- `https://unalabs.cloud/products/just-checking-in-game/`
- `https://unalabs.cloud/products/unascout/`

Unrelated dirty checkout changes in sibling products and existing admin,
dashboard, worker, package, and Supabase files were deliberately left out of
this release.
