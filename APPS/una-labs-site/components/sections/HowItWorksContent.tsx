'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FinalCTASection } from '@/components/sections/FinalCTASection';
import {
  StepRequestMockup,
  StepScopeMockup,
  StepProposalMockup,
  StepDeliveryMockup,
} from '@/components/ui/ProductMockups';
import { caseStudies, howItWorksProof } from '@/lib/site-content';

const TABS = ['All', 'Professional Services', 'Agencies', 'SaaS Teams', 'Accounting'];

const TAB_CONTEXT: Record<string, { headline: string; sub: string; example: string }> = {
  All: {
    headline: 'How a rough problem becomes a useful product',
    sub: 'Four practical stages: clarity, direction, delivery, and the care that keeps the work useful.',
    example: '',
  },
  'Professional Services': {
    headline: 'For teams with a messy operating problem',
    sub: 'We help turn a fuzzy need into a clear scope, a useful system, and a handoff your team can live with.',
    example: 'e.g. consulting firms, service teams, operational leaders',
  },
  Agencies: {
    headline: 'For teams shaping a client-facing experience',
    sub: 'We make the decision points visible, keep the scope honest, and build around the people who will actually use the work.',
    example: 'e.g. creative agencies, digital studios, dev shops',
  },
  'SaaS Teams': {
    headline: 'For teams deciding what to build next',
    sub: 'We help separate the promising idea from the distracting one, then shape a first version worth testing.',
    example: 'e.g. product teams, internal delivery squads',
  },
  Accounting: {
    headline: 'For careful, trust-sensitive work',
    sub: 'We bring structure to the journey so the experience feels clear for the people giving and receiving the service.',
    example: 'e.g. accounting firms, advisors, community services',
  },
};

const STEPS = [
  {
    number: '01',
    label: 'Submit a request',
    tag: 'Start with context',
    headline: 'Describe what you need. Rough is fine.',
    body: "Fill out a simple form - no polished brief required. Write it like you'd explain it to a colleague. We take it from there.",
    bullets: ['Takes 2-5 minutes', 'No templates. No jargon.', 'Zero commitment at this stage'],
    Mockup: StepRequestMockup,
  },
  {
    number: '02',
    label: 'Get a scoped brief',
    tag: 'Clarity phase',
    headline: 'We find the signal inside the request.',
    body: 'We turn your context into a defined problem, a possible direction, and a practical scope. You get something useful to make a decision with.',
    bullets: ['Problem framed clearly', 'Useful direction identified', 'Next step made visible'],
    Mockup: StepScopeMockup,
  },
  {
    number: '03',
    label: 'Choose the next move',
    tag: 'Scope before momentum',
    headline: 'Decide whether to pilot, build, or pause.',
    body: 'Once the opportunity is clear, we recommend the smallest sensible next step. That may be a pilot build, production delivery, ongoing care, or a confident pause.',
    bullets: ['Clear commercial proposal', 'Scope matched to the decision', 'No pressure to build prematurely'],
    Mockup: StepProposalMockup,
  },
  {
    number: '04',
    label: 'Governed delivery',
    tag: 'Build and improve',
    headline: 'Every step visible. Every output documented.',
    body: 'Work proceeds against a milestone tracker visible to you at all times. Approval gates ensure nothing advances without your sign-off. Delivery ends with a handoff package.',
    bullets: ['Real-time milestone tracking', 'Client approval gates at every stage', 'Handoff-ready documentation on completion'],
    Mockup: StepDeliveryMockup,
  },
];

const OUTCOMES = howItWorksProof;

