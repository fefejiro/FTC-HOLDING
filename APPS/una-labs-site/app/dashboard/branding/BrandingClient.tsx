'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getStripeApiUrl } from '@/lib/stripe-config';
import { isProjectAdminEmail } from '@/lib/projects';

type Branding = {
  companyName?: string;
  primaryColor?: string;
  logoUrl?: string;
  tagline?: string;
  replyEmail?: string;
};

type ProjectRecord = {
  id: string;
  client_name?: string;
  client_email?: string;
  email?: string;
  domain?: string;
  status?: string;
};

type PageState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated' }
  | { phase: 'forbidden' }
  | { phase: 'error'; message: string }
  | { phase: 'ready' };

export function BrandingClient() {
  const [state, setState] = useState<PageState>({ phase: 'loading' });
  const [token, setToken] = useState('');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [branding, setBranding] = useState<Branding>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [loadingBranding, setLoadingBranding] = useState(false);

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
          .select('id, client_name, client_email, email, domain, status')
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

  // Load branding when project selection changes
  useEffect(() => {
    if (!selectedId || !token) return;
    setLoadingBranding(true);
    setBranding({});
    setSaveMsg('');
    setSaveError('');
    fetch(getStripeApiUrl(`/api/admin/branding/${selectedId}`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((data: { ok?: boolean; branding?: Branding | null }) => {
        if (data.branding) setBranding(data.branding);
      })
      .catch(() => {})
      .finally(() => setLoadingBranding(false));
  }, [selectedId, token]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg('');
    setSaveError('');

    if (branding.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(branding.primaryColor)) {
      setSaveError('Primary color must be a 6-digit hex like #FF6B35.');
      return;
    }
    if (branding.logoUrl && !branding.logoUrl.startsWith('https://')) {
      setSaveError('Logo URL must start with https://');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(getStripeApiUrl(`/api/admin/branding/${selectedId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(branding),
      });
      const payload = await res.json() as { ok?: boolean; branding?: Branding; error?: string };
      if (res.ok && payload.ok) {
        if (payload.branding) setBranding(payload.branding);
        setSaveMsg('Branding saved.');
      } else {
        setSaveError(payload.error ?? 'Failed to save.');
      }
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const selectedProject = projects.find(p => p.id === selectedId);

  if (state.phase === 'loading') return (
    <div className="flex items-center justify-center min-h-[320px] text-slate-400 text-sm">Loading…</div>
  );
  if (state.phase === 'unauthenticated') return (
    <div className="p-8 text-center">
      <p className="text-slate-600 mb-4">Sign in to access Custom Branding.</p>
      <Button href="/login?redirect=/dashboard/branding">Sign in</Button>
    </div>
  );
  if (state.phase === 'forbidden') return (
    <div className="p-8 text-center"><p className="text-slate-600">This feature is for operators only.</p></div>
  );
  if (state.phase === 'error') return (
    <div className="p-8 text-center text-red-600">{state.message}</div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Custom Branding</h1>
        <p className="mt-1 text-sm text-slate-500">Set your logo and colors on every proposal, contract, and email.</p>
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
        {selectedProject && (
          <p className="mt-1 text-xs text-slate-400">{selectedProject.client_email || selectedProject.email} · {selectedProject.status}</p>
        )}
      </div>

      {/* Branding form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {loadingBranding ? (
          <p className="text-sm text-slate-400 text-center py-6">Loading branding…</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company name</label>
              <input
                type="text"
                value={branding.companyName ?? ''}
                onChange={e => setBranding(b => ({ ...b, companyName: e.target.value }))}
                placeholder="Acme Corp"
                maxLength={80}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                value={branding.tagline ?? ''}
                onChange={e => setBranding(b => ({ ...b, tagline: e.target.value }))}
                placeholder="Building what matters."
                maxLength={120}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Primary color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={branding.primaryColor ?? '#FF6B35'}
                  onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))}
                  className="h-9 w-14 rounded border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={branding.primaryColor ?? ''}
                  onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))}
                  placeholder="#FF6B35"
                  maxLength={7}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
              <input
                type="url"
                value={branding.logoUrl ?? ''}
                onChange={e => setBranding(b => ({ ...b, logoUrl: e.target.value }))}
                placeholder="https://cdn.example.com/logo.png"
                maxLength={300}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              {branding.logoUrl?.startsWith('https://') && (
                <img
                  src={branding.logoUrl}
                  alt="Logo preview"
                  className="mt-2 h-10 object-contain rounded border border-slate-100"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reply-to email</label>
              <input
                type="email"
                value={branding.replyEmail ?? ''}
                onChange={e => setBranding(b => ({ ...b, replyEmail: e.target.value }))}
                placeholder="hello@yourcompany.com"
                maxLength={120}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            {saveMsg && <p className="text-sm text-green-600">{saveMsg}</p>}

            <Button type="submit" variant="primary" disabled={saving} className="w-full">
              {saving ? 'Saving…' : 'Save branding'}
            </Button>
          </form>
        )}
      </div>

      {/* Preview */}
      {(branding.companyName || branding.primaryColor) && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Preview</p>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-3"
              style={{ backgroundColor: branding.primaryColor ?? '#FF6B35' }}
            >
              {branding.logoUrl?.startsWith('https://') && (
                <img src={branding.logoUrl} alt="Logo" className="h-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div>
                <p className="font-semibold text-white text-sm">{branding.companyName || 'Your Company'}</p>
                {branding.tagline && <p className="text-white/80 text-xs">{branding.tagline}</p>}
              </div>
            </div>
            <div className="bg-white px-6 py-4">
              <p className="text-sm text-slate-600">This is how your branding will appear on proposals and emails.</p>
              {branding.replyEmail && (
                <p className="text-xs text-slate-400 mt-1">Replies go to {branding.replyEmail}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
