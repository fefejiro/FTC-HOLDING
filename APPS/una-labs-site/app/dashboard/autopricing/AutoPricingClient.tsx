'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getStripeApiUrl } from '@/lib/stripe-config';
import { isProjectAdminEmail } from '@/lib/projects';

type ProjectPricing = {
  id: string;
  client_name?: string;
  client_email?: string;
  email?: string;
  domain?: string;
  tier?: string;
  status?: string;
  description?: string;
  ai_price_min_cad?: number | null;
  ai_price_max_cad?: number | null;
  ai_price_rationale?: string | null;
  ai_price_confidence?: string | null;
  ai_price_generated_at?: string | null;
};

type PageState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated' }
  | { phase: 'forbidden' }
  | { phase: 'error'; message: string }
  | { phase: 'ready' };

function formatCad(n?: number | null) {
  if (n == null) return '-';
  return `CA$${n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(v?: string | null) {
  if (!v) return null;
  try { return new Date(v).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return v; }
}

type ConfidenceBadge = 'teal' | 'orange' | 'muted';
function confidenceVariant(c?: string | null): ConfidenceBadge {
  if (c === 'high') return 'teal';
  if (c === 'medium') return 'orange';
  return 'muted';
}

export function AutoPricingClient() {
  const [state, setState] = useState<PageState>({ phase: 'loading' });
  const [token, setToken] = useState('');
  const [projects, setProjects] = useState<ProjectPricing[]>([]);
  const [repricing, setRepricing] = useState<string>('');
  const [repriceMsgs, setRepriceMsgs] = useState<Record<string, string>>({});

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
        const tok = session.access_token ?? '';
        setToken(tok);

        const supabase = createBrowserClient();
        const { data: rows } = await supabase
          .from('projects')
          .select('id, client_name, client_email, email, domain, tier, status, description, ai_price_min_cad, ai_price_max_cad, ai_price_rationale, ai_price_confidence, ai_price_generated_at')
          .order('created_at', { ascending: false });

        setProjects((rows ?? []) as ProjectPricing[]);
        setState({ phase: 'ready' });
      } catch (e) {
        setState({ phase: 'error', message: e instanceof Error ? e.message : 'Unexpected error.' });
      }
    }
    load();
  }, []);

  async function handleReprice(projectId: string) {
    setRepricing(projectId);
    setRepriceMsgs(prev => ({ ...prev, [projectId]: '' }));
    try {
      const res = await fetch(getStripeApiUrl(`/api/admin/reprice/${projectId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({}),
      });
      const data = await res.json() as {
        ok?: boolean;
        ai_price_min_cad?: number;
        ai_price_max_cad?: number;
        ai_price_rationale?: string;
        ai_price_confidence?: string;
        ai_price_generated_at?: string;
        error?: string;
      };
      if (res.ok && data.ok) {
        setProjects(prev => prev.map(p =>
          p.id === projectId
            ? { ...p, ai_price_min_cad: data.ai_price_min_cad ?? p.ai_price_min_cad, ai_price_max_cad: data.ai_price_max_cad ?? p.ai_price_max_cad, ai_price_rationale: data.ai_price_rationale ?? p.ai_price_rationale, ai_price_confidence: data.ai_price_confidence ?? p.ai_price_confidence, ai_price_generated_at: data.ai_price_generated_at ?? p.ai_price_generated_at }
            : p
        ));
        setRepriceMsgs(prev => ({ ...prev, [projectId]: 'Pricing updated.' }));
      } else {
        setRepriceMsgs(prev => ({ ...prev, [projectId]: data.error ?? 'Repricing failed.' }));
      }
    } catch {
      setRepriceMsgs(prev => ({ ...prev, [projectId]: 'Network error.' }));
    } finally {
      setRepricing('');
    }
  }

  if (state.phase === 'loading') return (
    <div className="flex items-center justify-center min-h-[320px] text-slate-400 text-sm">Loading…</div>
  );
  if (state.phase === 'unauthenticated') return (
    <div className="p-8 text-center">
      <p className="text-slate-600 mb-4">Sign in to access AutoPricing.</p>
      <Button href="/login?redirect=/dashboard/autopricing">Sign in</Button>
    </div>
  );
  if (state.phase === 'forbidden') return (
    <div className="p-8 text-center"><p className="text-slate-600">This feature is for operators only.</p></div>
  );
  if (state.phase === 'error') return (
    <div className="p-8 text-center text-red-600">{state.message}</div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">AutoPricing</h1>
        <p className="mt-1 text-sm text-slate-500">AI-generated price ranges per project. Re-run any time the scope changes.</p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
          No projects yet.
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(project => {
            const name = project.client_name || project.client_email || project.email || project.domain || project.id;
            const hasPricing = project.ai_price_min_cad != null;
            return (
              <div key={project.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-800 text-sm">{name}</p>
                      {project.tier && (
                        <Badge variant="muted">{project.tier}</Badge>
                      )}
                      {project.status && (
                        <Badge variant={project.status === 'active' ? 'orange' : project.status === 'complete' ? 'teal' : 'muted'}>
                          {project.status}
                        </Badge>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{project.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleReprice(project.id)}
                    disabled={repricing === project.id}
                    className="text-xs px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg border border-orange-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {repricing === project.id ? 'Running AI…' : 'Re-run pricing'}
                  </button>
                </div>

                {hasPricing ? (
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Min</p>
                      <p className="text-base font-semibold text-slate-900">{formatCad(project.ai_price_min_cad)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Max</p>
                      <p className="text-base font-semibold text-slate-900">{formatCad(project.ai_price_max_cad)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Confidence</p>
                      <Badge variant={confidenceVariant(project.ai_price_confidence)}>
                        {project.ai_price_confidence ?? '-'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Generated</p>
                      <p className="text-xs text-slate-600">{formatDate(project.ai_price_generated_at) ?? '-'}</p>
                    </div>
                    {project.ai_price_rationale && (
                      <div className="col-span-2 sm:col-span-4">
                        <p className="text-xs text-slate-400">Rationale</p>
                        <p className="text-xs text-slate-600 mt-0.5">{project.ai_price_rationale}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400">No AI pricing yet — click &ldquo;Re-run pricing&rdquo; to generate.</p>
                  </div>
                )}

                {repriceMsgs[project.id] && (
                  <p className={`text-xs mt-2 ${repriceMsgs[project.id].includes('updated') ? 'text-green-600' : 'text-red-600'}`}>
                    {repriceMsgs[project.id]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