const FEATURES = [
  {
    icon: '📋',
    color: 'bg-blue-50',
    label: 'Intake & Scoping',
    description: 'Turn rough requests into structured briefs through a human-reviewed process.',
    href: '/how-it-works',
  },
  {
    icon: '📊',
    color: 'bg-teal-50',
    label: 'Real-Time Dashboard',
    description: 'Make milestones, risks, and decisions visible to the people involved in the work.',
    href: '/how-it-works',
  },
  {
    icon: '📄',
    color: 'bg-orange-50',
    label: 'Proposals & Pricing',
    description: 'Scope the next step clearly before work begins, with commercial terms everyone understands.',
    href: '/pricing',
  },
  {
    icon: '✅',
    color: 'bg-green-50',
    label: 'Approval Gates',
    description: 'Use clear decision points so work advances with shared understanding and fewer surprises.',
    href: '/how-it-works',
  },
  {
    icon: '💳',
    color: 'bg-purple-50',
    label: 'Payments via Stripe',
    description: 'Connect payments and billing when the engagement needs them, with the details kept clear.',
    href: '/pricing',
  },
  {
    icon: '🔗',
    color: 'bg-pink-50',
    label: 'Delivery Proof',
    description: 'Every output timestamped and documented. Clients receive a handoff package they can keep.',
    href: '/how-it-works',
  },
  {
    icon: '🤖',
    color: 'bg-indigo-50',
    label: 'AI Automation',
    description: 'Use automation where it reduces admin, while judgement stays with the people doing the work.',
    href: '/how-it-works',
  },
  {
    icon: '📈',
    color: 'bg-yellow-50',
    label: 'Impact Reporting',
    description: 'Auto-generated impact reports per client. Quantified outcomes. No copy-paste.',
    href: '/how-it-works',
  },
  {
    icon: '🔌',
    color: 'bg-gray-50',
    label: 'Integrations',
    description: 'Connect your existing stack - Slack, Stripe, HubSpot, and more. Works with what you have.',
    href: '/how-it-works',
  },
];

type ModuleDemoItem = {
  label: string;
  slug: string;
  icon: string;
  bg: string;
  duration: string;
  live: boolean;
  description: string;
  href: string;
  walkthroughHref?: string;
};

type WalkthroughPlayerItem = {
  id: string;
  label: string;
  url: string;
  external: boolean;
  note: string;
};

function toModuleSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const MODULE_DEMOS_BASE: ModuleDemoItem[] = [
  { label: 'Forms & Intake', slug: 'intake-scoping', icon: '📋', bg: 'bg-blue-50', duration: '2 min', live: true, description: 'Share the problem in plain language. We turn the context into a useful starting point.', href: '/start', walkthroughHref: '/demo/intake' },
  { label: 'Proposals', slug: 'proposals', icon: '📄', bg: 'bg-orange-50', duration: '3 min', live: true, description: 'Receive a clear recommendation and commercial scope for the next sensible step.', href: '/start', walkthroughHref: '/demo/dispatch' },
  { label: 'Billing & Payments', slug: 'live-payments', icon: '💳', bg: 'bg-green-50', duration: '3 min', live: true, description: 'Connect payments and billing when the engagement needs them, with terms kept clear.', href: '/start', walkthroughHref: '/demo/peacepad' },
  { label: 'Contracts & E-sign', slug: 'contracts-e-sign', icon: '✏️', bg: 'bg-purple-50', duration: '2 min', live: true, description: 'Engagement letter generated per project. Client reviews scope, types their name, and signs directly in the portal - no third-party tool required.', href: '/dashboard/contract' },
  { label: 'Instant Bill', slug: 'instant-bill', icon: '⚡', bg: 'bg-yellow-50', duration: '2 min', live: true, description: 'One-off payment links for ad hoc or out-of-scope work. No re-intake required.', href: '/dashboard/instant-bill' },
  { label: 'AutoCollect', slug: 'autocollect', icon: '🔄', bg: 'bg-teal-50', duration: '3 min', live: true, description: 'Automated invoice reminders and payment collection. Zero manual follow-up.', href: '/dashboard/autocollect' },
  { label: 'AI Price Insights', slug: 'ai-price-insights', icon: '🤖', bg: 'bg-indigo-50', duration: '3 min', live: true, description: 'AI-recommended price confidence per project - High, Medium, or Low - surfaced directly on each project card.', href: '/dashboard' },
  { label: 'Scheduling', slug: 'scheduling', icon: '📅', bg: 'bg-violet-50', duration: '2 min', live: true, description: 'Milestone calendar with filters by this week, this month, or overdue. Quick-action buttons per milestone - book a review call, open briefing, or share client view.', href: '/dashboard/scheduling' },
  { label: 'Insights & Reporting', slug: 'reporting', icon: '📊', bg: 'bg-rose-50', duration: '3 min', live: true, description: 'Real-time BI dashboard - total revenue, MRR projection, cashflow forecast, collection health, pipeline conversion, and revenue by service tier.', href: '/dashboard/analytics' },
  { label: 'Deals Pipeline', slug: 'deals-pipeline', icon: '🎯', bg: 'bg-amber-50', duration: '2 min', live: true, description: 'Track contact form submissions from lead to signed engagement. Pipeline stages, status updates, internal notes, and conversion tracking in one view.', href: '/dashboard/deals' },
  { label: 'AutoPricing', slug: 'autopricing', icon: '🏷️', bg: 'bg-cyan-50', duration: '2 min', live: true, description: 'Re-trigger AI pricing from the proposal view. Update rates without re-intake.', href: '/dashboard/autopricing' },
  { label: 'Custom Branding', slug: 'custom-branding', icon: '🎨', bg: 'bg-fuchsia-50', duration: '2 min', live: true, description: 'Your logo and colors on every proposal, contract, and email your clients receive.', href: '/dashboard/branding' },
  { label: 'Integrations', slug: 'integrations', icon: '🔌', bg: 'bg-gray-50', duration: '3 min', live: true, description: 'Connect Xero, QuickBooks, Slack, and Zapier to your Una Labs workspace.', href: '/dashboard/integrations' },
];
const MODULE_DEMOS: ModuleDemoItem[] = MODULE_DEMOS_BASE.map((mod) => ({
  ...mod,
  slug: mod.slug || toModuleSlug(mod.label),
}));

