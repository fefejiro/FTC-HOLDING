---
applyTo: "app/api/webhooks/stripe/**,components/billing/**,lib/stripe.ts,**/*billing*,**/*subscription*"
---

# Billing and access instructions

## Focus

- Stripe checkout
- webhook correctness
- entitlement logic
- subscription status transitions
- pricing UI

## Rules

- Billing truth must come from server side webhook processing
- Do not trust frontend only payment state
- Use idempotent webhook handling patterns
- Store normalized subscription records in Supabase
- Keep plan and entitlement naming explicit
- Document assumptions about Stripe product and price IDs

## Done means

- checkout path is testable
- webhook path is implemented and validated
- access gating is wired to real state
- billing edge cases are documented
