'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { hasAdminAccess } from '@/lib/auth-guards';
import { getStripeApiUrl } from '@/lib/stripe-config';

type UbyAppKey = 'bushy' | 'og-trades' | 'anion' | 'garden-cleaners';

type AppSuiteCheck = {
  id: string;
  detail: string;
};

type AppSuite = {
  id: string;
  status: 'passing' | 'failing' | string;
  reason?: string;
  checks?: AppSuiteCheck[];
};

type E2EArtifact = {
  generatedAt?: string;
  suites?: AppSuite[];
};

type Lead = {
  id: string;
  source?: string;
  status?: string;
  company?: string | null;
  message?: string | null;
  created_at?: string;
};

type UbyAppConfig = {
  key: UbyAppKey;
  name: string;
  suiteId?: string;
  dashboardHref: string;
  dashboardLabel: string;
  fallbackStatus: string;
  keywords: string[];
};

type UbyCardData = UbyAppConfig & {
  liveStatus: string;
  recentJobs: string[];
  recentLeads: string[];
  alerts: string[];
};

const UBY_APPS: UbyAppConfig[] = [
  {
    key: 'bushy',
    name: 'Bushy',
    suiteId: 'bushy',
    dashboardHref: 'https://unalabs.cloud/admin',
    dashboardLabel: 'Open operator dashboard',
    fallbackStatus: 'Pending first runtime checks',
    keywords: ['bushy'],
  },
  {
    key: 'og-trades',
    name: 'OG Trades',
    suiteId: 'og-trades-academy',
    dashboardHref: 'https://www.ogtradesacademy.com/community',
    dashboardLabel: 'Open OG Trades dashboard',
    fallbackStatus: 'No suite checks found',
    keywords: ['og', 'trades', 'forex'],
  },
  {
    key: 'anion',
    name: 'Anion',
    suiteId: 'anion',
    dashboardHref: 'https://unalabs.cloud/status?project=anion',
    dashboardLabel: 'Open Anion board',
    fallbackStatus: 'Runtime not deployed yet',
    keywords: ['anion', 'class'],
  },
  {
    key: 'garden-cleaners',
    name: 'Garden Cleaners',
    suiteId: 'garden-cleaners',
    dashboardHref: 'https://gardencleaners.ca/portal',
    dashboardLabel: 'Open Garden portal',
    fallbackStatus: 'No suite checks found',
    keywords: ['garden', 'cleaner'],
  },
];

function formatDate(value?: string): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-CA', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function includesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

