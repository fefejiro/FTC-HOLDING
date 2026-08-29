'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type GuideOption = {
  id: string;
  label: string;
  nextId?: string;
  answer?: string;
  ctaHref?: string;
  ctaLabel?: string;
};

type GuideNode = {
  id: string;
  title: string;
  intro: string;
  options: GuideOption[];
};

const GUIDE_NODES: Record<string, GuideNode> = {
  root: {
    id: 'root',
    title: 'How can I help?',
    intro: 'Choose a path and I will guide you to the right page.',
    options: [
      { id: 'tour', label: 'How does Una Labs work?', nextId: 'tour' },
      { id: 'features', label: 'What does Una Labs do?', nextId: 'features' },
      { id: 'pricing', label: 'How are engagements priced?', nextId: 'pricing' },
      { id: 'start', label: 'I am ready to start', answer: 'Great. Start with a rough request. No account or credit card is required to submit intake.', ctaHref: '/start', ctaLabel: 'Start your project' },
      { id: 'help', label: 'I need help or support', nextId: 'help' },
    ],
  },
  tour: {
    id: 'tour',
    title: 'How Una Labs works',
    intro: 'Choose a way to understand the work.',
    options: [
      { id: 'tour-hiw', label: 'See how delivery works end-to-end', ctaHref: '/how-it-works', ctaLabel: 'Open How It Works' },
      { id: 'tour-pricing', label: 'Understand the engagement paths', ctaHref: '/pricing', ctaLabel: 'Open Engagement Guide' },
      { id: 'tour-product', label: 'See selected work', ctaHref: '/product', ctaLabel: 'Open Selected Work' },
      { id: 'tour-contact', label: 'Talk to us directly', ctaHref: '/contact', ctaLabel: 'Contact Una Labs' },
    ],
  },
  features: {
    id: 'features',
    title: 'What we help with',
    intro: 'We turn unclear problems into useful products and delivery systems.',
    options: [
      { id: 'feat-intake', label: 'Intake and scoping', answer: 'We turn rough client requests into structured scoped briefs in under 48 hours.', ctaHref: '/how-it-works?module=intake-scoping', ctaLabel: 'View intake flow' },
      { id: 'feat-dashboard', label: 'Real-time dashboard', answer: 'Track milestones, blockers, approvals, and progress in one governed workspace.', ctaHref: '/how-it-works?module=reporting', ctaLabel: 'View dashboard flow' },
      { id: 'feat-portal', label: 'Client portal and approvals', answer: 'Clients see exactly what they need, with clear approval gates before work advances.', ctaHref: '/how-it-works?module=deals-pipeline', ctaLabel: 'View portal flow' },
      { id: 'feat-payments', label: 'Payments and contracts', answer: 'Contracts, deposits, invoices, and collection are built into the delivery lifecycle.', ctaHref: '/how-it-works?module=live-payments', ctaLabel: 'View billing flow' },
      { id: 'feat-reporting', label: 'Reporting and handoff proof', answer: 'Delivery closes with documented outputs, sign-off records, and reusable reporting artifacts.', ctaHref: '/how-it-works?module=reporting', ctaLabel: 'View reporting flow' },
    ],
  },
  pricing: {
    id: 'pricing',
    title: 'Engagement Guide',
    intro: 'Start with the shape of work that fits your next decision.',
    options: [
      { id: 'plan-clarity', label: 'I need help making the problem clearer', answer: 'Start with a Clarity Sprint. We frame the problem, shape a useful direction, and recommend what should happen next.', ctaHref: '/start', ctaLabel: 'Start with clarity' },
      { id: 'plan-pilot', label: 'I want to test a first version', answer: 'A Pilot Build turns a promising direction into the smallest useful version worth putting in real hands.', ctaHref: '/start', ctaLabel: 'Discuss a pilot' },
      { id: 'plan-production', label: 'I need a production system', answer: 'Production Delivery carries a validated idea through integrations, deployment, and the details that make it dependable.', ctaHref: '/start', ctaLabel: 'Plan delivery' },
      { id: 'plan-care', label: 'I need ongoing improvement', answer: 'Care and Improvement keeps the product useful after launch through focused iteration, support, and review.', ctaHref: '/contact', ctaLabel: 'Plan ongoing care' },
    ],
  },
  help: {
    id: 'help',
    title: 'Support',
    intro: 'Choose the fastest support path.',
    options: [
      { id: 'help-tech', label: 'Technical issue', answer: 'Use the contact page and include your page URL and a short description of what happened.', ctaHref: '/contact', ctaLabel: 'Open support form' },
      { id: 'help-billing', label: 'Billing question', answer: 'For billing updates, payment issues, or invoice questions, contact billing@unalabs.cloud.', ctaHref: '/contact', ctaLabel: 'Contact billing' },
      { id: 'help-sales', label: 'Sales or partnership inquiry', answer: 'We can walk you through platform fit, onboarding, and service options.', ctaHref: '/contact', ctaLabel: 'Talk to sales' },
    ],
  },
};

