'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { isProjectAdminEmail, normalizeProjectStatus } from '@/lib/projects';

type ProjectRecord = {
  id: string;
  client_name?: string;
  client_email?: string;
  email?: string;
  domain?: string;
  status?: string;
};

type MilestoneRecord = {
  id: string;
  project_id: string;
  title?: string;
  status?: string;
  due_date?: string;
  proof_url?: string;
  proof_note?: string;
  completed_at?: string | null;
  created_at?: string;
};

type ActionItem = {
  milestone: MilestoneRecord;
  project?: ProjectRecord;
};

type ActionState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated'; redirectUrl: string }
  | { phase: 'forbidden'; email: string }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; email: string; projects: ProjectRecord[]; milestones: MilestoneRecord[] };

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function badgeVariant(status?: string): 'teal' | 'orange' | 'muted' {
  const normalized = (status ?? '').toLowerCase();
  if (['approved', 'complete', 'completed', 'done', 'live'].includes(normalized)) return 'teal';
  if (['review', 'in_progress', 'active', 'building', 'scoping', 'awaiting_approval'].includes(normalized)) return 'orange';
  return 'muted';
}

function isOverdue(dateValue?: string) {
  if (!dateValue) return false;
  const due = new Date(dateValue);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export function ActionCenterClient() {
  const [state, setState] = useState<ActionState>({ phase: 'loading' });
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [bulkActioning, setBulkActioning] = useState(false);
  const [search, setSearch] = useState('');
  const [dueFilter, setDueFilter] = useState<'all' | 'overdue' | 'no_due'>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);
        const session = await getSession();
        if (!session?.user) {
          setState({
            phase: 'unauthenticated',
            redirectUrl: '/login?redirect=/dashboard/actions',
          });
          return;
        }

        const email = session.user.email ?? '';
        if (!isProjectAdminEmail(email)) {
          setState({ phase: 'forbidden', email });
          return;
        }

        const client = createBrowserClient();
        const [{ data: projects, error: projectsError }, { data: milestones, error: milestonesError }] = await Promise.all([
          client.from('projects').select('*').order('created_at', { ascending: false }),
          client.from('milestones').select('*').in('status', ['review']).order('due_date', { ascending: true }),
        ]);

        if (projectsError || milestonesError) {
          throw projectsError || milestonesError || new Error('Unable to load action center.');
        }

        setState({
          phase: 'ready',
          email,
          projects: (projects as ProjectRecord[] | null) ?? [],
          milestones: (milestones as MilestoneRecord[] | null) ?? [],
        });
      } catch (err) {
        setState({
          phase: 'error',
          message: err instanceof Error ? err.message : 'Unable to load action center.',
        });
      }
    }

    void load();
  }, []);

  const actionItems = useMemo<ActionItem[]>(() => {
    if (state.phase !== 'ready') return [];
    const projectsById = new Map(state.projects.map((project) => [project.id, project]));
    return state.milestones.map((milestone) => ({
      milestone,
      project: projectsById.get(milestone.project_id),
    }));
  }, [state]);

  const filteredActionItems = useMemo(() => {
    let items = actionItems;

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(({ milestone, project }) =>
        (milestone.title ?? '').toLowerCase().includes(q)
        || (project?.client_name ?? '').toLowerCase().includes(q)
        || (project?.client_email ?? '').toLowerCase().includes(q)
        || (project?.email ?? '').toLowerCase().includes(q)
        || (project?.domain ?? '').toLowerCase().includes(q),
      );
    }

    if (dueFilter === 'overdue') {
      items = items.filter(({ milestone }) => isOverdue(milestone.due_date));
    }

    if (dueFilter === 'no_due') {
      items = items.filter(({ milestone }) => !milestone.due_date);
    }

    return items;
  }, [actionItems, dueFilter, search]);

  const projectQueueCount = useMemo(
    () => new Set(filteredActionItems.map((item) => item.milestone.project_id)).size,
    [filteredActionItems],
  );

  const handleAction = async (milestoneId: string, action: 'approved' | 'changes_requested') => {
    if (state.phase !== 'ready') return;

    try {
      setActioningId(milestoneId);
      setError('');
      const { createBrowserClient } = await import('@ftc/supabase');
      const client = createBrowserClient();
      const patch: Partial<MilestoneRecord> = {
        status: action,
        completed_at: action === 'approved' ? new Date().toISOString() : null,
      };

      const { error: updateError } = await client
        .from('milestones')
        .update(patch)
        .eq('id', milestoneId)
        .select('id')
        .single();

      if (updateError) {
        throw updateError || new Error('Milestone update failed.');
      }

      setState((previous) => {
        if (previous.phase !== 'ready') return previous;
        return {
          ...previous,
          milestones: previous.milestones.filter((milestone) => milestone.id !== milestoneId),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Milestone update failed.');
    } finally {
      setActioningId(null);
    }
  };

  const handleBulkApproveVisible = async () => {
    if (state.phase !== 'ready' || filteredActionItems.length === 0) return;

    try {
      setBulkActioning(true);
      setError('');
      const ids = filteredActionItems.map((item) => item.milestone.id);
      const { createBrowserClient } = await import('@ftc/supabase');
      const client = createBrowserClient();
      const { error: bulkError } = await client
        .from('milestones')
        .update({ status: 'approved', completed_at: new Date().toISOString() })
        .in('id', ids)
        .select('id');

      if (bulkError) {
        throw bulkError;
      }

      setState((previous) => {
        if (previous.phase !== 'ready') return previous;
        return {
          ...previous,
          milestones: previous.milestones.filter((milestone) => !ids.includes(milestone.id)),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk approve failed.');
    } finally {
      setBulkActioning(false);
    }
  };

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading action center...</p>
      </div>
    );
  }

  if (state.phase === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Badge variant="muted">Authentication required</Badge>
          <h1 className="mt-4 text-h2 text-tx-heading">Sign in to access Action Center</h1>
          <div className="mt-6">
            <a
              href={state.redirectUrl}
              className="inline-block bg-brand-teal text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'forbidden') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Badge variant="muted">Restricted</Badge>
          <h1 className="mt-4 text-h2 text-tx-heading">Action Center is operator-only</h1>
          <p className="mt-3 text-body text-tx-secondary">Signed in as {state.email}</p>
          <div className="mt-6">
            <Button href="/dashboard" variant="secondary" size="md">Back to dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Badge variant="muted">Error</Badge>
          <h1 className="mt-4 text-h2 text-tx-heading">Unable to load Action Center</h1>
          <p className="mt-3 text-body text-tx-secondary">{state.message}</p>
          <div className="mt-6">
            <Button href="/dashboard" variant="secondary" size="md">Back to dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  const openCount = filteredActionItems.length;

  return (
    <div className="min-h-screen bg-offwhite">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Badge variant="orange">Operator Lane</Badge>
            <h1 className="mt-4 text-display text-tx-heading">Action Center</h1>
            <p className="mt-2 text-body text-tx-secondary">
              Review milestones waiting for operator decision and approve or request changes in one place.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button href="/dashboard/launch-gate" variant="secondary" size="sm">Launch Gate</Button>
            <Button href="/dashboard" variant="secondary" size="sm">Back to dashboard</Button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-white px-6 py-5">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-tx-muted">Open reviews</p>
              <p className="mt-1 text-h3 text-brand-orange">{openCount}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-tx-muted">Projects in queue</p>
              <p className="mt-1 text-h3 text-tx-heading">
                {projectQueueCount}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-white px-6 py-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by milestone, client, email, or domain..."
              className="flex-1 rounded-lg border border-border bg-bg-subtle px-4 py-2.5 text-body-sm text-tx-heading placeholder:text-tx-muted focus:outline-none focus:border-brand-teal"
            />
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All due states' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'no_due', label: 'No due date' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDueFilter(option.value as 'all' | 'overdue' | 'no_due')}
                  className={`rounded-full px-3 py-1.5 text-body-sm font-semibold transition-colors ${
                    dueFilter === option.value
                      ? 'bg-brand-teal text-white'
                      : 'border border-border bg-white text-tx-secondary hover:bg-bg-subtle'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleBulkApproveVisible()}
              disabled={bulkActioning || filteredActionItems.length === 0}
              className="rounded-lg bg-brand-teal px-4 py-2.5 text-body-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {bulkActioning ? 'Approving...' : `Approve visible (${filteredActionItems.length})`}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-600">
            {error}
          </div>
        )}

        {filteredActionItems.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-white px-6 py-10 text-center">
            <Badge variant="teal">Clear queue</Badge>
            <p className="mt-3 text-body text-tx-secondary">No milestones match your current filters.</p>
            <div className="mt-6">
              <Button href="/dashboard" variant="secondary" size="md">Return to dashboard</Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {filteredActionItems.map(({ milestone, project }) => {
              const projectStatus = normalizeProjectStatus(project?.status);
              return (
                <div key={milestone.id} className="rounded-2xl border border-border bg-white px-5 py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-body font-semibold text-tx-heading truncate">{milestone.title || 'Untitled milestone'}</p>
                      <p className="mt-1 text-body-sm text-tx-secondary">
                        {(project?.client_name || project?.email || project?.client_email || 'Unknown client')} | {project?.domain || 'No domain'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant={badgeVariant(milestone.status)}>{milestone.status || 'review'}</Badge>
                        <Badge variant={badgeVariant(projectStatus)}>{projectStatus}</Badge>
                        <span className="text-body-sm text-tx-muted">Due {formatDate(milestone.due_date)}</span>
                        {isOverdue(milestone.due_date) && <Badge variant="orange">Overdue</Badge>}
                        {milestone.proof_url && (
                          <a
                            href={milestone.proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-body-sm font-semibold text-brand-teal hover:underline underline-offset-2"
                          >
                            View proof
                          </a>
                        )}
                      </div>
                      {milestone.proof_note && (
                        <p className="mt-2 text-body-sm text-tx-secondary">{milestone.proof_note}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2 text-body-sm">
                        <a href={`/portal?id=${milestone.project_id}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-teal hover:underline underline-offset-2">Portal</a>
                        <a href={`/dashboard/briefing?id=${milestone.project_id}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-teal hover:underline underline-offset-2">Briefing</a>
                        <a href={`/dashboard/report?id=${milestone.project_id}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-teal hover:underline underline-offset-2">Report</a>
                        <a href={`/dashboard/contract?id=${milestone.project_id}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-teal hover:underline underline-offset-2">Contract</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleAction(milestone.id, 'changes_requested')}
                        disabled={actioningId === milestone.id}
                        className="rounded-lg border border-brand-orange px-3 py-2 text-body-sm font-semibold text-brand-orange hover:bg-brand-orange/10 disabled:opacity-40"
                      >
                        Request changes
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAction(milestone.id, 'approved')}
                        disabled={actioningId === milestone.id}
                        className="rounded-lg bg-brand-teal px-3 py-2 text-body-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
