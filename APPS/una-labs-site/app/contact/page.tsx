'use client';

import { Badge } from '@/components/ui/Badge';

export default function ContactPage() {
  return (
    <section className="bg-white pt-16 pb-24">
      <div className="max-w-tight mx-auto px-6">
        <div className="mb-6 flex justify-center">
          <Badge variant="teal">Get in touch</Badge>
        </div>
        <h1 className="text-display-sm text-tx-heading text-center mb-4">Contact Una Labs</h1>
        <p className="text-body-lg text-tx-secondary text-center mb-10">
          Questions about pricing, enterprise plans, or partnerships? We respond within one business day.
        </p>

        <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="contact-name" className="block text-body font-medium text-tx-heading mb-1">Name</label>
            <input id="contact-name" type="text" required placeholder="Your name"
              className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-body font-medium text-tx-heading mb-1">Email</label>
            <input id="contact-email" type="email" required placeholder="you@company.com"
              className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label htmlFor="contact-message" className="block text-body font-medium text-tx-heading mb-1">Message</label>
            <textarea id="contact-message" rows={5} required placeholder="How can we help?"
              className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus resize-none" />
          </div>
          <button type="submit"
            className="w-full px-8 py-4 bg-brand-orange text-white font-semibold rounded-lg hover:bg-brand-orange-hover transition-all shadow-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2">
            Send message
          </button>
        </form>
      </div>
    </section>
  );
}