const PAGE_CONTEXT: Record<string, string> = {
  '/portal': 'You are viewing your client portal.',
  '/dashboard/handover': 'You are viewing the project handover summary.',
  '/dashboard/briefing': 'You are viewing the project briefing board.',
  '/dashboard/report': 'You are viewing the project report.',
  '/dashboard/proposal': 'You are viewing a project proposal.',
  '/dashboard/contract': 'You are reviewing the engagement letter.',
  '/dashboard/invoice': 'You are viewing a project invoice.',
  '/client/': 'You are viewing a client project portal.',
  '/start': 'You are starting a new project.',
  '/start/summary': 'You are reviewing your intake summary.',
  '/dashboard/actions': 'You are viewing the operator action center - milestone reviews awaiting approval.',
  '/dashboard/launch-gate': 'You are viewing the operator launch gate - per-project readiness scoring.',
  '/dashboard/scheduling': 'You are viewing scheduling for milestone reviews and upcoming checkpoints.',
  '/dashboard/analytics': 'You are viewing the business intelligence dashboard with real-time financial metrics and revenue analytics.',
  '/dashboard/deals': 'You are viewing the deals pipeline — inbound leads and prospects tracked from first contact to closed engagement.',
};

const PAGE_HINTS: Record<string, string> = {
  '/pricing': 'Need help choosing a path? Open How are engagements priced?.',
  '/how-it-works': 'Need a walkthrough? Open How does Una Labs work?.',
  '/start': 'Need help with intake? Open I am ready to start.',
  '/contact': 'Need direct support? Open I need help or support.',
};

