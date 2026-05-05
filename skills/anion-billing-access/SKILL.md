---
name: anion-billing-access
description: Use when implementing Stripe checkout, webhook fulfillment, plan gating, promo codes, billing settings, or subscription state for Anion.
---

# Anion Billing and Access

Use this skill for all Anion money, entitlement, and access-control work.

## Mission

Make billing trustworthy and server-driven.

## Responsibilities

- create or update checkout flows
- implement Stripe webhook fulfillment
- sync subscription records into Supabase
- gate paid features from reliable server truth
- support promo and coupon flows when approved
- document billing assumptions in ADRs

## Primary surfaces

- `APPS/anion/app/api/webhooks/stripe/`
- `APPS/anion/app/(public)/pricing/`
- `APPS/anion/lib/stripe.ts`
- billing-related dashboard or account settings surfaces

## Workflow

1. Load this skill.
2. Also load Stripe-specific skills if working in Stripe-heavy areas.
3. Confirm the canonical products and price IDs.
4. Keep billing state server-driven.
5. Record assumptions and test notes.

## Rules

- Do not trust the frontend as the source of payment truth.
- Do not unlock paid features from optimistic UI alone.
- Do not change Stripe products, prices, or webhook expectations without documenting why.
- Do not leak secrets or paste credentials.
- Do not merge billing work without at least test-mode evidence.

## Minimum validation

- checkout session creation
- webhook receipt and signature handling
- subscription record sync
- access gate behavior for paid and unpaid states
- failure-state notes for declined or incomplete flows

## Output

- billing files changed
- webhook and entitlement notes
- test evidence
- follow-up items or unresolved risks
