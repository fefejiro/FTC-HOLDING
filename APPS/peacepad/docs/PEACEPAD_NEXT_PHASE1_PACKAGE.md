# PeacePad Next Phase 1 Package

Status: Phase 1 complete for review  
Updated: 2026-07-23  
Scope: audit and documentation only; no production code changes; no App Store changes; no private court documents used.

## Current release state

- VERIFIED: PeacePad iOS `1.0`, build `1.0.9 (1)`, was submitted to Apple App Review.
- VERIFIED: Apple email confirmed the app was received for review.
- UNKNOWN: exact current App Store Connect state after session expiry requires fresh Apple authentication.
- Rule: keep the submitted release frozen unless Apple raises an issue, a critical production defect is verified, or the founder explicitly authorizes replacement submission.

## Current production architecture

```text
React Web Application
-> Capacitor Native Shell
-> Existing iOS Xcode Workspace
-> App Store Connect
-> TestFlight / App Store
```

Decision: keep this path for the submitted release and immediate post-review work. React Native is research-only.

## Package map

| Requested output | File |
| --- | --- |
| App Review status / release freeze | `IOS_RELEASE_STATUS.md`, `IOS_RELEASE_FREEZE.md`, `APP_REVIEW_RESPONSE_PLAYBOOK.md` |
| Repository audit | `PEACEPAD_REPOSITORY_AUDIT.md` |
| Historical/current feature inventory | `PEACEPAD_FEATURE_INVENTORY.md` |
| Reuse matrix | `PEACEPAD_REUSE_MATRIX.md` |
| Architecture decision | `PEACEPAD_ARCHITECTURE_DECISION.md` |
| PeacePad Next PRD | `PEACEPAD_NEXT_PRD.md` |
| Premium PRD | `PEACEPAD_PREMIUM_PRD.md` |
| User journeys | `PEACEPAD_USER_JOURNEYS.md` |
| Jobs to be done | `PEACEPAD_JOBS_TO_BE_DONE.md` |
| Product principles | `PEACEPAD_PRODUCT_PRINCIPLES.md` |
| Onboarding / activation | `PEACEPAD_ONBOARDING_SPEC.md`, `PEACEPAD_ACTIVATION_SPEC.md` |
| Acquisition / pilot channels | `PEACEPAD_ACQUISITION_PLAN.md`, `PEACEPAD_PILOT_CHANNELS.md` |
| Retention / referral | `PEACEPAD_RETENTION_MODEL.md`, `PEACEPAD_REFERRAL_MODEL.md` |
| Monetization / pricing | `PEACEPAD_MONETIZATION_MODEL.md`, `PEACEPAD_PRICING_EXPERIMENTS.md` |
| Reliability / mobile QA / incident response | `PEACEPAD_RELIABILITY_STANDARD.md`, `PEACEPAD_MOBILE_QA_MATRIX.md`, `PEACEPAD_INCIDENT_RESPONSE.md` |
| Privacy / security / evidence / AI | `PEACEPAD_PRIVACY_ARCHITECTURE.md`, `PEACEPAD_SECURITY_MODEL.md`, `PEACEPAD_EVIDENCE_INTEGRITY.md`, `PEACEPAD_AI_SAFETY.md` |
| Analytics | `PEACEPAD_ANALYTICS_SPEC.md` |
| Pilot program / interviews / scorecard | `PEACEPAD_PILOT_PROGRAM.md`, `PEACEPAD_INTERVIEW_GUIDE.md`, `PEACEPAD_FEEDBACK_SCORECARD.md` |
| React Native research | `PEACEPAD_REACT_NATIVE_SPIKE.md`, `PEACEPAD_NATIVE_MIGRATION_DECISION.md` |
| FTC operating system / portfolio / queue / agents | `../../DOCS/FTC_*.md` docs listed in `FTC_SOURCE_OF_TRUTH.md` |

## Recommended first implementation batch

Only after founder review/approval:

1. Modern onboarding carousel.
2. Goal selection.
3. Activation checklist.
4. Parenting-time event model.
5. Child-call event model.
6. Basic evidence-upload metadata model.
7. Manual timeline.
8. Privacy-conscious analytics events.
9. Safe-area and keyboard QA.
10. Feature flags so unfinished premium features remain hidden.

## Proposed PR sequence

1. Documentation and source-of-truth alignment.
2. Analytics event schema and privacy guardrails.
3. Onboarding and activation flow.
4. Parenting-time and child-call event model.
5. Evidence upload and tagging foundation.
6. Timeline and export foundation.
7. Post-TestFlight mobile QA fixes.
8. React Native spike, separate and non-production.

## Founder decisions required

- Approve Phase 1 docs as the source of truth.
- Confirm whether Premium begins inside the current web/API app after Apple review.
- Confirm whether evidence storage should use Supabase Storage, S3-compatible storage, Cloudflare R2, or another private object store.
- Confirm the first pricing hypothesis before any billing implementation.
- Confirm whether call recording is excluded until legal/privacy review.
- Confirm whether professional accounts are a later lane rather than Premium beta.

## Workstreams to pause

- React Native migration.
- WebRTC/live calling public release.
- Call recording/transcription.
- Billing/in-app purchases.
- Court-prep AI automation beyond manual/source-linked drafts.
- Any upload of private court documents into source control, tests, public issues, or marketing.

## Features hidden from v1

- Evidence Vault.
- Court Prep Workspace.
- OCR/date extraction/participant extraction.
- Lawyer/mediator/professional access.
- Real-time calls unless separately proven.
- Call recording.
- Paid subscriptions.
- React Native production app.

