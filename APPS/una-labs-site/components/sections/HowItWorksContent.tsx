'use client';

import { useState } from 'react';
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

const TABS = ['All', 'Professional Services', 'Agencies', 'SaaS Teams', 'Accounting'];

const STEPS = [
  {
    number: '01',
    label: 'Submit a request',
    tag: 'Free · No account needed',
    headline: 'Describe what you need. Rough is fine.',
    body: 'Fill out a simple form — no polished brief required. Write it like you\'d explain it to a colleague. We take it from there.',
    bullets: ['Takes 2–5 minutes', 'No templates. No jargon.', 'Zero commitment at this stage'],
    Mockup: StepRequestMockup,
  },
  {
    number: '02',
    label: 'Get a scoped brief',
    tag: 'Response within 48 hours',
    headline: 'We turn your input into a structured scope.',
    body: 'Una Labs structures your request into a defined brief — deliverables, timeline, and format. You review and approve before anything moves forward.',
    bullets: ['AI-assisted scoping in minutes', 'Deliverables clearly listed', 'Request changes freely — no pressure'],
    Mockup: StepScopeMockup,
  },
  {
    number: '03',
    label: 'Accept the proposal',
    tag: 'Fixed fee · No surprises',
    headline: 'One clear offer. One decision.',
    body: 'You receive a fixed-fee proposal in CAD. No negotiation theatre. Pay a 50% deposit to confirm — the rest on delivery.',
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

const OUTCOMES = [
  { value: '48h', label: 'From request to scoped brief', sub: 'Average turnaround' },
  { value: '4.8', label: 'Client satisfaction score', sub: 'Across all active engagements' },
  { value: '100%', label: 'Delivery documented', sub: 'Every output handoff-ready' },
  { value: 'CA$0', label: 'Upfront commitment', sub: 'Pay only after accepting scope' },
];

const FEATURES = [
  {
    icon: '📋',
    color: 'bg-blue-50',
    label: 'Intake & Scoping',
    description: 'Turn rough requests into structured briefs in under 48 hours. AI-assisted, human-reviewed.',
    href: '/product/intake-scoping',
  },
  {
    icon: '📊',
    color: 'bg-teal-50',
    label: 'Real-Time Dashboard',
    description: 'Every project visible — status, milestones, risks. Shared with clients. No login required.',
    href: '/product/dashboard',
  },
  {
    icon: '📄',
    color: 'bg-orange-50',
    label: 'Proposals & Pricing',
    description: 'Fixed-fee CAD proposals sent within 24 hours of brief approval. One clear offer.',
    href: '/product/intake-scoping',
  },
  {
    icon: '✅',
    color: 'bg-green-50',
    label: 'Approval Gates',
    description: 'Clients sign off before money or work advances. No surprises. No scope drift.',
    href: '/product/approval-sign-off',
  },
  {
    icon: '💳',
    color: 'bg-purple-50',
    label: 'Payments via Stripe',
    description: 'Deposit collected on acceptance. Balance on delivery. No chasing invoices. Fully automated.',
    href: '/product/intake-scoping',
  },
  {
    icon: '🔗',
    color: 'bg-pink-50',
    label: 'Delivery Proof',
    description: 'Every output timestamped and documented. Clients receive a handoff package they can keep.',
    href: '/product/approval-sign-off',
  },
  {
    icon: '🤖',
    color: 'bg-indigo-50',
    label: 'AI Automation',
    description: 'Brief generation, notifications, and reporting — automated. Your team focuses on delivery.',
    href: '/product/dashboard',
  },
  {
    icon: '📈',
    color: 'bg-yellow-50',
    label: 'Impact Reporting',
    description: 'Auto-generated impact reports per client. Quantified outcomes. No copy-paste.',
    href: '/product/reporting',
  },
  {
    icon: '🔌',
    color: 'bg-gray-50',
    label: 'Integrations',
    description: 'Connect your existing stack — Slack, Stripe, HubSpot, and more. Works with what you have.',
    href: '/product/dashboard',
  },
];

const TESTIMONIALS = [
  {
    quote: 'We submitted a rough brief on a Tuesday and had a scoped proposal in our inbox by Thursday morning. That\'s never happened before with any agency.',
    author: 'James Park',
    title: 'Operations Manager',
    company: 'Fortis Consulting',
    metric: '3× faster scoping',
  },
  {
    quote: 'The dashboard alone killed off the weekly status call. Our clients can see everything. The "where are we?" emails stopped on day one.',
    author: 'Priya Nair',
    title: 'Agency Principal',
    company: 'Nair Creative',
    metric: '0 status emails per week',
  },
  {
    quote: 'Reporting used to take four hours per client per month. Now it\'s automated. That time went back into delivery.',
    author: 'Marcus Webb',
    title: 'Head of Client Success',
    company: 'Webb & Partners',
    metric: '4h/month saved per client',
  },
];

const FAQ = [
  {
    q: 'Do I need to know exactly what I want before submitting?',
    a: "No — that's the whole point. Describe the problem or goal in plain language. We turn it into a structured scope. The rougher your input, the more value the process adds.",
  },
  {
    q: 'How fast do I get a response?',
    a: 'You receive a scoped brief within 48 hours of submission. Most arrive faster — often same day for straightforward requests.',
  },
  {
    q: "What if I don't like the proposal?",
    a: "You don't pay anything. We only collect a deposit after you've reviewed and accepted the scope. If it's not right, we revise or part ways — no obligation.",
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
    a: 'You receive a handoff package — access credentials, documentation, completion record, and client sign-off timestamp. Everything you need to maintain, extend, or hand off to another team.',
  },
];

export function HowItWorksContent() {
  const [activeTab, setActiveTab] = useState('All');
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const ActiveMockup = STEPS[activeStep].Mockup;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
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
              Every step governed. Every output professional. Every price in CAD — fixed, upfront, no surprises.
            </p>
          </div>

          {/* Tab strip */}
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

      {/* ── Outcome stats bar ────────────────────────────────────────────── */}
      <section className="bg-bg-subtle border-b border-border py-0">
        <div className="max-w-content mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
            {OUTCOMES.map((o) => (
              <div key={o.label} className="py-6 px-8 text-center first:pl-0 last:pr-0">
                <p className="text-3xl font-black text-brand-orange leading-none">{o.value}</p>
                <p className="text-body-sm font-semibold text-tx-heading mt-1">{o.label}</p>
                <p className="text-caption text-tx-muted mt-0.5">{o.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive 4-step process ───────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-h2 text-tx-heading mb-3">How a request becomes delivery</h2>
            <p className="text-body-lg text-tx-secondary max-w-xl mx-auto">
              Four governed stages. Fixed pricing. Full visibility at every step.
            </p>
          </div>

          <div className="grid lg:grid-cols-[420px_1fr] gap-10 items-start">
            {/* Left: step list */}
            <div className="flex flex-col gap-2">
              {STEPS.map((step, i) => (
                <button
                  key={step.number}
                  onClick={() => setActiveStep(i)}
                  className={[
                    'text-left rounded-2xl p-5 border transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2',
                    activeStep === i
                      ? 'border-brand-teal bg-brand-teal-light shadow-md'
                      : 'border-border bg-white hover:border-brand-teal/40 hover:shadow-sm',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-4">
                    <div className={[
                      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-body-sm font-bold transition-colors',
                      activeStep === i ? 'bg-brand-teal text-white' : 'bg-bg-subtle text-tx-muted border border-border group-hover:border-brand-teal/40',
                    ].join(' ')}>
                      {step.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className={`text-body font-bold ${activeStep === i ? 'text-brand-teal' : 'text-tx-heading'}`}>
                          {step.label}
                        </p>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${activeStep === i ? 'bg-white text-brand-teal' : 'bg-bg-subtle text-tx-muted'}`}>
                          {step.tag}
                        </span>
                      </div>
                      <p className={`text-body-sm leading-snug ${activeStep === i ? 'text-tx-body' : 'text-tx-muted'}`}>
                        {step.headline}
                      </p>
                      {activeStep === i && (
                        <div className="mt-3 space-y-2">
                          <p className="text-body-sm text-tx-secondary leading-relaxed">{step.body}</p>
                          <ul className="mt-2 space-y-1">
                            {step.bullets.map((b) => (
                              <li key={b} className="flex items-center gap-2 text-body-sm text-tx-body">
                                <span className="text-brand-teal font-bold flex-shrink-0">✓</span>
                                {b}
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

            {/* Right: live mockup panel */}
            <div className="hidden lg:block sticky top-24">
              <ActiveMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── What's included — feature grid ──────────────────────────────── */}
      <section className="bg-bg-offwhite py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="text-center mb-12">
            <div className="mb-3 flex justify-center">
              <Badge variant="teal">Everything included</Badge>
            </div>
            <h2 className="text-h2 text-tx-heading mb-3">Every tool you need to deliver</h2>
            <p className="text-body-lg text-tx-secondary max-w-xl mx-auto">
              No bolt-on add-ons. No per-seat surprises. The full system — intake through to handoff.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <Link
                key={f.label}
                href={f.href}
                className="group bg-white rounded-2xl p-6 border border-border shadow-sm hover:shadow-md hover:border-brand-teal/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
              >
                <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4 text-2xl`}>
                  {f.icon}
                </div>
                <h3 className="text-h4 text-tx-heading mb-2 group-hover:text-brand-teal transition-colors">
                  {f.label}
                </h3>
                <p className="text-body-sm text-tx-secondary leading-relaxed mb-3">{f.description}</p>
                <span className="text-body-sm font-semibold text-brand-teal flex items-center gap-1">
                  Learn more
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 14 14">
                    <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-h2 text-tx-heading mb-3">What clients say</h2>
            <p className="text-body-lg text-tx-secondary">Real outcomes from real engagements.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="bg-bg-offwhite rounded-2xl p-6 border border-border flex flex-col">
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-brand-teal-light text-brand-teal text-caption font-bold uppercase tracking-wider">
                    {t.metric}
                  </span>
                </div>
                <blockquote className="text-body text-tx-body leading-relaxed flex-1 mb-6">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <footer className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-teal-light flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-teal font-bold text-body-sm">{t.author.split(' ').map(w => w[0]).join('')}</span>
                  </div>
                  <div>
                    <p className="text-body-sm font-semibold text-tx-heading">{t.author}</p>
                    <p className="text-caption text-tx-muted">{t.title}, {t.company}</p>
                  </div>
                </footer>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="bg-bg-subtle py-20">
        <div className="max-w-narrow mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-h2 text-tx-heading mb-3">Still have questions?</h2>
            <p className="text-body-lg text-tx-secondary">
              Everything you need to know before you start.{' '}
              <Link href="/contact" className="text-brand-teal font-semibold hover:underline">Ask us directly →</Link>
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            {FAQ.map((item, i) => (
              <div key={i} className="border-b border-border last:border-0">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="w-full text-left flex justify-between items-center px-6 py-5 gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-teal"
                >
                  <span className={`text-body font-semibold transition-colors ${openFaq === i ? 'text-brand-teal' : 'text-tx-heading group-hover:text-brand-teal'}`}>
                    {item.q}
                  </span>
                  <span
                    className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-light transition-all duration-200 ${
                      openFaq === i ? 'bg-brand-teal text-white rotate-45' : 'bg-bg-subtle text-tx-muted'
                    }`}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-body text-tx-secondary leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button href="/start" variant="primary" size="lg">
              Start your first request — free
            </Button>
            <p className="mt-3 text-caption text-tx-muted">No account needed. No credit card. Response within 48h.</p>
          </div>
        </div>
      </section>

      <FinalCTASection />
    </>
  );
}
