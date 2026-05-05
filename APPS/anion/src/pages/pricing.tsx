import { useState } from 'react';
import { ANION_PLANS, startCheckout, openBillingPortal } from '../services/stripe';
import type { AnionPlan } from '../services/stripe';

type BillingCycle = 'monthly' | 'annual';

function PlanCard({
  plan,
  billingCycle,
  onSubscribe,
}: {
  plan: AnionPlan;
  billingCycle: BillingCycle;
  onSubscribe: (priceId: string) => void;
}) {
  const priceId = billingCycle === 'annual' ? plan.annualPriceId : plan.monthlyPriceId;
  const label = billingCycle === 'annual' ? plan.annualLabel : plan.monthlyLabel;

  return (
    <div className={`plan-card${plan.recommended ? ' plan-card--recommended' : ''}`}>
      {plan.recommended && <span className="plan-badge">Most Popular</span>}
      <h3 className="plan-name">{plan.name}</h3>
      <p className="plan-description">{plan.description}</p>
      <p className="plan-price">{label}</p>
      <ul className="plan-features">
        {plan.features.map((feature) => (
          <li key={feature}>✓ {feature}</li>
        ))}
      </ul>
      <button
        className="plan-cta"
        onClick={() => onSubscribe(priceId)}
        disabled={!priceId}
      >
        {priceId ? 'Get Started' : 'Coming Soon'}
      </button>
    </div>
  );
}

export function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function handleSubscribe(priceId: string) {
    setCheckoutError(null);
    setIsRedirecting(true);
    try {
      await startCheckout(priceId);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.');
      setIsRedirecting(false);
    }
  }

  async function handleManageBilling() {
    setCheckoutError(null);
    setIsRedirecting(true);
    try {
      await openBillingPortal();
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Could not open billing portal. Please try again.');
      setIsRedirecting(false);
    }
  }

  return (
    <section className="pricing-section">
      <h2>Choose Your Plan</h2>
      <p className="pricing-subtitle">Flexible tutoring subscriptions for every family.</p>

      <div className="billing-toggle">
        <button
          className={billingCycle === 'monthly' ? 'toggle-active' : ''}
          onClick={() => setBillingCycle('monthly')}
        >
          Monthly
        </button>
        <button
          className={billingCycle === 'annual' ? 'toggle-active' : ''}
          onClick={() => setBillingCycle('annual')}
        >
          Annual <span className="toggle-savings">Save ~20%</span>
        </button>
      </div>

      <div className="plan-grid">
        {ANION_PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            onSubscribe={handleSubscribe}
          />
        ))}
      </div>

      {checkoutError && <p className="pricing-error">{checkoutError}</p>}
      {isRedirecting && <p className="pricing-redirecting">Redirecting to Stripe…</p>}

      <div className="billing-portal-section">
        <p>Already a subscriber?</p>
        <button className="billing-portal-btn" onClick={handleManageBilling}>
          Manage Billing
        </button>
      </div>
    </section>
  );
}