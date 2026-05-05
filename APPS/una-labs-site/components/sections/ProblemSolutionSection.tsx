import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

interface ProblemSolutionProps {
  eyebrow: string;
  headline: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  imagePosition: 'left' | 'right';
  imagePlaceholderLabel?: string;
  background?: 'white' | 'subtle';
  MockupComponent?: React.ComponentType;
}

export function ProblemSolutionSection({
  eyebrow,
  headline,
  body,
  bullets,
  ctaLabel,
  ctaHref,
  imagePosition,
  imagePlaceholderLabel = 'Product view',
  background = 'white',
  MockupComponent,
}: ProblemSolutionProps) {
  const bgClass = background === 'subtle' ? 'bg-bg-subtle' : 'bg-white';

  const textCol = (
    <div className="flex flex-col justify-center">
      <div className="mb-4">
        <Badge variant="teal">{eyebrow}</Badge>
      </div>
      <h2 className="text-h2 text-tx-heading mb-4">{headline}</h2>
      <p className="text-body-lg text-tx-secondary leading-relaxed mb-6">{body}</p>
      <ul className="flex flex-col gap-3 mb-8 list-none p-0 m-0">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3">
            <span className="text-brand-teal font-bold mt-0.5 flex-shrink-0" aria-hidden="true">
              ✓
            </span>
            <span className="text-body text-tx-body">{bullet}</span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-2 text-brand-teal font-semibold hover:underline underline-offset-2"
      >
        {ctaLabel} →
      </Link>
    </div>
  );

  const imageCol = MockupComponent ? (
    <div className="rounded-2xl overflow-hidden shadow-lg aspect-[4/3] flex items-center justify-center p-0">
      <MockupComponent />
    </div>
  ) : (
    <div className="rounded-2xl overflow-hidden shadow-lg bg-bg-subtle aspect-[4/3] flex items-center justify-center">
      <span className="text-body-sm text-tx-muted">{imagePlaceholderLabel}</span>
    </div>
  );

  return (
    <section className={`${bgClass} py-20`}>
      <div className="max-w-content mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {imagePosition === 'left' ? (
            <>
              {imageCol}
              {textCol}
            </>
          ) : (
            <>
              {textCol}
              {imageCol}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
