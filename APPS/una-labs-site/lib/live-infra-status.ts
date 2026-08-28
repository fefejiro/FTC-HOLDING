import { STRIPE_API_URL } from '@/lib/stripe-config';

type LiveStatusSummary = {
  generated_at: string;
  modules?: Array<{ name: string; status: 'green' | 'yellow' | 'red'; detail: string }>;
  connections?: Array<{ name: string; status: 'green' | 'yellow' | 'red'; detail: string }>;
};

export async function loadLiveInfraMonitor() {
  const response = await fetch(`${STRIPE_API_URL}/api/status`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Live status unavailable (${response.status})`);
  const payload = await response.json() as LiveStatusSummary | { summary?: LiveStatusSummary };
  const summary = 'summary' in payload && payload.summary ? payload.summary : payload as LiveStatusSummary;
  if (!summary.generated_at) throw new Error('Live status payload is incomplete.');

  const checks = [...(summary.modules ?? []), ...(summary.connections ?? [])];
  const activeAlerts = checks.filter((check) => check.status !== 'green').length;
  const overallStatus: 'green' | 'yellow' | 'red' = checks.some((check) => check.status === 'red')
    ? 'red'
    : checks.some((check) => check.status === 'yellow') ? 'yellow' : 'green';

  return {
    generatedAt: summary.generated_at,
    summary: {
      overallStatus,
      activeAlerts,
      autoDebugEnabled: false,
      note: 'Live worker status feed. CI artifacts are tracked separately.',
    },
    providers: [
      {
        id: 'live-platform',
        label: 'Live platform feed',
        status: overallStatus,
        services: (summary.connections ?? []).map((connection) => ({
          name: connection.name,
          status: connection.status,
          detail: connection.detail,
          lastCheckedAt: summary.generated_at,
        })),
      },
    ],
    recentAlerts: checks
      .filter((check) => check.status !== 'green')
      .map((check) => ({
        source: check.name,
        level: (check.status === 'red' ? 'critical' : 'warning') as 'critical' | 'warning',
        message: check.detail,
        at: summary.generated_at,
      })),
  };
}
