'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type Project = {
  id: string;
  email?: string;
  tier?: string;
  billing?: string;
  status?: string;
  intake_id?: string;
  stripe_session_id?: string;
  created_at?: string;
};

type Milestone = {
  id: string;
  project_id: string;
  title?: string;
  status?: string;
  due_date?: string;
  completed_at?: string;
  proof_url?: string;
  proof_note?: string;
};

type Subscriber = {
  id: string;
  email: string;
  created_at: string;
};

type State =
  | { phase: 'loading' }
  | { phase: 'denied' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; projects: Project[]; milestones: Milestone[]; subscribers: Subscriber[] };

const ADMIN_EMAIL = 'mike.fejiro@gmail.com';

const TIER_PRICE: Record<string, number> = {
  starter: 67,
  professional: 135,
  agency: 339,
  enterprise: 679,
};

const STATUS_COLORS: Record<string, string> = {
  intake: 'bg-blue-100 text-blue-700',
  active: 'bg-orange-100 text-orange-700',
  review: 'bg-yellow-100 text-yellow-700',
  complete: 'bg-teal-100 text-teal-700',
  paused: 'bg-gray-100 text-gray-500',
};

function formatDate(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return value;
  }
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
      <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className="text-3xl font-bold text-tx-heading">{value}</p>
      {sub && <p className="text-body-sm text-tx-secondary mt-1">{sub}</p>}
    </div>
  );
}

