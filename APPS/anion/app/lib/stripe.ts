import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
      typescript: true,
    });
  }
  return _stripe;
}

// Keep named export for backward compat — resolved on first use, not at import
export const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    return (getStripe() as unknown as Record<string, unknown>)[prop as string];
  },
});

/**
 * Plan IDs — these map to Stripe Price IDs configured in your Stripe dashboard.
 * Set these in your Stripe dashboard and update the values below.
 */
export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: '4 sessions per month, 1 subject',
    priceMonthly: 4900, // $49/mo in cents
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? '',
    sessionsPerMonth: 4,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    description: '8 sessions per month, up to 3 subjects',
    priceMonthly: 8900,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH ?? '',
    sessionsPerMonth: 8,
  },
  unlimited: {
    id: 'unlimited',
    name: 'Unlimited',
    description: 'Unlimited sessions, all subjects, priority tutors',
    priceMonthly: 14900,
    stripePriceId: process.env.STRIPE_PRICE_UNLIMITED ?? '',
    sessionsPerMonth: 9999,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlan(planId: string) {
  return PLANS[planId as PlanId] ?? null;
}
