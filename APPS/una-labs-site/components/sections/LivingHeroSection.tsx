'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const STATES = [
  { label: 'Request arrives', detail: 'A rough idea lands in plain language.', value: '01' },
  { label: 'Scope forms', detail: 'The useful questions become a clear direction.', value: '02' },
  { label: 'Work progresses', detail: 'Milestones turn the plan into visible movement.', value: '03' },
  { label: 'Proof completes', detail: 'The handoff leaves a record people can use.', value: '04' },
];

export function LivingHeroSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % STATES.length), 3200);
    return () => window.clearInterval(timer);
  }, []);

  const state = STATES[active];
  return (
    <section className="overflow-hidden bg-white pt-14 pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto grid max-w-content items-center gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="max-w-xl">
          <Badge variant="teal">Una Labs · FTC product lab</Badge>
          <h1 className="mt-5 text-display text-tx-heading">Bring us the messy version.</h1>
          <p className="mt-6 max-w-lg text-body-lg leading-relaxed text-tx-secondary">
            AI can help make something. We help decide what should be made, build it around real constraints, and stay accountable for whether it becomes useful.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/start" variant="primary" size="lg">Start a conversation</Button>
            <Button href="/product" variant="ghost" size="lg">See selected work →</Button>
          </div>
          <p className="mt-4 text-caption text-tx-muted">A rough request is enough to begin.</p>
        </div>

        <div className="relative min-h-[340px] rounded-[32px] border border-border bg-bg-offwhite p-5 shadow-sm sm:p-8" aria-label="Una Labs delivery journey">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-teal/10 motion-safe:animate-pulse" aria-hidden="true" />
          <div className="relative rounded-[24px] bg-[#0f1117] p-5 text-white shadow-xl sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="text-xs font-semibold tracking-[0.18em] text-white/50">UNA LABS / DELIVERY PATH</span>
              <span className="rounded-full bg-[#4DB8A8]/20 px-3 py-1 text-xs font-semibold text-[#75d7c7]">{state.label}</span>
            </div>
            <div className="py-9">
              <div className="flex items-center gap-3" aria-hidden="true">
                {STATES.map((item, index) => (
                  <div key={item.value} className="flex flex-1 items-center gap-3">
                    <button type="button" aria-label={`Show ${item.label}`} onClick={() => setActive(index)} className={["h-11 w-11 shrink-0 rounded-2xl border text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75d7c7]", index <= active ? 'border-[#4DB8A8] bg-[#4DB8A8] text-[#0f1117]' : 'border-white/15 bg-white/5 text-white/40'].join(' ')}>{item.value}</button>
                    {index < STATES.length - 1 && <div className={["h-px flex-1 transition-colors duration-700", index < active ? 'bg-[#4DB8A8]' : 'bg-white/10'].join(' ')} />}
                  </div>
                ))}
              </div>
              <div className="mt-8 min-h-[80px] transition-opacity duration-500 motion-reduce:transition-none">
                <p className="text-2xl font-semibold tracking-tight">{state.label}</p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/55">{state.detail}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/40">
              <span>From problem to product</span><span className="text-[#75d7c7]">Clarity before momentum</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
