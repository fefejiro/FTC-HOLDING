'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getStripeApiUrl } from '@/lib/stripe-config';
import { isProjectAdminEmail } from '@/lib/projects';

type AutoCollectHealth = {
  generated_at: string;
  queue_total: number;
  queue_pending: number;
  queue_invite_sent: number;
  queue_paid: number;
  escalations: number;
  sent_today: number;
  daily_cap: number;
  remaining_daily_budget: number;
  max_send_per_run: number;
  reminder_interval_days: number;
  max_attempts: number;
  latest_invited_at: string | null;
};

type AutoCollectRecord = {
  id: string;
  invoice_id: string;
  project_id: string;
  client_email: string;
  invoice_number: string;
  amount_cad: number;
  due_date: string;
  status: string;
  attempts: number;
  last_invited_at: string | null;
  notes: string | null;
  created_at: string;
};

type PageState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated' }
  | { phase: 'forbidden' }
  | { phase: 'error'; message: string }
  | { phase: 'ready' };

function formatCad(n: number) {
  return `CA$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(v?: string | null) {
  if (!v) return '-';
  try { return new Date(v).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return v; }
}

export function AutoCollectClient() {
  const [state, setState] = useState<PageState>({ phase: 'loading' });
  const [token, setToken] = useState('');
  const [health, setHealth] = useState<AutoCollectHealth | null>(null);
  const [queue, setQueue] = useState<AutoCollectRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [inviteId, setInviteId] = useState('');
  const [inviting, setInviting] = useState('');
  const [inviteMsg, setInviteMsg] = useState<Record<string, string>>({});

  const loadData = useCallback(async (tok: string) => {
    const [hRes, qRes] = await Promise.all([
      fetch(getStripeApiUrl('/api/admin/autocollect/health'), { headers: tok ? { Authorization: `Bearer ${tok}` } : {} }),
      fetch(getStripeApiUrl('/api/admin/autocollect'), { headers: tok ? { Authorization: `Bearer ${tok}` } : {} }),
    ]);
    if (hRes.ok) {
      const hd = await hRes.json() as { ok?: boolean; health?: AutoCollectHealth };
      if (hd.health) setHealth(hd.health);
    }
    if (qRes.ok) {
      const qd = await qRes.json() as { ok?: boolean; items?: AutoCollectRecord[] };
      if (qd.items) setQueue(qd.items);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const { getSession } = await import('@ftc/auth');
        const session = await getSession();
        if (!session?.user?.email) { setState({ phase: 'unauthenticated' }); return; }
        if (!isProjectAdminEmail(session.user.email)) { setState({ phase: 'forbidden' }); return; }
        const tok = session.access_token ?? '';
        setToken(tok);
        await loadData(tok);
        setState({ phase: 'ready' });
      } catch (e) {
        setState({ phase: 'error', message: e instanceof Error ? e.message : 'Unexpected error.' });
      }
    }
    load();
  }, [loadData]);

  async function runSweep() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch(getStripeApiUrl('/api/admin/autocollect/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({}),
      });
      const data = await res.json() as { ok?: boolean; synced?: number; reconciled_paid?: number; message?: string; error?: string };
      if (res.ok && data.ok) {
        setSyncMsg(`Swept ${data.synced ?? 0} invoices. ${data.reconciled_paid ?? 0} reconciled as paid. ${data.message ?? ''}`);
        await loadData(token);
      } else {
        setSyncMsg(data.error ?? 'Sweep failed.');
      }
    } catch {
      setSyncMsg('Network error.');
    } finally {
      setSyncing(false);
    }
  }

  async function sendInvite(itemId: string) {
    setInviting(itemId);
    setInviteMsg(prev => ({ ...prev, [itemId]: '' }));
    try {
      const res = await fetch(getStripeApiUrl('/api/admin/autocollect/send-invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ autocollect_id: itemId }),
      });
      const data = await res.json() as { ok?: boolean; skipped?: string; error?: string };
      if (res.ok && data.ok) {
        setInviteMsg(prev => ({ ...prev, [itemId]: data.skipped ? `Skipped: ${data.skipped}` : 'Reminder sent.' }));
        await loadData(token);
      } else {
        setInviteMsg(prev => ({ ...prev, [itemId]: data.error ?? 'Failed to send.' }));
      }
    } catch {
      setInviteMsg(prev => ({ ...prev, [itemId]: 'Network error.' }));
    } finally {
      setInviting('');
    }
  }

  if (state.phase === 'loading') return (
    <div className="flex items-center justify-center min-h-[320px] text-slate-400 text-sm">Loading…</div>
  );
  if (state.phase === 'unauthenticated') return (
    <div className="p-8 text-center">
      <p className="text-slate-600 mb-4">Sign in to access AutoCollect.</p>
      <Button href="/login?redirect=/dashboard/autocollect">Sign in</Button>
    </div>
  );
  if (state.phase === 'forbidden') return (
    <div className="p-8 text-center"><p className="text-slate-600">This feature is for operators only.</p></div>
  );
  if (state.phase === 'error') return (
    <div className="p-8 text-center text-red-600">{state.message}</div>
  );

  const pendingTotal = queue
    .filter(q => q.status !== 'paid')
    .reduce((acc, q) => acc + q.amount_cad, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">AutoCollect</h1>
        <p className="mt-1 text-sm text-slate-500">Automated invoice reminders and payment collection engine.</p>
      </div>

      {/* Health metrics */}
      {health && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Queue total', value: health.queue_total },
            { label: 'Pending', value: health.queue_pending },
            { label: 'Sent today', value: `${health.sent_today} / ${health.daily_cap}` },
            { label: 'Paid', value: health.queue_paid },
          ].map(m => (
            <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-400">{m.label}</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {pendingTotal > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3">
          <p className="text-sm text-orange-800">
            <span className="font-semibold">{formatCad(pendingTotal)}</span> outstanding across {queue.filter(q => q.status !== 'paid').length} invoice{queue.filter(q => q.status !== 'paid').length !== 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="primary" onClick={runSweep} disabled={syncing}>
          {syncing ? 'Running sweep…' : 'Run sweep now'}
        </Button>
        {health && (
          <p className="text-xs text-slate-400">
            Last swept: {formatDate(health.latest_invited_at)} · Daily budget remaining: {health.remaining_daily_budget}
          </p>
        )}
      </div>
      {syncMsg && (
        <p className="text-sm text-slate-600 -mt-6">{syncMsg}</p>
      )}

      {/* Queue */}
      {queue.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Collection queue</h2>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {queue.map(item => (
              <div key={item.id} className="px-4 py-3 bg-white hover:bg-slate-50 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-slate-800 font-medium truncate">{item.invoice_number}</p>
                    <Badge variant={item.status === 'paid' ? 'teal' : item.status === 'invite_sent' ? 'orange' : 'muted'}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{item.client_email} · Due {formatDate(item.due_date)} · {item.attempts} attempt{item.attempts !== 1 ? 's' : ''}</p>
                  {item.notes && <p className="text-xs text-slate-500 mt-0.5">{item.notes}</p>}
                  {inviteMsg[item.id] && <p className="text-xs text-orange-600 mt-1">{inviteMsg[item.id]}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{formatCad(item.amount_cad)}</span>
                  {item.status !== 'paid' && (
                    <button
                      onClick={() => sendInvite(item.id)}
                      disabled={inviting === item.id}
                      className="text-xs px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg border border-orange-200 transition-colors disabled:opacity-50"
                    >
                      {inviting === item.id ? 'Sending…' : 'Send reminder'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        state.phase === 'ready' && (
          <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
            Collection queue is empty.
          </div>
        )
      )}

      {/* Config summary */}
      {health && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Engine configuration</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-6 text-sm text-slate-600">
            <span>Reminder interval: <strong>{health.reminder_interval_days}d</strong></span>
            <span>Max attempts: <strong>{health.max_attempts}</strong></span>
            <span>Max per run: <strong>{health.max_send_per_run}</strong></span>
            <span>Daily cap: <strong>{health.daily_cap}</strong></span>
            <span>Escalations: <strong>{health.escalations}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
