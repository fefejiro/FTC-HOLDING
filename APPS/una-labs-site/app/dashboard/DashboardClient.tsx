'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type ProjectRecord = {
  id: string;
  email?: string;
  tier?: string;
  billing?: string;
  status?: string;
  intake_id?: string;
  stripe_session_id?: string;
  created_at?: string;
};

type MilestoneRecord = {
  id: string;
  project_id: string;
  title?: string;
  status?: string;
  due_date?: string;
  completed_at?: string;
};

type DashboardState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; email: string; projects: ProjectRecord[]; milestones: MilestoneRecord[] };

function formatDate(value?: string) {
  if (!value) {
    return '—';
  }

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

export function DashboardClient() {
  const [state, setState] = useState<DashboardState>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);
        const session = await getSession();
        if (!session?.user) {
          if (!cancelled) {
            setState({ phase: 'unauthenticated' });
          }
          return;
        }

        const client = createBrowserClient();
        const [{ data: projects, error: projectsError }, { data: milestones, error: milestonesError }] =
          await Promise.all([
            client.from('projects').select('*').order('created_at', { ascending: false }),
            client.from('milestones').select('*').order('due_date', { ascending: true }),
          ]);

        if (projectsError) {
          throw projectsError;
        }
        if (milestonesError) {
          throw milestonesError;
        }

        if (!cancelled) {
          setState({
            phase: 'ready',
            email: session.user.email ?? '',
            projects: (projects as ProjectRecord[] | null) ?? [],
            milestones: (milestones as MilestoneRecord[] | null) ?? [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            phase: 'error',
            message:
              err instanceof Error
                ? err.message
                : 'Unable to load the dashboard right now.',
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const milestonesByProject = useMemo(() => {
    if (state.phase !== 'ready') {
      return new Map<string, MilestoneRecord[]>();
    }

    return state.milestones.reduce((map, milestone) => {
      const bucket = map.get(milestone.project_id) ?? [];
      bucket.push(milestone);
      map.set(milestone.project_id, bucket);
      return map;
    }, new Map<string, MilestoneRecord[]>());
  }, [state]);

  if (state.phase === 'loading') {
    return (
      <div className="min-h-[70vh] bg-bg-offwhite flex items-center justify-center">
        <p className="text-body text-tx-muted">Loading your dashboard…</p>
      </div>
    );
  }

  if (state.phase === 'unauthenticated') {
    return (
      <section className="bg-white min-h-[70vh] flex items-center">
        <div className="max-w-tight mx-auto px-6 py-20 text-center">
          <Badge variant="muted">Sign-in required</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">Log in to see live project data</h1>
          <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
            The dashboard route is now reserved for authenticated customer workspaces. If you have not
            gone through the intake flow yet, start there first.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href="/login?redirect=/dashboard" variant="primary" size="lg">
              Log in
            </Button>
            <Button href="/start" variant="secondary" size="lg">
              Start a request
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (state.phase === 'error') {
    return (
      <section className="bg-white min-h-[70vh] flex items-center">
        <div className="max-w-tight mx-auto px-6 py-20 text-center">
          <Badge variant="muted">Setup required</Badge>
          <h1 className="mt-4 text-display-sm text-tx-heading">The dashboard foundation is in place</h1>
          <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
            The client-side auth and Supabase reads are wired, but the runtime still needs the public
            Supabase env vars and the `projects` / `milestones` tables available to the deployed site.
          </p>
          <p className="mt-4 text-body-sm text-red-700">{state.message}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href="/login" variant="secondary" size="lg">
              Back to login
            </Button>
            <Button href="/help" variant="ghost" size="lg">
              Open help →
            </Button>
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
            <Badge variant="teal">Customer dashboard</Badge>
            <h1 className="mt-4 text-display-sm text-tx-heading">Project visibility for {state.email || 'your workspace'}</h1>
            <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-tx-secondary">
              This route now reads from Supabase on the client. As real project records land, this
              becomes the live operational surface instead of a static mockup.
            </p>
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

        {state.projects.length === 0 ? (
          <div className="mt-12 rounded-[28px] border border-border bg-white p-10 shadow-sm">
            <h2 className="text-h3 text-tx-heading">No projects yet</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
              The dashboard is connected, but there are no project records in Supabase for this user yet.
              Once the activation flow starts writing project rows, they will appear here.
            </p>
            <div className="mt-8">
              <Button href="/start" variant="primary" size="lg">
                Start your first request
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-12 grid gap-6">
            {state.projects.map((project) => {
              const milestones = milestonesByProject.get(project.id) ?? [];

              return (
                <div
                  key={project.id}
                  className="rounded-[28px] border border-border bg-white p-8 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-caption uppercase tracking-widest text-tx-muted">
                        Project
                      </p>
                      <h2 className="mt-2 text-h3 text-tx-heading">
                        {project.intake_id || project.id}
                      </h2>
                      <p className="mt-2 text-body text-tx-secondary">
                        {project.tier || 'Professional'} · {project.billing || 'monthly'} · {project.status || 'intake'}
                      </p>
                    </div>
                    <div className="grid gap-3 text-body-sm text-tx-secondary sm:grid-cols-2">
                      <p>Created: <span className="text-tx-heading">{formatDate(project.created_at)}</span></p>
                      <p>Stripe session: <span className="text-tx-heading">{project.stripe_session_id || '—'}</span></p>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {milestones.length > 0 ? milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className="rounded-2xl border border-border bg-bg-offwhite p-5"
                      >
                        <p className="text-body font-semibold text-tx-heading">{milestone.title || 'Milestone'}</p>
                        <p className="mt-2 text-body-sm text-tx-secondary">Status: {milestone.status || 'pending'}</p>
                        <p className="mt-1 text-body-sm text-tx-secondary">Due: {formatDate(milestone.due_date)}</p>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-border bg-bg-offwhite p-5 md:col-span-3">
                        <p className="text-body text-tx-secondary">
                          No milestones yet for this project. Once the workflow writes milestone rows, they will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
