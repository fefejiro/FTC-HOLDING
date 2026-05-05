
// Premium CSS product mockups — used wherever real screenshots are not yet available.
// Each mockup simulates a real Una Labs UI screen using Tailwind + inline styles only.

function BrowserChrome({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-border rounded-t-xl">
      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      <div className="ml-3 flex-1 bg-bg-subtle rounded-md px-3 py-1 text-[10px] text-tx-muted truncate">
        {title}
      </div>
    </div>
  );
}

// ── Dashboard mockup (Visibility problem) ──────────────────────────────────
export function DashboardMockup() {
  const projects = [
    { name: 'Client Intake Refresh', pct: 78, status: 'On Track', color: 'bg-brand-teal' },
    { name: 'Q2 Reporting Automation', pct: 45, status: 'In Progress', color: 'bg-brand-orange' },
    { name: 'Onboarding Flow Redesign', pct: 92, status: 'Review', color: 'bg-[#8B5CF6]' },
    { name: 'API Integration Scoping', pct: 20, status: 'Starting', color: 'bg-[#6B7280]' },
  ];

  return (
    <div className="rounded-xl overflow-hidden shadow-lg border border-border bg-white w-full h-full">
      <BrowserChrome title="dashboard.unalabs.cloud" />
      <div className="p-4 bg-bg-offwhite">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-semibold text-tx-heading">Project Dashboard</p>
            <p className="text-[9px] text-tx-muted">4 active engagements</p>
          </div>
          <div className="flex gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-brand-teal-light text-brand-teal text-[8px] font-semibold">All</span>
            <span className="px-2 py-0.5 rounded-full bg-white border border-border text-tx-muted text-[8px]">Active</span>
          </div>
        </div>
        {/* Project rows */}
        <div className="flex flex-col gap-2">
          {projects.map((p) => (
            <div key={p.name} className="bg-white rounded-lg px-3 py-2 border border-border">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-medium text-tx-heading truncate mr-2">{p.name}</p>
                <span
                  className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                    p.status === 'On Track'
                      ? 'bg-brand-teal-light text-brand-teal'
                      : p.status === 'In Progress'
                      ? 'bg-brand-orange-light text-brand-orange'
                      : p.status === 'Review'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-bg-subtle text-tx-muted'
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                  <div className={`h-full ${p.color} rounded-full`} style={{ width: `${p.pct}%` }} />
                </div>
                <p className="text-[8px] text-tx-muted w-6 text-right">{p.pct}%</p>
              </div>
            </div>
          ))}
        </div>
        {/* Footer bar */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[8px] text-tx-muted">Last updated 2 min ago</p>
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <div key={n} className="w-5 h-5 rounded-full bg-bg-subtle border border-border flex items-center justify-center">
                <span className="text-[6px] text-tx-muted font-semibold">{['SC', 'JP', 'PN'][n - 1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Report mockup (Reporting problem) ─────────────────────────────────────
export function ReportMockup() {
  const bars = [65, 82, 54, 90, 71, 88];
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  return (
    <div className="rounded-xl overflow-hidden shadow-lg border border-border bg-white w-full h-full">
      <BrowserChrome title="reports.unalabs.cloud — Q1 2026" />
      <div className="p-4 bg-bg-offwhite">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-semibold text-tx-heading">Impact Report — Q1 2026</p>
            <p className="text-[9px] text-tx-muted flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-teal" />
              Auto-generated · Client workspace
            </p>
          </div>
          <span className="px-2 py-0.5 bg-brand-teal-light text-brand-teal text-[8px] font-semibold rounded-full">
            Sent ✓
          </span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Revenue Impact', value: '$148K', change: '+23%' },
            { label: 'Hours Saved', value: '312h', change: '+41%' },
            { label: 'NPS Score', value: '74', change: '+8pts' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-lg p-2 border border-border text-center">
              <p className="text-[11px] font-bold text-tx-heading">{kpi.value}</p>
              <p className="text-[8px] text-tx-muted leading-tight">{kpi.label}</p>
              <p className="text-[8px] text-brand-teal font-semibold mt-0.5">{kpi.change}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-lg p-3 border border-border">
          <p className="text-[9px] font-medium text-tx-heading mb-2">Delivery score trend</p>
          <div className="flex items-end gap-1.5 h-14">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${(h / 100) * 48}px`,
                    background: i === bars.length - 1 ? 'var(--color-brand-teal)' : '#D1F0EC',
                  }}
                />
                <p className="text-[7px] text-tx-muted">{months[i]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Handoff / sign-off mockup (Handoff problem) ────────────────────────────
export function HandoffMockup() {
  const items = [
    'Scope documented and approved',
    'Deliverables transferred',
    'Access credentials handed over',
    'Client sign-off recorded',
    'Completion timestamp locked',
  ];

  return (
    <div className="rounded-xl overflow-hidden shadow-lg border border-border bg-white w-full h-full">
      <BrowserChrome title="handoff.unalabs.cloud" />
      <div className="p-4 bg-bg-offwhite">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-brand-teal-light flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="#4DB8A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-tx-heading">Project Sign-Off</p>
            <p className="text-[9px] text-tx-muted">Client Intake Refresh · Client workspace</p>
          </div>
        </div>

        {/* Checklist */}
        <div className="flex flex-col gap-1.5 mb-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-border">
              <div className="w-4 h-4 rounded-full bg-brand-teal-light flex items-center justify-center flex-shrink-0">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4.5L3 6L6.5 2" stroke="#4DB8A8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-[9px] text-tx-body">{item}</p>
            </div>
          ))}
        </div>

        {/* Approval stamp */}
        <div className="bg-white rounded-lg p-3 border border-border flex items-center justify-between">
          <div>
            <p className="text-[9px] font-semibold text-tx-heading">Client approver</p>
            <p className="text-[8px] text-tx-muted">Approved · Apr 14, 2026 · 3:22 PM</p>
          </div>
          <div className="px-2.5 py-1 rounded-full border-2 border-brand-teal text-brand-teal text-[9px] font-bold uppercase tracking-wider">
            Approved
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hero card content: Intake Form ─────────────────────────────────────────
export function IntakeFormCard() {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="h-1 flex-1 rounded-full bg-brand-teal" />
        <div className="h-1 flex-1 rounded-full bg-brand-teal opacity-40" />
        <div className="h-1 flex-1 rounded-full bg-brand-teal opacity-20" />
        <p className="text-[9px] text-tx-muted ml-1">Step 1 of 3</p>
      </div>
      {[
        { label: 'Your name', value: 'Client lead' },
        { label: 'Work email', value: 'client@company.com' },
      ].map((f) => (
        <div key={f.label}>
          <p className="text-[9px] text-tx-muted mb-0.5">{f.label}</p>
          <div className="bg-white rounded border border-border px-2 py-1.5">
            <p className="text-[10px] text-tx-heading">{f.value}</p>
          </div>
        </div>
      ))}
      <div>
        <p className="text-[9px] text-tx-muted mb-0.5">Project description</p>
        <div className="bg-white rounded border border-brand-teal px-2 py-1.5 h-10">
          <p className="text-[9px] text-tx-body leading-tight">We need to redesign our onboarding flow for enterprise clients...</p>
        </div>
      </div>
      <div className="h-7 rounded-md bg-brand-orange flex items-center justify-center">
        <p className="text-white text-[9px] font-semibold">Submit Request →</p>
      </div>
    </div>
  );
}

// ── Hero card content: Proposal ────────────────────────────────────────────
export function ProposalCard() {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold text-tx-heading">Scoped Proposal</p>
        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-brand-teal-light text-brand-teal font-semibold">Ready</span>
      </div>
      <p className="text-[9px] text-tx-muted">Client Intake Refresh · Client workspace</p>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: 'Scope', val: '4 deliverables' },
          { label: 'Timeline', val: '3 weeks' },
          { label: 'Revisions', val: '2 rounds' },
          { label: 'Format', val: 'Fixed fee' },
        ].map((r) => (
          <div key={r.label} className="bg-white rounded p-1.5 border border-border">
            <p className="text-[8px] text-tx-muted">{r.label}</p>
            <p className="text-[9px] font-semibold text-tx-heading">{r.val}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-border">
        <div>
          <p className="text-[8px] text-tx-muted">Investment</p>
          <p className="text-[13px] font-bold text-tx-heading">$12,500</p>
        </div>
        <div className="h-6 px-3 rounded-md bg-brand-teal flex items-center">
          <p className="text-white text-[9px] font-semibold">Accept →</p>
        </div>
      </div>
    </div>
  );
}

// ── Hero card content: Delivery Report ─────────────────────────────────────
export function DeliveryReportCard() {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded-full bg-brand-teal-light flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5.5L4 7.5L8.5 3" stroke="#4DB8A8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-[10px] font-semibold text-tx-heading">Delivery Report</p>
        <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded-full bg-brand-teal-light text-brand-teal font-semibold">Complete</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[
          { val: '8', sub: 'Deliverables' },
          { val: '21d', sub: 'On schedule' },
          { val: '100%', sub: 'Documented' },
        ].map((m) => (
          <div key={m.sub} className="bg-white rounded p-1.5 border border-border text-center">
            <p className="text-[11px] font-bold text-brand-teal">{m.val}</p>
            <p className="text-[7px] text-tx-muted">{m.sub}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg p-2 border border-border">
        <p className="text-[8px] text-tx-muted mb-1">Output timeline</p>
        <div className="flex items-end gap-1 h-8">
          {[30, 55, 40, 70, 60, 90, 75].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{ height: `${(h / 100) * 28}px`, background: i === 6 ? 'var(--color-brand-teal)' : '#D1F0EC' }}
            />
          ))}
        </div>
      </div>
      <div className="h-6 rounded-md border border-brand-teal flex items-center justify-center gap-1.5">
        <p className="text-brand-teal text-[9px] font-semibold">Download handoff package</p>
      </div>
    </div>
  );
}

// ── Step Panel: Request (full-size intake screen) ──────────────────────────
export function StepRequestMockup() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-xl border border-border bg-white w-full">
      <BrowserChrome title="app.unalabs.cloud/request" />
      <div className="p-6 bg-bg-offwhite min-h-[360px]">
        <div className="max-w-md mx-auto">
          <div className="mb-5 text-center">
            <p className="text-[13px] font-bold text-tx-heading">Start a new request</p>
            <p className="text-[10px] text-tx-muted mt-0.5">Rough is fine — we do the structuring</p>
          </div>
          <div className="flex items-center gap-2 mb-5">
            {['Request', 'Scope', 'Proposal', 'Delivery'].map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${i === 0 ? 'bg-brand-teal text-white' : 'bg-bg-subtle border border-border text-tx-muted'}`}>
                  {i + 1}
                </div>
                <p className={`text-[9px] font-medium hidden sm:block ${i === 0 ? 'text-brand-teal' : 'text-tx-muted'}`}>{s}</p>
                {i < 3 && <div className="flex-1 h-px bg-border" />}
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl p-5 border border-border shadow-sm space-y-3">
            {[{ label: 'Your name', val: 'Client lead' }, { label: 'Work email', val: 'client@company.com' }, { label: 'Company', val: 'Client workspace' }].map(f => (
              <div key={f.label}>
                <p className="text-[9px] text-tx-muted mb-0.5 font-medium">{f.label}</p>
                <div className="border border-border rounded-md px-3 py-2 bg-white">
                  <p className="text-[10px] text-tx-heading">{f.val}</p>
                </div>
              </div>
            ))}
            <div>
              <p className="text-[9px] text-tx-muted mb-0.5 font-medium">Describe your project</p>
              <div className="border-2 border-brand-teal rounded-md px-3 py-2 bg-white min-h-[52px]">
                <p className="text-[10px] text-tx-body leading-snug">We need to redesign our client onboarding flow for enterprise accounts. Currently manual — looking for automation...</p>
              </div>
            </div>
            <div className="pt-1">
              <div className="w-full h-9 bg-brand-orange rounded-lg flex items-center justify-center">
                <p className="text-white text-[11px] font-semibold">Submit Request — Free, no account needed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step Panel: Scope (AI-generated brief) ─────────────────────────────────
export function StepScopeMockup() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-xl border border-border bg-white w-full">
      <BrowserChrome title="app.unalabs.cloud/brief/MRD-2041" />
      <div className="p-6 bg-bg-offwhite min-h-[360px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-brand-teal-light flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8M3 7h6M3 10h4" stroke="#4DB8A8" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </div>
          <div>
            <p className="text-[12px] font-bold text-tx-heading">Scoped Brief — MRD-2041</p>
            <p className="text-[9px] text-tx-muted flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-teal" />
              AI-generated in 12 minutes · Client workspace
            </p>
          </div>
          <span className="ml-auto text-[8px] px-2 py-0.5 rounded-full bg-brand-teal-light text-brand-teal font-semibold border border-brand-teal/20">Ready for review</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { label: 'Project type', val: 'Workflow Automation' },
            { label: 'Estimated scope', val: '3–4 weeks' },
            { label: 'Complexity', val: 'Medium' },
            { label: 'Delivery format', val: 'Fixed-fee engagement' },
          ].map(f => (
            <div key={f.label} className="bg-white rounded-lg p-3 border border-border">
              <p className="text-[8px] text-tx-muted">{f.label}</p>
              <p className="text-[10px] font-semibold text-tx-heading mt-0.5">{f.val}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg p-3 border border-border mb-3">
          <p className="text-[9px] font-semibold text-tx-heading mb-2">Deliverables identified</p>
          {['Client intake form (Typeform replacement)', 'Automated email sequences (4 triggers)', 'CRM integration layer (HubSpot)', 'Handoff documentation + training'].map((d, i) => (
            <div key={i} className="flex items-center gap-2 py-1 border-b border-border last:border-0">
              <div className="w-4 h-4 rounded bg-brand-teal-light flex items-center justify-center flex-shrink-0">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4.5L3 6L6.5 2" stroke="#4DB8A8" strokeWidth="1" strokeLinecap="round"/></svg>
              </div>
              <p className="text-[9px] text-tx-body">{d}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-8 rounded-lg bg-brand-teal flex items-center justify-center">
            <p className="text-white text-[10px] font-semibold">Approve brief →</p>
          </div>
          <div className="h-8 px-3 rounded-lg border border-border flex items-center">
            <p className="text-[10px] text-tx-secondary">Request changes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step Panel: Proposal (full accept-proposal screen) ─────────────────────
export function StepProposalMockup() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-xl border border-border bg-white w-full">
      <BrowserChrome title="app.unalabs.cloud/proposal/PRP-2041" />
      <div className="p-6 bg-bg-offwhite min-h-[360px]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[12px] font-bold text-tx-heading">Proposal — PRP-2041</p>
            <p className="text-[9px] text-tx-muted">Enterprise Intake Automation · Client workspace</p>
          </div>
          <span className="text-[8px] px-2 py-1 rounded-full bg-brand-orange-light text-brand-orange font-semibold">Awaiting acceptance</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[{ label: 'Deliverables', val: '4 items' }, { label: 'Timeline', val: '3 weeks' }, { label: 'Revisions', val: '2 rounds' }].map(f => (
            <div key={f.label} className="bg-white rounded-lg p-2.5 border border-border text-center">
              <p className="text-[10px] font-bold text-tx-heading">{f.val}</p>
              <p className="text-[8px] text-tx-muted mt-0.5">{f.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg p-3 border border-border mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-semibold text-tx-heading">Scope of work</p>
            <span className="text-[8px] text-tx-muted">Fixed fee</span>
          </div>
          {['Intake automation system', 'Email trigger sequences', 'CRM integration', 'Documentation & handoff'].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <p className="text-[9px] text-tx-body">{item}</p>
              <p className="text-[9px] font-medium text-tx-heading">{['CA$3,200', 'CA$2,800', 'CA$4,100', 'CA$1,900'][i]}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl p-3 border-2 border-brand-teal flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] text-tx-muted">Total investment</p>
            <p className="text-[18px] font-bold text-tx-heading">CA$12,000</p>
            <p className="text-[8px] text-tx-muted">50% deposit on acceptance · balance on delivery</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] text-tx-muted mb-1">Valid until Apr 24, 2026</p>
            <div className="h-8 px-4 rounded-lg bg-brand-teal flex items-center justify-center">
              <p className="text-white text-[10px] font-bold">Accept & pay CA$6,000 →</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step Panel: Delivery (project live + sign-off) ─────────────────────────
export function StepDeliveryMockup() {
  const milestones = [
    { label: 'Kickoff & discovery', done: true, date: 'Apr 3' },
    { label: 'Intake form live', done: true, date: 'Apr 7' },
    { label: 'Email sequences configured', done: true, date: 'Apr 11' },
    { label: 'CRM integration', done: false, date: 'Apr 15', active: true },
    { label: 'Final handoff & sign-off', done: false, date: 'Apr 18' },
  ];
  return (
    <div className="rounded-2xl overflow-hidden shadow-xl border border-border bg-white w-full">
      <BrowserChrome title="app.unalabs.cloud/project/MRD-2041" />
      <div className="p-6 bg-bg-offwhite min-h-[360px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-bold text-tx-heading">Enterprise Intake Automation</p>
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-brand-teal-light text-brand-teal font-semibold">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-bg-subtle overflow-hidden">
                <div className="h-full bg-brand-teal rounded-full" style={{ width: '68%' }} />
              </div>
              <p className="text-[9px] text-tx-muted">68%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border p-3 mb-3">
          <p className="text-[9px] font-semibold text-tx-heading mb-2">Milestone tracker</p>
          <div className="space-y-1.5">
            {milestones.map((m, i) => (
              <div key={i} className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 ${m.active ? 'bg-brand-teal-light' : ''}`}>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${m.done ? 'bg-brand-teal' : m.active ? 'border-2 border-brand-teal bg-white' : 'bg-bg-subtle border border-border'}`}>
                  {m.done && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4.5L3 6L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>}
                  {m.active && <div className="w-1.5 h-1.5 rounded-full bg-brand-teal" />}
                </div>
                <p className={`text-[9px] flex-1 ${m.done ? 'line-through text-tx-muted' : m.active ? 'font-semibold text-brand-teal' : 'text-tx-body'}`}>{m.label}</p>
                <p className="text-[8px] text-tx-muted">{m.date}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[{ val: '3/4', label: 'Deliverables done', color: 'text-brand-teal' }, { val: '0', label: 'Blockers', color: 'text-tx-heading' }, { val: '3d', label: 'Until sign-off', color: 'text-brand-orange' }].map(m => (
            <div key={m.label} className="bg-white rounded-lg p-2 border border-border text-center">
              <p className={`text-[13px] font-bold ${m.color}`}>{m.val}</p>
              <p className="text-[7px] text-tx-muted">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
