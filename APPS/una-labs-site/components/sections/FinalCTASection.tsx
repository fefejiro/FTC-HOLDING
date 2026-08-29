import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function FinalCTASection() {
  return (
    <section className="bg-brand-teal-light py-24">
      <div className="max-w-content mx-auto px-6 text-center">

        <div className="mb-4 flex justify-center">
          <Badge variant="teal">Bring us the messy version</Badge>
        </div>

        <h2 className="text-display-sm text-tx-heading mb-6 max-w-tight mx-auto">
          Have a problem worth making clearer?
        </h2>

        <p className="text-body-lg text-tx-secondary mb-10 max-w-narrow mx-auto">
          Tell us what is difficult, manual, unclear, or worth improving. We will help shape the next useful step.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Button href="/start" variant="primary" size="lg">
            Start a conversation
          </Button>
          <Button href="/product" variant="secondary" size="lg">See selected work</Button>
        </div>

        <p className="mt-6 text-caption text-tx-muted">
          A rough request is enough to begin.
        </p>

      </div>
    </section>
  );
}
