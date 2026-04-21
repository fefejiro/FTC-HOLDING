'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { loadPortfolioStatus, type ProjectStatusSummary, type Rag } from '@/lib/portfolio-status';

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

export default function StatusPage() {
  const [projects, setProjects] = useState<ProjectStatusSummary[]>([]);
  const [selectedKey, setSelectedKey] = useState('una-labs');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const nextProjects = await loadPortfolioStatus();
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
  }, []);

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

  return (
    <section className="bg-bg-offwhite min-h-screen">
      <div className="max-w-content mx-auto px-6 pt-14 pb-20">
        <div className="bg-white rounded-[28px] border border-border shadow-sm p-8">
          <Badge variant="teal">Portfolio Status</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Project Delivery Control Tower</h1>
          <p className="mt-3 text-body text-tx-secondary max-w-3xl">
            One operating board for Una Labs, SayWetin, PeacePad, and the next products behind them. This page refreshes every 60 seconds and mixes live endpoint probes with project delivery lanes so build health, release posture, and execution velocity can live in one place.
          </p>
          <p className="mt-2 text-[11px] text-tx-muted">
            {selectedProject ? `Current view: ${selectedProject.name} · Last refreshed: ${formatDate(selectedProject.generatedAt)}` : 'Loading portfolio status...'}
          </p>
          <div className="mt-5 flex gap-3 flex-wrap">
            <Button href="/start" variant="primary" size="md">Start Free Trial</Button>
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
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 text-body-sm">
            {error}
          </div>
        )}

        {projectCards.length > 0 && (
          <>
            <div className="grid lg:grid-cols-3 gap-4 mt-6">
              {projectCards.map((project) => {
                const active = selectedProject?.key === project.key;
                return (
                  <button
                    key={project.key}
                    type="button"
                    onClick={() => setSelectedKey(project.key)}
                    className={`text-left bg-white rounded-[24px] border p-5 shadow-sm transition-all ${
                      active ? 'border-brand-teal ring-2 ring-brand-teal/20' : 'border-border hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-tx-muted">{project.tag}</p>
                        <h2 className="mt-2 text-h3 text-tx-heading">{project.name}</h2>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 border rounded font-bold text-[11px] uppercase ${ragStyles(project.counts.red > 0 ? 'red' : project.counts.yellow > 0 ? 'yellow' : 'green')}`}>
                        {project.counts.red > 0 ? 'at risk' : project.counts.yellow > 0 ? 'active' : 'green'}
                      </span>
                    </div>
                    <p className="mt-3 text-body-sm text-tx-secondary">{project.description}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-bg-offwhite px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-tx-muted">Green</p>
                        <p className="mt-1 font-semibold text-teal-700">{project.counts.green}</p>
                      </div>
                      <div className="rounded-xl bg-bg-offwhite px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-tx-muted">Yellow</p>
                        <p className="mt-1 font-semibold text-yellow-700">{project.counts.yellow}</p>
                      </div>
                      <div className="rounded-xl bg-bg-offwhite px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-tx-muted">Red</p>
                        <p className="mt-1 font-semibold text-red-700">{project.counts.red}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] text-tx-muted">{project.sourceLabel}</p>
                  </button>
                );
              })}
            </div>

            {selectedProject && (
              <>
                <div className="grid md:grid-cols-4 gap-4 mt-6">
                  {selectedProject.metrics.map((metric) => (
                    <div key={metric.label} className="bg-white rounded-2xl border border-border p-5">
                      <p className="text-[11px] uppercase tracking-wide text-tx-muted">{metric.label}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-h2 text-tx-heading">{metric.value}</p>
                        {metric.status && (
                          <span className={`inline-flex px-2 py-0.5 border rounded font-bold text-[11px] uppercase ${ragStyles(metric.status)}`}>
                            {metric.status}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-body-sm text-tx-muted">{metric.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="grid xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)] gap-6 mt-6">
                  <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden">
                    <div className="px-8 py-5 border-b border-border">
                      <h2 className="text-h3 text-tx-heading">Delivery Lanes</h2>
                      <p className="mt-1 text-body-sm text-tx-secondary">{selectedProject.refreshNote}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-body-sm">
                        <thead>
                          <tr className="border-b border-border bg-bg-offwhite">
                            <th className="px-6 py-3 text-left font-semibold text-tx-muted uppercase tracking-wide text-[11px]">Lane</th>
                            <th className="px-6 py-3 text-left font-semibold text-tx-muted uppercase tracking-wide text-[11px]">Status</th>
                            <th className="px-6 py-3 text-left font-semibold text-tx-muted uppercase tracking-wide text-[11px]">Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProject.delivery.map((lane) => (
                            <tr key={lane.name} className="border-b border-border hover:bg-bg-offwhite/60 transition-colors">
                              <td className="px-6 py-4 font-medium text-tx-heading">{lane.name}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-0.5 border rounded font-bold text-[11px] uppercase ${ragStyles(lane.status)}`}>
                                  {lane.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-tx-body">{lane.detail}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white rounded-[28px] border border-border shadow-sm p-8">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-h3 text-tx-heading">Testing Lanes</h2>
                        <span className={`inline-flex px-2 py-0.5 border rounded font-bold text-[11px] uppercase ${ragStyles(deliveryCounts.red > 0 ? 'red' : deliveryCounts.yellow > 0 ? 'yellow' : 'green')}`}>
                          {deliveryCounts.red > 0 ? 'needs focus' : deliveryCounts.yellow > 0 ? 'moving' : 'stable'}
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {selectedProject.testing.map((lane) => (
                          <div key={lane.name} className="rounded-xl border border-border p-4">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-tx-heading">{lane.name}</p>
                              <span className={`inline-flex px-2 py-0.5 border rounded font-bold text-[11px] uppercase ${ragStyles(lane.status)}`}>
                                {lane.status}
                              </span>
                            </div>
                            <p className="mt-2 text-body-sm text-tx-secondary">{lane.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-[28px] border border-border shadow-sm p-8">
                      <h2 className="text-h3 text-tx-heading">Current Blockers</h2>
                      <div className="mt-4 space-y-3">
                        {selectedProject.blockers.map((item) => (
                          <div key={item} className="rounded-xl border border-red-100 bg-red-50/70 p-4 text-body-sm text-red-700">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6 mt-6">
                  <div className="bg-white rounded-[28px] border border-border shadow-sm p-8">
                    <h2 className="text-h3 text-tx-heading">Connection Health</h2>
                    <div className="mt-4 space-y-3">
                      {selectedProject.connections.map((connection) => (
                        <div key={connection.name} className="rounded-xl border border-border p-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-tx-heading">{connection.name}</p>
                            <span className={`inline-flex px-2 py-0.5 border rounded font-bold text-[11px] uppercase ${ragStyles(connection.status)}`}>
                              {connection.status}
                            </span>
                          </div>
                          <p className="mt-2 text-body-sm text-tx-secondary">{connection.detail}</p>
                          <a href={connection.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-semibold text-brand-teal hover:underline">
                            Open endpoint
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-[28px] border border-border shadow-sm p-8">
                    <h2 className="text-h3 text-tx-heading">Next Actions</h2>
                    <div className="mt-4 space-y-3">
                      {selectedProject.nextActions.map((item) => (
                        <div key={item} className="rounded-xl border border-border bg-bg-offwhite p-4 text-body-sm text-tx-secondary">
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 flex gap-3 flex-wrap">
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
