import { loadStripe } from '@stripe/stripe-js';

export type AnionPlan = {
  id: string;
  name: string;
  description: string;
  monthlyLabel: string;
  annualLabel: string;
  monthlyPriceId: string;
  annualPriceId: string;
  features: string[];
  recommended?: boolean;
};

export const ANION_PLANS: AnionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For families getting started with tutoring.',
    monthlyLabel: '$29/mo',
    annualLabel: '$279/yr',
    monthlyPriceId: (import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY as string | undefined) ?? '',
    annualPriceId: (import.meta.env.VITE_STRIPE_PRICE_STARTER_ANNUAL as string | undefined) ?? '',
    features: ['4 sessions/month', '1 student profile', 'Tutor directory access', 'Email support'],
  },
  {
    id: 'family',
    name: 'Family',
    description: 'Unlimited learning for the whole family.',
    monthlyLabel: '$59/mo',
    annualLabel: '$569/yr',
    monthlyPriceId: (import.meta.env.VITE_STRIPE_PRICE_FAMILY_MONTHLY as string | undefined) ?? '',
    annualPriceId: (import.meta.env.VITE_STRIPE_PRICE_FAMILY_ANNUAL as string | undefined) ?? '',
    features: ['Unlimited sessions', 'Up to 3 students', 'Priority booking', 'Session recordings'],
    recommended: true,
  },
];

function getPublishableKey(): string {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (!key) throw new Error('VITE_STRIPE_PUBLISHABLE_KEY is not configured.');
  return key;
}

let stripePromise: ReturnType<typeof loadStripe> | null = null;

export function getStripeInstance(): ReturnType<typeof loadStripe> {
  stripePromise ??= loadStripe(getPublishableKey());
  return stripePromise;
}

export async function startCheckout(priceId: string, customerEmail?: string): Promise<void> {
  if (!priceId) throw new Error('A valid Stripe price ID is required to start checkout.');
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, customerEmail }),
  });
  if (!res.ok) throw new Error(`Checkout session creation failed (${res.status})`);
  const { url } = (await res.json()) as { url: string };
  window.location.href = url;
}

export async function openBillingPortal(customerId?: string): Promise<void> {
  const res = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // When customerId is omitted the server resolves the customer from the authenticated session.
    body: JSON.stringify({ customerId: customerId ?? null }),
  });
  if (!res.ok) throw new Error(`Billing portal session creation failed (${res.status})`);
  const { url } = (await res.json()) as { url: string };
  window.location.href = url;
}