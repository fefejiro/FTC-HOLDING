import type { Metadata } from 'next';
import { CoachingBookingForm } from '@/components/CoachingBookingForm';

export const metadata: Metadata = {
  title: 'One-to-one AI coaching',
  description: 'Book a practical 60-minute AI coaching session with Una Labs.',
};

export default function LearnPage() {
  return (
    <section className="bg-bg-offwhite py-14 sm:py-20">
      <div className="mx-auto grid max-w-content gap-10 px-6 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
        <div className="max-w-lg">
          <p className="text-eyebrow uppercase tracking-[0.16em] text-brand-teal">Una Labs learning</p>
          <h1 className="mt-4 text-display text-tx-heading">Practical AI coaching for beginners.</h1>
          <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">A focused, one-to-one session for the real work in front of you. You do not need a technical background or a polished idea.</p>
          <dl className="mt-10 space-y-5 border-y border-border py-7">
            <div><dt className="text-caption font-semibold uppercase tracking-wider text-tx-muted">In the session</dt><dd className="mt-1 text-body text-tx-heading">Bring a goal, a stuck point, or a messy workflow. We will make it more useful together.</dd></div>
            <div><dt className="text-caption font-semibold uppercase tracking-wider text-tx-muted">What you leave with</dt><dd className="mt-1 text-body text-tx-heading">A working next step, clear notes, and confidence to continue on your own.</dd></div>
            <div><dt className="text-caption font-semibold uppercase tracking-wider text-tx-muted">Investment</dt><dd className="mt-1 text-body font-semibold text-tx-heading">CAD $149 for 60 minutes, paid securely through Stripe.</dd></div>
          </dl>
        </div>
        <CoachingBookingForm />
      </div>
    </section>
  );
}
