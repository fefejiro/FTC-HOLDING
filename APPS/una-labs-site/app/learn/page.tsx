import type { Metadata } from 'next';
import { CoachingBookingForm } from '@/components/CoachingBookingForm';

export const metadata: Metadata = {
  title: 'Practical AI learning for your real work',
  description: 'Build a practical AI learning plan around your own goals, work, ideas, or problems with Una Labs.',
};

export default function LearnPage() {
  return (
    <section className="bg-bg-offwhite py-14 sm:py-20">
      <div className="mx-auto grid max-w-content gap-10 px-6 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
        <div className="max-w-lg">
          <p className="text-eyebrow uppercase tracking-[0.16em] text-brand-teal">Una Labs learning</p>
          <h1 className="mt-4 text-display text-tx-heading">Learn to use AI for the work and problems that matter to you.</h1>
          <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">Personalized, practical guidance for any experience level. Bring a goal, question, task, or difficult workflow, and learn how to explore it, solve it, and continue confidently on your own.</p>
          <dl className="mt-10 space-y-5 border-y border-border py-7">
            <div><dt className="text-caption font-semibold uppercase tracking-wider text-tx-muted">In the session</dt><dd className="mt-1 text-body text-tx-heading">Bring a goal, a stuck point, or a messy workflow. We will frame the problem, choose a useful approach, and work through it together.</dd></div>
            <div><dt className="text-caption font-semibold uppercase tracking-wider text-tx-muted">What you leave with</dt><dd className="mt-1 text-body text-tx-heading">More than a one-off answer: a repeatable process, clear notes, and confidence to approach the next problem yourself.</dd></div>
            <div><dt className="text-caption font-semibold uppercase tracking-wider text-tx-muted">Investment</dt><dd className="mt-1 text-body font-semibold text-tx-heading">CAD $149 for 60 minutes, paid securely through Stripe.</dd></div>
          </dl>
        </div>
        <CoachingBookingForm />
      </div>
    </section>
  );
}