const WALKTHROUGH_PLAYER_ITEMS: WalkthroughPlayerItem[] = [
  {
    id: 'intake',
    label: 'Intake walkthrough',
    url: '/start',
    external: false,
    note: 'A guided look at the intake flow',
  },
  {
    id: 'dispatch',
    label: 'Dispatch walkthrough',
    url: 'https://dispatch.unalabs.cloud',
    external: true,
    note: 'A guided look at a coordination workflow',
  },
  {
    id: 'peacepad',
    label: 'Peacepad walkthrough',
    url: 'https://peacepad.ca',
    external: true,
    note: 'A guided look at a trust-sensitive product surface',
  },
];

const FAQ = [  {
    q: 'Do I need to know exactly what I want before submitting?',
    a: "No - that's the whole point. Describe the problem or goal in plain language. We turn it into a structured scope. The rougher your input, the more value the process adds.",
  },
  {
    q: 'How fast do I get a response?',
    a: 'We respond after reviewing the context and will clarify the next step with you. Timing depends on the question and the shape of the work.',
  },
  {
    q: "What if I don't like the proposal?",
    a: 'The Clarity Sprint is a defined piece of work. It can stand alone, or become the foundation for a pilot or production engagement if the direction is right.',
  },
  {
    q: 'Is this a freelancer marketplace?',
    a: "No. It's a governed delivery system. Every engagement has a clear scope, agreed commercial terms, approval gates, and documented output. You're buying a professional outcome, not a person.",
  },
  {
    q: 'What kinds of work do you handle?',
    a: 'Digital systems, AI automation, workflow tooling, web platforms, SEO infrastructure, and operational builds. If it produces a digital deliverable, we scope it.',
  },
  {
    q: 'What happens when the project is done?',
    a: 'You receive a handoff package - access credentials, documentation, completion record, and client sign-off timestamp. Everything you need to maintain, extend, or hand off to another team.',
  },
];

