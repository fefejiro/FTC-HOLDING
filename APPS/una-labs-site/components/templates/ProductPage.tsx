import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FinalCTASection } from '@/components/sections/FinalCTASection';

interface KeyFeature {
  icon: string;
  title: string;
  description: string;
}

interface ProductPageProps {
  featureTitle: string;
  eyebrow: string;
  headline: string;
  accentPhrase?: string;
  subheadline: string;
  problemStatement: string;
  solutionBody: string;
  keyFeatures: KeyFeature[];
  testimonialQuote: string;
  testimonialAuthor: string;
  testimonialTitle: string;
  testimonialCompany: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
}

function renderHeadline(headline: string, accentPhrase?: string) {
  if (!accentPhrase || !headline.includes(accentPhrase)) {
    return <h1 className="text-display text-tx-heading mt-4 mb-6">{headline}</h1>;
  }
  const [before, after] = headline.split(accentPhrase);
  return (
    <h1 className="text-display text-tx-heading mt-4 mb-6">
      {before}
      <span className="text-brand-orange">{accentPhrase}</span>
      {after}
    </h1>
  );
}

export function ProductPage({
  eyebrow,
  headline,
  accentPhrase,
  subheadline,
  problemStatement,
  solutionBody,
  keyFeatures,
  testimonialQuote,
  testimonialAuthor,
  testimonialTitle,
  testimonialCompany,
  ctaPrimaryLabel,
  ctaPrimaryHref,
}: ProductPageProps) {
  return (
    <>
      {/* Hero — centered, no right column */}
      <section className="bg-white pt-16 pb-20 text-center">
        <div className="max-w-narrow mx-auto px-6">
          <div className="flex justify-center mb-2">
            <Badge variant="teal">{eyebrow}</Badge>
          </div>
          {renderHeadline(headline, accentPhrase)}
          <p className="text-body-lg text-tx-secondary leading-relaxed mb-8">
            {subheadline}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button href={ctaPrimaryHref} variant="primary" size="lg">
              {ctaPrimaryLabel}
            </Button>
            <Button href="/how-it-works" variant="ghost" size="lg">
              See how it works {'->'}
            </Button>
          </div>
          <p className="mt-3 text-caption text-tx-muted">
            Service-led onboarding. Activation opens the workspace and scoped plan.
          </p>
        </div>
      </section>

      {/* Problem + Solution */}
      <section className="bg-bg-subtle py-16">
        <div className="max-w-narrow mx-auto px-6 text-center">
          <div className="flex justify-center mb-4">
            <Badge variant="muted">The problem</Badge>
          </div>
          <p className="text-body-lg text-tx-body leading-relaxed mb-10">
            {problemStatement}
          </p>
          <div className="flex justify-center mb-4">
            <Badge variant="teal">The fix</Badge>
          </div>
          <p className="text-body-lg text-tx-secondary leading-relaxed">
            {solutionBody}
          </p>
        </div>
      </section>

      {/* Key features */}
      <section className="bg-white py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {keyFeatures.map((f) => (
              <div
                key={f.title}
                className="bg-bg-subtle border border-border rounded-xl p-8"
              >
                <span className="text-4xl block mb-4" aria-hidden="true">
                  {f.icon}
                </span>
                <h3 className="text-h4 text-tx-heading mb-2">{f.title}</h3>
                <p className="text-body-sm text-tx-secondary leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-bg-subtle py-20">
        <div className="max-w-narrow mx-auto px-6">
          <blockquote className="bg-white border-l-4 border-brand-teal rounded-xl p-8 shadow-md">
            <p className="text-body-lg text-tx-body italic leading-relaxed">
              &ldquo;{testimonialQuote}&rdquo;
            </p>
            <footer className="mt-6 flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-full bg-bg-subtle flex-shrink-0"
                aria-hidden="true"
              />
              <div>
                <strong className="block text-body text-tx-heading">
                  {testimonialAuthor}
                </strong>
                <span className="text-body-sm text-tx-secondary">
                  {testimonialTitle}, {testimonialCompany}
                </span>
              </div>
            </footer>
          </blockquote>
        </div>
      </section>

      <FinalCTASection />
    </>
  );
}