export function AssistantDrawer() {
  const [open, setOpen] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string>('root');
  const [activeAnswer, setActiveAnswer] = useState<GuideOption | null>(null);
  const [history, setHistory] = useState<string[]>(['root']);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [preferredVoiceURI, setPreferredVoiceURI] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const pageContext = Object.entries(PAGE_CONTEXT).find(([path]) => pathname.startsWith(path))?.[1];
  const pageHint = Object.entries(PAGE_HINTS).find(([path]) => pathname.startsWith(path))?.[1];
  const activeNode = GUIDE_NODES[activeNodeId] ?? GUIDE_NODES.root;

  function openNode(nextId: string) {
    setActiveAnswer(null);
    setActiveNodeId(nextId);
    setHistory((prev) => [...prev, nextId]);
  }

  function goBack() {
    if (activeAnswer) {
      setActiveAnswer(null);
      return;
    }

    if (history.length <= 1) {
      setActiveNodeId('root');
      return;
    }

    const nextHistory = [...history];
    nextHistory.pop();
    const previousNode = nextHistory[nextHistory.length - 1] || 'root';
    setHistory(nextHistory);
    setActiveNodeId(previousNode);
  }

  function stopSpeech() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
  }

  function speak(text: string) {
    if (!voiceEnabled || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;

    const voices = synth.getVoices();
    const selected = voices.find((v) => v.voiceURI === preferredVoiceURI)
      ?? voices.find((v) => /^en(-|_)/i.test(v.lang))
      ?? voices[0];

    if (selected) {
      utterance.voice = selected;
    }

    synth.speak(utterance);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const seen = window.localStorage.getItem('una_guide_seen');
      if (seen === '1') return;

      const timer = window.setTimeout(() => {
        setOpen(true);
      }, 8000);

      window.localStorage.setItem('una_guide_seen', '1');

      return () => window.clearTimeout(timer);
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setVoiceSupported(false);
      return;
    }

    const synth = window.speechSynthesis;
    setVoiceSupported(true);

    const setBestVoice = () => {
      const voices = synth.getVoices();
      if (!voices.length) return;
      const best = voices.find((v) => /^en(-|_)/i.test(v.lang)) ?? voices[0];
      setPreferredVoiceURI(best.voiceURI);
    };

    setBestVoice();
    synth.onvoiceschanged = setBestVoice;

    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (!open || !voiceEnabled) {
      stopSpeech();
      return;
    }

    if (activeAnswer) {
      const cta = activeAnswer.ctaLabel ? ` You can continue with ${activeAnswer.ctaLabel}.` : '';
      speak(`${activeAnswer.label}. ${activeAnswer.answer ?? ''}${cta}`.trim());
      return;
    }

    const options = activeNode.options
      .slice(0, 5)
      .map((option, idx) => `Option ${idx + 1}: ${option.label}.`)
      .join(' ');

    speak(`${activeNode.title}. ${activeNode.intro}. ${options}`.trim());
  }, [open, activeNodeId, activeAnswer, activeNode, voiceEnabled, preferredVoiceURI]);

  // Close on outside click
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        stopSpeech();
        setOpen(false);
        setActiveNodeId('root');
        setActiveAnswer(null);
        setHistory(['root']);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        stopSpeech();
        setOpen(false);
        setActiveNodeId('root');
        setActiveAnswer(null);
        setHistory(['root']);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div ref={drawerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 print:hidden">
      {open && (
        <div className="w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="px-5 py-4 border-b border-border bg-bg-subtle">
            <div className="flex items-center justify-between gap-3">
              <p className="text-body-sm font-semibold text-tx-heading">Una Labs site guide</p>
              {voiceSupported && (
                <button
                  type="button"
                  onClick={() => {
                    if (voiceEnabled) {
                      stopSpeech();
                    }
                    setVoiceEnabled((prev) => !prev);
                  }}
                  className="rounded-md border border-border bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-tx-secondary hover:text-brand-teal"
                >
                  Voice {voiceEnabled ? 'On' : 'Off'}
                </button>
              )}
            </div>
            {pageContext && <p className="mt-0.5 text-[11px] text-tx-muted">{pageContext}</p>}
            {pageHint && <p className="mt-1 text-[11px] text-brand-teal">{pageHint}</p>}
          </div>

          {activeAnswer ? (
            <div className="px-5 py-4">
              <button
                type="button"
                onClick={() => setActiveAnswer(null)}
                className="mb-3 text-[11px] font-semibold text-brand-teal hover:underline"
              >
                Back
              </button>
              <p className="text-body-sm font-semibold text-tx-heading mb-2">{activeAnswer.label}</p>
              <p className="text-body-sm text-tx-secondary leading-relaxed">{activeAnswer.answer}</p>
              {activeAnswer.ctaHref && activeAnswer.ctaLabel && (
                <div className="mt-4">
                  <Link
                    href={activeAnswer.ctaHref}
                    className="inline-flex items-center rounded-lg bg-brand-teal text-white px-3.5 py-2 text-xs font-semibold hover:opacity-95"
                  >
                    {activeAnswer.ctaLabel}
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="px-5 py-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-body-sm font-semibold text-tx-heading">{activeNode.title}</p>
                  <p className="mt-1 text-[12px] text-tx-secondary leading-relaxed">{activeNode.intro}</p>
                </div>
                {history.length > 1 && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="shrink-0 text-[11px] font-semibold text-brand-teal hover:underline"
                  >
                    Back
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {activeNode.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      if (option.nextId) {
                        openNode(option.nextId);
                        return;
                      }
                      if (option.answer) {
                        setActiveAnswer(option);
                        return;
                      }
                      if (option.ctaHref) {
                        setActiveAnswer(option);
                      }
                    }}
                    className="w-full rounded-lg border border-border px-3.5 py-3 text-left text-body-sm text-tx-heading hover:border-brand-teal/40 hover:bg-bg-subtle transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border px-5 py-3 bg-bg-offwhite">
            <Link href="/contact" className="text-[11px] font-semibold text-brand-teal hover:underline">
              Need human help? Contact us →
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label={open ? 'Close site guide' : 'Open site guide'}
        onClick={() => {
          const nextOpen = !open;
          if (!nextOpen) {
            stopSpeech();
          }
          setOpen(nextOpen);
          setActiveNodeId('root');
          setActiveAnswer(null);
          setHistory(['root']);
        }}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal text-white shadow-lg hover:opacity-90 transition-opacity"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
        )}
      </button>
    </div>
  );
}