function ModuleCard({ mod, highlighted }: { mod: ModuleDemoItem; highlighted: boolean }) {
  return (
    <div
      id={`module-${mod.slug}`}
      className={[
        'group bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all duration-200',
        highlighted ? 'border-brand-teal ring-2 ring-brand-teal/30' : 'border-border',
      ].join(' ')}
    >
      <div className={`h-36 flex items-center justify-center ${mod.bg} relative`}>
        <span className="text-4xl">{mod.icon}</span>
        <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider text-tx-muted bg-white/80 rounded-full px-2 py-0.5">{mod.duration}</span>
      </div>
      <div className="p-5">
        <p className="text-body font-semibold text-tx-heading group-hover:text-brand-teal transition-colors">{mod.label}</p>
        <p className="mt-1 text-body-sm text-tx-secondary leading-snug">{mod.description}</p>
        <div className="mt-4 flex items-center gap-3">
          {mod.live && (
            <Link
              href={mod.href}
              className="text-[11px] font-semibold uppercase tracking-wider text-brand-teal hover:underline"
            >
              Try live →
            </Link>
          )}
          {mod.walkthroughHref && (
            <Link
              href={mod.walkthroughHref}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold uppercase tracking-wider text-tx-secondary hover:text-brand-teal"
            >
              Open walkthrough ↗
            </Link>
          )}
          {!mod.live && (
            <Link
              href="/contact"
              className="text-[11px] font-semibold uppercase tracking-wider text-tx-secondary hover:text-brand-teal"
            >
              Contact us →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function HowItWorksContent() {
  const [activeTab, setActiveTab] = useState('All');
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [highlightedModuleSlug, setHighlightedModuleSlug] = useState<string | null>(null);
  const [activeWalkthroughId, setActiveWalkthroughId] = useState<string>(WALKTHROUGH_PLAYER_ITEMS[0].id);
  const proofStudies = Object.values(caseStudies);
  const walkthroughCount = MODULE_DEMOS.filter((mod) => Boolean(mod.walkthroughHref)).length;
  const moduleMap = useMemo(() => {
    return new Map(MODULE_DEMOS.map((mod) => [mod.slug, mod]));
  }, []);
  const activeWalkthrough = WALKTHROUGH_PLAYER_ITEMS.find((item) => item.id === activeWalkthroughId) ?? WALKTHROUGH_PLAYER_ITEMS[0];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const moduleSlug = searchParams.get('module');
    if (!moduleSlug) return;

    const matched = moduleMap.get(moduleSlug);
    if (!matched) return;

    setHighlightedModuleSlug(matched.slug);

    const run = window.setTimeout(() => {
      const el = document.getElementById(`module-${matched.slug}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);

    const clear = window.setTimeout(() => {
      setHighlightedModuleSlug(null);
    }, 2600);

    return () => {
      window.clearTimeout(run);
      window.clearTimeout(clear);
    };
  }, [moduleMap]);

  const ActiveMockup = STEPS[activeStep].Mockup;

  return (
    <>
      <section className="bg-white pt-16 pb-0">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <div className="mb-4 flex justify-center">
              <Badge variant="teal">How it works</Badge>
            </div>
            <h1 className="text-display text-tx-heading mb-4">
              From rough problem to useful product
            </h1>
            <p className="text-body-lg text-tx-secondary leading-relaxed">
              We start with clarity, choose the right first version, then build and improve around real constraints.
            </p>
          </div>

          <div
            className="flex gap-1 overflow-x-auto border-b border-border"
            role="tablist"
            aria-label="Filter by industry"
          >
            {TABS.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  'px-4 py-3 text-body whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-inset rounded-sm',
                  activeTab === tab
                    ? 'border-b-2 border-brand-teal text-brand-teal font-semibold -mb-px'
                    : 'text-tx-secondary hover:text-tx-heading',
                ].join(' ')}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg-subtle border-b border-border py-0">
        <div className="max-w-content mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
            {OUTCOMES.map((outcome) => (
              <div key={outcome.label} className="py-6 px-8 text-center first:pl-0 last:pr-0">
                <p className="text-3xl font-black text-brand-orange leading-none">{outcome.value}</p>
                <p className="text-body-sm font-semibold text-tx-heading mt-1">{outcome.label}</p>
                <p className="text-caption text-tx-muted mt-0.5">{outcome.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-h2 text-tx-heading mb-3">{TAB_CONTEXT[activeTab].headline}</h2>
            <p className="text-body-lg text-tx-secondary max-w-xl mx-auto">
              {TAB_CONTEXT[activeTab].sub}
            </p>
            {TAB_CONTEXT[activeTab].example && (
              <p className="text-caption text-tx-muted mt-2">{TAB_CONTEXT[activeTab].example}</p>
            )}
          </div>

          <div className="grid lg:grid-cols-[420px_1fr] gap-10 items-start">
            <div className="flex flex-col gap-2">
              {STEPS.map((step, index) => (
                <button
                  key={step.number}
                  onClick={() => setActiveStep(index)}
                  className={[
                    'text-left rounded-2xl p-5 border transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2',
                    activeStep === index
                      ? 'border-brand-teal bg-brand-teal-light shadow-md'
                      : 'border-border bg-white hover:border-brand-teal/40 hover:shadow-sm',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={[
                        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-body-sm font-bold transition-colors',
                        activeStep === index
                          ? 'bg-brand-teal text-white'
                          : 'bg-bg-subtle text-tx-muted border border-border group-hover:border-brand-teal/40',
                      ].join(' ')}
                    >
                      {step.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className={`text-body font-bold ${activeStep === index ? 'text-brand-teal' : 'text-tx-heading'}`}>
                          {step.label}
                        </p>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                            activeStep === index ? 'bg-white text-brand-teal' : 'bg-bg-subtle text-tx-muted'
                          }`}
                        >
                          {step.tag}
                        </span>
                      </div>
                      <p className={`text-body-sm leading-snug ${activeStep === index ? 'text-tx-body' : 'text-tx-muted'}`}>
                        {step.headline}
                      </p>
                      {activeStep === index && (
                        <div className="mt-3 space-y-2">
                          <p className="text-body-sm text-tx-secondary leading-relaxed">{step.body}</p>
                          <ul className="mt-2 space-y-1">
                            {step.bullets.map((bullet) => (
                              <li key={bullet} className="flex items-center gap-2 text-body-sm text-tx-body">
                                <span className="text-brand-teal font-bold flex-shrink-0">✓</span>
                                {bullet}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="hidden lg:block sticky top-24">
              <ActiveMockup />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-bg-offwhite py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="text-center mb-12">
            <div className="mb-3 flex justify-center">
              <Badge variant="teal">Everything included</Badge>
            </div>
            <h2 className="text-h2 text-tx-heading mb-3">What we can bring to the work</h2>
            <p className="text-body-lg text-tx-secondary max-w-xl mx-auto">
              Product thinking, design, engineering, workflow structure, and the operational care that helps a useful idea hold up in the real world.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((feature) => (
              <Link
                key={feature.label}
                href={feature.href}
                className="group bg-white rounded-2xl p-6 border border-border shadow-sm hover:shadow-md hover:border-brand-teal/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
              >
                <div className={`w-11 h-11 rounded-xl ${feature.color} flex items-center justify-center mb-4 text-2xl`}>
                  {feature.icon}
                </div>
                <h3 className="text-h4 text-tx-heading mb-2 group-hover:text-brand-teal transition-colors">
                  {feature.label}
                </h3>
                <p className="text-body-sm text-tx-secondary leading-relaxed mb-3">{feature.description}</p>
                <span className="text-body-sm font-semibold text-brand-teal flex items-center gap-1">
                  Learn more
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 14 14">
                    <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-border py-16">
        <div className="max-w-content mx-auto px-6">
          <div className="text-center mb-8">
            <Badge variant="teal">See the work in context</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">Explore a guided product walkthrough</h2>
            <p className="mt-3 text-body text-tx-secondary max-w-2xl mx-auto">
              See how a product surface carries a real question from first interaction toward something useful.
            </p>
          </div>

          <div className="mb-5 flex flex-wrap justify-center gap-2">
            {WALKTHROUGH_PLAYER_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveWalkthroughId(item.id)}
                className={[
                  'rounded-full border px-4 py-2 text-body-sm font-semibold transition-colors',
                  item.id === activeWalkthroughId
                    ? 'border-brand-teal bg-brand-teal text-white'
                    : 'border-border bg-bg-offwhite text-tx-heading hover:border-brand-teal/40',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="bg-bg-subtle border-b border-border px-5 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-300" />
                <span className="w-3 h-3 rounded-full bg-yellow-300" />
                <span className="w-3 h-3 rounded-full bg-green-300" />
              </div>
              <span className="text-body-sm text-tx-muted font-mono truncate">
                {activeWalkthrough.external ? activeWalkthrough.url : `unalabs.cloud${activeWalkthrough.url}`}
              </span>
              {activeWalkthrough.external && (
                <a
                  href={activeWalkthrough.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-[11px] font-semibold text-brand-teal hover:underline"
                >
                  Open full screen ↗
                </a>
              )}
            </div>
            <div className="relative w-full" style={{ height: '560px' }}>
              <iframe
                src={activeWalkthrough.url}
                title={activeWalkthrough.label}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>

          <p className="mt-4 text-center text-body-sm text-tx-muted">{activeWalkthrough.note}</p>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-h2 text-tx-heading mb-3">Selected work behind the thinking</h2>
            <p className="text-body-lg text-tx-secondary">
              These products show how we move from a human problem to a product people can use.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {proofStudies.map((study) => (
              <div key={study.slug} className="bg-bg-offwhite rounded-2xl p-6 border border-border flex flex-col">
                <div className="mb-4">
                  <Badge variant="muted">{study.title}</Badge>
                </div>
                <h3 className="text-h4 text-tx-heading mb-3">{study.headline}</h3>
                <p className="text-body-sm text-tx-secondary leading-relaxed flex-1">
                  {study.subheadline}
                </p>
                <div className="mt-6">
                  <Button href={`/products/${study.slug}`} variant="ghost" size="md">
                    View case study →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg-subtle py-20">
        <div className="max-w-narrow mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-h2 text-tx-heading mb-3">Still have questions?</h2>
            <p className="text-body-lg text-tx-secondary">
              Everything you need to know before you start.{' '}
              <Link href="/contact" className="text-brand-teal font-semibold hover:underline">
                Ask us directly →
              </Link>
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            {FAQ.map((item, index) => (
              <div key={item.q} className="border-b border-border last:border-0">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  aria-expanded={openFaq === index}
                  className="w-full text-left flex justify-between items-center px-6 py-5 gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-teal"
                >
                  <span className={`text-body font-semibold transition-colors ${openFaq === index ? 'text-brand-teal' : 'text-tx-heading group-hover:text-brand-teal'}`}>
                    {item.q}
                  </span>
                  <span
                    className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-light transition-all duration-200 ${
                      openFaq === index ? 'bg-brand-teal text-white rotate-45' : 'bg-bg-subtle text-tx-muted'
                    }`}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5">
                    <p className="text-body text-tx-secondary leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button href="/start" variant="primary" size="lg">
              Start Your Project
            </Button>
            <p className="mt-3 text-caption text-tx-muted">A rough request is enough to begin.</p>
          </div>
        </div>
      </section>

      {/* Module Demo Grid — Ignition-style per-feature showcase */}
      <section className="bg-bg-subtle border-t border-border py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="teal">Delivery capabilities</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">Explore the capabilities we bring</h2>
            <p className="mt-3 text-body-lg text-tx-secondary max-w-xl mx-auto">
              {walkthroughCount > 0
                ? `${walkthroughCount} guided example${walkthroughCount > 1 ? 's are' : ' is'} available above, alongside the capabilities we bring to delivery.`
                : 'Explore the capabilities we bring from first question through delivery and improvement.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {MODULE_DEMOS.map((mod) => (
              <ModuleCard key={mod.label} mod={mod} highlighted={highlightedModuleSlug === mod.slug} />
            ))}
          </div>
          <p className="mt-8 text-center text-body-sm text-tx-muted">
            Guided examples are shown above.{' '}
            <Link href="/start" className="text-brand-teal hover:underline">Bring us your problem</Link> to explore the right next step.
          </p>
        </div>
      </section>

      <FinalCTASection />
    </>
  );
}
