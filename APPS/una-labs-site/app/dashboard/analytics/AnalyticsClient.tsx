'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { isProjectAdminEmail } from '@/lib/projects';

interface ProjectRecord {
  id: string;
  email: string;
  project_name: string;
  client_email: string;
  domain: string;
  client_name: string;
  plan_tier: string;
  monthly_rate_cad: number;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

interface MilestoneRecord {
  id: string;
  project_id: string;
  title: string;
  description: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  deliverables: string;
  created_at: string;
}

interface InvoiceRecord {
  id: string;
  project_id: string;
  amount_cad: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issued_date: string;
  due_date: string;
  paid_date?: string;
  created_at: string;
}

interface AiUsageRecord {
  project_id: string | null;
  total_tokens: number;
  cost_cad: number | null;
  occurred_at: string;
}

type AnalyticsState = 'loading' | 'unauthenticated' | 'forbidden' | 'ready' | 'error';

interface AnalyticsData {
  aiSpend: { today: number; week: number; month: number; allTime: number; tokens: number };
  aiByProject: Array<{ id: string | null; name: string; costCad: number; tokens: number; lastActivity: string | null }>;
  totalRevenue: number;
  mrrProjection: number;
  activeProjects: number;
  completedProjects: number;
  pipelineMetrics: {
    proposed: number;
    signed: number;
    active: number;
  };
  revenueByTier: Record<string, number>;
  cashflowForecast: {
    collected: number;
    pending: number;
  };
  collectionHealth: {
    onTimePercent: number;
    overduePercent: number;
  };
}

export function AnalyticsClient() {
  const [state, setState] = useState<AnalyticsState>('loading');
  const [email, setEmail] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const refreshTimer = window.setInterval(() => void loadAnalytics(), 30_000);
    let realtimeChannel: { unsubscribe: () => void } | undefined;

    async function loadAnalytics() {
      try {
        const [{ getSession }, { createBrowserClient }] = await Promise.all([
          import('@ftc/auth'),
          import('@ftc/supabase'),
        ]);

        // Get session
        const session = await getSession();
        if (!session?.user?.email) {
          setState('unauthenticated');
          return;
        }

        const userEmail = session.user.email;
        setEmail(userEmail);

        // Check if operator/admin
        if (!isProjectAdminEmail(userEmail)) {
          setState('forbidden');
          return;
        }

        const supabase = createBrowserClient();

        // Fetch all projects
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('*');

        if (projectsError) throw projectsError;
        if (active) setLastCheckedAt(new Date().toISOString());

        if (!projects || projects.length === 0) {
          setState('ready');
          setData({
            aiSpend: { today: 0, week: 0, month: 0, allTime: 0, tokens: 0 },
            aiByProject: [],
            totalRevenue: 0,
            mrrProjection: 0,
            activeProjects: 0,
            completedProjects: 0,
            pipelineMetrics: { proposed: 0, signed: 0, active: 0 },
            revenueByTier: {},
            cashflowForecast: { collected: 0, pending: 0 },
            collectionHealth: { onTimePercent: 0, overduePercent: 0 },
          });
          return;
        }

        const projectIds = (projects as ProjectRecord[]).map(p => p.id);

        // Fetch invoices and milestones in parallel
        const [{ data: invoices, error: invoicesError }, { data: milestones, error: milestonesError }, { data: aiUsage, error: aiUsageError }] = await Promise.all([
          supabase
            .from('invoices')
            .select('*')
            .in('project_id', projectIds),
          supabase
            .from('milestones')
            .select('*')
            .in('project_id', projectIds),
          supabase
            .from('ai_usage_events')
            .select('project_id,total_tokens,cost_cad,occurred_at')
            .order('occurred_at', { ascending: false }),
        ]);

        if (invoicesError) throw invoicesError;
        if (milestonesError) throw milestonesError;
        if (aiUsageError) throw aiUsageError;

        // Calculate analytics
        const typedProjects = projects as ProjectRecord[];
        const typedInvoices = (invoices || []) as InvoiceRecord[];
        const typedMilestones = (milestones || []) as MilestoneRecord[];
        const typedAiUsage = (aiUsage || []) as AiUsageRecord[];
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
        const aiCost = (event: AiUsageRecord) => Number(event.cost_cad || 0);
        const aiSpend = {
          today: typedAiUsage.filter(e => new Date(e.occurred_at) >= startOfToday).reduce((s, e) => s + aiCost(e), 0),
          week: typedAiUsage.filter(e => new Date(e.occurred_at) >= startOfWeek).reduce((s, e) => s + aiCost(e), 0),
          month: typedAiUsage.filter(e => new Date(e.occurred_at) >= startOfMonth).reduce((s, e) => s + aiCost(e), 0),
          allTime: typedAiUsage.reduce((s, e) => s + aiCost(e), 0),
          tokens: typedAiUsage.reduce((s, e) => s + Number(e.total_tokens || 0), 0),
        };
        const projectNames = new Map(typedProjects.map(p => [p.id, p.project_name]));
        const aiProjectMap = new Map<string, { costCad: number; tokens: number; lastActivity: string | null }>();
        typedAiUsage.forEach(event => {
          const key = event.project_id || 'unattributed';
          const current = aiProjectMap.get(key) || { costCad: 0, tokens: 0, lastActivity: null };
          current.costCad += aiCost(event);
          current.tokens += Number(event.total_tokens || 0);
          if (!current.lastActivity || event.occurred_at > current.lastActivity) current.lastActivity = event.occurred_at;
          aiProjectMap.set(key, current);
        });
        const aiByProject = Array.from(aiProjectMap.entries())
          .map(([id, value]) => ({ id: id === 'unattributed' ? null : id, name: id === 'unattributed' ? 'Unattributed' : (projectNames.get(id) || 'Unknown project'), ...value }))
          .sort((a, b) => b.costCad - a.costCad);

        // Revenue metrics
        const activeProjects = typedProjects.filter(p => p.status === 'active').length;
        const completedProjects = typedProjects.filter(p => p.status === 'completed').length;
        const mrrProjection = typedProjects
          .filter(p => p.status === 'active')
          .reduce((sum, p) => sum + (p.monthly_rate_cad || 0), 0);
        const totalRevenue = typedInvoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.amount_cad, 0);

        // Revenue by tier
        const revenueByTier: Record<string, number> = {};
        typedProjects.forEach(p => {
          if (p.plan_tier) {
            revenueByTier[p.plan_tier] = (revenueByTier[p.plan_tier] || 0) + (p.monthly_rate_cad || 0);
          }
        });

        // Pipeline metrics (using milestone status as proxy)
        const pipelineMetrics = {
          proposed: typedMilestones.filter(m => m.status === 'pending').length,
          signed: typedMilestones.filter(m => m.status === 'in_progress').length,
          active: typedProjects.filter(p => p.status === 'active').length,
        };

        // Cashflow forecast
        const paidInvoices = typedInvoices.filter(inv => inv.status === 'paid');
        const pendingInvoices = typedInvoices.filter(inv => inv.status === 'sent' || inv.status === 'draft');
        const collected = paidInvoices.reduce((sum, inv) => sum + inv.amount_cad, 0);
        const pending = pendingInvoices.reduce((sum, inv) => sum + inv.amount_cad, 0);

        // Collection health
        const paidOnTime = typedInvoices.filter(inv => {
          if (inv.status !== 'paid' || !inv.paid_date) return false;
          return new Date(inv.paid_date) <= new Date(inv.due_date);
        }).length;
        const overdue = typedInvoices.filter(inv => inv.status === 'overdue').length;
        const totalInvoices = typedInvoices.length;
        const onTimePercent = totalInvoices > 0 ? Math.round((paidOnTime / totalInvoices) * 100) : 0;
        const overduePercent = totalInvoices > 0 ? Math.round((overdue / totalInvoices) * 100) : 0;

        if (!active) return;

        setData({
          aiSpend,
          aiByProject,
          totalRevenue,
          mrrProjection,
          activeProjects,
          completedProjects,
          pipelineMetrics,
          revenueByTier,
          cashflowForecast: { collected, pending },
          collectionHealth: { onTimePercent, overduePercent },
        });

        setState('ready');
      } catch (err) {
        console.error('Analytics error:', err);
        if (active) setState('error');
      }
    };

