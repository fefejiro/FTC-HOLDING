'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { loadPortfolioStatus, type ProjectStatusSummary, type Rag } from '@/lib/portfolio-status';
import { hasAdminAccess } from '@/lib/auth-guards';

function ragStyles(status: Rag): string {
  if (status === 'green') return 'bg-teal-100 text-teal-700 border-teal-200';
  if (status === 'yellow') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminStatusPage() {
  const [projects, setProjects] = useState<ProjectStatusSummary[]>([]);
  const [selectedKey, setSelectedKey] = useState('una-labs');
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [token, setToken] = useState('');
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    async function init() {
      const { getSession } = await import('@ftc/auth');
      const session = await getSession();
      if (!session?.user) {
        window.location.href = '/login?redirect=/admin/status';
        return;
      }
      if (!hasAdminAccess(session)) {
        setAuthError('Access denied.');
        return;
      }
      setToken(session.access_token ?? '');
      setAuthReady(true);
    }
    void init();
  }, []);

  useEffect(() => {
    if (!authReady || !token) return;
    let cancelled = false;

    async function load() {
      try {
        const nextProjects = await loadPortfolioStatus(token);
        if (!cancelled) {
          setProjects(nextProjects);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load portfolio status summary.');
        }
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [authReady, token]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const project = params.get('project');
    if (project) {
      setSelectedKey(project);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('project', selectedKey);
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', next);
  }, [selectedKey]);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.key === selectedKey) ?? projects[0] ?? null;
  }, [projects, selectedKey]);

  const deliveryCounts = useMemo(() => {
    if (!selectedProject) return { green: 0, yellow: 0, red: 0 };
    return selectedProject.delivery.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { green: 0, yellow: 0, red: 0 }
    );
  }, [selectedProject]);

  const projectCards = useMemo(() => {
    return projects.map((project) => {
      const counts = project.delivery.reduce(
        (acc, lane) => {
          acc[lane.status] += 1;
          return acc;
        },
        { green: 0, yellow: 0, red: 0 }
      );

      return {
        ...project,
        counts,
      };
    });
  }, [projects]);

  if (authError) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-red-300 bg-red-50 p-10 text-center shadow-lg">
          <p className="text-xl font-bold text-red-700">Access Denied</p>
          <p className="mt-3 text-sm text-red-600">{authError}</p>
          <Button href="/admin" variant="secondary" size="md">Back to Admin</Button>
        </div>
      </section>
    );
  }

  if (!authReady) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm">Verifying session...</p>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 min-h-screen">
      <div className="max-w-content mx-auto px-6 pt-16 pb-20">
        {/* Hero Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-10 mb-10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <Badge variant="teal">Portfolio Status</Badge>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900">Project Delivery Control Tower</h1>
              <p className="mt-4 text-lg text-slate-600 max-w-3xl leading-relaxed">
                One operating board for Una Labs, SayWetin, PeacePad, Just Checking In Game, UnaScout, Dispatch, and ATEAM. This page refreshes every 60 seconds with live endpoint probes and project delivery telemetry.
              </p>
              <p className="mt-3 text-sm text-slate-500 font-medium">
                {selectedProject ? `Viewing: ${selectedProject.name} · Last refreshed: ${formatDate(selectedProject.generatedAt)}` : 'Loading portfolio status...'}
              </p>
            </div>
          </div>
          <div className="mt-7 flex gap-3 flex-wrap">
            <Button href="/start-project" variant="primary" size="md">Start Your Project</Button>
            <Button href="/admin" variant="secondary" size="md">Open Admin</Button>
            {selectedProject?.quickLinks[0] && (
              <Button
                href={selectedProject.quickLinks[0].href}
                external={selectedProject.quickLinks[0].external}
                variant="ghost"
                size="md"
              >
                {selectedProject.quickLinks[0].label}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-6 text-red-700 text-sm font-medium shadow-md">
            <span className="font-bold">⚠️ Error: </span>{error}
          </div>
        )}

        {projectCards.length > 0 && (
          <>
            <div className="grid lg:grid-cols-3 gap-5 mb-10">
              {projectCards.map((project) => {
                const active = selectedProject?.key === project.key;
                return (
                  <button
                    key={project.key}
                    type="button"
                    onClick={() => setSelectedKey(project.key)}
                    className={`text-left bg-white rounded-xl border-2 p-6 shadow-md transition-all duration-200 hover:shadow-lg ${
                      active ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{project.tag}</p>
                        <h2 className="mt-2 text-xl font-bold text-slate-900">{project.name}</h2>
                      </div>
                      <span className={`inline-flex px-3 py-1 border rounded-lg font-bold text-xs uppercase whitespace-nowrap ${ragStyles(project.counts.red > 0 ? 'red' : project.counts.yellow > 0 ? 'yellow' : 'green')}`}>
                        {project.counts.red > 0 ? '🔴 At Risk' : project.counts.yellow > 0 ? '🟡 Active' : '✅ Green'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">{project.description}</p>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 px-3 py-3 border border-teal-100">
                        <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Green</p>
                        <p className="mt-1.5 text-lg font-bold text-teal-900">{project.counts.green}</p>
                      </div>
                      <div className="rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 px-3 py-3 border border-amber-100">
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Yellow</p>
                        <p className="mt-1.5 text-lg font-bold text-amber-900">{project.counts.yellow}</p>
                      </div>
                      <div className="rounded-lg bg-gradient-to-br from-red-50 to-pink-50 px-3 py-3 border border-red-100">
                        <p className="text-xs font-bold uppercase tracking-wide text-red-700">Red</p>
                        <p className="mt-1.5 text-lg font-bold text-red-900">{project.counts.red}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-slate-500 font-medium">{project.sourceLabel}</p>
                  </button>
                );
              })}
            </div>

            {selectedProject && (
              <>
                <div className="grid md:grid-cols-4 gap-5 mb-10">
                  {selectedProject.metrics.map((metric) => (
                    <div key={metric.label} className="bg-white rounded-xl border border-slate-200 p-6 shadow-md hover:shadow-lg transition-all">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{metric.label}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <p className="text-3xl font-bold text-slate-900">{metric.value}</p>
                        {metric.status && (
                          <span className={`inline-flex px-2.5 py-1 border rounded-lg font-bold text-xs uppercase whitespace-nowrap ${ragStyles(metric.status)}`}>
                            {metric.status === 'green' ? '✓' : metric.status === 'yellow' ? '⚠' : '✕'} {metric.status}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm text-slate-600">{metric.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="grid xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)] gap-8">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/50">
                      <h2 className="text-2xl font-bold text-slate-900">Delivery Lanes</h2>
                      <p className="mt-2 text-sm text-slate-600">{selectedProject.refreshNote}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="px-6 py-4 text-left font-bold text-slate-700 uppercase tracking-wider text-xs">Lane</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-700 uppercase tracking-wider text-xs">Status</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-700 uppercase tracking-wider text-xs">Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProject.delivery.map((lane) => (
                            <tr key={lane.name} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                              <td className="px-6 py-4 font-semibold text-slate-900">{lane.name}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-3 py-1.5 border rounded-lg font-bold text-xs uppercase ${ragStyles(lane.status)}`}>
                                  {lane.status === 'green' ? '✓ Green' : lane.status === 'yellow' ? '⚠ Yellow' : '✕ Red'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600">{lane.detail}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
                      <div className="flex items-center justify-between gap-3 mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">Testing Lanes</h2>
                        <span className={`inline-flex px-3.5 py-2 border rounded-lg font-bold text-xs uppercase ${ragStyles(deliveryCounts.red > 0 ? 'red' : deliveryCounts.yellow > 0 ? 'yellow' : 'green')}`}>
                          {deliveryCounts.red > 0 ? '🔴 Focus' : deliveryCounts.yellow > 0 ? '🟡 Active' : '✅ Stable'}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {selectedProject.testing.map((lane) => (
                          <div key={lane.name} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-slate-900">{lane.name}</p>
                              <span className={`inline-flex px-2.5 py-1 border rounded font-bold text-xs uppercase ${ragStyles(lane.status)}`}>
                                {lane.status === 'green' ? '✓' : lane.status === 'yellow' ? '⚠' : '✕'}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{lane.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">Current Blockers</h2>
                      <div className="space-y-3">
                        {selectedProject.blockers.length > 0 ? selectedProject.blockers.map((item) => (
                          <div key={item} className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 font-medium flex gap-3">
                            <span className="text-lg leading-none">🚫</span>
                            <span>{item}</span>
                          </div>
                        )) : (
                          <div className="rounded-xl border border-green-200 bg-green-50/80 p-4 text-sm text-green-700 font-medium flex gap-3">
                            <span className="text-lg leading-none">✅</span>
                            <span>No active blockers</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Connection Health</h2>
                    <div className="space-y-4">
                      {selectedProject.connections.map((connection) => (
                        <div key={connection.name} className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="font-semibold text-slate-900">{connection.name}</p>
                            <span className={`inline-flex px-3 py-1.5 border rounded-lg font-bold text-xs uppercase ${ragStyles(connection.status)}`}>
                              {connection.status === 'green' ? '✓ OK' : connection.status === 'yellow' ? '⚠ Slow' : '✕ Down'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{connection.detail}</p>
                          <a href={connection.url} target="_blank" rel="noreferrer" className="inline-block text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                            → Open endpoint
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Next Actions</h2>
                    <div className="space-y-3 mb-7">
                      {selectedProject.nextActions.map((item) => (
                        <div key={item} className="rounded-xl border border-slate-200 bg-gradient-to-r from-blue-50/50 to-slate-50/50 p-4 text-sm text-slate-700 leading-relaxed">
                          • {item}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.quickLinks.map((link) => (
                        <Button key={`${selectedProject.key}-${link.label}`} href={link.href} external={link.external} variant="secondary" size="sm">
                          {link.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
