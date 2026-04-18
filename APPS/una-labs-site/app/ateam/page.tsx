import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';

const CAPABILITIES = [
  'Reads new intake context and turns it into operationally useful project structure.',
  'Supports milestone tracking, approvals, and delivery state behind the scenes.',
  'Helps power follow-through after checkout instead of leaving activation as a dead end.',
  'Acts as internal operating leverage, not a customer product.',
];

export const metadata: Metadata = {
  title: 'ATEAM',
  description:
    'ATEAM is the internal orchestration layer behind Una Labs. It is not a customer product.',
};

export default function AteamPage() {
  return (
    <section className="bg-white">
      <div className="max-w-narrow mx-auto px-6 pt-16 pb-24">
        <div className="text-center">
          <Badge variant="muted">Internal system</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">ATEAM is the engine room behind Una Labs</h1>
          <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
            ATEAM is the internal orchestration layer used to support intake processing, workflow state,
            approvals, and the operational follow-through behind the public Una Labs experience.
          </p>
        </div>

        <div className="mt-12 rounded-[28px] border border-border bg-bg-offwhite p-8 shadow-sm">
          <p className="text-body font-semibold text-tx-heading">What it does</p>
          <ul className="mt-6 space-y-4">
            {CAPABILITIES.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 text-brand-teal">✦</span>
                <span className="text-body text-tx-body">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 text-center text-body-sm leading-relaxed text-tx-secondary">
          ATEAM is not sold as a standalone customer product. If you are a technical partner or investor
          and need context, email <a href="mailto:hello@unalabs.cloud" className="text-brand-teal hover:underline">hello@unalabs.cloud</a>.
        </p>
      </div>
    </section>
  );
}
