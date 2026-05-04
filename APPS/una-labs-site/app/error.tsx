'use client';

import { Button } from '@/components/ui/Button';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="bg-white min-h-[60vh] flex items-center">
      <div className="max-w-content mx-auto px-6 py-24 text-center">
        <p className="text-eyebrow uppercase text-brand-teal tracking-widest mb-4">Error</p>
        <h1 className="text-display-sm text-tx-heading mb-4">Something went wrong</h1>
        <p className="text-body-lg text-tx-secondary mb-10 max-w-narrow mx-auto">
          An unexpected error occurred. You can try again or head back to your dashboard.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="primary" size="lg" onClick={reset}>
            Try again
          </Button>
          <Button href="/dashboard" variant="secondary" size="lg">
            Back to dashboard
          </Button>
        </div>
      </div>
    </section>
  );
}
