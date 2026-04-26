'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getAteamEndpoint, isProjectAdminEmail, normalizeProjectStatus } from '@/lib/projects';
import { getStripeApiUrl } from '@/lib/stripe-config';
import { getCommercialBillingLabel, getCommercialLabel, isActivationCommercial } from '@/lib/service-engagement';

type ProjectRecord = {
  id: string;
  client_name?: string;
  client_email?: string;
  domain?: string;
  description?: string;
  email?: string;
  tier?: string;
  billing?: string;
  status?: string;
  live_url?: string | null;
  handover_doc?: string | null;
  notes?: string | null;
  intake_id?: string;
  stripe_session_id?: string;
  ai_price_min_cad?: number | null;
  ai_price_max_cad?: number | null;
  ai_price_rationale?: string | null;
  ai_price_confidence?: string | null;
  ai_price_generated_at?: string | null;
  created_at?: string;
};

type MilestoneRecord = {
  id: string;
  project_id: string;
  title?: string;
  status?: string;
  due_date?: string;
  completed_at?: string;
  proof_url?: string;
  proof_note?: string;
};

type DashboardState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; email: string; projects: ProjectRecord[]; milestones: MilestoneRecord[] };

type OpsSuite = {
  id: string;
  label: string;
  enabled: boolean;
  status: 'passing' | 'failing' | 'pending';
  reason: string;
  checksTotal: number;
  checksPassed: number;
  checksFailed: number;
  passRate: number;
};

type OpsMetrics = {
  generatedAt: string;
  summary: {
    overallStatus: 'green' | 'red' | 'yellow';
    checksTotal: number;
    checksPassed: number;
    checksFailed: number;
    passRate: number;
    activeSuites: number;
    pendingSuites: number;
    cycleDurationMs: number;
  };
  velocity: {
    commits14d: number;
    commits30d: number;
    signal: 'low' | 'medium' | 'high';
  };
  suites: OpsSuite[];
  nextActions: string[];
};

const STATUS_CONFIG: Record<string, { label: string; description: string; next: string; badge: 'teal' | 'orange' | 'muted' }> = {
  intake: {
    label: 'Getting started',
    description: "We've received your request and are setting up your workspace.",
    next: 'Expect a kick-off message within 1 business day.',
    badge: 'teal',
  },
  scoped: {
    label: 'Discovery',
    description: 'Your project is in internal scope review while we prepare the plan pack for approval.',
    next: 'We will publish the scoped plan to your portal once review is complete.',
    badge: 'teal',
  },
  awaiting_approval: {
    label: 'Plan pending approval',
    description: 'Your scoped plan is ready and waiting on your review, signature, or deposit step.',
    next: 'Open the proposal and engagement letter to keep the project moving.',
    badge: 'orange',
  },
  active: {
    label: 'In progress',
    description: 'Work is underway. Milestones will update as we hit each stage.',
    next: 'Review milestones below and flag anything that needs adjusting.',
    badge: 'orange',
  },
  review: {
    label: 'Awaiting your feedback',
    description: "We've submitted work for your review.",
    next: 'Check the milestones below - some are ready for your approval.',
    badge: 'orange',
  },
  complete: {
    label: 'Delivered',
    description: 'This project has been completed and handed off.',
    next: 'Need something new? Start a fresh request anytime.',
    badge: 'teal',
  },
  paused: {
    label: 'On hold',
    description: 'This project is currently paused.',
    next: 'Reply to your last email to get things moving again.',
    badge: 'muted',
  },
  support: {
    label: 'Ongoing support',
    description: 'The project is now in a support or maintenance lane.',
    next: 'Use the portal to track updates, requests, and support milestones.',
    badge: 'teal',
  },
};

function formatDate(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return value;
  }
}

function formatPriceRange(min?: number | null, max?: number | null) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return `CA$${Number(min).toLocaleString('en-CA')} - CA$${Number(max).toLocaleString('en-CA')}`;
}

