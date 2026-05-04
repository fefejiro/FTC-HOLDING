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
  completed_at?: string | null;
  proof_url?: string;
  proof_note?: string;
};

type ArtifactRecord = {
  id: string;
  project_id: string;
  title?: string;
  type?: string;
  url?: string;
  note?: string;
  created_at?: string;
};

type ReportState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; email: string; projects: ProjectRecord[]; milestones: MilestoneRecord[]; artifacts: ArtifactRecord[] };

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

function ProjectSection({
  project,
  milestones,
  artifacts,
}: {
  project: ProjectRecord;
  milestones: MilestoneRecord[];
  artifacts: ArtifactRecord[];
}) {
  const tierLabel = getCommercialLabel(project.tier ?? project.plan);
  const statusBadge = STATUS_BADGES[project.status?.toLowerCase() ?? 'intake'] ?? 'muted';
  const completedCount = milestones.filter((milestone) => ['complete', 'completed', 'approved', 'done'].includes((milestone.status ?? '').toLowerCase())).length;
  const completionRate = milestones.length > 0
    ? Math.round((completedCount / milestones.length) * 100)
    : 0;
  const proofCount = milestones.filter((milestone) => Boolean(milestone.proof_note || milestone.proof_url)).length;

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

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <p className="text-body-sm text-tx-muted">Milestone completion</p>
          <p className="text-body font-semibold text-tx-heading mt-1">{completedCount}/{milestones.length || 0} complete ({completionRate}%)</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <p className="text-body-sm text-tx-muted">Milestone proof entries</p>
          <p className="text-body font-semibold text-tx-heading mt-1">{proofCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <p className="text-body-sm text-tx-muted">Artifacts in bundle</p>
          <p className="text-body font-semibold text-tx-heading mt-1">{artifacts.length}</p>
        </div>
      </div>

      {milestones.length > 0 ? (
        <div className="space-y-3">
          <div className="mt-2 h-2 w-full rounded-full bg-bg-subtle overflow-hidden">
            <div className="h-full bg-brand-teal" style={{ width: `${completionRate}%` }} />
          </div>
          <h3 className="text-h4 text-tx-heading font-semibold mb-4 mt-6">Milestones</h3>
          {milestones.map((milestone) => (
            <div key={milestone.id} className="p-4 bg-bg-subtle rounded-lg border border-border">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-body font-semibold text-tx-heading mb-1">{milestone.title || 'Milestone'}</h4>
                  {milestone.description && (
                    <p className="text-body-sm text-tx-secondary mb-2">{milestone.description}</p>
                  )}
                </div>
                <Badge variant={['complete', 'completed', 'approved', 'done'].includes((milestone.status ?? '').toLowerCase()) ? 'teal' : (milestone.status ?? '').toLowerCase() === 'in_progress' ? 'orange' : 'muted'}>
                  {milestone.status || 'pending'}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-3 text-body-sm text-tx-muted flex-wrap">
                <span>Due {formatDate(milestone.due_date)}</span>
                {milestone.completed_at && <span>Completed {formatDate(milestone.completed_at)}</span>}
              </div>
              {(milestone.proof_note || milestone.proof_url) && (
                <div className="mt-3 rounded-lg border border-brand-teal/30 bg-white px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-teal">Milestone proof</p>
                  {milestone.proof_note && <p className="mt-1 text-body-sm text-tx-body">{milestone.proof_note}</p>}
                  {milestone.proof_url && (
                    <a href={milestone.proof_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-body-sm font-semibold text-brand-teal hover:underline">
                      Open proof link
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-body-sm text-tx-muted">No milestones yet.</p>
      )}

      <div className="mt-6">
        <h3 className="text-h4 text-tx-heading font-semibold mb-3">Artifacts and evidence</h3>
        {artifacts.length === 0 ? (
          <p className="text-body-sm text-tx-muted">No artifacts captured yet.</p>
        ) : (
          <div className="space-y-3">
            {artifacts.map((artifact) => (
              <div key={artifact.id} className="rounded-lg border border-border bg-bg-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body-sm font-semibold text-tx-heading">{artifact.title || 'Artifact'}</p>
                    <p className="mt-1 text-body-sm text-tx-secondary capitalize">{(artifact.type || 'artifact').replace(/_/g, ' ')}</p>
                    {artifact.note && <p className="mt-1 text-body-sm text-tx-secondary">{artifact.note}</p>}
                    <p className="mt-1 text-[11px] text-tx-muted">Added {formatDate(artifact.created_at)}</p>
                  </div>
                  {artifact.url && (
                    <a href={artifact.url} target="_blank" rel="noreferrer" className="text-body-sm font-semibold text-brand-teal hover:underline whitespace-nowrap">
                      Open
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
        const artifactResult = projectIds.length > 0
          ? await client
              .from('project_artifacts')
              .select('*')
              .in('project_id', projectIds)
              .order('created_at', { ascending: false })
          : { data: [] as ArtifactRecord[] | null, error: null };

        const projects = projectResult.data;
        const milestones = milestoneResult.data;
        const artifacts = artifactResult.data;
        if (projectResult.error) throw projectResult.error;
        if (milestoneResult.error) throw milestoneResult.error;
        if (artifactResult.error) throw artifactResult.error;

        if (!cancelled) {
          setState({
            phase: 'ready',
            email: session.user.email ?? '',
            projects: (projects as ProjectRecord[] | null) ?? [],
            milestones: (milestones as MilestoneRecord[] | null) ?? [],
            artifacts: (artifacts as ArtifactRecord[] | null) ?? [],
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

  const artifactsByProject = useMemo(() => {
    if (state.phase !== 'ready') return new Map<string, ArtifactRecord[]>();

    return state.artifacts.reduce((map, artifact) => {
      const bucket = map.get(artifact.project_id) ?? [];
      bucket.push(artifact);
      map.set(artifact.project_id, bucket);
      return map;
    }, new Map<string, ArtifactRecord[]>());
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

  const totalMilestones = state.milestones.length;
  const completedMilestones = state.milestones.filter((milestone) => ['complete', 'completed', 'approved', 'done'].includes((milestone.status ?? '').toLowerCase())).length;
  const approvalQueue = state.milestones.filter((milestone) => (milestone.status ?? '').toLowerCase() === 'review').length;
  const proofEntries = state.milestones.filter((milestone) => Boolean(milestone.proof_note || milestone.proof_url)).length + state.artifacts.length;

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

        <div className="mb-8 rounded-2xl border border-border bg-bg-subtle p-6">
          <h2 className="text-h3 text-tx-heading font-semibold">Executive proof bundle</h2>
          <p className="mt-2 text-body text-tx-secondary">A client-ready summary of status, proofs, and delivery artifacts across active projects.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-white px-4 py-3">
              <p className="text-body-sm text-tx-muted">Projects</p>
              <p className="mt-1 text-h4 text-tx-heading font-semibold">{state.projects.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-white px-4 py-3">
              <p className="text-body-sm text-tx-muted">Milestones complete</p>
              <p className="mt-1 text-h4 text-tx-heading font-semibold">{completedMilestones}/{totalMilestones}</p>
            </div>
            <div className="rounded-xl border border-border bg-white px-4 py-3">
              <p className="text-body-sm text-tx-muted">Approval queue</p>
              <p className="mt-1 text-h4 text-tx-heading font-semibold">{approvalQueue}</p>
            </div>
            <div className="rounded-xl border border-border bg-white px-4 py-3">
              <p className="text-body-sm text-tx-muted">Proof entries</p>
              <p className="mt-1 text-h4 text-tx-heading font-semibold">{proofEntries}</p>
            </div>
          </div>
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
                artifacts={artifactsByProject.get(project.id) ?? []}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
