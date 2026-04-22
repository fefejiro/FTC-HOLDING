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
          Start with activation. Get a scoped brief. Approve the plan. Move into build with proof.
          Clear phases, clear payment, no ambiguity.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Button href="/start-project" variant="primary" size="lg">
            Start Your Project
          </Button>
          <Button href="/how-it-works" variant="secondary" size="lg">
            See How It Works
          </Button>
          <Button href="/pricing" variant="ghost" size="lg">
            View Pricing
          </Button>
        </div>

        <p className="mt-6 text-caption text-tx-muted">
          Activation covers scope and planning. Build deposit comes after approval.
        </p>

      </div>
    </section>
  );
}
