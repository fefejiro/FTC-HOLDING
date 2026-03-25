# Una Labs ATEAM Fast Pass Handover 2026-03-25

## What changed

Una Labs no longer presents ATEAM as a slow, over-explained public demo flow.

The public `/ateam` route now acts as a fast-pass idea lab:

- one rough-idea intake
- optional browser voice capture
- two short clarifier questions
- a visible build-style conversion tunnel
- one compact decision package
- clear handoff into Una Labs intake
- optional open into the real local ATEAM operator view

This keeps the public experience useful and demo-worthy without exposing the full internal Mission Control UI up front.

## Product behavior now

### Public path

1. Visitor opens `/ateam`
2. Visitor drops a rough idea in natural language
3. ATEAM starts a workflow run
4. ATEAM asks only two practical follow-ups:
   - who it is for
   - first useful win
5. Public flow auto-chains the internal gates:
   - save answers
   - approve brief
   - generate pack
   - approve pack
6. Visitor receives a compact decision package:
   - idea summary
   - likely user value
   - recommended direction
   - quick verdict
   - visual concept cards
   - prototype direction
   - build watch / smoke checks
   - next move
7. Visitor can:
   - continue with Una Labs via `/work-with-ftc`
   - open the real local ATEAM operator view when running locally

### Operator path

The public handoff still connects to the real local/operator runtime:

- `/ateam/operator/office`
- `/ateam/operator/factory`

The ATEAM public shell uses the reduced workflow shell so the operator handoff stays focused on:

- Office
- Team
- Factory
- Pipeline

## Architectural notes

### Reused instead of rebuilt

This refactor intentionally reused the existing workflow infrastructure instead of adding a parallel fake system:

- ATEAM workflow engine
- ATEAM workflow service
- existing workflow API routes
- existing local/operator proxy path
- existing handoff storage
- existing intake submission route

### Removed dead public demo path

The older public demo path was removed because it duplicated the workflow and made the product feel split:

- deleted `APPS/ftc-site/app/ateam/AteamDemoClient.tsx`
- deleted `APPS/ftc-site/app/api/ateam-demo/route.ts`

Legacy demo handoff parsing is still tolerated in the intake form so stale browser/session data does not crash the user journey.

## UX changes

### Public ATEAM copy

The public copy was tightened to feel more like an idea lab and less like a coaching or therapy workflow.

Examples:

- “Drop a rough idea. Leave with a quick decision pack.”
- “Quick structure pass”
- “Prototype direction out”
- “Continue with Una Labs”

### Local ATEAM talk seed

The old “personal AI companion” seed reply in the local ATEAM public app was replaced with a more product-aligned line:

- “I'm Manchi. Drop the rough idea, and I'll shape the first pass.”

This affects the seeded talk/demo copy only. Historical memory thread files still contain older text snapshots.

## Client Launches branding

Client Launches now carries stronger client identity instead of a bland generic card.

Emergency Prompt now has:

- explicit brand metadata
- branded featured card styling
- stronger case-study hero styling
- more prominent client identity in `/work` and `/work/emergency-prompt`

No real Emergency Prompt logo file existed in the repo during this pass, so the implementation uses a branded text mark and accent system instead of inventing a fake asset.

## Main files touched

- `APPS/ATEAM/Public/app.js`
- `APPS/ATEAM/Server/lib/workflowEngine.js`
- `APPS/ATEAM/Server/lib/workflowService.js`
- `APPS/ATEAM/Server/__tests__/unit/workflowEngine.test.js`
- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/app/ateam/[surface]/page.tsx`
- `APPS/ftc-site/app/components/WorkIntakeForm.tsx`
- `APPS/ftc-site/app/work/WorkPageClient.tsx`
- `APPS/ftc-site/app/work/emergency-prompt/page.tsx`
- `APPS/ftc-site/lib/ateamUpstream.ts`
- `APPS/ftc-site/lib/ateamWorkflow.ts`
- `APPS/ftc-site/lib/recentWork.ts`
- `APPS/ftc-site/styles/globals.css`

## Verification

Verified locally in `C:\FTC HOLDING`:

- `npm.cmd --prefix APPS/ATEAM/Server run test:unit`
- `Set-Location 'C:\FTC HOLDING\APPS\ftc-site'; $env:CI='1'; npx.cmd next build`

Both passed during this handoff.

## Known limitations

- Public `/ateam` is now real and useful, but the deep operator view still depends on the real ATEAM runtime being available through the existing local/operator proxy setup.
- Browser voice capture is still browser-native speech recognition, not a deeper ATEAM audio pipeline.
- Historical thread JSON files inside ATEAM memory still contain old awkward prompt text, but the active public/product path no longer uses that wording.

## Recommended phase two

1. Replace browser speech recognition with the real ATEAM talk/transcript normalization path.
2. Add real client logo assets where available so Client Launches can use image branding instead of text marks.
3. Add a more visual structural wireframe renderer to the decision package.
4. Decide whether to purge or migrate stale ATEAM memory thread fixtures containing old prompt language.
