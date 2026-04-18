import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Una Labs',
  description: 'Privacy policy for Una Labs.',
};

export default function PrivacyPage() {
  return (
    <section className="bg-white pt-16 pb-24">
      <div className="max-w-narrow mx-auto px-6">
        <h1 className="text-h2 text-tx-heading mb-2">Privacy Policy</h1>
        <p className="text-body-sm text-tx-muted mb-10">Last updated: April 2026</p>
        <div className="flex flex-col gap-8 text-body text-tx-body leading-relaxed">
          <div>
            <h2 className="text-h4 text-tx-heading mb-2">Data we collect</h2>
            <p>We collect information you provide when using Una Labs, including name, email, and project details. We use this to deliver our service and communicate with you.</p>
          </div>
          <div>
            <h2 className="text-h4 text-tx-heading mb-2">How we use your data</h2>
            <p>Your data is used to operate the platform, respond to requests, and improve our service. We do not sell your data to third parties.</p>
          </div>
          <div>
            <h2 className="text-h4 text-tx-heading mb-2">Data security</h2>
            <p>All data is encrypted in transit and at rest. We use industry-standard security practices and conduct regular security reviews.</p>
          </div>
          <div>
            <h2 className="text-h4 text-tx-heading mb-2">Contact</h2>
            <p>For privacy questions, contact us at <a href="mailto:privacy@unalabs.cloud" className="text-brand-teal hover:underline">privacy@unalabs.cloud</a>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