export function AdminClient() {
  const [state, setState] = useState<State>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);
        const session = await getSession();
        if (!session?.user || session.user.email !== ADMIN_EMAIL) {
          if (!cancelled) setState({ phase: 'denied' });
          return;
        }

        const client = createBrowserClient();
        const [
          { data: projects, error: projectError },
          { data: milestones, error: milestoneError },
          { data: subscribers, error: subscriberError },
        ] = await Promise.all([
          client.from('projects').select('*').order('created_at', { ascending: false }),
          client.from('milestones').select('*').order('due_date', { ascending: true }),
          client.from('subscribers').select('*').order('created_at', { ascending: false }),
        ]);

        if (projectError) throw projectError;
        if (milestoneError) throw milestoneError;
        if (subscriberError) throw subscriberError;

        if (!cancelled) {
          setState({
            phase: 'ready',
            projects: (projects as Project[] | null) ?? [],
            milestones: (milestones as Milestone[] | null) ?? [],
            subscribers: (subscribers as Subscriber[] | null) ?? [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ phase: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-bg-offwhite flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading...</p>
      </div>
    );
  }

  if (state.phase === 'denied') {
    return (
      <div className="min-h-screen bg-bg-offwhite flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <Badge variant="muted">Access denied</Badge>
          <h1 className="mt-4 text-h2 text-tx-heading">Admin only</h1>
          <p className="mt-3 text-body text-tx-secondary">This page is restricted.</p>
          <div className="mt-6">
            <Button href="/" variant="secondary" size="md">Go home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-screen bg-bg-offwhite flex items-center justify-center px-6">
        <p className="text-body text-red-500">{state.message}</p>
      </div>
    );
  }

  const { projects, milestones, subscribers } = state;

  const totalMRR = projects
    .filter((project) => !['paused', 'complete'].includes(project.status ?? ''))
    .reduce((sum, project) => sum + (TIER_PRICE[project.tier?.toLowerCase() ?? ''] ?? 0), 0);

  const byStatus = projects.reduce<Record<string, number>>((accumulator, project) => {
    const status = project.status ?? 'intake';
    accumulator[status] = (accumulator[status] ?? 0) + 1;
    return accumulator;
  }, {});

  const milestonesByProject = milestones.reduce<Record<string, Milestone[]>>((map, milestone) => {
    if (!map[milestone.project_id]) map[milestone.project_id] = [];
    map[milestone.project_id].push(milestone);
    return map;
  }, {});

  const needsApproval = projects.filter((project) =>
    (milestonesByProject[project.id] ?? []).some((milestone) => milestone.status === 'review')
  );

  return (
    <section className="bg-bg-offwhite min-h-screen">
      <div className="max-w-content mx-auto px-6 pt-14 pb-24">
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <Badge variant="teal">Admin</Badge>
            <h1 className="mt-3 text-display-sm text-tx-heading">Una Labs - Reporting</h1>
            <p className="mt-1 text-body text-tx-muted">All projects, milestones, and subscribers.</p>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={async () => {
              const { signOut } = await import('@ftc/auth');
              await signOut();
              window.location.href = '/login';
            }}
          >
            Sign out
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Stat label="Total projects" value={projects.length} />
          <Stat label="Est. MRR" value={`CA$${totalMRR.toLocaleString('en-CA')}`} sub="Active plans only" />
          <Stat label="Needs approval" value={needsApproval.length} sub="Milestones in review" />
          <Stat label="Subscribers" value={subscribers.length} sub="Newsletter list" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
          {(['intake', 'active', 'review', 'complete', 'paused'] as const).map((status) => (
            <div key={status} className="bg-white rounded-xl border border-border px-4 py-3 flex items-center justify-between">
              <span className="text-body-sm text-tx-secondary capitalize">{status}</span>
              <span className={`text-body-sm font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
                {byStatus[status] ?? 0}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden mb-10">
          <div className="px-8 py-5 border-b border-border flex items-center justify-between">
            <h2 className="text-h3 text-tx-heading">All Projects</h2>
            <span className="text-body-sm text-tx-muted">{projects.length} total</span>
          </div>
          {projects.length === 0 ? (
            <div className="px-8 py-10 text-center text-body text-tx-muted">No projects yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-offwhite">
                    {['Client', 'Plan', 'Billing', 'Status', 'Milestones', 'Started'].map((heading) => (
                      <th key={heading} className="px-6 py-3 text-left font-semibold text-tx-muted uppercase tracking-wide text-[11px]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project, index) => {
                    const projectMilestones = milestonesByProject[project.id] ?? [];
                    const done = projectMilestones.filter((milestone) => ['done', 'complete', 'completed', 'approved'].includes(milestone.status ?? '')).length;
                    const hasReview = projectMilestones.some((milestone) => milestone.status === 'review');

                    return (
                      <tr key={project.id} className={`border-b border-border hover:bg-bg-offwhite transition-colors ${index % 2 === 0 ? '' : 'bg-bg-offwhite/40'}`}>
                        <td className="px-6 py-4">
                          <p className="font-medium text-tx-heading">{project.email}</p>
                          {project.intake_id && <p className="text-tx-muted text-[11px] mt-0.5">{project.intake_id}</p>}
                        </td>
                        <td className="px-6 py-4 capitalize text-tx-body">{project.tier ?? '-'}</td>
                        <td className="px-6 py-4 capitalize text-tx-body">{project.billing ?? '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${STATUS_COLORS[project.status ?? 'intake']}`}>
                              {project.status ?? 'intake'}
                            </span>
                            {hasReview && <span className="text-[10px] font-bold text-brand-orange">review</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-tx-body">
                          {projectMilestones.length > 0 ? `${done}/${projectMilestones.length}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-tx-muted">{formatDate(project.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-border flex items-center justify-between">
            <h2 className="text-h3 text-tx-heading">Newsletter Subscribers</h2>
            <span className="text-body-sm text-tx-muted">{subscribers.length} total</span>
          </div>
          {subscribers.length === 0 ? (
            <div className="px-8 py-10 text-center text-body text-tx-muted">No subscribers yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-offwhite">
                    {['Email', 'Subscribed'].map((heading) => (
                      <th key={heading} className="px-6 py-3 text-left font-semibold text-tx-muted uppercase tracking-wide text-[11px]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber, index) => (
                    <tr key={subscriber.id} className={`border-b border-border hover:bg-bg-offwhite transition-colors ${index % 2 === 0 ? '' : 'bg-bg-offwhite/40'}`}>
                      <td className="px-6 py-4 font-medium text-tx-heading">{subscriber.email}</td>
                      <td className="px-6 py-4 text-tx-muted">{formatDate(subscriber.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
