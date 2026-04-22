'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getCommercialLabel } from '@/lib/service-engagement';

type ProjectRecord = {
  id: string;
  email?: string;
  name?: string;
  description?: string;
  plan?: string;
  tier?: string;
  status?: string;
  created_at?: string;
};

type MilestoneRecord = {
  id: string;
  project_id: string;
  title?: string;
  description?: string;
  due_date?: string;
  status?: string;
  created_at?: string;
};

type ReportState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; email: string; projects: ProjectRecord[]; milestones: MilestoneRecord[] };

const STATUS_BADGES: Record<string, 'teal' | 'orange' | 'muted'> = {
  intake: 'teal',
  scoped: 'orange',
  active: 'orange',
  review: 'orange',
  complete: 'teal',
  paused: 'muted',
};

function formatDate(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return value;
  }
}

function ProjectSection({ project, milestones }: { project: ProjectRecord; milestones: MilestoneRecord[] }) {
  const tierLabel = getCommercialLabel(project.tier ?? project.plan);
  const statusBadge = STATUS_BADGES[project.status?.toLowerCase() ?? 'intake'] ?? 'muted';
  const completedCount = milestones.filter((milestone) => milestone.status === 'complete').length;
  const completionRate = milestones.length > 0
    ? Math.round((completedCount / milestones.length) * 100)
    : 0;

  return (
    <div className="mb-12 break-inside-avoid">
      <div className="border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-h2 text-tx-heading font-semibold">{project.name || `Project ${project.id.slice(0, 8)}`}</h2>
          <Badge variant={statusBadge}>{project.status || 'intake'}</Badge>
        </div>
        <div className="flex items-center gap-4 text-body-sm text-tx-secondary">
          <span>{tierLabel}</span>
          <span>Started {formatDate(project.created_at)}</span>
        </div>
        {project.description && (
          <p className="mt-3 text-body text-tx-body leading-relaxed">{project.description}</p>
        )}
      </div>

      {milestones.length > 0 ? (
        <div className="space-y-3">
          <div className="mb-4 rounded-lg border border-border bg-bg-subtle p-4">
            <p className="text-body-sm text-tx-muted">Milestone completion</p>
            <p className="text-body font-semibold text-tx-heading mt-1">
              {completedCount}/{milestones.length} complete ({completionRate}%)
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-white overflow-hidden">
              <div className="h-full bg-brand-teal" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
          <h3 className="text-h4 text-tx-heading font-semibold mb-4">Milestones</h3>
          {milestones.map((milestone) => (
            <div key={milestone.id} className="flex items-start gap-4 p-4 bg-bg-subtle rounded-lg">
              <div className="flex-shrink-0 mt-0.5">
                <Badge variant={milestone.status === 'complete' ? 'teal' : milestone.status === 'in_progress' ? 'orange' : 'muted'}>
                  {milestone.status || 'pending'}
                </Badge>
              </div>
              <div className="flex-1">
                <h4 className="text-body font-semibold text-tx-heading mb-1">{milestone.title || 'Milestone'}</h4>
                {milestone.description && (
                  <p className="text-body-sm text-tx-secondary mb-2">{milestone.description}</p>
                )}
                {milestone.due_date && (
                  <p className="text-body-sm text-tx-muted">Due {formatDate(milestone.due_date)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-body-sm text-tx-muted">No milestones yet.</p>
      )}
    </div>
  );
}

export function ReportClient() {
  const [state, setState] = useState<ReportState>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);

        const session = await getSession();
        if (!session?.user) {
          if (!cancelled) setState({ phase: 'unauthenticated' });
          return;
        }

        const client = createBrowserClient();
        const projectResult = await client
          .from('projects')
          .select('*')
          .ilike('email', session.user.email ?? '')
          .order('created_at', { ascending: false });

        const projectIds = ((projectResult.data as ProjectRecord[] | null) ?? []).map((p) => p.id);
        const milestoneResult = projectIds.length > 0
          ? await client
              .from('milestones')
              .select('*')
              .in('project_id', projectIds)
              .order('due_date', { ascending: true })
          : { data: [] as MilestoneRecord[] | null, error: null };

        const projects = projectResult.data;
        const milestones = milestoneResult.data;
        if (projectResult.error) throw projectResult.error;
        if (milestoneResult.error) throw milestoneResult.error;

        if (!cancelled) {
          setState({
            phase: 'ready',
            email: session.user.email ?? '',
            projects: (projects as ProjectRecord[] | null) ?? [],
            milestones: (milestones as MilestoneRecord[] | null) ?? [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            phase: 'error',
            message: error instanceof Error ? error.message : 'Unable to load report.',
          });
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, []);

  const milestonesByProject = useMemo(() => {
    if (state.phase !== 'ready') return new Map<string, MilestoneRecord[]>();

    return state.milestones.reduce((map, milestone) => {
      const bucket = map.get(milestone.project_id) ?? [];
      bucket.push(milestone);
      map.set(milestone.project_id, bucket);
      return map;
    }, new Map<string, MilestoneRecord[]>());
  }, [state]);

  if (state.phase === 'loading') {
    return (
      <div className="min-h-[70vh] bg-white flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading your report...</p>
      </div>
    );
  }

  if (state.phase === 'unauthenticated') {
    return (
      <div className="min-h-[70vh] bg-white flex items-center justify-center">
        <div className="max-w-md text-center">
          <Badge variant="muted">Authentication required</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Sign in to view your report</h1>
          <p className="mt-4 text-body text-tx-secondary">
            This report contains your project details and milestones.
          </p>
          <div className="mt-6">
            <Button href="/login?redirect=/dashboard/report" variant="primary" size="lg">
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-[70vh] bg-white flex items-center justify-center">
        <div className="max-w-md text-center">
          <Badge variant="muted">Error loading report</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Unable to load your report</h1>
          <p className="mt-4 text-body text-tx-secondary">{state.message}</p>
          <div className="mt-6">
            <Button onClick={() => window.location.reload()} variant="primary" size="lg">
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="no-print flex justify-between items-center mb-12">
          <div>
            <h1 className="text-display-sm text-tx-heading font-semibold">Project Report</h1>
            <p className="text-body text-tx-secondary mt-2">{state.email} • {today}</p>
          </div>
          <Button onClick={() => window.print()} variant="primary" size="lg">
            Print / Save as PDF
          </Button>
        </div>

        <div className="print:block">
          <div className="mb-12 pb-8 border-b border-border">
            <h1 className="text-display text-tx-heading font-semibold">Project Report</h1>
            <p className="text-body text-tx-secondary mt-2">{state.email} • {today}</p>
          </div>

          {state.projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-body text-tx-muted">No projects found.</p>
            </div>
          ) : (
            state.projects.map((project) => (
              <ProjectSection
                key={project.id}
                project={project}
                milestones={milestonesByProject.get(project.id) ?? []}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
