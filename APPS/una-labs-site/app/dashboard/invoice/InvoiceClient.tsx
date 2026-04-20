'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { STRIPE_API_URL } from '@/lib/stripe-config';

type InvoiceRecord = {
  id: string;
  project_id: string;
  milestone_id: string;
  invoice_number: string;
  title: string;
  amount_cad: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  client_email: string;
  created_at: string;
};

type InvoiceState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated'; redirectUrl: string }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; email: string; invoice: InvoiceRecord };

function formatDate(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return value;
  }
}

function amountLabel(amount: number): string {
  return `CA$${amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoiceClient({ initialMilestoneId }: { initialMilestoneId?: string }) {
  const [state, setState] = useState<InvoiceState>({ phase: 'loading' });
  const searchParams = useSearchParams();
  const milestoneId = initialMilestoneId || searchParams.get('milestone_id');

  useEffect(() => {
    if (!milestoneId) {
      setState({ phase: 'error', message: 'No milestone ID provided.' });
      return;
    }

    const targetMilestoneId = milestoneId;

    async function loadInvoice() {
      try {
        const { getSession } = await import('@ftc/auth');
        const session = await getSession();
        if (!session?.user) {
          setState({ phase: 'unauthenticated', redirectUrl: `/login?redirect=/dashboard/invoice?milestone_id=${milestoneId}` });
          return;
        }

        const response = await fetch(`${STRIPE_API_URL}/api/invoices?milestone_id=${encodeURIComponent(targetMilestoneId)}`, {
          method: 'GET',
          headers: {
            ...(session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
        });

        const payload = await response.json() as { error?: string; invoices?: InvoiceRecord[] };
        if (!response.ok) {
          setState({ phase: 'error', message: payload.error ?? 'Unable to load invoice.' });
          return;
        }

        const invoice = payload.invoices?.[0];
        if (!invoice) {
          setState({ phase: 'error', message: 'Invoice not found for this milestone yet.' });
          return;
        }

        setState({
          phase: 'ready',
          email: session.user.email ?? '',
          invoice,
        });
      } catch (error) {
        setState({ phase: 'error', message: error instanceof Error ? error.message : 'Unable to load invoice.' });
      }
    }

    void loadInvoice();
  }, [milestoneId]);

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading invoice...</p>
      </div>
    );
  }

  if (state.phase === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Badge variant="muted">Authentication required</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Sign in to view your invoice</h1>
          <p className="mt-4 text-body text-tx-secondary">Invoices are only visible to the project owner.</p>
          <div className="mt-6">
            <a href={state.redirectUrl} className="inline-block bg-brand-teal text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
              Sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Badge variant="muted">Error loading invoice</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Unable to load invoice</h1>
          <p className="mt-4 text-body text-tx-secondary">{state.message}</p>
        </div>
      </div>
    );
  }

  const { invoice } = state;
  const isPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-10">
          <div>
            <Badge variant="teal">Invoice</Badge>
            <h1 className="mt-4 text-display-sm text-tx-heading font-semibold">{invoice.invoice_number}</h1>
            <p className="mt-2 text-body text-tx-secondary">{invoice.client_email}</p>
          </div>
          <div className="flex gap-3 no-print">
            <Button variant="secondary" size="sm" href="/dashboard">
              Back to dashboard
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              Print / Save PDF
            </Button>
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-white shadow-sm p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-bg-offwhite px-4 py-3">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Milestone</p>
              <p className="text-body text-tx-heading">{invoice.title}</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-offwhite px-4 py-3">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Amount</p>
              <p className="text-body text-tx-heading font-semibold">{amountLabel(invoice.amount_cad)}</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-offwhite px-4 py-3">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Due date</p>
              <p className="text-body text-tx-heading">{formatDate(invoice.due_date)}</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-offwhite px-4 py-3">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">Status</p>
              <Badge variant={isPaid ? 'teal' : 'orange'}>{isPaid ? 'Paid' : 'Unpaid'}</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
