import { Badge } from '@/components/ui/Badge';
import { PROOF_METRICS, TESTIMONIALS } from '@/lib/constants';

export function SocialProofSection() {
  const t = TESTIMONIALS[0];

  return (
    <section className="bg-bg-subtle py-20">
      <div className="max-w-content mx-auto px-6">

        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <Badge variant="teal">Trusted outcomes</Badge>
          </div>
          <h2 className="text-h2 text-tx-heading">
            Results teams can show their clients
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 mb-12">
          {PROOF_METRICS.map((metric) => (
            <div
              key={metric.label}
              className="bg-white border border-border rounded-xl p-8 shadow-sm"
            >
              <span className="block text-5xl font-bold text-brand-orange leading-none">
                {metric.value}
              </span>
              <strong className="block mt-3 text-h4 text-tx-heading">{metric.label}</strong>
              <p className="mt-1 text-body-sm text-tx-secondary">{metric.note}</p>
            </div>
          ))}
        </div>

        <div className="max-w-narrow mx-auto">
          <blockquote className="bg-white border-l-4 border-brand-teal rounded-xl p-8 shadow-md">
            <p className="text-body-lg text-tx-body italic leading-relaxed">
              "{t.quote}"
            </p>
            <footer className="mt-6 flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-full bg-bg-subtle flex-shrink-0"
                aria-hidden="true"
              />
              <div>
                <strong className="block text-body text-tx-heading">{t.author}</strong>
                <span className="text-body-sm text-tx-secondary">
                  {t.title}, {t.company}
                </span>
              </div>
            </footer>
          </blockquote>
        </div>

      </div>
    </section>
  );
}
