'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="bg-white min-h-[60vh] flex items-center">
      <div className="max-w-content mx-auto px-6 py-24 text-center">
        <p className="text-eyebrow uppercase text-brand-teal tracking-widest mb-4">Something went wrong</p>
        <h1 className="text-display-sm text-tx-heading mb-4">An unexpected error occurred</h1>
        <p className="text-body-lg text-tx-secondary mb-10 max-w-narrow mx-auto">
          We hit a snag on our end. You can try again or head back to the homepage.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button onClick={reset} variant="primary" size="lg">Try again</Button>
          <Button href="/" variant="secondary" size="lg">Back to homepage</Button>
        </div>
      </div>
    </section>
  );
}
