import { Badge } from '@/components/ui/Badge';

const STEPS = [
  ['01', 'Tell us the outcome', 'A short conversation is enough to begin.'],
  ['02', 'Shape the right first version', 'We turn the goal into a practical scope and next step.'],
  ['03', 'Build in the open', 'You can see progress, decisions, and what needs your input.'],
  ['04', 'Leave with something useful', 'The work ends in a product, handoff, and proof—not a mystery.'],
];

export function HowWeWorkSection() {
  return (
    <section className="bg-bg-offwhite py-20">
      <div className="mx-auto max-w-content px-6">
        <div className="max-w-2xl"><Badge variant="teal">How working with us feels</Badge><h2 className="mt-4 text-h2 text-tx-heading">Clear enough to move. Flexible enough to fit.</h2><p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">You do not need to know the answer before you start. We help find the useful version with you.</p></div>
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([number, title, detail]) => <li key={number} className="rounded-[22px] border border-border bg-white p-6"><span className="text-sm font-bold text-brand-orange">{number}</span><h3 className="mt-7 text-h4 text-tx-heading">{title}</h3><p className="mt-3 text-body-sm leading-relaxed text-tx-secondary">{detail}</p></li>)}
        </ol>
      </div>
    </section>
  );
}