function PlanLabel({ tier, billing }: { tier?: string; billing?: string }) {
  const tierLabel = getCommercialLabel(tier);
  const billingLabel = getCommercialBillingLabel(billing);
  const isActivation = isActivationCommercial(tier);
  return (
    <span className="text-body text-tx-secondary">
      {tierLabel}{billingLabel && !isActivation ? ` | ${billingLabel}` : ''}
    </span>
  );
}

type MilestoneCardProps = {
  milestone: MilestoneRecord;
  clientEmail: string;
  projectTitle: string;
  onStatusChange: (id: string, newStatus: string) => void;
};

function MilestoneCard({ milestone, clientEmail, projectTitle, onStatusChange }: MilestoneCardProps) {
  const status = milestone.status?.toLowerCase() ?? 'pending';
  const isReview = status === 'review';
  const isDone = ['done', 'complete', 'completed', 'approved'].includes(status);
  const isChangesRequested = status === 'changes_requested';

  const [actionState, setActionState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const handleAction = async (action: 'approve' | 'changes') => {
    if (action === 'changes' && !showNotes) {
      setShowNotes(true);
      return;
    }

    setActionState('loading');

    try {
      const [{ getSession }, { createBrowserClient }] = await Promise.all([
        import('@ftc/auth'),
        import('@ftc/supabase'),
      ]);
      const session = await getSession();
      if (!session?.user) {
        setActionState('error');
        return;
      }

      const supabase = createBrowserClient();
      const newStatus = action === 'approve' ? 'approved' : 'changes_requested';
      const { error } = await supabase
        .from('milestones')
        .update({ status: newStatus, completed_at: action === 'approve' ? new Date().toISOString() : null })
        .eq('id', milestone.id);

      if (error) {
        setActionState('error');
        return;
      }

      await fetch(getStripeApiUrl('/api/milestone-action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestone_id: milestone.id,
          milestone_title: milestone.title,
          project_title: projectTitle,
          action,
          notes: notes.trim() || undefined,
          client_email: clientEmail,
        }),
      }).catch(() => {
        // Keep the customer flow moving even if the notification send fails.
      });

      if (action === 'approve') {
        fetch(getStripeApiUrl('/api/invoices/generate'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ milestone_id: milestone.id }),
        }).catch(() => {
          // Non-fatal. Invoice generation can be retried server-side.
        });
      }

      setActionState('done');
      onStatusChange(milestone.id, newStatus);
    } catch {
      setActionState('error');
    }
  };

  let borderClass = 'border-border bg-bg-offwhite';
  if (isReview) borderClass = 'border-brand-orange/40 bg-orange-50/40';
  if (isDone) borderClass = 'border-brand-teal/30 bg-brand-teal-light/30';
  if (isChangesRequested) borderClass = 'border-red-200 bg-red-50/40';

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${borderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-body font-semibold ${isDone ? 'text-brand-teal line-through opacity-70' : 'text-tx-heading'}`}>
          {milestone.title || 'Milestone'}
        </p>
        {isDone && <span className="text-brand-teal text-body-sm font-semibold leading-none flex-shrink-0">Approved</span>}
        {isReview && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-brand-orange text-white flex-shrink-0">Needs approval</span>}
        {isChangesRequested && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-red-100 text-red-600 flex-shrink-0">Changes requested</span>}
      </div>

      {!isReview && !isDone && !isChangesRequested && (
        <p className="text-body-sm text-tx-muted">
          {status === 'in_progress' ? 'In progress' : status === 'pending' ? 'Coming up' : status}
        </p>
      )}

      {milestone.due_date && !isDone && (
        <p className="text-body-sm text-tx-muted">Due {formatDate(milestone.due_date)}</p>
      )}
      {milestone.completed_at && isDone && (
        <p className="text-body-sm text-tx-muted">Completed {formatDate(milestone.completed_at)}</p>
      )}

      {(milestone.proof_url || milestone.proof_note) && (
        <div className="mt-1 rounded-xl border border-brand-teal/30 bg-white px-4 py-3 flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-teal">Delivery proof</p>
          {milestone.proof_note && (
            <p className="text-body-sm text-tx-body leading-relaxed">{milestone.proof_note}</p>
          )}
          {milestone.proof_url && (
            <a
              href={milestone.proof_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand-teal hover:underline underline-offset-2 break-all"
            >
              <span>Open</span>
              <span>{milestone.proof_url.replace(/^https?:\/\//, '').split('/')[0]}</span>
            </a>
          )}
        </div>
      )}

      {isReview && actionState === 'idle' && (
        <div className="mt-1 flex flex-col gap-2">
          {showNotes && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what needs to change..."
              rows={3}
              className="w-full px-3 py-2 text-body-sm border border-border rounded-lg focus:outline-none focus:border-border-focus resize-none"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleAction('approve')}
              className="flex-1 px-3 py-2 bg-brand-teal text-white text-body-sm font-semibold rounded-lg hover:bg-brand-teal/90 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => showNotes ? handleAction('changes') : setShowNotes(true)}
              className="flex-1 px-3 py-2 border border-red-300 text-red-600 text-body-sm font-semibold rounded-lg hover:bg-red-50 transition-colors"
            >
              {showNotes ? 'Send feedback' : 'Request changes'}
            </button>
          </div>
          {showNotes && (
            <button onClick={() => setShowNotes(false)} className="text-body-sm text-tx-muted hover:text-tx-secondary text-center">
              Cancel
            </button>
          )}
        </div>
      )}

      {isReview && actionState === 'loading' && (
        <p className="text-body-sm text-tx-muted animate-pulse">Saving...</p>
      )}
      {isReview && actionState === 'done' && (
        <p className="text-body-sm text-brand-teal font-medium">Saved - we've been notified.</p>
      )}
      {actionState === 'error' && (
        <p className="text-body-sm text-red-500">Something went wrong. Try refreshing.</p>
      )}
      {(status === 'approved' || actionState === 'done') && (
        <a
          href={`/dashboard/invoice?milestone_id=${milestone.id}`}
          className="text-[11px] font-semibold text-brand-teal hover:underline mt-1 block"
        >
          View Invoice -&gt;
        </a>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  milestones,
  clientEmail,
  onMilestoneStatusChange,
}: {
  project: ProjectRecord;
  milestones: MilestoneRecord[];
  clientEmail: string;
  onMilestoneStatusChange: (id: string, newStatus: string) => void;
}) {
  const status = project.status?.toLowerCase() ?? 'intake';
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.intake;
  const done = milestones.filter((m) => ['done', 'complete', 'completed', 'approved'].includes(m.status?.toLowerCase() ?? '')).length;
  const total = milestones.length;
  const hasReview = milestones.some((m) => m.status?.toLowerCase() === 'review');
  const projectTitle = project.intake_id || project.id;
  const priceRange = formatPriceRange(project.ai_price_min_cad, project.ai_price_max_cad);

  return (
    <div className="rounded-[28px] border border-border bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={cfg.badge}>{cfg.label}</Badge>
            {hasReview && (
              <span className="inline-block text-eyebrow uppercase tracking-widest px-3 py-1 rounded-full bg-brand-orange text-white text-[11px] font-bold animate-pulse">
                Action needed
              </span>
            )}
            <PlanLabel tier={project.tier} billing={project.billing} />
          </div>
          <p className="mt-4 text-body-lg text-tx-secondary leading-relaxed">{cfg.description}</p>
          <div className="mt-3 rounded-xl bg-bg-subtle border border-border px-4 py-3">
            <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">What&apos;s next</p>
            <p className="text-body text-tx-heading">{cfg.next}</p>
          </div>
          {priceRange && (
            <div className="mt-3 rounded-xl bg-white border border-border px-4 py-3">
              <p className="text-body-sm text-tx-muted uppercase tracking-wider font-semibold mb-1">AI price insight</p>
              <p className="text-body font-semibold text-tx-heading">{priceRange}</p>
              {project.ai_price_confidence && (
                <p className="text-body-sm text-tx-muted capitalize mt-1">{project.ai_price_confidence} confidence</p>
              )}
              {project.ai_price_rationale && (
                <p className="text-body-sm text-tx-secondary mt-1 leading-relaxed">{project.ai_price_rationale}</p>
              )}
            </div>
          )}
        </div>
        <div className="text-body-sm text-tx-muted lg:text-right shrink-0">
          <p>Started {formatDate(project.created_at)}</p>
          {total > 0 && (
            <p className="mt-1 font-semibold text-tx-secondary">{done}/{total} milestones done</p>
          )}
        </div>
      </div>

      {total > 0 && (
        <>
          <div className="mt-6 h-2 rounded-full bg-bg-subtle overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-teal transition-all duration-700"
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {milestones.map((milestone) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                clientEmail={clientEmail}
                projectTitle={projectTitle}
                onStatusChange={onMilestoneStatusChange}
              />
            ))}
          </div>
        </>
      )}

      {total === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-bg-offwhite p-6 text-center">
          <p className="text-body text-tx-secondary">Milestones will appear here once your project kicks off.</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button href={`/dashboard/report`} variant="secondary" size="sm">
          View Report
        </Button>
        <Button href={`/dashboard/proposal?id=${project.id}`} variant="secondary" size="sm" external>
          View Proposal
        </Button>
        <Button href={`/dashboard/contract?id=${project.id}`} variant="secondary" size="sm">
          View Contract
        </Button>
        <Button href={`/portal?id=${project.id}`} variant="secondary" size="sm" external>
          Client View
        </Button>
      </div>
    </div>
  );
}

export function DashboardClient() {
  const [state, setState] = useState<DashboardState>({ phase: 'loading' });
  const [milestoneStatuses, setMilestoneStatuses] = useState<Record<string, string>>({});
  const [adminProjects, setAdminProjects] = useState<ProjectRecord[]>([]);
  const [adminActionId, setAdminActionId] = useState<string | null>(null);
  const [adminError, setAdminError] = useState('');
  const [opsMetrics, setOpsMetrics] = useState<OpsMetrics | null>(null);
  const [opsMetricsError, setOpsMetricsError] = useState('');
  const [handoverPreview, setHandoverPreview] = useState<{ projectId: string; projectName: string; doc: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function loadForSession(session: { user: { email?: string } }) {
      const { createBrowserClient } = await import('@ftc/supabase');
      const client = createBrowserClient();
      const email = session.user.email ?? '';
      const projectResult = await client
        .from('projects')
        .select('*')
        .eq('client_email', email)
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
        if (isProjectAdminEmail(email)) {
          const adminResult = await client
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });
          if (adminResult.error) throw adminResult.error;
          setAdminProjects((adminResult.data as ProjectRecord[] | null) ?? []);
        } else {
          setAdminProjects([]);
        }

        setState({
          phase: 'ready',
          email,
          projects: (projects as ProjectRecord[] | null) ?? [],
          milestones: (milestones as MilestoneRecord[] | null) ?? [],
        });
      }
    }

    async function init() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);

        const client = createBrowserClient();
        const authSubscription = client.auth.onAuthStateChange(async (event, authSession) => {
          if (cancelled) return;

          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && authSession?.user) {
            try {
              await loadForSession(authSession);
            } catch (error) {
              if (!cancelled) {
                setState({
                  phase: 'error',
                  message: error instanceof Error ? error.message : 'Unable to load portal.',
                });
              }
            }
          }
        });
        unsubscribe = () => authSubscription.data.subscription.unsubscribe();

        const session = await getSession();
        if (session?.user) {
          await loadForSession(session);
        } else if (!window.location.hash.includes('access_token=')) {
          if (!cancelled) setState({ phase: 'unauthenticated' });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            phase: 'error',
            message: error instanceof Error ? error.message : 'Unable to load your portal right now.',
          });
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const handleMilestoneStatusChange = (id: string, newStatus: string) => {
    setMilestoneStatuses((previous) => ({ ...previous, [id]: newStatus }));
  };

  useEffect(() => {
    if (state.phase !== 'ready' || !isProjectAdminEmail(state.email)) return;

    let active = true;

    const loadOpsMetrics = async () => {
      try {
        const response = await fetch(`/ops/portfolio-e2e-status.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Metrics file unavailable (${response.status})`);
        const payload = await response.json() as OpsMetrics;
        if (!active) return;
        setOpsMetrics(payload);
        setOpsMetricsError('');
      } catch (error) {
        if (!active) return;
        setOpsMetricsError(error instanceof Error ? error.message : 'Unable to load operations metrics.');
      }
    };

    void loadOpsMetrics();
    const interval = window.setInterval(() => {
      void loadOpsMetrics();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [state]);

  const handleAdminProjectPatch = async (projectId: string, patch: Partial<ProjectRecord>) => {
    try {
      setAdminActionId(projectId);
      setAdminError('');
      const { createBrowserClient } = await import('@ftc/supabase');
      const client = createBrowserClient();
      const { data, error } = await client
        .from('projects')
        .update(patch)
        .eq('id', projectId)
        .select('*')
        .single();

      if (error || !data) {
        throw error || new Error('Project update failed.');
      }

      setAdminProjects((previous) => previous.map((project) => (project.id === projectId ? { ...project, ...data } : project)));
      setState((previous) => previous.phase !== 'ready'
        ? previous
        : {
            ...previous,
            projects: previous.projects.map((project) => (project.id === projectId ? { ...project, ...data } : project)),
          });
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Project update failed.');
    } finally {
      setAdminActionId(null);
    }
  };

  const handleMarkLive = async (projectId: string) => {
    const current = adminProjects.find((project) => project.id === projectId);
    const liveUrl = window.prompt('Enter the live URL for this project:', current?.live_url || '');
    if (!liveUrl) return;
    await handleAdminProjectPatch(projectId, {
      status: 'live',
      live_url: liveUrl.trim(),
    });
  };

  const handleGenerateHandover = async (projectId: string) => {
    try {
      setAdminActionId(projectId);
      setAdminError('');
      const [{ getSession }, { createBrowserClient }] = await Promise.all([
        import('@ftc/auth'),
        import('@ftc/supabase'),
      ]);
      const session = await getSession();
      const endpoint = getAteamEndpoint('/api/ateam/generate-handover');
      if (!endpoint) {
        throw new Error('ATEAM upstream is not configured.');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          supabase_access_token: session?.access_token || '',
        }),
      });
      const body = await response.json() as { handover_doc?: string; project?: ProjectRecord; error?: string };
      if (!response.ok || !body.handover_doc) {
        throw new Error(body.error || 'Handover generation failed.');
      }

      const client = createBrowserClient();
      const { data } = await client
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (data) {
        setAdminProjects((previous) => previous.map((project) => (project.id === projectId ? { ...project, ...data } : project)));
      }

      const projectName = data?.client_name || data?.client_email || projectId;
      setHandoverPreview({ projectId, projectName, doc: body.handover_doc });
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Handover generation failed.');
    } finally {
      setAdminActionId(null);
    }
  };

  const handleDownloadSummary = () => {
    if (state.phase !== 'ready') return;

    const generatedDate = new Date().toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const lines: string[] = [
      'Una Labs — Project Summary',
      `Generated: ${generatedDate}`,
      `Account: ${state.email}`,
      '',
    ];

    state.projects.forEach((project) => {
      lines.push(`Plan: ${project.tier ?? 'Unknown'}`);
      lines.push(`Billing: ${project.billing ?? 'Unknown'}`);
      lines.push(`Status: ${project.status ?? 'Unknown'}`);
      lines.push(`Start date: ${formatDate(project.created_at)}`);
      const priceRange = formatPriceRange(project.ai_price_min_cad, project.ai_price_max_cad);
      if (priceRange) {
        lines.push(`AI price insight: ${priceRange}${project.ai_price_confidence ? ` (${project.ai_price_confidence} confidence)` : ''}`);
      }

      const projectMilestones = milestonesByProject.get(project.id) ?? [];
      if (projectMilestones.length > 0) {
        lines.push('Milestones:');
        projectMilestones.forEach((milestone) => {
          lines.push(`  - ${milestone.title ?? 'Untitled'} | Due: ${formatDate(milestone.due_date)} | Status: ${milestone.status ?? 'Unknown'}`);
        });
      } else {
        lines.push('Milestones: None');
      }

      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'una-labs-summary.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const milestonesByProject = useMemo(() => {
    if (state.phase !== 'ready') return new Map<string, MilestoneRecord[]>();

    return state.milestones.reduce((map, milestone) => {
      const effectiveMilestone = { ...milestone, status: milestoneStatuses[milestone.id] ?? milestone.status };
      const bucket = map.get(milestone.project_id) ?? [];
      bucket.push(effectiveMilestone);
      map.set(milestone.project_id, bucket);
      return map;
    }, new Map<string, MilestoneRecord[]>());
  }, [state, milestoneStatuses]);

  if (state.phase === 'loading') {
    return (
      <div className="min-h-[70vh] bg-bg-offwhite flex items-center justify-center">
        <p className="text-body text-tx-muted animate-pulse">Loading your portal...</p>
      </div>
    );
  }

  if (state.phase === 'unauthenticated') {
    return (
      <section className="bg-white min-h-[70vh] flex items-center">
        <div className="max-w-tight mx-auto px-6 py-20 text-center">
          <Badge variant="muted">Sign-in required</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Your projects live here</h1>
          <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
            Log in with your email to see your active projects, milestones, and what&apos;s happening next.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href="/login?redirect=/dashboard" variant="primary" size="lg">Log in</Button>
            <Button href="/start-project" variant="secondary" size="lg">Start your project</Button>
          </div>
        </div>
      </section>
    );
  }

  if (state.phase === 'error') {
    return (
      <section className="bg-white min-h-[70vh] flex items-center">
        <div className="max-w-tight mx-auto px-6 py-20 text-center">
          <Badge variant="muted">Something went wrong</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Your portal could not load</h1>
          <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
            Try refreshing. If the problem continues, email us at{' '}
            <a href="mailto:hello@unalabs.cloud" className="text-brand-teal underline">hello@unalabs.cloud</a>.
          </p>
          <div className="mt-8">
            <Button onClick={() => window.location.reload()} variant="primary" size="lg">Refresh</Button>
          </div>
        </div>
      </section>
    );
  }

  const firstName = state.email.split('@')[0].split('.')[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const isAdmin = isProjectAdminEmail(state.email);
  const hasAnyReview = state.milestones.some(
    (milestone) => (milestoneStatuses[milestone.id] ?? milestone.status)?.toLowerCase() === 'review'
  );

  return (
    <section className="bg-bg-offwhite min-h-[70vh]">
      <div className="max-w-content mx-auto px-6 pt-16 pb-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="teal">Client Portal</Badge>
              {hasAnyReview && (
                <span className="inline-block text-eyebrow uppercase tracking-widest px-3 py-1 rounded-full bg-brand-orange text-white text-[11px] font-bold">
                  Approval needed
                </span>
              )}
            </div>
            <h1 className="mt-4 text-display-sm text-tx-heading">
              Hey {displayName} - here&apos;s where things stand
            </h1>
            <p className="mt-3 text-body text-tx-muted">{state.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const { signOut } = await import('@ftc/auth');
              await signOut();
              window.location.href = '/login';
            }}
          >
            Sign out
          </Button>
        </div>

        {state.projects.length === 0 ? (
          <div className="mt-12 rounded-[28px] border border-border bg-white p-10 shadow-sm text-center">
            <div className="text-5xl mb-4">0</div>
            <h2 className="text-h3 text-tx-heading">No active projects yet</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary max-w-md mx-auto">
              Once you complete the intake and payment, your project will appear here with live status updates.
            </p>
            <div className="mt-8">
              <Button href="/start-project" variant="primary" size="lg">Start your project</Button>
            </div>
          </div>
        ) : (
          <div className="mt-12 grid gap-6">
            {state.projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                milestones={milestonesByProject.get(project.id) ?? []}
                clientEmail={state.email}
                onMilestoneStatusChange={handleMilestoneStatusChange}
              />
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="mt-12 rounded-[28px] border border-border bg-white p-8 shadow-sm">
            <div className="rounded-2xl border border-border bg-bg-offwhite p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <Badge variant="teal">Ops automation</Badge>
                  <h3 className="mt-3 text-h4 text-tx-heading">Realtime E2E and velocity telemetry</h3>
                  <p className="mt-1 text-body-sm text-tx-secondary">Auto-refreshes every 30 seconds from the portfolio metrics artifact.</p>
                </div>
                <a
                  href="/ops/portfolio-e2e-status.json"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border px-3 py-2 text-body-sm font-semibold text-tx-heading hover:bg-white"
                >
                  Open JSON feed
                </a>
              </div>

              {opsMetricsError && (
                <p className="mt-4 text-body-sm text-red-600">{opsMetricsError}</p>
              )}

              {opsMetrics && (
                <>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-border bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-tx-muted">Checks</p>
                      <p className="mt-1 text-h4 text-tx-heading">{opsMetrics.summary.checksPassed}/{opsMetrics.summary.checksTotal}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-tx-muted">Pass rate</p>
                      <p className="mt-1 text-h4 text-tx-heading">{opsMetrics.summary.passRate}%</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-tx-muted">Velocity (14d)</p>
                      <p className="mt-1 text-h4 text-tx-heading">{opsMetrics.velocity.commits14d}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-tx-muted">Velocity (30d)</p>
                      <p className="mt-1 text-h4 text-tx-heading">{opsMetrics.velocity.commits30d}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-body-sm text-tx-muted">
                    Updated {formatDate(opsMetrics.generatedAt)} | Cycle {Math.round((opsMetrics.summary.cycleDurationMs || 0) / 1000)}s | Active suites {opsMetrics.summary.activeSuites} | Pending suites {opsMetrics.summary.pendingSuites}
                  </p>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[680px] border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-left text-body-sm text-tx-muted">
                          <th className="pb-1">Suite</th>
                          <th className="pb-1">Status</th>
                          <th className="pb-1">Checks</th>
                          <th className="pb-1">Pass rate</th>
                          <th className="pb-1">Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opsMetrics.suites.map((suite) => (
                          <tr key={suite.id} className="bg-white">
                            <td className="rounded-l-xl px-3 py-3 text-body-sm font-semibold text-tx-heading">{suite.label}</td>
                            <td className="px-3 py-3 text-body-sm text-tx-secondary">{suite.status}</td>
                            <td className="px-3 py-3 text-body-sm text-tx-secondary">{suite.checksPassed}/{suite.checksTotal}</td>
                            <td className="px-3 py-3 text-body-sm text-tx-secondary">{suite.passRate}%</td>
                            <td className="rounded-r-xl px-3 py-3 text-body-sm text-tx-secondary">{suite.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <Badge variant="teal">Projects</Badge>
                <h2 className="mt-4 text-h3 text-tx-heading">Operator project control</h2>
                <p className="mt-2 text-body text-tx-secondary">Status editing, go-live updates, and handover generation for all tracked projects.</p>
              </div>
            </div>

            {adminError && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-600">
                {adminError}
              </div>
            )}

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-body-sm text-tx-muted">
                    <th className="pb-2">Client</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Domain</th>
                    <th className="pb-2">Tier</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Created</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminProjects.map((project) => (
                    <tr key={project.id} className="bg-bg-offwhite">
                      <td className="rounded-l-xl px-4 py-4 align-top">
                        <p className="text-body font-semibold text-tx-heading">{project.client_name || project.email || 'Untitled project'}</p>
                        {project.description && <p className="mt-1 text-body-sm text-tx-secondary max-w-xs line-clamp-2">{project.description}</p>}
                      </td>
                      <td className="px-4 py-4 align-top text-body-sm text-tx-secondary">{project.client_email || project.email || '-'}</td>
                      <td className="px-4 py-4 align-top text-body-sm text-tx-secondary">{project.domain || '-'}</td>
                      <td className="px-4 py-4 align-top text-body-sm text-tx-secondary">{project.tier || 'unknown'}</td>
                      <td className="px-4 py-4 align-top">
                        <select
                          value={normalizeProjectStatus(project.status)}
                          onChange={(event) => void handleAdminProjectPatch(project.id, { status: event.target.value })}
                          disabled={adminActionId === project.id}
                          className="rounded-lg border border-border bg-white px-3 py-2 text-body-sm text-tx-heading"
                        >
                          {['scoping', 'building', 'live', 'paused'].map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 align-top text-body-sm text-tx-secondary">{formatDate(project.created_at)}</td>
                      <td className="rounded-r-xl px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleMarkLive(project.id)}
                            disabled={adminActionId === project.id}
                            className="rounded-lg border border-brand-teal px-3 py-2 text-body-sm font-semibold text-brand-teal hover:bg-brand-teal/10 disabled:opacity-50"
                          >
                            Mark live
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleGenerateHandover(project.id)}
                            disabled={adminActionId === project.id}
                            className="rounded-lg border border-border px-3 py-2 text-body-sm font-semibold text-tx-heading hover:bg-white disabled:opacity-50"
                          >
                            Generate handover
                          </button>
                        </div>
                        {project.live_url && <p className="mt-2 text-[11px] text-tx-muted break-all">{project.live_url}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-border bg-white px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-body font-semibold text-tx-heading">Need help?</p>
            <p className="text-body-sm text-tx-secondary mt-1">Reply to your last email or reach us directly.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="ghost"
              size="md"
              onClick={handleDownloadSummary}
            >
              Download summary
            </Button>
            <Button href="mailto:hello@unalabs.cloud" variant="secondary" size="md" external>
              Email us
            </Button>
          </div>
        </div>

        {handoverPreview && (
          <div className="fixed inset-0 z-50 bg-black/50 px-6 py-10 overflow-y-auto">
            <div className="max-w-3xl mx-auto rounded-3xl border border-border bg-white p-8 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="teal">Handover doc</Badge>
                  <h2 className="mt-4 text-h3 text-tx-heading">{handoverPreview.projectName}</h2>
                </div>
                <button type="button" onClick={() => setHandoverPreview(null)} className="text-body-sm text-tx-muted hover:text-tx-heading">
                  Close
                </button>
              </div>
              <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-border bg-bg-offwhite p-5 text-body-sm text-tx-body overflow-x-auto">
                {handoverPreview.doc}
              </pre>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(handoverPreview.doc)}
                  className="rounded-lg bg-brand-teal px-4 py-3 text-body-sm font-semibold text-white"
                >
                  Copy to clipboard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([handoverPreview.doc], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${handoverPreview.projectName.replace(/\s+/g, '-').toLowerCase()}-handover.txt`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded-lg border border-border px-4 py-3 text-body-sm font-semibold text-tx-heading"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
