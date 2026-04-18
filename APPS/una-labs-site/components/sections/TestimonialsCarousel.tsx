'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/Badge';
import { TESTIMONIALS } from '@/lib/constants';

const INTERVAL_MS = 6000;

export function TestimonialsCarousel() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);

  const fadeTo = (idx: number) => {
    setVisible(false);
    setTimeout(() => {
      setActive(idx);
      setVisible(true);
    }, 200);
  };

  const startInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!pausedRef.current) {
        setVisible(false);
        setTimeout(() => {
          setActive((prev) => (prev + 1) % TESTIMONIALS.length);
          setVisible(true);
        }, 200);
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
    fadeTo(idx);
    startInterval();
  };

  const prev = () => goTo((active - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const next = () => goTo((active + 1) % TESTIMONIALS.length);

  const t = TESTIMONIALS[active];

  return (
    <section className="bg-white py-20">
      <div className="max-w-content mx-auto px-6">

        <div className="text-center mb-12">
          <div className="mb-3 flex justify-center">
            <Badge variant="teal">Client voices</Badge>
          </div>
          <h2 className="text-h2 text-tx-heading">What teams are saying</h2>
        </div>

        <div
          className="relative max-w-narrow mx-auto"
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
        >
          {/* Prev button */}
          <button
            onClick={prev}
            aria-label="Previous testimonial"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14 w-10 h-10 rounded-full border border-border bg-white hover:border-border-hover shadow-sm flex items-center justify-center text-tx-secondary hover:text-tx-heading transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
          >
            ←
          </button>

          {/* Card */}
          <div
            className="bg-white border border-border rounded-xl p-10 shadow-sm transition-opacity duration-200"
            style={{ opacity: visible ? 1 : 0 }}
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="flex gap-0.5 mb-6" aria-label={`Rated ${t.rating} out of 5`}>
              {Array.from({ length: t.rating }).map((_, i) => (
                <span key={i} className="text-brand-orange text-xl" aria-hidden="true">★</span>
              ))}
            </div>

            <p className="text-body-lg italic text-tx-body leading-relaxed">
              "{t.quote}"
            </p>

            <footer className="mt-8 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-bg-subtle flex-shrink-0" aria-hidden="true" />
              <div>
                <strong className="block text-body text-tx-heading">{t.author}</strong>
                <span className="text-body-sm text-tx-secondary">
                  {t.title}, {t.company}
                </span>
              </div>
            </footer>
          </div>

          {/* Next button */}
          <button
            onClick={next}
            aria-label="Next testimonial"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-14 w-10 h-10 rounded-full border border-border bg-white hover:border-border-hover shadow-sm flex items-center justify-center text-tx-secondary hover:text-tx-heading transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
          >
            →
          </button>
        </div>

        {/* Dots */}
        <div
          className="flex justify-center gap-2 mt-8"
          role="tablist"
          aria-label="Testimonial selection"
        >
          {TESTIMONIALS.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={i === active}
              aria-label={`Testimonial from ${t.author}`}
              onClick={() => goTo(i)}
              className={[
                'h-2 rounded-full transition-all duration-200',
                i === active ? 'bg-brand-teal w-6' : 'bg-border hover:bg-border-hover w-2',
              ].join(' ')}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
