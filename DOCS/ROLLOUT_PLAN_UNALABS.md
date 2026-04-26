# Unalabs Rollout Plan

Last updated: 2026-03-10
Canonical repo root: `C:\FTC HOLDING`

## Purpose

This plan formalizes the Unalabs umbrella direction in phases without mixing strategic cleanup with active deploy firefighting.

## Phase A - Documentation and Naming Clarity

### Goal
Create one shared understanding of the ecosystem before changing repo layout or infrastructure.

### Actions
1. Document the ecosystem map.
2. Document recommended repo structure.
3. Document brand, repo, deploy, and domain ownership separately.
4. Link new strategic docs from the root README.
5. Use `Unalabs` consistently when referring to the umbrella studio / product lab.
6. Use `FTC HOLDING` consistently when referring to legal or operating ownership.

### Success criteria
- New operator can understand the ecosystem from root docs without reverse-engineering app folders.
- PeacePad, Saywetin, ATEAM, and extension work are clearly positioned.
- No code or deployment behavior changed.

## Phase B - Safe Repo Cleanup and Folder Normalization

### Goal
Reduce structural ambiguity after the docs have stabilized and ownership decisions are explicit.

### Candidate work
1. Decide formal ownership/tracking of `APPS/ATEAM`.
2. Classify `client/` and either absorb, archive, or document it.
3. Introduce logical doc buckets under `DOCS/` such as:
   - `architecture`
   - `releases`
   - `policies`
   - `operations`
4. Move only clearly infra-specific notes or scripts into an `INFRA/` area.
5. Review whether `workers/` should remain top-level or be split by ownership.

### Guardrails
- No broad moves without path verification.
- No folder renames that break workspaces or docs without a migration map.
- No mixing repo cleanup with production cutovers.

### Success criteria
- Root layout becomes easier to scan.
- Existing scripts and build paths remain stable.
- No accidental disruption to active product delivery.

## Phase C - Brand and Domain Alignment

### Goal
Align public-facing narrative and domains with the documented Unalabs umbrella, only after internal structure is clear.

### Candidate work
1. Finalize the Unalabs site as the public umbrella entry point.
2. Keep product domains product-specific.
3. Clarify how extensions are presented publicly:
   - under a product page
   - under an Unalabs capabilities page
   - or both
4. Publish a concise external product map for collaborators, partners, and hiring contexts.

### Success criteria
- Public narrative matches repo and deployment reality.
- Brand hierarchy is easy to explain.
- Domain ownership supports product clarity rather than creating overlap.

## Recommended Sequence

1. Finish Phase A documentation.
2. Let product work continue without large structural churn.
3. Make one explicit ATEAM ownership decision.
4. Then begin narrow Phase B cleanup.
5. Treat Phase C as optional until there is a real communication or growth need.

## Strong recommendation

Do not combine these phases in one pass.

- Strategy docs are low-risk and high-value.
- Repo cleanup is medium-risk and should happen only with verification.
- Domain or brand changes are highest-risk and should be handled separately from product release work.

## Una Labs Rollout Ops Snapshot (Auto)

<!-- AUTO:UNALABS_ROLLOUT:START -->
- Updated at: 2026-04-26T20:58:03.312Z
- Done count: 12
- In progress count: 1
- Blocked count: 0
- Done:
  - Phase 0–4: Auth, proposals, reporting, pipeline, billing
  - Phase 5: Contracts/E-sign
  - Phase 5b: Admin contracts table
  - Phase 6: Invoicing — auto-generate on milestone approval
  - Phase 7: Instant Bill — one-off Stripe PaymentLink
  - Phase 8: AI Price Insights — recommended pricing bands in scoping output
  - Phase 10: Deals / Leads — pre-intake prospect pipeline
  - Phase 11: /how-it-works — narrated module demo page
  - Phase 12: AutoPricing self-serve — re-trigger AI price from proposal view
  - Phase 13: Custom Branding — per-project logo + accent on proposals/emails
  - Phase 14: Multi-tenancy + Stripe Connect — sell platform to other agencies
  - Phase 15: Zapier / Webhooks — outbound event hooks for Xero, Slack, QBO
- In progress:
  - Phase 9: AutoCollect — collection queue, reminders, payout-ready tracking
- Blocked:
  - None
- Next: Execute full test plan end-to-end and finalize launch signoff package.
<!-- AUTO:UNALABS_ROLLOUT:END -->
