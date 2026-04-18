import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { INDUSTRIES } from '@/lib/constants';

export function IndustryGrid() {
  return (
    <section className="bg-bg-offwhite py-20">
      <div className="max-w-content mx-auto px-6">

        <div className="text-center mb-12">
          <div className="mb-3 flex justify-center">
            <Badge variant="teal">Built for your work</Badge>
          </div>
          <h2 className="text-h2 text-tx-heading">Una Labs works for your team</h2>
          <p className="mt-4 text-body-lg text-tx-secondary max-w-narrow mx-auto">
            Whether you're a consulting firm, a digital agency, or an accounting practice,
            the platform adapts to how you deliver.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INDUSTRIES.map((industry) => (
            <Link
              key={industry.slug}
              href={industry.href}
              className="group bg-white border border-border rounded-xl p-8 hover:border-border-hover hover:shadow-md transition-all duration-200"
            >
              <span className="text-4xl block mb-4" aria-hidden="true">
                {industry.icon}
              </span>
              <h3 className="text-h4 text-tx-heading mb-2 group-hover:text-brand-teal transition-colors">
                {industry.title}
              </h3>
              <p className="text-body-sm text-tx-secondary leading-relaxed mb-4">
                {industry.description}
              </p>
              <span className="text-body-sm font-semibold text-brand-teal">
                Learn more →
              </span>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
