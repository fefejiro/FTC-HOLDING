'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/Badge';
import { FEATURES } from '@/lib/constants';

const INTERVAL_MS = 4500;

export function FeatureCarousel() {
  const [active, setActive] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);

  const startInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!pausedRef.current) {
        setActive((prev) => (prev + 1) % FEATURES.length);
      }
    }, INTERVAL_MS);
  };

  useEffect(() => {
    startInterval();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const goTo = (idx: number) => {
    setActive(idx);
    startInterval();
  };

  return (
    <section className="bg-bg-offwhite py-20">
      <div className="max-w-content mx-auto px-6">

        <div className="text-center mb-12">
          <div className="mb-3 flex justify-center">
            <Badge variant="teal">What gets handled</Badge>
          </div>
          <h2 className="text-h2 text-tx-heading">
            From rough request to paid delivery — all of it.
          </h2>
        </div>

        {/* Card grid */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
        >
          {FEATURES.map((feature, i) => (
            <button
              key={feature.id}
              onClick={() => goTo(i)}
              aria-pressed={i === active}
              className={[
                'text-left p-6 rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2',
                i === active
                  ? 'border-brand-teal bg-white shadow-teal shadow-md'
                  : 'border-border bg-white hover:border-border-hover hover:shadow-sm',
              ].join(' ')}
            >
              <span className="text-3xl block mb-3" aria-hidden="true">
                {feature.icon}
              </span>
              <strong className="block text-h4 text-tx-heading mb-1">
                {feature.label}
              </strong>
              <p className="text-body-sm text-tx-secondary leading-snug">
                {feature.benefit}
              </p>
            </button>
          ))}
        </div>

        {/* Dot navigation */}
        <div
          className="flex justify-center gap-2"
          role="tablist"
          aria-label="Feature selection"
        >
          {FEATURES.map((feature, i) => (
            <button
              key={feature.id}
              role="tab"
              aria-selected={i === active}
              aria-label={feature.label}
              onClick={() => goTo(i)}
              className={[
                'h-2 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2',
                i === active
                  ? 'bg-brand-teal w-6'
                  : 'bg-border hover:bg-border-hover w-2',
              ].join(' ')}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