    void loadAnalytics();

    // Polling is the reliable fallback; Realtime makes normal row changes
    // appear immediately when the Supabase stream is available.
    void import('@ftc/supabase').then(({ createBrowserClient }) => {
      if (!active) return;
      const supabase = createBrowserClient();
      realtimeChannel = supabase
        .channel('una-labs-analytics-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => void loadAnalytics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, () => void loadAnalytics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => void loadAnalytics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_usage_events' }, () => void loadAnalytics())
        .subscribe();
    });

    return () => {
      active = false;
      if (refreshTimer) window.clearInterval(refreshTimer);
      realtimeChannel?.unsubscribe();
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-tx-secondary">Loading analytics...</div>
      </div>
    );
  }

  if (state === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="max-w-md rounded-xl border border-border bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-tx-heading">Sign-in required</p>
          <p className="mt-2 text-tx-secondary">Use the Una Labs owner Google account to view internal analytics.</p>
          <a className="mt-4 inline-block font-semibold text-brand-teal hover:underline" href="/login/?redirect=/dashboard/analytics">Log in</a>
        </div>
      </div>
    );
  }

  if (state === 'forbidden') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="max-w-md rounded-xl border border-border bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-tx-heading">Analytics is restricted</p>
          <p className="mt-2 text-tx-secondary">You are signed in as {email}. This internal cost and revenue view is available only to Una Labs owner accounts.</p>
          <a className="mt-4 inline-block font-semibold text-brand-teal hover:underline" href="/dashboard/">Open your project dashboard</a>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600">Error loading analytics. Please try again.</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8 py-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tx-heading">Business Intelligence Dashboard</h1>
        <p className="text-tx-secondary mt-2">Real-time metrics and financial insights</p>
      </div>

      {/* AI cost visibility */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tx-heading">AI Spend</h2>
          <p className="text-tx-secondary mt-1">Measured OpenAI usage recorded by the existing worker. Claude remains dormant.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Today', data.aiSpend.today],
            ['This week', data.aiSpend.week],
            ['This month', data.aiSpend.month],
            ['All time', data.aiSpend.allTime],
          ].map(([label, value]) => (
            <div key={String(label)} className="bg-white rounded-lg border border-border-default p-5 shadow-sm">
              <p className="text-tx-secondary text-sm font-semibold">{label}</p>
              <p className="text-3xl font-bold tx-heading mt-2">CA${Number(value).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-border-default p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold tx-heading">AI cost by project</h3>
            <span className="text-sm text-tx-secondary">{data.aiSpend.tokens.toLocaleString()} tokens</span>
          </div>
          {data.aiByProject.length > 0 ? (
            <div className="space-y-3">
              {data.aiByProject.map(project => (
                <div key={project.id || 'unattributed'} className="flex items-center justify-between border-b border-border-default pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-semibold tx-heading">{project.name}</p>
                    <p className="text-xs text-tx-secondary">{project.tokens.toLocaleString()} tokens{project.lastActivity ? ` · ${new Date(project.lastActivity).toLocaleDateString()}` : ''}</p>
                  </div>
                  <p className="font-bold text-brand-teal">CA${project.costCad.toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-tx-secondary italic">No persisted AI usage yet. New measured OpenAI calls will appear after the usage migration is applied.</p>
          )}
        </div>
      </section>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-lg border border-border-default p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-tx-secondary text-sm font-semibold">Total Revenue</h3>
            <div className="w-10 h-10 bg-brand-teal/10 rounded-full flex items-center justify-center">
              <span className="text-lg">💰</span>
            </div>
          </div>
          <div className="text-3xl font-bold tx-heading">
            CA${data.totalRevenue.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-tx-secondary mt-2">All-time collected revenue</p>
        </div>

        {/* MRR Projection */}
        <div className="bg-white rounded-lg border border-border-default p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-tx-secondary text-sm font-semibold">MRR Projection</h3>
            <div className="w-10 h-10 bg-brand-orange/10 rounded-full flex items-center justify-center">
              <span className="text-lg">📈</span>
            </div>
          </div>
          <div className="text-3xl font-bold tx-heading">
            CA${data.mrrProjection.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-tx-secondary mt-2">Monthly recurring revenue (active only)</p>
        </div>

        {/* Active Projects */}
        <div className="bg-white rounded-lg border border-border-default p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-tx-secondary text-sm font-semibold">Active Projects</h3>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-lg">🚀</span>
            </div>
          </div>
          <div className="text-3xl font-bold tx-heading">{data.activeProjects}</div>
          <p className="text-xs text-tx-secondary mt-2">In-progress engagements</p>
        </div>

        {/* Completed Projects */}
        <div className="bg-white rounded-lg border border-border-default p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-tx-secondary text-sm font-semibold">Completed</h3>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg">✓</span>
            </div>
          </div>
          <div className="text-3xl font-bold tx-heading">{data.completedProjects}</div>
          <p className="text-xs text-tx-secondary mt-2">Successfully delivered projects</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cashflow Forecast */}
        <div className="bg-white rounded-lg border border-border-default p-6 shadow-sm">
          <h3 className="text-lg font-bold tx-heading mb-6">Cashflow Forecast</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm tx-secondary">Collected</span>
                <span className="font-semibold text-green-700">
                  CA${data.cashflowForecast.collected.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="w-full bg-bg-subtle rounded-full h-3 overflow-hidden">
                <div
                  className="bg-green-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (data.cashflowForecast.collected / (data.cashflowForecast.collected + data.cashflowForecast.pending || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm tx-secondary">Pending</span>
                <span className="font-semibold text-orange-600">
                  CA${data.cashflowForecast.pending.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="w-full bg-bg-subtle rounded-full h-3 overflow-hidden">
                <div
                  className="bg-brand-orange h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (data.cashflowForecast.pending / (data.cashflowForecast.collected + data.cashflowForecast.pending || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border-default">
            <div className="text-sm text-tx-secondary">
              Total Outstanding: <span className="font-semibold">CA${(data.cashflowForecast.collected + data.cashflowForecast.pending).toLocaleString('en-CA', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {/* Collection Health */}
        <div className="bg-white rounded-lg border border-border-default p-6 shadow-sm">
          <h3 className="text-lg font-bold tx-heading mb-6">Collection Health</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm tx-secondary">On Time</span>
                <span className="font-semibold text-green-700">{data.collectionHealth.onTimePercent}%</span>
              </div>
              <div className="w-full bg-bg-subtle rounded-full h-3 overflow-hidden">
                <div
                  className="bg-green-500 h-full rounded-full transition-all"
                  style={{ width: `${data.collectionHealth.onTimePercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm tx-secondary">Overdue</span>
                <span className="font-semibold text-red-700">{data.collectionHealth.overduePercent}%</span>
              </div>
              <div className="w-full bg-bg-subtle rounded-full h-3 overflow-hidden">
                <div
                  className="bg-red-500 h-full rounded-full transition-all"
                  style={{ width: `${data.collectionHealth.overduePercent}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border-default flex gap-2">
            <Badge variant="teal" className="bg-green-50 text-green-700">
              ✓ Healthy
            </Badge>
            <Badge variant="orange" className="bg-orange-50 text-orange-700">
              ⚠ Monitor
            </Badge>
          </div>
        </div>
      </div>

      {/* Pipeline & Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Conversion */}
        <div className="bg-white rounded-lg border border-border-default p-6 shadow-sm">
          <h3 className="text-lg font-bold tx-heading mb-6">Pipeline Conversion</h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium tx-heading">Proposed</span>
                <Badge variant="muted" className="bg-blue-50 text-blue-700">{data.pipelineMetrics.proposed}</Badge>
              </div>
              <div className="w-full bg-bg-subtle rounded-full h-2 overflow-hidden">
                <div className="bg-blue-400 h-full rounded-full" style={{ width: '33%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium tx-heading">In Progress</span>
                <Badge variant="orange" className="bg-orange-50 text-orange-700">{data.pipelineMetrics.signed}</Badge>
              </div>
              <div className="w-full bg-bg-subtle rounded-full h-2 overflow-hidden">
                <div className="bg-brand-orange h-full rounded-full" style={{ width: '67%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium tx-heading">Active</span>
                <Badge variant="teal" className="bg-green-50 text-green-700">{data.pipelineMetrics.active}</Badge>
              </div>
              <div className="w-full bg-bg-subtle rounded-full h-2 overflow-hidden">
                <div className="bg-green-500 h-full rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Revenue by Tier */}
        <div className="bg-white rounded-lg border border-border-default p-6 shadow-sm">
          <h3 className="text-lg font-bold tx-heading mb-6">Revenue by Service Tier</h3>
          <div className="space-y-4">
            {Object.entries(data.revenueByTier).length > 0 ? (
              Object.entries(data.revenueByTier).map(([tier, revenue]) => (
                <div key={tier}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium capitalize tx-heading">{tier}</span>
                    <span className="font-semibold">CA${revenue.toLocaleString('en-CA', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="w-full bg-bg-subtle rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand-teal h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (revenue / (data.mrrProjection || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-tx-secondary italic">No tier data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-bg-offwhite rounded-lg border border-border-default p-4 text-sm text-tx-secondary">
        <p>Live sync is enabled for projects, invoices, milestones, and AI usage. {lastCheckedAt ? `Last checked: ${new Date(lastCheckedAt).toLocaleTimeString()}` : 'Connecting...'}</p>
      </div>
    </div>
  );
}
