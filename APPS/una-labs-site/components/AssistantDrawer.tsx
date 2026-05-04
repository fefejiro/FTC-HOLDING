'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type Intent = {
  id: string;
  question: string;
  answer: string;
};

const GLOBAL_INTENTS: Intent[] = [
  {
    id: 'which-plan',
    question: 'Which plan should I choose?',
    answer:
      'If you have a clear goal and need a website or digital product built, start with the Standard plan. If you need AI features or ongoing platform management, go with Pro. Premium is for complex multi-product builds or when you need a dedicated delivery team. When in doubt, start Standard - you can upgrade at any milestone.',
  },
  {
    id: 'proposal-meaning',
    question: 'What does this proposal mean?',
    answer:
      'A proposal is the scoped plan for your project - it lists what will be built, in what order, and at what price. Once you approve it (by signing the contract), it becomes the delivery roadmap your milestone tracker is built from. Nothing starts until the proposal is signed.',
  },
  {
    id: 'what-next',
    question: 'What do I need to do next?',
    answer:
      'Check your portal for any items marked "Awaiting on you." These could be approvals, information we need, or milestone sign-offs. If nothing is listed, we are actively working on the current milestone and you will hear from us on the next update.',
  },
  {
    id: 'billing-how',
    question: 'How does billing work?',
    answer:
      'You pay at key milestones, not upfront in full. An activation fee is charged on sign-up. Milestone invoices are sent when each deliverable is ready for your review and approval. You can see all invoices and outstanding balances in your portal under Payment status.',
  },
  {
    id: 'invoice-pay',
    question: 'How do I pay an invoice?',
    answer:
      'Every invoice includes a secure payment link. Click "Pay now" on any unpaid invoice in your portal or on the invoice page itself. Payments are processed via Stripe - we accept all major cards. Once paid, the invoice status updates automatically within a few minutes.',
  },
  {
    id: 'handover-what',
    question: 'What happens at handover?',
    answer:
      'Handover is the final step where we package everything we built - deliverables, documentation, and credentials - and formally transfer them to you. We send a handover summary with all archived assets. Once you acknowledge it, the project is marked complete and you retain full ownership of everything delivered.',
  },
  {
    id: 'actions-what',
    question: 'What is the Action Center?',
    answer:
      'The Action Center collects every milestone across all projects that is in the review state - milestones waiting on operator sign-off. You can search, filter by due date, bulk-approve multiple milestones at once, and spot overdue items at a glance. It is the fastest way to unblock delivery across your entire portfolio.',
  },
  {
    id: 'launch-gate-what',
    question: 'What is the Launch Gate?',
    answer:
      'The Launch Gate scores each project against readiness checks - milestone completion, no blocked milestones, proof on every completed milestone, a live URL recorded, and a handover document present. Projects that pass all checks show as Ready. Those with failing checks are flagged Blocked. Use it before marking any project live.',
  },
  {
    id: 'scheduling-what',
    question: 'What is Scheduling?',
    answer:
      'Scheduling shows upcoming milestone due dates and review checkpoints in one calendar-style queue. You can filter by this week, this month, or overdue items, then open briefing details or create a review call directly from each item.',
  },
  {
    id: 'analytics-what',
    question: 'What is the Analytics dashboard?',
    answer:
      'The Analytics dashboard displays real-time financial insights across your entire project portfolio. Track total revenue collected, monthly recurring revenue projections, active and completed project counts, cashflow forecast (collected vs. pending), collection health (on-time vs. overdue), pipeline conversion metrics, and revenue breakdown by service tier.',
  },
  {
    id: 'deals-what',
    question: 'What is the Deals Pipeline?',
    answer:
      'The Deals Pipeline tracks every inbound lead from first contact to closed-won engagement. Contact form submissions land here automatically. You can advance each lead through stages (New, Contacted, Qualified, Proposal Sent, Won), add internal notes, and open the linked project once a lead converts.',
  },
  {
    id: 'contact',
    question: 'Who do I contact?',
    answer:
      'For project questions, use the "Request a change" form in your client portal - we read every message within one business day. For billing issues, email billing@unalabs.cloud. For urgent matters, reply directly to any email you have received from us.',
  },
];

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

export function AssistantDrawer() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const pageContext = Object.entries(PAGE_CONTEXT).find(([path]) => pathname.startsWith(path))?.[1];
  const activeIntent = GLOBAL_INTENTS.find((intent) => intent.id === activeId);

  // Close on outside click
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveId(null);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setActiveId(null);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div ref={drawerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 print:hidden">
      {open && (
        <div className="w-80 rounded-2xl border border-border bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="px-5 py-4 border-b border-border bg-bg-subtle">
            <p className="text-body-sm font-semibold text-tx-heading">Quick answers</p>
            {pageContext && <p className="mt-0.5 text-[11px] text-tx-muted">{pageContext}</p>}
          </div>

          {activeIntent ? (
            <div className="px-5 py-4">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="mb-3 text-[11px] font-semibold text-brand-teal hover:underline"
              >
                Back to questions
              </button>
              <p className="text-body-sm font-semibold text-tx-heading mb-2">{activeIntent.question}</p>
              <p className="text-body-sm text-tx-secondary leading-relaxed">{activeIntent.answer}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {GLOBAL_INTENTS.map((intent) => (
                <button
                  key={intent.id}
                  type="button"
                  onClick={() => setActiveId(intent.id)}
                  className="w-full px-5 py-3.5 text-left text-body-sm text-tx-heading hover:bg-bg-subtle transition-colors"
                >
                  {intent.question}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        aria-label={open ? 'Close quick help' : 'Open quick help'}
        onClick={() => {
          setOpen((prev) => !prev);
          setActiveId(null);
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

