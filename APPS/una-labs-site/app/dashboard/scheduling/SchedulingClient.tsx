'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { isProjectAdminEmail } from '@/lib/projects';

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
};

type ScheduleState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated'; redirectUrl: string }
  | { phase: 'error'; message: string }
  | {
      phase: 'ready';
      email: string;
      isAdmin: boolean;
      projects: ProjectRecord[];
      milestones: MilestoneRecord[];
    };

type ScheduleItem = {
  project: ProjectRecord;
  milestone: MilestoneRecord;
};

function formatDateTime(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function toCalendarUtc(value: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}T${pad(value.getUTCHours())}${pad(value.getUTCMinutes())}00Z`;
}

function buildCalendarLink(item: ScheduleItem) {
  const due = item.milestone.due_date ? new Date(item.milestone.due_date) : new Date();
  const start = new Date(due);
  start.setMinutes(0, 0, 0);
  if (Number.isNaN(start.getTime())) {
    start.setTime(Date.now() + 24 * 60 * 60 * 1000);
  }
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const text = `${item.project.client_name || item.project.email || 'Client'} review - ${item.milestone.title || 'Milestone'}`;
  const details = `Project: ${item.project.id}\nMilestone: ${item.milestone.id}`;
  const dates = `${toCalendarUtc(start)}/${toCalendarUtc(end)}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text,
    details,
    dates,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function statusVariant(status?: string): 'teal' | 'orange' | 'muted' {
  const normalized = (status ?? '').toLowerCase();
  if (['approved', 'complete', 'completed', 'done'].includes(normalized)) return 'teal';
  if (['review', 'in_progress', 'active', 'pending', 'blocked'].includes(normalized)) return 'orange';
  return 'muted';
}

function isOverdue(value?: string) {
  if (!value) return false;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < Date.now();
}

export function SchedulingClient() {
  const [state, setState] = useState<ScheduleState>({ phase: 'loading' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'week' | 'month' | 'overdue'>('all');

  useEffect(() => {
    async function load() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);

        const session = await getSession();
        if (!session?.user) {
          setState({ phase: 'unauthenticated', redirectUrl: '/login?redirect=/dashboard/scheduling' });
          return;
        }

        const email = session.user.email ?? '';
        const isAdmin = isProjectAdminEmail(email);

        const client = createBrowserClient();
        const projectsQuery = isAdmin
          ? client.from('projects').select('*').order('created_at', { ascending: false })
          : client
              .from('projects')
              .select('*')
              .or(`email.eq.${email},client_email.eq.${email}`)
              .order('created_at', { ascending: false });

        const { data: projects, error: projectsError } = await projectsQuery;
        if (projectsError) throw projectsError;

        const projectRecords = (projects as ProjectRecord[] | null) ?? [];
        const projectIds = projectRecords.map((project) => project.id);
        if (projectIds.length === 0) {
          setState({ phase: 'ready', email, isAdmin, projects: [], milestones: [] });
          return;
        }

        const { data: milestones, error: milestonesError } = await client
          .from('milestones')
          .select('*')
          .in('project_id', projectIds)
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true });

        if (milestonesError) throw milestonesError;

        setState({
          phase: 'ready',
          email,
          isAdmin,
          projects: projectRecords,
          milestones: (milestones as MilestoneRecord[] | null) ?? [],
        });
      } catch (error) {
        setState({
          phase: 'error',
          message: error instanceof Error ? error.message : 'Unable to load scheduling view.',
        });
      }
    }

    void load();
  }, []);

  const scheduleItems = useMemo<ScheduleItem[]>(() => {
    if (state.phase !== 'ready') return [];
    const projectsById = new Map(state.projects.map((project) => [project.id, project]));
    return state.milestones
      .map((milestone) => {
        const project = projectsById.get(milestone.project_id);
        if (!project) return null;
        return { project, milestone };
      })
      .filter((item): item is ScheduleItem => item !== null);
  }, [state]);

  const filteredItems = useMemo(() => {
    let items = scheduleItems;

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((item) =>
        (item.milestone.title ?? '').toLowerCase().includes(q)
        || (item.project.client_name ?? '').toLowerCase().includes(q)
        || (item.project.client_email ?? '').toLowerCase().includes(q)
        || (item.project.email ?? '').toLowerCase().includes(q)
        || (item.project.domain ?? '').toLowerCase().includes(q),
      );
    }

    const now = Date.now();
    const weekLimit = now + 7 * 24 * 60 * 60 * 1000;
    const monthLimit = now + 30 * 24 * 60 * 60 * 1000;

    if (filter === 'week') {
      items = items.filter((item) => {
        const due = new Date(item.milestone.due_date ?? '').getTime();
        return !Number.isNaN(due) && due >= now && due <= weekLimit;
      });
    }

    if (filter === 'month') {
      items = items.filter((item) => {
        const due = new Date(item.milestone.due_date ?? '').getTime();
        return !Number.isNaN(due) && due >= now && due <= monthLimit;
      });
    }

    if (filter === 'overdue') {
      items = items.filter((item) => isOverdue(item.milestone.due_date));
    }

    return items;
  }, [filter, scheduleItems, search]);

  const summary = useMemo(() => {
    const now = Date.now();
    const weekLimit = now + 7 * 24 * 60 * 60 * 1000;
    const monthLimit = now + 30 * 24 * 60 * 60 * 1000;

    let week = 0;
    let month = 0;
    let overdue = 0;

    for (const item of scheduleItems) {
      const due = new Date(item.milestone.due_date ?? '').getTime();
      if (Number.isNaN(due)) continue;
      if (due < now) overdue += 1;
      if (due >= now && due <= weekLimit) week += 1;
      if (due >= now && due <= monthLimit) month += 1;
    }

    return {
      total: scheduleItems.length,
      week,
      month,
      overdue,
    };
  }, [scheduleItems]);

  if (state.phase === 'loading') {
    return (
      <section className="bg-bg-offwhite min-h-[70vh] flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading scheduling...</p>
      </section>
    );
  }

  if (state.phase === 'unauthenticated') {
    return (
      <section className="bg-white min-h-[70vh] flex items-center">
        <div className="max-w-tight mx-auto px-6 py-20 text-center">
          <Badge variant="orange">Login required</Badge>
          <h1 className="mt-6 text-h2 text-tx-heading">Please sign in to view scheduling</h1>
          <p className="mt-3 text-body text-tx-secondary">We could not detect an active session for this workspace.</p>
          <div className="mt-8">
            <Button href={state.redirectUrl} variant="primary" size="lg">Go to login</Button>
          </div>
        </div>
      </section>
    );
  }

  if (state.phase === 'error') {
    return (
      <section className="bg-white min-h-[70vh] flex items-center">
        <div className="max-w-tight mx-auto px-6 py-20 text-center">
          <Badge variant="orange">Unavailable</Badge>
          <h1 className="mt-6 text-h2 text-tx-heading">Scheduling is temporarily unavailable</h1>
          <p className="mt-3 text-body text-tx-secondary">{state.message}</p>
          <div className="mt-8">
            <Button onClick={() => window.location.reload()} variant="primary" size="lg">Refresh</Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-bg-offwhite min-h-[70vh]">
      <div className="max-w-content mx-auto px-6 pt-16 pb-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="teal">Scheduling</Badge>
            <h1 className="mt-4 text-display-sm text-tx-heading">Upcoming reviews and delivery slots</h1>
            <p className="mt-3 text-body text-tx-muted">
              {state.isAdmin
                ? 'Operator calendar across all active projects.'
                : 'Your project schedule for milestone reviews and handoff checkpoints.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href="/dashboard" variant="ghost" size="sm">Back to dashboard</Button>
            {state.isAdmin && <Button href="/dashboard/actions" variant="secondary" size="sm">Action center</Button>}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total scheduled', value: summary.total, color: 'text-tx-heading' },
            { label: 'Due this week', value: summary.week, color: 'text-brand-teal' },
            { label: 'Due this month', value: summary.month, color: 'text-brand-orange' },
            { label: 'Overdue', value: summary.overdue, color: summary.overdue > 0 ? 'text-red-500' : 'text-tx-muted' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-tx-muted">{stat.label}</p>
              <p className={`mt-1 text-h4 font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="Search by client, domain, or milestone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="flex-1 rounded-lg border border-border bg-white px-4 py-2.5 text-body-sm text-tx-heading placeholder:text-tx-muted focus:outline-none focus:border-brand-teal"
          />
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'All' },
              { key: 'week', label: 'This week' },
              { key: 'month', label: 'This month' },
              { key: 'overdue', label: 'Overdue' },
            ].map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => setFilter(pill.key as 'all' | 'week' | 'month' | 'overdue')}
                className={`rounded-full px-3 py-1.5 text-body-sm font-semibold transition-colors ${
                  filter === pill.key
                    ? 'bg-brand-teal text-white'
                    : 'border border-border bg-white text-tx-secondary hover:bg-bg-subtle'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-white p-10 text-center">
            <p className="text-body text-tx-secondary">No milestones match your current schedule filter.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {filteredItems.map((item) => (
              <div key={item.milestone.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={statusVariant(item.milestone.status)}>{item.milestone.status || 'scheduled'}</Badge>
                      {isOverdue(item.milestone.due_date) && <Badge variant="orange">Overdue</Badge>}
                    </div>
                    <h3 className="mt-3 text-h4 text-tx-heading">{item.milestone.title || 'Untitled milestone'}</h3>
                    <p className="mt-1 text-body-sm text-tx-secondary">
                      {item.project.client_name || item.project.client_email || item.project.email || 'Unknown client'}
                      {item.project.domain ? ` • ${item.project.domain}` : ''}
                    </p>
                    <p className="mt-1 text-body-sm text-tx-muted">Due {formatDateTime(item.milestone.due_date)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button href={buildCalendarLink(item)} variant="secondary" size="sm" external>
                      Book review call
                    </Button>
                    <Button href={`/dashboard/briefing?id=${item.project.id}`} variant="secondary" size="sm">
                      Open briefing
                    </Button>
                    <Button href={`/portal?id=${item.project.id}`} variant="ghost" size="sm" external>
                      Client view
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
