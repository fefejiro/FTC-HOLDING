import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getApiUrl } from '@/lib/api-config';
import { useAuth } from '@/hooks/use-auth';

type OpsStatsResponse = {
  kpis: {
    syncCoverage: number;
    syncConfidence: number;
    tapToExplainVolume: number;
    fallbackRate: number;
  };
  panels: {
    coverageByCatalog: Array<{ group: string; synced: number; total: number; coverage: number }>;
    syncHealth: Array<{ issue: string; count: number }>;
    ambiguousQueue: Array<{ trackId: string; title: string; artist: string; flags: number; reviewer: string; priority: string }>;
    mostTappedLines: Array<{ trackId: string; title: string; artist: string; lineId: string | null; taps: number }>;
  };
};

function percent(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

export default function OpsLiveLyricsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data, isLoading, isError } = useQuery<OpsStatsResponse>({
    queryKey: ['/ops/api/live-lyrics/stats'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/ops/api/live-lyrics/stats'), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load live lyrics ops stats');
      }
      return response.json();
    },
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-muted-foreground">Checking access...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Live lyrics ops metrics are only available to authenticated users.
            </p>
            <div className="flex gap-2">
              <Link href="/login">
                <Button data-testid="button-ops-sign-in">Sign in</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Back home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="mb-3" data-testid="button-back-admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Live Lyrics Ops</h1>
          <p className="text-sm text-muted-foreground">Real-time health for sync quality, engagement, and fallback behavior.</p>
        </div>
        <Badge variant="secondary">NEW</Badge>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading stats...</p> : null}
      {isError ? <p className="text-sm text-destructive">Unable to load stats right now.</p> : null}

      {data ? (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sync coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold" data-testid="kpi-sync-coverage">{percent(data.kpis.syncCoverage)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sync confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold" data-testid="kpi-sync-confidence">{percent(data.kpis.syncConfidence)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tap-to-explain volume</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold" data-testid="kpi-tap-volume">{data.kpis.tapToExplainVolume}</p>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fallback rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold" data-testid="kpi-fallback-rate">{percent(data.kpis.fallbackRate)}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Synced lyrics coverage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.panels.coverageByCatalog.map((row) => (
                  <div key={row.group}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{row.group}</span>
                      <span>{percent(row.coverage)}%</span>
                    </div>
                    <Progress value={percent(row.coverage)} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.panels.syncHealth.length > 0 ? (
                    data.panels.syncHealth.map((item) => (
                      <div key={item.issue} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                        <span>{item.issue}</span>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No major drift issues logged this week.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ambiguous line queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.panels.ambiguousQueue.length > 0 ? (
                    data.panels.ambiguousQueue.map((item) => (
                      <div key={`${item.trackId}-${item.title}`} className="rounded-lg border p-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.artist}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant={item.priority === 'high' ? 'destructive' : 'secondary'}>{item.priority}</Badge>
                          <Badge variant="outline">flags: {item.flags}</Badge>
                          <Badge variant="outline">{item.reviewer}</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No ambiguous lines queued yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most-tapped lines (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.panels.mostTappedLines.length > 0 ? (
                    data.panels.mostTappedLines.map((item) => {
                      const maxTaps = Math.max(...data.panels.mostTappedLines.map((entry) => entry.taps), 1);
                      const width = Math.max(8, Math.round((item.taps / maxTaps) * 100));
                      return (
                        <div key={`${item.trackId}-${item.lineId ?? item.title}`}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="truncate pr-2">
                              {item.title}
                              {item.lineId ? (
                                <span className="ml-1 text-xs text-muted-foreground font-mono">[{item.lineId}]</span>
                              ) : null}
                            </span>
                            <span>{item.taps}</span>
                          </div>
                          <div className="h-2 w-full rounded bg-muted">
                            <div className="h-full rounded bg-primary" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No tap activity in the past 24 hours.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
