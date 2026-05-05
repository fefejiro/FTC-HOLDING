import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Una Labs',
  description: 'Terms of service for Una Labs.',
};

export default function TermsPage() {
  return (
    <section className="bg-white pt-16 pb-24">
      <div className="max-w-narrow mx-auto px-6">
        <h1 className="text-h2 text-tx-heading mb-2">Terms of Service</h1>
        <p className="text-body-sm text-tx-muted mb-10">Last updated: April 2026</p>
        <div className="flex flex-col gap-8 text-body text-tx-body leading-relaxed">
          <div>
            <h2 className="text-h4 text-tx-heading mb-2">Use of service</h2>
            <p>By using Una Labs, you agree to use the platform for lawful purposes only. You are responsible for the content you submit through our intake system.</p>
          </div>
          <div>
            <h2 className="text-h4 text-tx-heading mb-2">Payments</h2>
            <p>Deposits collected upon proposal acceptance are non-refundable once work begins. Disputes must be raised within 7 days of delivery.</p>
          </div>
          <div>
            <h2 className="text-h4 text-tx-heading mb-2">Intellectual property</h2>
            <p>All deliverables become your property upon final payment and sign-off. Una Labs retains no rights to client work.</p>
          </div>
          <div>
            <h2 className="text-h4 text-tx-heading mb-2">Contact</h2>
            <p>Questions about these terms: <a href="mailto:legal@unalabs.cloud" className="text-brand-teal hover:underline">legal@unalabs.cloud</a></p>
          </div>
        </div>
      </div>
    </section>
  );
}
