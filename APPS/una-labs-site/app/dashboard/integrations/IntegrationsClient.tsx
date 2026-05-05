'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getStripeApiUrl } from '@/lib/stripe-config';
import { isProjectAdminEmail } from '@/lib/projects';

const ALLOWED_EVENTS = [
  'project.created',
  'proposal.sent',
  'payment.received',
  'milestone.approved',
] as const;

type WebhookEvent = typeof ALLOWED_EVENTS[number];

type WebhookEndpoint = {
  id: string;
  url: string;
  events: WebhookEvent[];
  created_at: string;
};

type ProjectRecord = {
  id: string;
  client_name?: string;
  client_email?: string;
  email?: string;
  domain?: string;
};

type PageState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated' }
  | { phase: 'forbidden' }
  | { phase: 'error'; message: string }
  | { phase: 'ready' };

const INTEGRATIONS = [
  {
    slug: 'zapier',
    icon: '⚡',
    name: 'Zapier',
    description: 'Connect Una Labs events to 6,000+ apps. Trigger actions in Slack, Notion, Google Sheets, and more when a project is created or a payment is received.',
    status: 'available' as const,
    setupUrl: 'https://zapier.com/',
    hint: 'Use your webhook URL below as the Zapier Webhooks trigger.',
  },
  {
    slug: 'xero',
    icon: '📊',
    name: 'Xero',
    description: 'Sync paid invoices to Xero automatically. Keep your books up to date without manual data entry.',
    status: 'coming-soon' as const,
  },
  {
    slug: 'quickbooks',
    icon: '📒',
    name: 'QuickBooks',
    description: 'Push payments and project revenue to QuickBooks Online in real time.',
    status: 'coming-soon' as const,
  },
  {
    slug: 'slack',
    icon: '💬',
    name: 'Slack',
    description: 'Get Slack notifications when milestones are approved, proposals are sent, or payments land.',
    status: 'available' as const,
    setupUrl: 'https://api.slack.com/messaging/webhooks',
    hint: 'Create a Slack incoming webhook and paste the URL in the webhook form below.',
  },
];

function formatDate(v?: string | null) {
  if (!v) return '-';
  try { return new Date(v).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return v; }
}

