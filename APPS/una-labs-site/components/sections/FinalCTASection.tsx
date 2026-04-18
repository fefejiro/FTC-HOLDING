import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function FinalCTASection() {
  return (
    <section className="bg-brand-teal-light py-24">
      <div className="max-w-content mx-auto px-6 text-center">

        <div className="mb-4 flex justify-center">
          <Badge variant="teal">Start here</Badge>
        </div>

        <h2 className="text-display-sm text-tx-heading mb-6 max-w-tight mx-auto">
          Deliver with confidence, starting today
        </h2>

        <p className="text-body-lg text-tx-secondary mb-10 max-w-narrow mx-auto">
          Submit a request. Get a scoped brief. Agree on terms. Deliver with proof.
          No retainers, no ambiguity.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Button href="/start" variant="primary" size="lg">
            Start Free Trial
          </Button>
          <Button href="/how-it-works" variant="secondary" size="lg">
            See How It Works
          </Button>
          <Button href="/pricing" variant="ghost" size="lg">
            View Pricing
          </Button>
        </div>

        <p className="mt-6 text-caption text-tx-muted">
          No credit card required. No account needed to get a scope.
        </p>

      </div>
    </section>
  );
}
