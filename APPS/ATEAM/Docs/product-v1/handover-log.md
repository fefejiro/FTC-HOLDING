# ATEAM V1 Handover Log

## 2026-04-07

### Summary

Implemented the ATEAM V1 reframe so the public workflow now follows a clearer `intake -> normalize -> plan -> approve -> execute -> artifact -> log -> evaluate` contract without replacing existing routes.

### Files Changed

- `APPS/ATEAM/Server/lib/workflowEngine.js`
- `APPS/ATEAM/Server/lib/workflowService.js`
- `APPS/ATEAM/Server/lib/workflowRunStore.js`
- `APPS/ATEAM/Server/lib/sqliteDb.js`
- `APPS/ATEAM/Server/lib/storage/backends/postgres.js`
- `APPS/ATEAM/Server/lib/storage/backends/postgresCore.js`
- `APPS/ATEAM/Server/lib/storage/backends/supabaseCore.js`
- `APPS/ATEAM/Server/server.js`
- `APPS/ATEAM/supabase/migrations/20260407000100_ateam_v1_reframe.sql`
- `APPS/ATEAM/Server/__tests__/unit/workflowEngine.test.js`
- `APPS/ATEAM/Server/__tests__/unit/workflowRunStore.test.js`
- `APPS/ATEAM/Server/__tests__/unit/workflowService.test.js`
- `APPS/ftc-site/lib/ateamWorkflow.ts`
- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/styles/globals.css`
- `APPS/ATEAM/README.md`
- `APPS/ATEAM/Docs/README.md`
- `APPS/ATEAM/Docs/product-v1/*`

### Decisions Made

- Keep existing workflow routes and extend their payloads
- Introduce `request`, `plan`, `evaluation`, `state`, `stateHistory`, and `recentArtifact` on workflow runs
- Preserve `phase` as a compatibility layer
- Keep the current decision pack as the default artifact bundle
- Make plan review the main public trust step

### Validation

- `npm --prefix APPS/ATEAM run verify:server`
- `npm --prefix APPS/ATEAM run test:backend`
- `npm --prefix APPS/ftc-site run build`

### Unresolved Issues

- No production deployment was performed in this session
- Live manual QA remains useful before broader release

### Exact Next Step

Run a focused live QA pass on `/ateam`, then deploy the updated `APPS/ATEAM` + `APPS/ftc-site` surfaces through the normal Una Labs release path.

## 2026-04-07 Copy Polish Follow-up

### Summary

Tightened the workflow copy heuristics after live QA surfaced awkward truncated titles and over-inferred audience text.

### Files Changed

- `APPS/ATEAM/Server/lib/workflowEngine.js`
- `APPS/ATEAM/Server/__tests__/unit/workflowEngine.test.js`

### Decisions Made

- derive cleaner titles from rough ideas instead of leading with verbs like `Build` or `Create`
- only treat context as audience when it actually reads like one
- fall back to audience clues in the original idea before using generic preset language
- make brief summaries sound more intentional and less stitched together

### Validation

- `npm --prefix APPS/ATEAM run test:backend`
- `npm --prefix APPS/ATEAM run verify:server`

### Exact Next Step

Push this polish pass, wait for deploy propagation, then rerun one short live QA pass on `/ateam` to confirm the improved titles and summaries are visible in production.

## 2026-04-07 Phase 2 Surface Extension

### Summary

Extended the public ATEAM surface with the first V2-facing scaffolding while keeping the V1 product definition intact. The current pass adds request templates, agent role visibility, filtered recent-run browsing, and editable-plan scaffolding before approval.

### Files Changed

- `APPS/ATEAM/Server/lib/workflowEngine.js`
- `APPS/ATEAM/Server/lib/workflowService.js`
- `APPS/ATEAM/Server/lib/workflowRunStore.js`
- `APPS/ATEAM/Server/server.js`
- `APPS/ATEAM/Server/__tests__/unit/workflowRunStore.test.js`
- `APPS/ATEAM/Server/__tests__/unit/workflowService.test.js`
- `APPS/ftc-site/lib/ateamWorkflow.ts`
- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/styles/globals.css`
- `APPS/ATEAM/Docs/product-v1/README.md`
- `APPS/ATEAM/Docs/product-v1/product-scope-v1.md`
- `APPS/ATEAM/Docs/product-v1/architecture-v1.md`
- `APPS/ATEAM/Docs/product-v1/implementation-plan.md`

### Decisions Made

- keep templates and role metadata as catalog data from the backend instead of inventing new route families
- keep editable plans as pre-approval scaffolding layered onto the existing normalized plan
- keep recent-run improvements inside the current public list surface instead of building a full history product
- preserve the single-agent contract and stable public routes

### Validation

- `npm --prefix APPS/ATEAM run test:backend`
- `npm --prefix APPS/ATEAM run verify:server`
- `npm --prefix APPS/ftc-site run build`

### Unresolved Issues

- live QA is still useful after deploy propagation to verify the new template and editable-plan affordances on production
- plan editing remains intentionally lightweight and should not expand into full workflow authoring without a new product decision

### Exact Next Step

Push the Phase 2 pass, confirm the public `/ateam` deploy is live, then run a focused browser QA of template selection, plan editing, filtered recent runs, and final pack generation.

## 2026-04-07 Public Fallback Workaround

### Summary

Added a public-facing fallback path for `/ateam` so the workflow stays testable even when the Railway `ateam-api` service is paused. The Phase 2 frontend now detects upstream failures like `Application not found` and transparently switches into a browser-local workflow simulator.

### Files Changed

- `APPS/ftc-site/lib/ateamWorkflowLocal.ts`
- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/styles/globals.css`

### Decisions Made

- keep the normal cloud API path as the default and only fall back when the live workflow upstream is unavailable
- make the fallback explicit to the user with a visible notice so local-browser runs are not mistaken for the shared backend
- reuse ATEAM workflow-engine logic where possible so the local simulation still follows the same request, plan, approval, and pack shapes

### Validation

- `npm --prefix APPS/ftc-site run build`

### Unresolved Issues

- the Railway `ateam-api` service is still paused for usage limits, so the fallback is a continuity path, not a replacement for the real shared runtime
- live QA is still needed after deploy propagation to confirm the fallback activates cleanly on `unalabs.cloud/ateam`

### Exact Next Step

Push the fallback pass, let Cloudflare deploy it, then verify on the public host that `/ateam` shows the local-demo banner and still completes the intake -> plan -> approve -> pack flow while Railway remains paused.

## 2026-04-07 Pages Preview Bypass

### Summary

Added a Pages-preview bypass so direct `*.pages.dev` deployment URLs can be used for live QA without being forced back to the canonical `unalabs.cloud` host. This creates a reliable test lane when the custom-domain alias or cache lags behind the newest production deployment.

### Files Changed

- `APPS/ftc-site/middleware.ts`

### Decisions Made

- keep canonical redirect behavior as the default for `*.pages.dev`
- allow an explicit `?preview=1` query flag to bypass the redirect only for Pages preview hosts
- use the bypass as a deployment-verification tool, not as a public canonical entrypoint

### Validation

- pending deploy propagation and direct Pages-preview smoke check

### Unresolved Issues

- `unalabs.cloud` is still intermittently serving the pre-fix fallback build even when Pages marks the newest deployment active
- the Railway `ateam-api` backend remains paused, so preview testing still relies on the public fallback mode

### Exact Next Step

Deploy this middleware change, then open the newest Pages deployment URL with `/ateam?preview=1` to confirm the latest build can be tested directly even while the apex domain is stale.

## 2026-04-07 Edge API Fallback For Paused Railway

### Summary

Added an API-layer ATEAM edge fallback so `APPS/ftc-site` can answer `/api/ateam/workflow/*` directly when the Railway `ateam-api` upstream returns `Application not found` or similar availability failures. This is meant to let even a stale public frontend complete a run while the backend service is paused.

### Files Changed

- `APPS/ftc-site/lib/ateamWorkflowEdgeFallback.ts`
- `APPS/ftc-site/lib/ateamUpstream.ts`
- `APPS/ftc-site/app/api/ateam/workflow/runs/route.ts`
- `APPS/ftc-site/app/api/ateam/workflow/runs/[runId]/route.ts`
- `APPS/ftc-site/app/api/ateam/workflow/runs/[runId]/answers/route.ts`
- `APPS/ftc-site/app/api/ateam/workflow/runs/[runId]/approve/route.ts`
- `APPS/ftc-site/app/api/ateam/workflow/runs/[runId]/generate-pack/route.ts`

### Decisions Made

- keep the normal upstream proxy path first and only switch to edge fallback when the upstream clearly fails
- use a short-lived in-memory session store keyed by cookie as a continuity path for public demo testing
- keep the fallback response shape aligned with the public workflow contract so the older frontend can still progress through the run

### Validation

- `npm --prefix APPS/ftc-site run build`

### Unresolved Issues

- the edge fallback is a continuity mechanism, not durable shared storage
- `unalabs.cloud` and Pages deployment aliases are still serving inconsistent frontend builds, so the fallback mainly protects the API layer while Cloudflare catches up

### Exact Next Step

Push the edge fallback, let Cloudflare deploy it, then re-run the public `/ateam` flow to confirm the live page can complete intake -> plan -> approve -> pack even while Railway stays paused.

## 2026-04-07 Public UX Hierarchy And Scroll Cleanup

## 2026-04-08 Public Site / ATEAM Boundary Reset

### Summary

Reset the product boundary so `APPS/ATEAM` is once again treated as the canonical ATEAM application and `APPS/ftc-site` is treated as the Una Labs public shell. This pass removes the embedded-feature drift from the public site, restores a clean CTA path into ATEAM, and prepares the repo for the preferred domain split:

- `unalabs.cloud` -> Una Labs public website
- `ateam.unalabs.cloud` -> standalone ATEAM application

### Source Of The Last Good ATEAM

The last strong ATEAM implementation is still the app runtime in:

- `APPS/ATEAM/Public/index.html`
- `APPS/ATEAM/Public/style.css`
- `APPS/ATEAM/Public/app.js`

That surface preserves the stronger Mission Control / Office / live-system feel and remains the correct reference point for future restoration work.

### Files Changed

- `APPS/ftc-site/lib/site.ts`
- `APPS/ftc-site/middleware.ts`
- `APPS/ftc-site/lib/content.ts`
- `APPS/ftc-site/app/components/Header.tsx`
- `APPS/ftc-site/styles/globals.css`
- `APPS/ftc-site/app/page.tsx`
- `APPS/ftc-site/app/components/HomePageExperience.tsx`
- `APPS/ftc-site/app/ateam/page.tsx`
- `APPS/ftc-site/app/ateam/[surface]/page.tsx`
- `APPS/ftc-site/lib/productCardBranding.ts`
- `APPS/ftc-site/app/products/page.tsx`
- `APPS/ftc-site/app/work/WorkPageClient.tsx`
- `APPS/ftc-site/app/work/[slug]/page.tsx`
- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`

### What Was Restored

- a clear distinction between the Una Labs public website and the ATEAM app boundary
- a dedicated standalone ATEAM URL constant and host mapping in the public shell
- header and CTA flows that send users into ATEAM instead of treating ATEAM like a normal product card
- public-homepage composition focused on Una Labs trust, products, launches, and entry into ATEAM

### What Was Removed

- `ATEAM` as a normal top-level public-nav destination
- embedded ATEAM workflow treatment on the Una Labs homepage
- product and work links that routed ATEAM back into the embedded `/ateam` website surface
- the typecheck bug in the reduced `AteamWorkflowClient` surface that blocked `ftc-site` production builds

### Decisions Made

- treat `APPS/ATEAM` as the app source of truth and stop using the embedded `ftc-site` workflow page as the product definition
- keep legacy `/ateam` routes only as transition/redirect surfaces
- remove `Open ATEAM` language from public-site information architecture and replace it with `Enter ATEAM`
- keep the stronger standalone-domain target even if the current live host still needs DNS / deployment follow-through

### Route / Domain Map

Preferred target:

- `unalabs.cloud` -> Una Labs public site (`APPS/ftc-site`)
- `ateam.unalabs.cloud` -> standalone ATEAM app (`APPS/ATEAM`)
- `dispatch.unalabs.cloud` -> Dispatch
- `peacepad.unalabs.cloud` -> PeacePad
- `saywetin.unalabs.cloud` -> SayWetin

Transitional behavior implemented in this pass:

- `unalabs.cloud/ateam` -> redirect to `https://ateam.unalabs.cloud`
- `unalabs.cloud/ateam/[surface]` -> redirect to `https://ateam.unalabs.cloud/[surface]`
- public-site CTA buttons now point at the standalone ATEAM URL constant instead of the embedded page

### Validation

- `npm --prefix APPS/ftc-site run build`

### Unresolved Issues

- the standalone `ateam.unalabs.cloud` deployment still needs to be fully wired to the real ATEAM runtime so the public redirect lands in the restored app instead of any stale or fallback surface
- the current `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx` still exists as transitional code and should not be treated as the future ATEAM architecture
- further restoration work is still needed to bring the old Mission Control / Office environment fully onto the standalone ATEAM domain

### Exact Next Step

Deploy the real `APPS/ATEAM` app shell onto `ateam.unalabs.cloud`, verify that `unalabs.cloud/ateam` redirects there cleanly, then continue the restoration pass by lifting the Mission Control / Office experience from `APPS/ATEAM/Public/*` into the final standalone production route without re-embedding it in the Una Labs website.

### Summary

Cleaned up the public `/ateam` surface so it behaves like a workflow tool instead of a trapped split-panel brochure. The nested-scroll issue came from the main ATEAM split container being locked to viewport height while both the operator column and intake column also used their own vertical scrolling. That created an internal page scroll inside the layout instead of one natural document scroll.

### Files Changed

- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/styles/globals.css`

### Decisions Made

- removed the viewport-locked split behavior by undoing the `height: calc(100vh - 52px)` plus `overflow-y: auto` column pattern
- switched the public layout so the intake/workflow surface is the primary desktop column and the operator panel is now a smaller sticky reference panel
- rewrote the fallback banner into cleaner user-facing language: demo mode active, runs stay in this browser
- added a local-persistence note near the intake action area so users understand current run limits without seeing backend/debug language
- moved the “best for” guidance and agent role library out of the primary intake stage into a secondary section below the main split
- kept the current working fallback behavior intact while the shared backend remains paused

### Validation

- `npm --prefix APPS/ftc-site run build`

### Unresolved Issues

- the shared Railway `ateam-api` backend is still paused, so public runs still depend on the browser-local fallback path instead of durable shared persistence
- once the backend returns, the live UI can keep this hierarchy cleanup but should switch back to true shared run persistence and history continuity

### Exact Next Step

Push the layout cleanup, let Cloudflare deploy it, then visually QA `https://unalabs.cloud/ateam` for:
- single natural page scroll with no trapped inner column scroll
- intake surface leading above the fold
- cleaner demo-mode copy
- secondary role/guidance content appearing lower on the page instead of competing with the first workflow action

## 2026-04-07 Narrative Rewrite And Funding Memo Pack

### Summary

Repositioned the public ATEAM and Una Labs narrative away from "operator-led AI build studio" language and toward trusted AI workflow infrastructure, governed execution, and decision-ready outputs. Added a funding-positioning memo pack for ATEAM, Una Labs, and PeacePad so the product story is documented for future grant, partnership, and commercialization work.

### Files Changed

- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/app/components/OperatorOfficePanel.tsx`
- `APPS/ftc-site/app/components/Header.tsx`
- `APPS/ftc-site/app/components/HomePageExperience.tsx`
- `APPS/ftc-site/app/layout.tsx`
- `APPS/ftc-site/app/page.tsx`
- `APPS/ftc-site/app/ateam/page.tsx`
- `APPS/ftc-site/lib/ateamMode.ts`
- `APPS/ftc-site/lib/content.ts`
- `APPS/ATEAM/Docs/README.md`
- `APPS/ATEAM/README.md`
- `APPS/ATEAM/Docs/funding-positioning/README.md`
- `APPS/ATEAM/Docs/funding-positioning/ateam-memo.md`
- `APPS/ATEAM/Docs/funding-positioning/una-labs-memo.md`
- `APPS/ATEAM/Docs/funding-positioning/peacepad-memo.md`

### Decisions Made

- made the public ATEAM hero and proof language center on structured intake, scoped plans, human approval, and decision-ready output
- kept the working fallback behavior intact, but rewrote the copy to use cleaner demo-mode language without backend/debug phrasing
- treated operator roles as a supporting workflow-stage concept instead of the main product identity
- aligned the surrounding Una Labs metadata and homepage language to support a workflow-infrastructure story
- documented claims intentionally avoided so the public narrative stays stronger than "AI app" language without overclaiming sovereignty, hosting, or durable shared persistence
- verified the funding-positioning memos against official Canada, NRC, ISED, Vector, and Ontario sources on 2026-04-07

### Validation

- `npm --prefix APPS/ftc-site run build`

### Unresolved Issues

- the shared Railway `ateam-api` backend is still paused, so the live public demo still relies on fallback mode for run continuity
- the new narrative is stronger than the old one, but some deeper public copy in adjacent Una Labs routes can still be aligned further if we want the entire site to tell one consistent infrastructure story

### Exact Next Step

Let Cloudflare deploy the narrative pass, QA `/ateam` and the Una Labs homepage copy on the public host, then decide whether to do a second-wave alignment pass across the products and work pages.

## 2026-04-07 ATEAM Workflow-First Layout Cleanup

### Summary

Cleaned up the public `/ateam` idle surface so the workflow form reads as the primary action instead of feeling like a brochure wrapped around the operator cards. The main page shell no longer leads with the old split-panel treatment, and the operator-stage explainer now lives in the supporting section below the core intake path.

### Files Changed

- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/styles/globals.css`

### Decisions Made

- removed the top-level `wf-office-col` from the main `wf-split` shell so the page no longer reserves a dominant right-side explainer column before the workflow starts
- kept the working intake, template, recent-run, and local-demo flow intact instead of redesigning the runtime logic
- moved the `OperatorOfficePanel` into the secondary support band under the fit guidance and role library so it remains useful without dominating the first impression
- converted the intake stage into a workflow-first desktop grid: intro and proof on the left, actual request form on the right, with templates, outputs, and recent runs following below
- preserved a single natural page scroll and added responsive collapse rules so tablet/mobile return to a one-column stack cleanly

### Validation

- `npm --prefix APPS/ftc-site run build`

### Unresolved Issues

- the shared Railway `ateam-api` backend is still paused, so the live public flow still depends on browser-local demo mode for persistence
- once the backend returns, the visual hierarchy can stay as-is, but recent runs and approvals should be re-verified against true shared data instead of fallback storage

### Exact Next Step

Let Cloudflare deploy this layout pass, then visually QA `https://unalabs.cloud/ateam` for:
- the workflow form appearing above the fold without large empty dead space
- operator/stage content appearing lower as supporting information
- clean single-page scroll behavior on desktop and mobile

## 2026-04-07 Live ATEAM Verification After Public Polish

### Summary

Verified the live public ATEAM surface on `https://unalabs.cloud/ateam` after the latest polish pass. The route is rendering the intended workflow-first hero, guided intake form, demo-mode banner, template strip, recent-runs section, and supporting role/stage content.

### What Was Verified

- nav and footer both expose ATEAM as a first-class public route inside Una Labs
- the live ATEAM page now leads with:
  - trusted workflow infrastructure framing
  - the intake form above the fold
  - demo-mode messaging
  - supporting content below the main workflow surface
- the homepage also still links into ATEAM through:
  - main nav
  - studio lane card
  - footer link

### Remaining Gap

- the page is live and visible, but it is still operating in demo/local-browser mode because the shared ATEAM backend path remains optional and not required for this public beta surface

### Exact Next Step

If a later pass is needed, focus on content refinement or interaction polish rather than route visibility, because the current live issue is no longer "ATEAM missing from Una Labs."

## 2026-04-07 Voice Reliability And Native-Surface Pass

### Summary

Fixed the two biggest public UX gaps on `/ateam`: voice intake was behaving like a short burst recorder instead of a usable dictation path, and the page still felt like a boxed module inside Una Labs instead of the core workflow surface. The voice input now supports longer dictation with gentler silence handling and limited automatic recovery, and the layout now gives more width and priority to the intake itself while demoting the extra support chrome.

### Files Changed

- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/styles/globals.css`

### Root Cause: Voice

- browser speech recognition was configured with `continuous = false`, so it behaved like a short one-shot capture instead of a true dictation flow
- the silence-stop timer was only `2600ms`, so even natural speaking pauses triggered an early stop
- transcript handling rebuilt the spoken content from a short-lived session rather than maintaining a stronger final + interim append model
- the public UI presented voice as a normal action even though the behavior was still closer to beta quality

### What Changed In Speech Input

- switched speech recognition to continuous mode
- increased the total capture window and silence tolerance so longer phrases and natural pauses are supported
- split transcript handling into final and interim buffers so live text is appended more predictably instead of feeling truncated
- added limited auto-restart behavior when recognition ends unexpectedly mid-session
- updated the live notice copy to make the listening state clearer
- demoted the trigger label to `Voice beta` so the typed path remains the primary trusted input during public beta

### Root Cause: Layout

- the ATEAM page had accumulated multiple override layers for the same shell, split, and intake-grid classes
- those layered overrides still treated ATEAM like a contained module inside a broader Una Labs page shell
- support blocks such as the placeholder rail and extra office-stage panel kept reinforcing the impression of an embedded widget rather than a native page-level workflow surface

### What Changed In Layout And Hierarchy

- widened the ATEAM container and shifted more width toward the intake side of the hero
- removed the large boxed stage wrapper feel by making the intake stage itself transparent and letting the intake card own the visual priority
- promoted the intake card and request form as the dominant right-column action area
- hid the decorative idle placeholder rail and the extra office-stage support panel from the idle public surface
- kept the supporting role library and fit guidance lower on the page so they wrap around the workflow instead of overshadowing it
- refined the hero copy so ATEAM reads as the native workflow surface inside Una Labs, not a sub-tool dropped into the page

### Validation

- `npm --prefix APPS/ftc-site run build`

### Remaining Gaps

- browser speech recognition is still browser-dependent, so the typed path remains the most reliable intake path during public beta
- the shared Railway `ateam-api` backend is still not the primary public persistence path, so the current demo/local-browser continuity behavior remains important
- the Una Labs homepage still depends on Cloudflare serving the newest homepage deployment before the stronger ATEAM homepage placement is consistently visible on the apex domain

### Exact Next Step

Push this pass, let Cloudflare deploy it, then QA `https://unalabs.cloud/ateam` for:
- longer voice capture with natural pauses
- clearer listening notices and appended transcript behavior
- a wider, less boxed intake surface
- less empty dead space and less embedded-widget feel on desktop

## 2026-04-07 Dynamic Route And Voice Toggle Follow-up

### Summary

Followed up on two remaining public pain points: needing manual Cloudflare purges to see ATEAM updates, and the voice button still feeling like a soft secondary control instead of a clear record toggle. The root route issue was that both `/` and `/ateam` were still exported as `force-static`, so edge HTML could stay stale even after successful Pages deployments. Those routes are now set to dynamic with explicit no-store headers, and the voice control is now a clearer click-to-start / click-to-stop recording toggle with a red live indicator and stronger recording-state copy.

### Files Changed

- `APPS/ftc-site/app/page.tsx`
- `APPS/ftc-site/app/ateam/page.tsx`
- `APPS/ftc-site/middleware.ts`
- `APPS/ftc-site/public/_headers`
- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/styles/globals.css`

### Root Cause: Live Route Staleness

- both the Una Labs homepage and `/ateam` route were explicitly marked `force-static`
- the site was also shipping broad `s-maxage` caching for document HTML
- together, that made active Cloudflare Pages deployments look "done" while old route HTML could still persist on the custom domain until a manual purge

### What Changed For Live Delivery

- switched `/` and `/ateam` from `force-static` to `force-dynamic`
- added `revalidate = 0` on both routes
- added explicit `Cache-Control`, `CDN-Cache-Control`, and `Cloudflare-CDN-Cache-Control` no-store headers for `/` and `/ateam`
- kept those headers in both middleware and `_headers` so the route update path is less dependent on manual zone purges

### What Changed In Voice UX

- replaced the old quiet `Voice beta` pill with a clearer record toggle
- the button now reads as a recording control:
  - `Record request` when idle
  - `Stop recording` when active
- added a red recording indicator with pulsing animation while capture is active
- updated button helper copy so the interaction is explicit: click once to start, click again to stop
- updated recording notices to speak in recording language rather than generic listening language

### Remaining Gaps

- browser speech recognition remains browser-dependent, so typed input is still the safest path
- the public ATEAM flow still uses demo/local-browser persistence when the shared backend is unavailable
- this dynamic/no-store change should remove the need for future manual purges on `/` and `/ateam`, but it should be rechecked after the next production deploy to confirm the stale-edge pattern is gone

## 2026-04-07 Wide-Viewport Layout And Voice CTA Refinement

### Summary

Followed up on two remaining public UX issues after the dynamic route fix. First, ATEAM could still look too "lean" on very wide desktop viewports because the page shell was capped at a narrow fixed width, making the workflow feel like a centered embedded widget inside a huge empty canvas. Second, the voice control needed to read more like an intentional recording action and less like a small utility pill.

### Files Changed

- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/styles/globals.css`

### Root Cause: Lean / Embedded Feel On Wide Screens

- the base `.container` and `.wf-shell .container` widths were still conservative relative to very large desktop viewports
- the intake stage grid was skewed too tightly, leaving the request surface visually boxed into a narrow center column
- older placeholder/support patterns such as `.wf-placeholder-strip` and `.wf-office-support` were still able to reappear via later CSS layers, which reinforced the impression of an embedded module instead of a page-native workflow

### What Changed In Layout

- widened the global Una Labs container so the homepage and top-level studio pages use large screens more intentionally
- widened the ATEAM shell further than the base site container so `/ateam` can behave like a primary workflow page instead of a standard brochure section
- increased the intake column width and headline span so the hero and request form breathe properly on desktop
- forced the placeholder strip and boxed office support module back out of the public idle surface with a final override layer
- flattened the secondary support grid into a full-width stack so supporting content wraps beneath the workflow instead of splitting the page into smaller side modules

### What Changed In Voice UI

- strengthened the helper copy so voice is clearly described as a click-to-start / click-to-stop beta recorder
- restyled the voice trigger as a prominent red recording control with stronger contrast and more obvious recording affordance
- kept the pulsing indicator while active so the recording state is visible at a glance

### Remaining Gaps

- speech recognition still depends on browser support and user microphone permissions, so typed intake remains the safest fallback
- the public route still needs a final live browser QA pass after deployment to confirm the wider shell and red voice control are what users actually see on the apex domain

## 2026-04-07 Route-Scoped ATEAM Shell Override

### Summary

Followed up on one more live issue: `/ateam` was serving current HTML but still picking up an older global CSS bundle at the edge, which made the page look like a narrow embedded widget even after the wider-shell work was merged. To break that dependency, the route now ships its own critical ATEAM layout and voice styles inline at the page level so the main workflow surface can update without relying on a manual Cloudflare purge of shared stylesheet assets.

### Files Changed

- `APPS/ftc-site/app/ateam/page.tsx`

### Root Cause: HTML Fresh, CSS Stale

- route HTML was updating because `/ateam` is now dynamic and no-store
- the shared global CSS asset could still lag on the custom domain, so the live page mixed new markup with older width rules
- that mismatch is what kept the intake surface visually compressed and let older support/decorative patterns continue to influence the page

### What Changed

- added route-scoped global styles directly inside `app/ateam/page.tsx`
- widened the ATEAM shell, hero, intake grid, support grid, and voice control through page-level styles that travel with the route HTML
- explicitly hid the placeholder strip and office-support panel at the route level so the page reads like a native workflow surface instead of an embedded module
- added explicit no-store headers for `/` and `/ateam` in `next.config.js` after confirming middleware-only headers were still being replaced by `s-maxage=60` on the live route

### Remaining Gaps

- the route should still be rechecked in a real browser after deployment because static CSS caching can differ between the custom domain and preview hosts
- if Cloudflare continues serving stale shared CSS bundles, other page-level critical styles may need to be localized the same way

## 2026-04-07 Laptop Fit, Voice UX, And ATEAM Hierarchy Polish

### Summary

Completed the remaining public polish pass driven by laptop screenshots at normal browsing zoom. The main goals were to make the Una Labs home page and `/ateam` feel like one layout system, stop the ATEAM route from reading like a dropped-in widget, make the home ATEAM preview reliably open `/ateam`, and remove duplicate or noisy demo-state messaging. The voice path was also tightened again so it behaves more like a deliberate record control than a small secondary utility.

### Files Changed

- `APPS/ftc-site/app/components/HomePageExperience.tsx`
- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/app/ateam/page.tsx`
- `APPS/ftc-site/styles/globals.css`

### Root Cause: Voice Trust Issue

- the browser speech implementation was already improved technically, but the public surface still presented it too softly
- a small secondary-style voice control, paired with repeated environment messaging, made the feature feel optional and unreliable even when recognition itself was working better
- the public intake also still allowed the demo-state copy to repeat in multiple places, which diluted the main action and made the recording flow feel less intentional

### What Changed In Speech Input Behavior

- kept typed intake as the safest primary path
- tightened the helper copy so voice is clearly framed as a beta recorder with click-to-start / click-to-stop behavior
- updated the button copy to `Start recording` / `Stop recording`
- kept the animated recording indicator while active
- removed duplicate demo-state text around the intake so the voice control sits in a cleaner, less noisy surface

### Root Cause: Embedded / Add-On Layout Feel

- the intake hero was improved earlier, but the lower page still split into a support band with uneven visual weight
- the "best for" note sat outside the main fit card, which created dead space and made the left column feel unfinished
- the home ATEAM preview block also behaved more like a brochure card with a separate CTA than a native product entry point
- section widths and hero proportions were still close, but not fully calibrated for laptop views where small inconsistencies become obvious

### What Changed To Make ATEAM More Native To Una Labs

- made the home ATEAM lane card itself clickable so the ATEAM preview behaves like a real product surface entry point
- updated the ATEAM card copy on the homepage so it speaks in the current intake -> plan -> approval -> output language
- tightened the home hero proportions and visual stack spacing for laptop widths
- widened and rebalanced the `/ateam` route through route-scoped layout overrides so the intake surface leads and the lower sections read as support, not as separate stitched-on modules
- moved the "not ideal for..." note inside the fit card so the secondary support band feels composed instead of sparse
- removed the duplicate bottom demo-mode note from the public intake flow, keeping the environment message in one place

### Remaining Gaps Between Public UX And Intended Product Direction

- browser speech recognition is still browser-dependent, so typed intake remains the most trustworthy default
- the public ATEAM route is stronger now, but it still contains more supporting explanation than a fully hardened product surface would likely keep
- the shared/persistent backend path for public ATEAM is still not the primary experience, so the demo/local-browser continuity behavior remains an important constraint

## 2026-04-07 Cloudflare Route Ownership Fix

### Summary

Removed public `/ateam*` ownership from the legacy `workers/ateam-edge` worker so Cloudflare Pages can own `https://unalabs.cloud/ateam` directly. The worker now stays focused on public workflow API proxying and mission-control redirect behavior, which removes the main route conflict that was causing stale or mixed ATEAM responses on the custom domain.

### Files Changed

- `workers/ateam-edge/wrangler.toml`
- `workers/ateam-edge/src/index.ts`
- `APPS/ftc-site/RUNBOOK.md`
- `APPS/ATEAM/README.md`
- `DOCS/infra/stack-map.md`
- `DOCS/REPO_STRUCTURE_GUIDE_2026-03-27.md`

### Root Cause

- the old `ateam-edge` worker was still bound to `unalabs.cloud/ateam*`
- that left `/ateam` split between the Pages app and a legacy worker ownership layer
- Pages deployments could become active while the custom domain still served an older or mixed route path because the worker continued intercepting `/ateam*`

### What Changed

- removed `unalabs.cloud/ateam*` and `www.unalabs.cloud/ateam*` from `workers/ateam-edge`
- left the worker responsible only for:
  - `unalabs.cloud/api/ateam/*`
  - `www.unalabs.cloud/api/ateam/*`
  - mission-control redirect paths
- updated the docs so the public contract is now explicit:
  - Pages owns `/ateam`
  - edge worker owns ATEAM API and ops-related routing only

### Remaining Follow-up

- redeploy `workers/ateam-edge` so the route removal takes effect live
- then recheck `https://unalabs.cloud/ateam` and confirm it is now coming straight from Pages without the old edge conflict

## 2026-04-07 Laptop Fit + ATEAM Page Uniformity Pass

### Summary

Finalized the remaining laptop-fit polish for the Una Labs home page and `/ateam` by tightening the route-level layout rules, removing the idle placeholder band from the ATEAM markup, and making the ATEAM lane on the homepage a true clickable entry point. Also removed the last “rough operational requests” wording from the public copy so the homepage and ATEAM page read as one unified workflow system.

### Files Changed

- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/app/ateam/page.tsx`
- `APPS/ftc-site/app/components/HomePageExperience.tsx`
- `APPS/ftc-site/styles/globals.css`
- `APPS/ftc-site/lib/content.ts`

### Root Cause: Haphazard Fit

- multiple overlapping width systems caused the ATEAM hero and supporting sections to feel narrow and embedded on laptop widths
- the idle placeholder strip was still rendering in markup, creating visual noise even when CSS attempted to hide it
- the ATEAM lane preview on the homepage looked like a card but did not behave like a true entry point
- outdated “rough operational requests” copy still showed in the product case-study data

### What Changed

- simplified and rebalanced `/ateam` route-scoped layout rules to use one consistent width system and clearer intake-first grid ratios
- removed the idle placeholder strip from the render path
- widened the “Primary goal” and “Desired output” fields by giving them a full-width class
- made the ATEAM glance row on the homepage clickable and aligned the copy with the current ATEAM positioning
- updated the ATEAM product tagline/summary to the new language

### Remaining Gaps

- browser speech recognition is still browser-dependent, so typed input remains the safest default
- the ATEAM public flow still relies on demo/local-browser continuity while the shared backend remains optional

## 2026-04-07 ATEAM Surface Stabilization Follow-up (Single-Flow + Notice De-dup)

### Summary

Completed a focused stabilization pass on `/ateam` after additional live feedback. This pass hardened the route against fallback layout drift (embedded/narrow island behavior), removed duplicate demo-mode messaging variants, and reduced form clipping risk for laptop users.

### Files Changed

- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/app/ateam/page.tsx`
- `APPS/ftc-site/styles/globals.css`

### Root Cause: Embedded / Narrow Island Behavior

- legacy grid-era workflow styles still existed globally and could reserve a second split column
- when that styling path won, `/ateam` could render like a constrained module rather than a full workflow surface
- this created dead space and made the page feel stitched in

### Root Cause: Duplicate Demo Messaging

- demo status could arrive through more than one notice string variant
- previous filtering only suppressed one exact message string, allowing similar `Demo mode active...` variants to still render in later states

### What Changed

- enforced route-scoped `/ateam` layout hardening:
  - force single-column shell split
  - remove any implicit second column reservation
  - ensure intake container uses full available route width
- expanded notice de-dup logic:
  - suppress any notice beginning with `Demo mode active.` in non-banner slots
  - keep the environment message in one clean primary banner
- reduced clipping pressure:
  - removed placeholder ellipsis behavior on guided inputs (`text-overflow: clip`)

### Validation

- `npm.cmd --prefix APPS/ftc-site run build` completed successfully

### Remaining Follow-up

- verify on live `https://unalabs.cloud/ateam` at laptop browser zoom settings (90% and 100%) to confirm no stale route artifact
- if stale HTML still appears on the custom domain, finish edge-route ownership and cache checks before new UI passes

## 2026-04-08 — Edge Runtime Deploy Unblock + ATEAM Top-Bar/Voice Copy Polish

Deployed a focused unblock to stop Cloudflare Pages failures on new ATEAM commits, then applied a small public-surface polish requested from live QA.

### Files Changed

- `APPS/ftc-site/app/page.tsx`
- `APPS/ftc-site/app/ateam/page.tsx`
- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`

### Root Cause: “ATEAM not showing latest” after push

- Cloudflare Pages deployment for `ftc-site-pages` was failing on recent commits because Next-on-Pages rejected non-edge routes:
  - `/`
  - `/ateam`
- when deploys failed, the custom domain kept serving the older successful artifact

### What Changed

- added `export const runtime = "edge";` on:
  - `app/page.tsx`
  - `app/ateam/page.tsx`
- this restored successful production deploys for latest commits
- then removed public ATEAM top-bar status badge rendering (no visible `Private Beta` chip in workflow shell)
- replaced wording from `Voice beta ...` to neutral `Voice capture ...` helper copy in intake

### Validation

- local build passed:
  - `npm.cmd --prefix APPS/ftc-site run build`
- production deploys are now succeeding again on `ftc-site-pages` (latest source commits show `Active` instead of `Failure`)

### Remaining Follow-up

- if any user still sees old ATEAM shell sections, verify browser cache and zone-level route precedence for `unalabs.cloud/ateam`
- continue with next UX pass:
  - remove any remaining dense legacy support blocks
  - keep intake + plan + approval path dominant above the fold

## 2026-04-08 - Live Routing Recovery for ATEAM API (No-Manual-Purge Path)

Closed the primary "ATEAM still in demo mode" blocker by fixing upstream host resolution at both the Pages proxy layer and the `ateam-edge` worker config.

### Root Cause

- upstream host config drift:
  - `workers/ateam-edge/wrangler.toml` pointed at `https://ateam-api-production.up.railway.app` (returns Railway `Application not found`)
  - Pages API proxy defaulted to a single host and dropped to local fallback when that host failed
- this forced the public workflow path into local demo behavior even when Railway service health was green

### Files Changed

- `APPS/ftc-site/lib/ateamUpstream.ts`
- `workers/ateam-edge/wrangler.toml`

### What Changed

- upgraded upstream resolution in `ateamUpstream.ts`:
  - now tries configured env origin first
  - then falls back to:
    - `https://ateam-api.unalabs.cloud`
    - `https://ateam-platform-production.up.railway.app`
  - skips bad Railway edge routes by detecting:
    - `x-railway-fallback: true`
    - `Application not found` body
- updated `ateam-edge` worker default upstream to:
  - `https://ateam-platform-production.up.railway.app`

### Why this helps without manual purge

- public runtime now has a resilient upstream chain; if one hostname is stale or mis-routed during DNS/SSL propagation, it can continue on the next valid origin
- this reduces cache-propagation sensitivity and avoids "hard stop to demo mode" from one bad host

### Remaining Follow-up

- once Cloudflare DNS for `ateam-api.unalabs.cloud` is confirmed with Railway-required CNAME target, this can become the stable primary again
- complete deploy + live smoke checks:
  - `https://unalabs.cloud/api/ateam/workflow/runs?limit=1`
  - `https://unalabs.cloud/ateam`

## 2026-04-08 - Standalone ATEAM Host Wiring

Confirmed the app/runtime split was already coded, but the standalone host still did not resolve. That made production fall back to the legacy public-route behavior even though the preferred architecture had moved on.

### Files Changed

- `workers/ateam-edge/wrangler.toml`
- `APPS/ATEAM/README.md`
- `APPS/ftc-site/README.md`

### Root Cause

- `ateam.unalabs.cloud` was not provisioned as a first-class host
- the edge worker had proxy logic ready for a standalone app host, but Cloudflare was still treating the host binding like a plain route pattern instead of a real custom domain
- repo documentation still described the embedded `/ateam` model as canonical, which reinforced the wrong deployment shape

### What Changed

- switched `workers/ateam-edge` from `ateam.unalabs.cloud/*` route matching to a true Cloudflare custom-domain binding on `ateam.unalabs.cloud`
- documented the preferred public boundary explicitly:
  - `unalabs.cloud` = Una Labs public site
  - `ateam.unalabs.cloud` = standalone ATEAM app
  - `unalabs.cloud/ateam` = compatibility redirect
- updated both app/site READMEs so the repo no longer treats the embedded public route as the target architecture

### Remaining Follow-up

- deploy `workers/ateam-edge` so Cloudflare provisions `ateam.unalabs.cloud`
- push the `ftc-site` public-shell changes so `unalabs.cloud/ateam` stops serving the old embedded experience and redirects to the standalone host
- smoke test:
  - `https://unalabs.cloud/`
  - `https://unalabs.cloud/ateam`
  - `https://ateam.unalabs.cloud/office`

## 2026-04-08 - Public /ateam Route Takeover

The main production bug was not that ATEAM was missing from the repo. The old live ATEAM shell was still present and healthy. The real problem was that Cloudflare Pages still owned `unalabs.cloud/ateam`, so users kept seeing the stale embedded public page even after the site/app split work had been pushed.

### Root Cause

- `workers/ateam-edge` only owned:
  - `unalabs.cloud/api/ateam/*`
  - `unalabs.cloud/mission-control*`
  - `ateam.unalabs.cloud`
- public `unalabs.cloud/ateam` traffic still fell through to Pages
- Pages served the older embedded ATEAM route, which looked like the simplified brochure version and masked the restored app work
- when `/ateam` was first proxied through the worker, the browser still resolved `style.css`, `app.js`, and module scripts against `/` instead of `/ateam/`, because the public integrated route needed a real base href

### Files Changed

- `workers/ateam-edge/src/index.ts`
- `workers/ateam-edge/wrangler.toml`

### What Changed

- added explicit worker ownership for:
  - `unalabs.cloud/ateam*`
  - `www.unalabs.cloud/ateam*`
- changed the public `/ateam*` path to proxy the real ATEAM app from Railway instead of letting Pages serve the stale embedded route
- strip `/ateam` before proxying upstream so:
  - `unalabs.cloud/ateam` -> upstream `/`
  - `unalabs.cloud/ateam/office` -> upstream `/office`
- keep `/ateam/operator*` redirected to the ops host
- inject an integrated bootstrap for public `/ateam` responses:
  - `window.ATEAM_API_BASE="/ateam"`
  - `window.ATEAM_BASE_PATH="/ateam"`
  - `<base href="/ateam/">`
- this lets the older ATEAM app resolve:
  - `style.css`
  - `app.js`
  - `/modules/*`
  - `/ateam/api/*`
  correctly under the public host

### Source Of The Last Good ATEAM

The still-usable older app shell lives under:

- `APPS/ATEAM/Public/index.html`
- `APPS/ATEAM/Public/app.js`
- `APPS/ATEAM/Public/style.css`
- `APPS/ATEAM/Public/modules/config.js`

This is the dark live app shell with Mission Control, Office, Team, Factory, Pipeline, and agent-presence behavior. That older app is now what public `/ateam` proxies again.

### Verification

- `https://unalabs.cloud/ateam` now returns the ATEAM app HTML instead of the embedded site route
- `https://unalabs.cloud/ateam/style.css` returns `200`
- `https://unalabs.cloud/ateam/app.js` returns `200`
- `https://unalabs.cloud/ateam/health` returns `200`
- `https://unalabs.cloud/ateam/api/workflow/runs?limit=1` returns `200`
- browser snapshot confirms the Mission Control shell is rendering on `unalabs.cloud/ateam`

### Remaining Follow-up

- provision and verify `ateam.unalabs.cloud` so the preferred standalone domain becomes the canonical live entry
- once that host is stable, decide whether:
  - `unalabs.cloud/ateam` should remain a compatibility bridge, or
  - redirect fully to `https://ateam.unalabs.cloud`
- continue the architecture cleanup so the public site stays company-first while ATEAM stays system-first
