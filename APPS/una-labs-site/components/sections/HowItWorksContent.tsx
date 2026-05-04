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
    headline: 'How a request becomes delivery',
    sub: 'Four governed stages. Fixed pricing. Full visibility at every step.',
    example: '',
  },
  'Professional Services': {
    headline: 'Structured delivery for professional teams',
    sub: 'From client intake through documented handoff - every engagement scoped, priced, and tracked.',
    example: 'e.g. consulting firms, law practices, financial advisors',
  },
  Agencies: {
    headline: 'How agencies deliver without scope creep',
    sub: 'Fixed-fee projects, approval gates at every stage. Clients see everything. No more status emails.',
    example: 'e.g. creative agencies, digital studios, dev shops',
  },
  'SaaS Teams': {
    headline: 'Ship features with governed delivery',
    sub: 'Structured intake turns vague feature requests into scoped, priced work items with clear sign-off.',
    example: 'e.g. product teams, internal delivery squads',
  },
  Accounting: {
    headline: 'Client delivery built for accounting firms',
    sub: 'Scope engagements, collect deposits, and deliver documented work - without chasing invoices.',
    example: 'e.g. CPA firms, bookkeepers, tax practices',
  },
};

const STEPS = [
  {
    number: '01',
    label: 'Submit a request',
    tag: 'Free · No account needed',
    headline: 'Describe what you need. Rough is fine.',
    body: "Fill out a simple form - no polished brief required. Write it like you'd explain it to a colleague. We take it from there.",
    bullets: ['Takes 2-5 minutes', 'No templates. No jargon.', 'Zero commitment at this stage'],
    Mockup: StepRequestMockup,
  },
  {
    number: '02',
    label: 'Get a scoped brief',
    tag: 'Response within 48 hours',
    headline: 'We turn your input into a structured scope.',
    body: 'Una Labs structures your request into a defined brief - deliverables, timeline, and format. You review and approve before anything moves forward.',
    bullets: ['AI-assisted scoping in minutes', 'Deliverables clearly listed', 'Request changes freely - no pressure'],
    Mockup: StepScopeMockup,
  },
  {
    number: '03',
    label: 'Accept the proposal',
    tag: 'Fixed fee · No surprises',
    headline: 'One clear offer. One decision.',
    body: 'You receive a fixed-fee proposal in CAD. No negotiation theatre. Pay a 50% deposit to confirm - the rest on delivery.',
    bullets: ['Transparent CAD pricing', 'Pay only after you agree on scope', '50% deposit secures the engagement'],
    Mockup: StepProposalMockup,
  },
  {
    number: '04',
    label: 'Governed delivery',
    tag: 'Tracked · Documented · Signed off',
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
    description: 'Turn rough requests into structured briefs in under 48 hours. AI-assisted, human-reviewed.',
    href: '/how-it-works',
  },
  {
    icon: '📊',
    color: 'bg-teal-50',
    label: 'Real-Time Dashboard',
    description: 'Every project visible - status, milestones, risks. Shared with clients. No login required.',
    href: '/how-it-works',
  },
  {
    icon: '📄',
    color: 'bg-orange-50',
    label: 'Proposals & Pricing',
    description: 'Fixed-fee CAD proposals sent within 24 hours of brief approval. One clear offer.',
    href: '/pricing',
  },
  {
    icon: '✅',
    color: 'bg-green-50',
    label: 'Approval Gates',
    description: 'Clients sign off before money or work advances. No surprises. No scope drift.',
    href: '/how-it-works',
  },
  {
    icon: '💳',
    color: 'bg-purple-50',
    label: 'Payments via Stripe',
    description: 'Deposit collected on acceptance. Balance on delivery. No chasing invoices. Fully automated.',
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
    description: 'Brief generation, notifications, and reporting - automated. Your team focuses on delivery.',
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

function toModuleSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const MODULE_DEMOS_BASE: ModuleDemoItem[] = [
  { label: 'Forms & Intake', slug: 'intake-scoping', icon: '📋', bg: 'bg-blue-50', duration: '2 min', live: true, description: 'Submit your project request. We structure it into a scoped brief in under 48 hours.', href: '/start', walkthroughHref: '/demo/intake' },
  { label: 'Proposals', slug: 'proposals', icon: '📄', bg: 'bg-orange-50', duration: '3 min', live: true, description: 'Start a request to receive a fixed-fee CAD proposal. One clear offer per engagement.', href: '/start', walkthroughHref: '/demo/dispatch' },
  { label: 'Billing & Payments', slug: 'live-payments', icon: '💳', bg: 'bg-green-50', duration: '3 min', live: true, description: 'Stripe-powered checkout. 50% deposit on project acceptance, balance on delivery.', href: '/start', walkthroughHref: '/demo/peacepad' },
  { label: 'Contracts & E-sign', slug: 'contracts-e-sign', icon: '✏️', bg: 'bg-purple-50', duration: '2 min', live: true, description: 'Engagement letter generated per project. Client reviews scope, types their name, and signs directly in the portal - no third-party tool required.', href: '/dashboard/contract' },
  { label: 'Instant Bill', slug: 'instant-bill', icon: '⚡', bg: 'bg-yellow-50', duration: '2 min', live: false, description: 'One-off payment links for ad hoc or out-of-scope work. Coming soon.', href: '/contact' },
  { label: 'AutoCollect', slug: 'autocollect', icon: '🔄', bg: 'bg-teal-50', duration: '3 min', live: false, description: 'Automated invoice reminders and payment collection. Zero manual follow-up. Coming soon.', href: '/contact' },
  { label: 'AI Price Insights', slug: 'ai-price-insights', icon: '🤖', bg: 'bg-indigo-50', duration: '3 min', live: true, description: 'AI-recommended price confidence per project - High, Medium, or Low - surfaced directly on each project card.', href: '/dashboard' },
  { label: 'Scheduling', slug: 'scheduling', icon: '📅', bg: 'bg-violet-50', duration: '2 min', live: true, description: 'Milestone calendar with filters by this week, this month, or overdue. Quick-action buttons per milestone - book a review call, open briefing, or share client view.', href: '/dashboard/scheduling' },
  { label: 'Insights & Reporting', slug: 'reporting', icon: '📊', bg: 'bg-rose-50', duration: '3 min', live: true, description: 'Real-time BI dashboard - total revenue, MRR projection, cashflow forecast, collection health, pipeline conversion, and revenue by service tier.', href: '/dashboard/analytics' },
  { label: 'Deals Pipeline', slug: 'deals-pipeline', icon: '🎯', bg: 'bg-amber-50', duration: '2 min', live: true, description: 'Track contact form submissions from lead to signed engagement. Pipeline stages, status updates, internal notes, and conversion tracking in one view.', href: '/dashboard/deals' },
  { label: 'AutoPricing', slug: 'autopricing', icon: '🏷️', bg: 'bg-cyan-50', duration: '2 min', live: false, description: 'Re-trigger AI pricing from the proposal view. Update rates without re-intake. Coming soon.', href: '/contact' },
  { label: 'Custom Branding', slug: 'custom-branding', icon: '🎨', bg: 'bg-fuchsia-50', duration: '2 min', live: false, description: 'Your logo and colors on every proposal, contract, and email your clients receive. Coming soon.', href: '/contact' },
  { label: 'Integrations', slug: 'integrations', icon: '🔌', bg: 'bg-gray-50', duration: '3 min', live: false, description: 'Connect Xero, QuickBooks, Slack, and Zapier to your Una Labs workspace. Coming soon.', href: '/contact' },
];
const MODULE_DEMOS: ModuleDemoItem[] = MODULE_DEMOS_BASE.map((mod) => ({
  ...mod,
  slug: mod.slug || toModuleSlug(mod.label),
}));

const FAQ = [  {
    q: 'Do I need to know exactly what I want before submitting?',
    a: "No - that's the whole point. Describe the problem or goal in plain language. We turn it into a structured scope. The rougher your input, the more value the process adds.",
  },
  {
    q: 'How fast do I get a response?',
    a: 'You receive a scoped brief within 48 hours of submission. Most arrive faster - often same day for straightforward requests.',
  },
  {
    q: "What if I don't like the proposal?",
    a: "You don't pay anything. We only collect a deposit after you've reviewed and accepted the scope. If it's not right, we revise or part ways - no obligation.",
  },
  {
    q: 'Is this a freelancer marketplace?',
    a: "No. It's a governed delivery system. Every engagement has defined scope, fixed pricing in CAD, approval gates, and documented output. You're buying a professional outcome, not a person.",
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
  const statusLabel = mod.walkthroughHref ? 'Walkthrough live' : mod.live ? 'Product live' : 'Coming soon';
  const statusClasses = mod.walkthroughHref
    ? 'bg-teal-100 text-teal-700'
    : mod.live
      ? 'bg-green-100 text-green-700'
      : 'bg-amber-100 text-amber-700';

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
        <span className={`absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ${statusClasses}`}>{statusLabel}</span>
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
              Watch walkthrough ↗
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
  const proofStudies = Object.values(caseStudies);
  const walkthroughCount = MODULE_DEMOS.filter((mod) => Boolean(mod.walkthroughHref)).length;
  const moduleMap = useMemo(() => {
    return new Map(MODULE_DEMOS.map((mod) => [mod.slug, mod]));
  }, []);

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
              From rough request to documented delivery
            </h1>
            <p className="text-body-lg text-tx-secondary leading-relaxed">
              Every step governed. Every output professional. Every price in CAD - fixed, upfront, no surprises.
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
            <h2 className="text-h2 text-tx-heading mb-3">Every tool you need to deliver</h2>
            <p className="text-body-lg text-tx-secondary max-w-xl mx-auto">
              No bolt-on add-ons. No per-seat surprises. The full system - intake through to handoff.
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

      <section className="bg-white py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-h2 text-tx-heading mb-3">Real products behind the workflow</h2>
            <p className="text-body-lg text-tx-secondary">
              The request-to-delivery model on this page is already reflected in shipped systems.
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
            <p className="mt-3 text-caption text-tx-muted">No account needed. No credit card. Response within 48h.</p>
          </div>
        </div>
      </section>

      {/* Module Demo Grid — Ignition-style per-feature showcase */}
      <section className="bg-bg-subtle border-t border-border py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="teal">Platform modules</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">See every feature in action</h2>
            <p className="mt-3 text-body-lg text-tx-secondary max-w-xl mx-auto">
              {walkthroughCount > 0
                ? `${walkthroughCount} walkthrough${walkthroughCount > 1 ? 's are' : ' is'} live now. Everything from lead capture to payment and handoff in one governed flow.`
                : 'Eight live modules. One platform. Everything from lead capture to automated payment collection.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {MODULE_DEMOS.map((mod) => (
              <ModuleCard key={mod.label} mod={mod} highlighted={highlightedModuleSlug === mod.slug} />
            ))}
          </div>
          <p className="mt-8 text-center text-body-sm text-tx-muted">
            Live walkthrough links are shown above.{' '}
            <Link href="/start" className="text-brand-teal hover:underline">Start Your Project</Link> to see it live.
          </p>
        </div>
      </section>

      <FinalCTASection />
    </>
  );
}
