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
          Have something worth making?
        </h2>

        <p className="text-body-lg text-tx-secondary mb-10 max-w-narrow mx-auto">
          Tell us what you are trying to accomplish. We will help shape the next step.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Button href="/start" variant="primary" size="lg">
            Start Your Project
          </Button>
          <Button href="/demo" variant="secondary" size="lg">See Una Labs in action</Button>
        </div>

        <p className="mt-6 text-caption text-tx-muted">
          Start with the essentials. We will progressively add the detail we need.
        </p>

      </div>
    </section>
  );
}
