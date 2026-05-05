import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <section className="bg-white min-h-[60vh] flex items-center">
      <div className="max-w-content mx-auto px-6 py-24 text-center">
        <p className="text-eyebrow uppercase text-brand-teal tracking-widest mb-4">404</p>
        <h1 className="text-display-sm text-tx-heading mb-4">Page not found</h1>
        <p className="text-body-lg text-tx-secondary mb-10 max-w-narrow mx-auto">
          This page does not exist yet. Head back to the homepage or explore what&apos;s ready.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button href="/" variant="primary" size="lg">Back to homepage</Button>
          <Button href="/how-it-works" variant="secondary" size="lg">How It Works</Button>
        </div>
      </div>
    </section>
  );
}
