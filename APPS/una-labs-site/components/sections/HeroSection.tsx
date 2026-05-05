import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { IntakeFormCard, ProposalCard, DeliveryReportCard } from '@/components/ui/ProductMockups';

interface TrustLogo {
  src: string;
  alt: string;
  width: number;
}

interface HeroSectionProps {
  eyebrow?: string;
  headline: string;
  accentPhrase?: string;
  subheadline: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  frictionNote?: string;
  trustLogos?: TrustLogo[];
}

const MOCKUP_CARDS = [
  { label: 'Intake Form', bg: 'bg-bg-subtle', Content: IntakeFormCard },
  { label: 'Proposal', bg: 'bg-brand-teal-light', Content: ProposalCard },
  { label: 'Delivery Report', bg: 'bg-brand-orange-light', Content: DeliveryReportCard },
] as const;

export function HeroSection({
  eyebrow,
  headline,
  accentPhrase,
  subheadline,
  ctaPrimaryLabel,
  ctaPrimaryHref,
  ctaSecondaryLabel,
  ctaSecondaryHref,
  frictionNote = 'No credit card required. 14 days free.',
  trustLogos,
}: HeroSectionProps) {
  const renderHeadline = () => {
    if (!accentPhrase || !headline.includes(accentPhrase)) {
      return <h1 className="text-display text-tx-heading">{headline}</h1>;
    }
    const [before, after] = headline.split(accentPhrase);
    return (
      <h1 className="text-display text-tx-heading">
        {before}
        <span className="text-brand-orange">{accentPhrase}</span>
        {after}
      </h1>
    );
  };

  return (
    <section className="bg-white pt-16 pb-24 overflow-hidden">
      <div className="max-w-content mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: copy */}
          <div className="max-w-xl">
            {eyebrow && (
              <div className="mb-4">
                <Badge variant="teal">{eyebrow}</Badge>
              </div>
            )}

            {renderHeadline()}

            <p className="mt-6 text-body-lg text-tx-secondary leading-relaxed">
              {subheadline}
            </p>

            {trustLogos && trustLogos.length > 0 && (
              <div className="mt-6 flex items-center gap-4 flex-wrap">
                {trustLogos.map((logo) => (
                  <Image
                    key={logo.alt}
                    src={logo.src}
                    alt={logo.alt}
                    width={logo.width}
                    height={32}
                    className="opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
                  />
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button href={ctaPrimaryHref} variant="primary" size="lg">
                {ctaPrimaryLabel}
              </Button>
              <Button href={ctaSecondaryHref} variant="ghost" size="lg">
                {ctaSecondaryLabel} →
              </Button>
            </div>

            {frictionNote && (
              <p className="mt-3 text-caption text-tx-muted">{frictionNote}</p>
            )}
          </div>

          {/* Right: visual (desktop only) */}
          <div className="relative hidden lg:block" aria-hidden="true">
            {/* Organic blob */}
            <div className="absolute inset-0 -right-16 top-[-10%]">
              <div
                className="w-full h-full bg-brand-teal opacity-10"
                style={{ borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%' }}
              />
            </div>

            {/* Stacked mockup cards */}
            <div className="relative flex flex-col gap-4 pl-8">
              {MOCKUP_CARDS.map((card, i) => (
                <div
                  key={card.label}
                  className={`${card.bg} rounded-xl p-4 shadow-md border border-border`}
                  style={{ transform: `translateX(${i * 12}px)` }}
                >
                  <card.Content />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
