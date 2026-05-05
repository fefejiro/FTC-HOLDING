'use client';

export const STAGE_RAIL: Array<{ id: string; label: string }> = [
  { id: 'intake', label: 'Intake' },
  { id: 'scoped', label: 'Scoping' },
  { id: 'awaiting_approval', label: 'Approval' },
  { id: 'active', label: 'Delivery' },
  { id: 'review', label: 'Client review' },
  { id: 'complete', label: 'Complete' },
  { id: 'support', label: 'Support' },
];

export function normalizeStageId(status?: string): string {
  const current = (status ?? '').toLowerCase();
  if (!current) return 'intake';
  if (current.includes('awaiting') || current.includes('pause')) return 'awaiting_approval';
  if (current.includes('review')) return 'review';
  if (current.includes('complete') || current.includes('done') || current.includes('delivered')) return 'complete';
  if (current.includes('active') || current.includes('progress') || current.includes('build')) return 'active';
  if (current.includes('scope')) return 'scoped';
  if (current.includes('support')) return 'support';
  return 'intake';
}

export function StageRail({ status }: { status?: string }) {
  const stageId = normalizeStageId(status);
  const stageIndex = STAGE_RAIL.findIndex((stage) => stage.id === stageId);

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {STAGE_RAIL.map((stage, index) => {
        const active = index === stageIndex;
        const done = index < stageIndex;
        return (
          <div key={stage.id} className="rounded-xl border border-border px-3 py-3 bg-bg-subtle">
            <p className={`text-[11px] font-bold uppercase tracking-wider ${active ? 'text-brand-teal' : done ? 'text-tx-heading' : 'text-tx-muted'}`}>
              {done ? 'Done' : active ? 'Current' : 'Upcoming'}
            </p>
            <p className={`mt-1 text-body-sm font-semibold ${active ? 'text-brand-teal' : 'text-tx-heading'}`}>
              {stage.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function ProjectClarityCards({
  whereLabel,
  whatIsNext,
  blockersCount,
  confidenceLabel,
}: {
  whereLabel: string;
  whatIsNext: string;
  blockersCount: number;
  confidenceLabel: string;
}) {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-4">
      <div className="rounded-xl border border-border bg-bg-subtle p-4">
        <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Where are we</p>
        <p className="mt-1 text-body font-semibold text-tx-heading">{whereLabel}</p>
      </div>
      <div className="rounded-xl border border-border bg-bg-subtle p-4">
        <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">What is next</p>
        <p className="mt-1 text-body font-semibold text-tx-heading">{whatIsNext}</p>
      </div>
      <div className="rounded-xl border border-border bg-bg-subtle p-4">
        <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">What is blocked</p>
        <p className="mt-1 text-body font-semibold text-tx-heading">
          {blockersCount} client action{blockersCount === 1 ? '' : 's'}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-bg-subtle p-4">
        <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold">Confidence</p>
        <p className="mt-1 text-body font-semibold text-tx-heading">{confidenceLabel}</p>
      </div>
    </div>
  );
}

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h2 className="text-h4 text-tx-heading font-semibold mb-4">{title}</h2>
      {children}
    </section>
  );
}
