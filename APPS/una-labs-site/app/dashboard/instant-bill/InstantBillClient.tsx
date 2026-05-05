'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getStripeApiUrl } from '@/lib/stripe-config';
import { isProjectAdminEmail } from '@/lib/projects';

type ProjectRecord = {
  id: string;
  client_name?: string;
  client_email?: string;
  email?: string;
  domain?: string;
  status?: string;
};

type InstantBillRecord = {
  id: string;
  project_id: string;
  description: string;
  amount_cad: number;
  payment_link_url: string;
  status: string;
  created_at: string;
};

type PageState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated' }
  | { phase: 'forbidden' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; projects: ProjectRecord[] };

function formatCad(n: number) {
  return `CA$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InstantBillClient() {
  const [state, setState] = useState<PageState>({ phase: 'loading' });
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ url: string; description: string; amount: number } | null>(null);
  const [formError, setFormError] = useState('');
  const [history, setHistory] = useState<InstantBillRecord[]>([]);
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);
        const session = await getSession();
        if (!session?.user?.email) { setState({ phase: 'unauthenticated' }); return; }
        if (!isProjectAdminEmail(session.user.email)) { setState({ phase: 'forbidden' }); return; }
        setToken(session.access_token ?? '');

        const supabase = createBrowserClient();
        const { data: projectRows } = await supabase
          .from('projects')
          .select('id, client_name, client_email, email, domain, status')
          .order('created_at', { ascending: false });

        const projectList = (projectRows ?? []) as ProjectRecord[];
        setProjects(projectList);
        if (projectList.length > 0) setSelectedProjectId(projectList[0].id);

        const { data: bills } = await supabase
          .from('instant_bills')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        setHistory((bills ?? []) as InstantBillRecord[]);

        setState({ phase: 'ready', projects: projectList });
      } catch (e) {
        setState({ phase: 'error', message: e instanceof Error ? e.message : 'Unexpected error.' });
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setResult(null);

    const amtNum = parseFloat(amount);
    if (!selectedProjectId) { setFormError('Select a project.'); return; }
    if (!description.trim()) { setFormError('Description is required.'); return; }
    if (isNaN(amtNum) || amtNum < 0.5 || amtNum > 50000) { setFormError('Amount must be between $0.50 and $50,000 CAD.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(getStripeApiUrl('/api/admin/instant-bill'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ project_id: selectedProjectId, description: description.trim(), amount_cad: amtNum }),
      });
      const payload = await res.json() as { ok?: boolean; error?: string; instant_bill?: InstantBillRecord; payment_link_url?: string };
      if (!res.ok || !payload.ok) { setFormError(payload.error ?? 'Failed to create payment link.'); return; }

      setResult({ url: payload.payment_link_url!, description: description.trim(), amount: amtNum });
      if (payload.instant_bill) setHistory(prev => [payload.instant_bill!, ...prev]);
      setDescription('');
      setAmount('');
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  if (state.phase === 'loading') return (
    <div className="flex items-center justify-center min-h-[320px] text-slate-400 text-sm">Loading…</div>
  );
  if (state.phase === 'unauthenticated') return (
    <div className="p-8 text-center">
      <p className="text-slate-600 mb-4">Sign in to access Instant Bill.</p>
      <Button href="/login?redirect=/dashboard/instant-bill">Sign in</Button>
    </div>
  );
  if (state.phase === 'forbidden') return (
    <div className="p-8 text-center">
      <p className="text-slate-600">This feature is for operators only.</p>
    </div>
  );
  if (state.phase === 'error') return (
    <div className="p-8 text-center text-red-600">{state.message}</div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Instant Bill</h1>
        <p className="mt-1 text-sm text-slate-500">Create a one-off Stripe payment link and send it to a client immediately.</p>
      </div>

      {/* Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Project selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.client_name || p.client_email || p.email || p.domain || p.id}
                </option>
              ))}
            </select>
            {selectedProject && (
              <p className="mt-1 text-xs text-slate-400">{selectedProject.client_email || selectedProject.email} · {selectedProject.status}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Extra design revisions — homepage"
              maxLength={200}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (CAD)</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">CA$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="250.00"
                min="0.50"
                max="50000"
                step="0.01"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}

          <Button type="submit" variant="primary" disabled={submitting} className="w-full">
            {submitting ? 'Creating link…' : 'Create payment link'}
          </Button>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="teal">Link created</Badge>
            <span className="text-sm text-slate-700">{result.description} · {formatCad(result.amount)}</span>
          </div>
          <p className="text-xs text-slate-500">Email sent to the client. Share the link below if needed.</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={result.url}
              className="flex-1 border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm text-slate-700 truncate"
            />
            <button
              onClick={() => copyLink(result.url)}
              className="text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <a href={result.url} target="_blank" rel="noreferrer" className="text-xs text-orange-600 hover:underline">Open link →</a>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent bills</h2>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {history.map(bill => (
              <div key={bill.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 truncate">{bill.description}</p>
                  <p className="text-xs text-slate-400">{new Date(bill.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-slate-700">{formatCad(bill.amount_cad)}</span>
                  <Badge variant={bill.status === 'paid' ? 'teal' : 'muted'}>{bill.status}</Badge>
                  <a href={bill.payment_link_url} target="_blank" rel="noreferrer" className="text-xs text-orange-500 hover:underline">Link</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