export function UbyPortalClient() {
  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState('');
  const [authError, setAuthError] = useState('');
  const [artifact, setArtifact] = useState<E2EArtifact | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { getSession } = await import('@ftc/auth');
        const session = await getSession();
        if (!session?.user) {
          window.location.href = '/login?redirect=/uby';
          return;
        }
        if (!hasAdminAccess(session)) {
          if (!cancelled) setAuthError('Access denied. UBY portal is restricted to admin allowlist.');
          return;
        }
        if (!cancelled) {
          setToken(session.access_token ?? '');
          setAuthReady(true);
        }
      } catch {
        if (!cancelled) setAuthError('Could not verify session. Please sign in again.');
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    async function load() {
      try {
        const [artifactRes, leadsRes] = await Promise.all([
          fetch('/ops/portfolio-e2e-status.json', { cache: 'no-store' }),
          fetch(getStripeApiUrl('/api/admin/leads?limit=50'), {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
        ]);

        if (!artifactRes.ok) throw new Error('Could not load portfolio status feed.');

        const nextArtifact = (await artifactRes.json()) as E2EArtifact;
        const leadBody = leadsRes.ok ? (await leadsRes.json()) as { leads?: Lead[] } : { leads: [] };

        if (!cancelled) {
          setArtifact(nextArtifact);
          setLeads(leadBody.leads ?? []);
          setLoadError('');
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Could not load UBY portal feed.');
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

  const cards = useMemo<UbyCardData[]>(() => {
    const suites = artifact?.suites ?? [];

    return UBY_APPS.map((app) => {
      const suite = app.suiteId ? suites.find((item) => item.id === app.suiteId) : undefined;
      const status = suite
        ? suite.status === 'passing'
          ? '🟢 Live'
          : suite.status === 'failing'
            ? '🔴 Attention needed'
            : `🟡 ${suite.status}`
        : `🟡 ${app.fallbackStatus}`;

      const matchingLeads = leads
        .filter((lead) => {
          const searchable = [lead.source, lead.company, lead.message].filter(Boolean).join(' ');
          return includesAny(searchable, app.keywords);
        })
        .slice(0, 3)
        .map((lead) => `${lead.status ?? 'new'} · ${formatDate(lead.created_at)}`);

      const recentJobs = (suite?.checks ?? []).slice(0, 3).map((check) => check.detail);
      const alerts: string[] = [];

      if (suite?.status === 'failing' && suite.reason) {
        alerts.push(suite.reason);
      }
      if (!suite) {
        alerts.push('No live health suite configured yet.');
      }
      if (matchingLeads.length === 0) {
        alerts.push('No recent mapped leads in the shared queue.');
      }

      return {
        ...app,
        liveStatus: status,
        recentJobs,
        recentLeads: matchingLeads,
        alerts,
      };
    });
  }, [artifact, leads]);

  if (authError) {
    return (
      <section className="min-h-screen bg-bg-offwhite px-6 py-20 flex items-center justify-center">
        <div className="max-w-lg w-full rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-display-xs text-red-700">Access denied</p>
          <p className="mt-2 text-body text-red-700">{authError}</p>
          <div className="mt-6 flex justify-center">
            <Button href="/admin" variant="secondary" size="sm">Back to admin</Button>
          </div>
        </div>
      </section>
    );
  }

  if (!authReady) {
    return (
      <section className="min-h-screen bg-bg-offwhite px-6 py-20 flex items-center justify-center">
        <p className="text-body text-tx-muted">Verifying session...</p>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-bg-offwhite">
      <div className="max-w-content mx-auto px-6 py-12 space-y-8">
        <header className="bg-white border border-border rounded-2xl p-6 sm:p-8">
          <Badge variant="teal">UBY Operator Portal</Badge>
          <h1 className="mt-3 text-display-sm text-tx-heading">All UBY apps in one triage board</h1>
          <p className="mt-2 text-body text-tx-secondary">
            Read-only view across Bushy, OG Trades, Anion, and Garden Cleaners. Refreshes every 60 seconds.
          </p>
          <p className="mt-3 text-body-sm text-tx-muted">Last feed update: {formatDate(artifact?.generatedAt)}</p>
          {loadError && (
            <p className="mt-4 text-body-sm text-brand-orange">{loadError}</p>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cards.map((card) => (
            <article key={card.key} className="bg-white border border-border rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-display-xs text-tx-heading">{card.name}</h2>
                  <p className="mt-1 text-body-sm text-tx-secondary">Live status: {card.liveStatus}</p>
                </div>
                <Button href={card.dashboardHref} external variant="secondary" size="sm">
                  {card.dashboardLabel}
                </Button>
              </div>

              <div>
                <p className="text-eyebrow text-tx-muted">Recent jobs</p>
                <ul className="mt-2 space-y-1.5 text-body-sm text-tx-secondary">
                  {card.recentJobs.length > 0 ? card.recentJobs.map((job) => (
                    <li key={job}>• {job}</li>
                  )) : <li>• No recent job checks.</li>}
                </ul>
              </div>

              <div>
                <p className="text-eyebrow text-tx-muted">Recent leads/jobs</p>
                <ul className="mt-2 space-y-1.5 text-body-sm text-tx-secondary">
                  {card.recentLeads.length > 0 ? card.recentLeads.map((lead) => (
                    <li key={lead}>• {lead}</li>
                  )) : <li>• No recent leads mapped to this app.</li>}
                </ul>
              </div>

              <div>
                <p className="text-eyebrow text-tx-muted">Alerts</p>
                <ul className="mt-2 space-y-1.5 text-body-sm text-tx-secondary">
                  {card.alerts.map((alert) => (
                    <li key={alert}>• {alert}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
