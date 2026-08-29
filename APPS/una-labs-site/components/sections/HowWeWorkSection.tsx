import { Badge } from '@/components/ui/Badge';

const STEPS = [
  ['01', 'Find the signal', 'We listen, ask better questions, and define the problem worth solving.'],
  ['02', 'Shape the first version', 'We turn the goal into a practical scope, experience, and next step.'],
  ['03', 'Build around reality', 'We design, test, and deliver around the people and constraints that matter.'],
  ['04', 'Stay accountable', 'We leave you with a useful product, clear handoff, and a path to improve it.'],
];

export function HowWeWorkSection() {
  return (
    <section className="bg-bg-offwhite py-20">
      <div className="mx-auto max-w-content px-6">
        <div className="max-w-2xl"><Badge variant="teal">What we sell</Badge><h2 className="mt-4 text-h2 text-tx-heading">Clarity, delivery, and the care after launch.</h2><p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">You do not need a finished brief. We help decide what matters, make the first version useful, and keep improving it with you.</p></div>
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([number, title, detail]) => <li key={number} className="rounded-[22px] border border-border bg-white p-6"><span className="text-sm font-bold text-brand-orange">{number}</span><h3 className="mt-7 text-h4 text-tx-heading">{title}</h3><p className="mt-3 text-body-sm leading-relaxed text-tx-secondary">{detail}</p></li>)}
        </ol>
      </div>
    </section>
  );
}