export function IntegrationsClient() {
  const [state, setState] = useState<PageState>({ phase: 'loading' });
  const [token, setToken] = useState('');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loadingEndpoints, setLoadingEndpoints] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([...ALLOWED_EVENTS]);
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState('');
  const [addError, setAddError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string>('');

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
        const { data: rows } = await supabase
          .from('projects')
          .select('id, client_name, client_email, email, domain')
          .order('created_at', { ascending: false });

        const projectList = (rows ?? []) as ProjectRecord[];
        setProjects(projectList);
        if (projectList.length > 0) setSelectedId(projectList[0].id);
        setState({ phase: 'ready' });
      } catch (e) {
        setState({ phase: 'error', message: e instanceof Error ? e.message : 'Unexpected error.' });
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedId || !token) return;
    setLoadingEndpoints(true);
    setEndpoints([]);
    fetch(getStripeApiUrl(`/api/admin/webhooks/${selectedId}`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((data: { ok?: boolean; endpoints?: WebhookEndpoint[] }) => {
        if (data.endpoints) setEndpoints(data.endpoints);
      })
      .catch(() => {})
      .finally(() => setLoadingEndpoints(false));
  }, [selectedId, token]);

  async function addEndpoint(e: React.FormEvent) {
    e.preventDefault();
    setAddMsg('');
    setAddError('');
    if (!webhookUrl.startsWith('https://')) { setAddError('URL must start with https://'); return; }
    if (selectedEvents.length === 0) { setAddError('Select at least one event.'); return; }

    setAdding(true);
    try {
      const res = await fetch(getStripeApiUrl('/api/admin/webhooks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ project_id: selectedId, url: webhookUrl, events: selectedEvents }),
      });
      const data = await res.json() as { ok?: boolean; endpoint?: WebhookEndpoint & { secret?: string }; error?: string };
      if (res.ok && data.ok && data.endpoint) {
        setEndpoints(prev => [...prev, data.endpoint!]);
        if (data.endpoint.secret) {
          setRevealedSecrets(prev => ({ ...prev, [data.endpoint!.id]: data.endpoint!.secret! }));
        }
        setWebhookUrl('');
        setAddMsg('Endpoint registered. Copy your signing secret — it will not be shown again.');
      } else {
        setAddError(data.error ?? 'Failed to add endpoint.');
      }
    } catch {
      setAddError('Network error.');
    } finally {
      setAdding(false);
    }
  }

  async function deleteEndpoint(id: string) {
    setDeletingId(id);
    try {
      await fetch(getStripeApiUrl(`/api/admin/webhooks/${id}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setEndpoints(prev => prev.filter(ep => ep.id !== id));
    } catch { /* swallow */ } finally {
      setDeletingId('');
    }
  }

  function toggleEvent(ev: WebhookEvent) {
    setSelectedEvents(prev =>
      prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]
    );
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  if (state.phase === 'loading') return (
    <div className="flex items-center justify-center min-h-[320px] text-slate-400 text-sm">Loading…</div>
  );
  if (state.phase === 'unauthenticated') return (
    <div className="p-8 text-center">
      <p className="text-slate-600 mb-4">Sign in to access Integrations.</p>
      <Button href="/login?redirect=/dashboard/integrations">Sign in</Button>
    </div>
  );
  if (state.phase === 'forbidden') return (
    <div className="p-8 text-center"><p className="text-slate-600">This feature is for operators only.</p></div>
  );
  if (state.phase === 'error') return (
    <div className="p-8 text-center text-red-600">{state.message}</div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-12">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Integrations</h1>
        <p className="mt-1 text-sm text-slate-500">Connect Una Labs to the tools you already use.</p>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {INTEGRATIONS.map(integration => (
          <div key={integration.slug} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{integration.icon}</span>
              <div>
                <p className="font-medium text-slate-800 text-sm">{integration.name}</p>
                <Badge variant={integration.status === 'available' ? 'teal' : 'muted'}>
                  {integration.status === 'available' ? 'Available' : 'Coming soon'}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{integration.description}</p>
            {integration.status === 'available' && integration.hint && (
              <p className="text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">{integration.hint}</p>
            )}
            {integration.status === 'available' && integration.setupUrl && (
              <a
                href={integration.setupUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs text-orange-600 hover:underline"
              >
                Set up {integration.name} →
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Webhook endpoints */}
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Webhook endpoints</h2>
          <p className="text-sm text-slate-500 mt-1">
            Una Labs sends signed POST requests to your endpoint URL when events occur.
            Each payload includes an <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">X-Una-Signature</code> HMAC-SHA256 header for verification.
          </p>
        </div>

        {/* Project selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.client_name || p.client_email || p.email || p.domain || p.id}
              </option>
            ))}
          </select>
        </div>

        {/* Existing endpoints */}
        {loadingEndpoints ? (
          <p className="text-sm text-slate-400">Loading endpoints…</p>
        ) : endpoints.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {endpoints.map(ep => (
              <div key={ep.id} className="px-4 py-3 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 truncate font-mono">{ep.url}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {ep.events.length > 0 ? ep.events.join(', ') : 'All events'} · Added {formatDate(ep.created_at)}
                    </p>
                    {revealedSecrets[ep.id] && (
                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 px-2 py-1 rounded font-mono break-all">
                          {revealedSecrets[ep.id]}
                        </code>
                        <button
                          onClick={() => copyText(revealedSecrets[ep.id], ep.id)}
                          className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                        >
                          {copied === ep.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteEndpoint(ep.id)}
                    disabled={deletingId === ep.id}
                    className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-100 transition-colors disabled:opacity-50"
                  >
                    {deletingId === ep.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
            No webhook endpoints yet for this project.
          </div>
        )}

        {/* Add endpoint form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-sm font-medium text-slate-700">Add endpoint</p>
          <form onSubmit={addEndpoint} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Webhook URL</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Events to subscribe</label>
              <div className="flex flex-wrap gap-2">
                {ALLOWED_EVENTS.map(ev => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleEvent(ev)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedEvents.includes(ev)
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    {ev}
                  </button>
                ))}
              </div>
            </div>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            {addMsg && <p className="text-sm text-green-600">{addMsg}</p>}
            <Button type="submit" variant="primary" disabled={adding}>
              {adding ? 'Registering…' : 'Add endpoint'}
            </Button>
          </form>
        </div>

        {/* Event reference */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Event reference</p>
          <div className="space-y-2">
            {[
              { ev: 'project.created', desc: 'A new project is created in the system.' },
              { ev: 'proposal.sent', desc: 'A scoped proposal is sent to the client.' },
              { ev: 'payment.received', desc: 'A Stripe payment is confirmed.' },
              { ev: 'milestone.approved', desc: 'A milestone is marked as approved.' },
            ].map(({ ev, desc }) => (
              <div key={ev} className="flex gap-3 text-sm">
                <code className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-mono whitespace-nowrap text-slate-700">{ev}</code>
                <span className="text-xs text-slate-500">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
