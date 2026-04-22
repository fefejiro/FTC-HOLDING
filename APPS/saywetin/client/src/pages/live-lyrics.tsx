import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronDown, Sparkles, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getApiUrl } from '@/lib/api-config';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { setLiveModeState } from '@/lib/live-mode-store';

type SyncedLine = {
  id: string;
  t: string;
  startMs: number;
  endMs: number;
  tappable: boolean;
};

type SyncedLyricsResponse = {
  lines: SyncedLine[];
  confidence: number;
  source: string;
};

type ExplainResponse = {
  literal: string;
  cultural: string;
  slangMap: Array<{ word: string; meaning: string; region: string }>;
  region: string[];
  confidence: number;
  alternates?: Array<{ title: string; body: string; confidence: number }>;
  relatedPhrases: string[];
  artistNote?: string;
};

type TrackResponse = {
  track: {
    id: string;
    title: string;
    artist: string;
    coverArtUrl?: string | null;
  };
};

const DRIFT_THRESHOLD_MS = 1500;
const LIVE_SIGNAL_SESSION_KEY = 'saywetin_live_signal_sid';

function getLiveSignalSessionId(): string {
  try {
    const existing = window.localStorage.getItem(LIVE_SIGNAL_SESSION_KEY);
    if (existing) {
      return existing;
    }

    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sid_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    window.localStorage.setItem(LIVE_SIGNAL_SESSION_KEY, generated);
    return generated;
  } catch {
    return `sid_ephemeral_${Date.now()}`;
  }
}

async function sendLiveSignal(payload: {
  type: 'tap' | 'flag' | 'resync' | 'dwell' | 'exit' | 'fallback';
  trackId?: string;
  lineId?: string;
  dwellMs?: number;
  reason?: string;
}) {
  await fetch(getApiUrl('/v1/signals'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': getLiveSignalSessionId(),
    },
    body: JSON.stringify(payload),
  });
}

export default function LiveLyricsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const [positionMs, setPositionMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedLine, setSelectedLine] = useState<SyncedLine | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [syncWarn, setSyncWarn] = useState(false);
  const fallbackNoLyricsSentRef = useRef(false);
  const syncWarnSentRef = useRef(false);
  const sheetOpenedAtRef = useRef<number | null>(null);
  // Tracks the timestamp (real clock ms) when drift first started, for the 2-second sustained threshold.
  const driftStartedAtRef = useRef<number | null>(null);

  const { data: trackData } = useQuery<TrackResponse>({
    queryKey: ['/api/recognized-tracks', id],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/recognized-tracks/${id}`), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Track not found');
      }
      return response.json();
    },
    enabled: Boolean(id),
  });

  const { data: syncedLyricsData } = useQuery<SyncedLyricsResponse>({
    queryKey: ['/v1/tracks', id, 'synced-lyrics'],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/v1/tracks/${id}/synced-lyrics`), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Unable to load synced lyrics');
      }
      return response.json();
    },
    enabled: Boolean(id),
  });

  const lines = syncedLyricsData?.lines || [];
  const totalDurationMs = lines.length > 0 ? lines[lines.length - 1].endMs : 0;
  const noLyrics = lines.length === 0;

  const currentLineIndex = useMemo(() => {
    if (lines.length === 0) {
      return -1;
    }

    return lines.findIndex((line) => positionMs >= line.startMs && positionMs < line.endMs);
  }, [lines, positionMs]);

  const explainMutation = useMutation<ExplainResponse>({
    mutationFn: async () => {
      if (!selectedLine || !id) {
        throw new Error('No selected line');
      }

      const response = await apiRequest('POST', '/v1/meaning/explain', {
        lineId: selectedLine.id,
        lyric: selectedLine.t,
        trackId: id,
        positionMs,
      });

      return response.json();
    },
  });
  const hasAlternates = (explainMutation.data?.alternates?.length || 0) > 0;

  useEffect(() => {
    if (!id) {
      return;
    }

    setLiveModeState({
      isLiveActive: true,
      currentTrackId: id,
      trackTitle: trackData?.track?.title || '',
      trackArtist: trackData?.track?.artist || '',
      coverArtUrl: trackData?.track?.coverArtUrl || null,
    });
  }, [id, trackData?.track?.artist, trackData?.track?.coverArtUrl, trackData?.track?.title]);

  useEffect(() => {
    const currentLine = currentLineIndex >= 0 ? lines[currentLineIndex] : null;
    setLiveModeState({
      currentLineId: currentLine?.id || null,
      currentLineText: currentLine?.t || '',
      positionMs,
    });
  }, [currentLineIndex, lines, positionMs]);

  useEffect(() => {
    if (!selectedLine || !explainMutation.data) {
      return;
    }

    setLiveModeState({
      lastExplanation: {
        lineId: selectedLine.id,
        lyric: selectedLine.t,
        literal: explainMutation.data.literal,
        cultural: explainMutation.data.cultural,
        slangMap: explainMutation.data.slangMap,
        region: explainMutation.data.region,
        confidence: explainMutation.data.confidence,
        alternates: explainMutation.data.alternates,
        relatedPhrases: explainMutation.data.relatedPhrases,
        artistNote: explainMutation.data.artistNote,
      },
    });
  }, [selectedLine, explainMutation.data]);

  useEffect(() => {
    if (!isPlaying || noLyrics) {
      return;
    }

    const interval = window.setInterval(() => {
      setPositionMs((current) => {
        const next = current + 250;
        if (next >= totalDurationMs) {
          return totalDurationMs;
        }
        return next;
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [isPlaying, noLyrics, totalDurationMs]);

  // Sustained-drift detection: only warn after drift has persisted for 2 real seconds.
  // This avoids false warnings during normal inter-line gaps.
  const DRIFT_SUSTAINED_MS = 2000;
  useEffect(() => {
    if (noLyrics) {
      setSyncWarn(false);
      driftStartedAtRef.current = null;
      return;
    }

    const isDrifting = currentLineIndex === -1 && positionMs > DRIFT_THRESHOLD_MS && positionMs < totalDurationMs;

    if (isDrifting) {
      if (driftStartedAtRef.current === null) {
        driftStartedAtRef.current = Date.now();
      } else if (Date.now() - driftStartedAtRef.current >= DRIFT_SUSTAINED_MS) {
        setSyncWarn(true);
      }
    } else {
      driftStartedAtRef.current = null;
      setSyncWarn(false);
    }
  }, [currentLineIndex, noLyrics, positionMs, totalDurationMs]);

  useEffect(() => {
    if (!id || !noLyrics || fallbackNoLyricsSentRef.current) {
      return;
    }

    fallbackNoLyricsSentRef.current = true;
    sendLiveSignal({
      type: 'fallback',
      reason: 'nolyrics',
      trackId: id,
    }).catch(() => {
      // Fire-and-forget telemetry should not interrupt UX.
    });
  }, [id, noLyrics]);

  useEffect(() => {
    if (!id || !syncWarn || syncWarnSentRef.current) {
      return;
    }

    syncWarnSentRef.current = true;
    sendLiveSignal({
      type: 'fallback',
      reason: 'syncwarn',
      trackId: id,
    }).catch(() => {
      // Fire-and-forget telemetry should not interrupt UX.
    });
  }, [id, syncWarn]);

  const visibleLines = useMemo(() => {
    if (lines.length === 0) {
      return [];
    }

    if (currentLineIndex < 0) {
      return lines.slice(0, 6);
    }

    const start = Math.max(0, currentLineIndex - 2);
    return lines.slice(start, start + 6);
  }, [lines, currentLineIndex]);

  const onTapLine = async (line: SyncedLine) => {
    if (!line.tappable) {
      return;
    }

    setSelectedLine(line);
    setSheetOpen(true);
    sheetOpenedAtRef.current = Date.now();
    explainMutation.reset();

    try {
      await sendLiveSignal({
        type: 'tap',
        lineId: line.id,
        trackId: id,
      });
    } catch {
      // Fire-and-forget telemetry should not interrupt UX.
    }

    explainMutation.mutate();
  };

  const onResync = async () => {
    setPositionMs(0);
    setSyncWarn(false);
    driftStartedAtRef.current = null;
    syncWarnSentRef.current = false;

    // Force a fresh fetch of synced lyrics (fingerprint refresh as per spec §4.2)
    queryClient.invalidateQueries({ queryKey: ['/v1/tracks', id, 'synced-lyrics'] });

    try {
      await sendLiveSignal({
        type: 'resync',
        trackId: id,
      });
    } catch {
      // Fire-and-forget telemetry should not interrupt UX.
    }
  };

  const onClose = async () => {
    try {
      await sendLiveSignal({
        type: 'exit',
        trackId: id,
      });
    } catch {
      // Fire-and-forget telemetry should not interrupt UX.
    }

    navigate(`/song/${id}`);
  };

  const onFlagLine = async () => {
    if (!id || !selectedLine) {
      return;
    }

    try {
      await sendLiveSignal({
        type: 'flag',
        trackId: id,
        lineId: selectedLine.id,
      });
    } catch {
      // Fire-and-forget telemetry should not interrupt UX.
    }
  };

  const onSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open && id && sheetOpenedAtRef.current) {
      const dwellMs = Date.now() - sheetOpenedAtRef.current;
      sheetOpenedAtRef.current = null;
      sendLiveSignal({
        type: 'dwell',
        trackId: id,
        lineId: selectedLine?.id,
        dwellMs,
      }).catch(() => {
        // Fire-and-forget telemetry should not interrupt UX.
      });
    }
  };

  return (
    <div className="min-h-screen bg-live-obsidian text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pb-8 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={onClose}>
            <ChevronDown className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-live-mint" />
            <span className="text-xs uppercase tracking-[0.2em] text-white/80">Live</span>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="h-12 w-12 overflow-hidden rounded-xl bg-white/10">
            {trackData?.track?.coverArtUrl ? (
              <img src={trackData.track.coverArtUrl} alt="cover" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{trackData?.track?.title || 'Live lyrics'}</p>
            <p className="truncate text-sm text-white/70">{trackData?.track?.artist || 'Unknown artist'}</p>
          </div>
        </div>

        {syncWarn ? (
          <div className="mb-4 rounded-xl border border-dashed border-live-amber bg-live-amber/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-live-amber">
                Sync may be slightly off. We're following, but not fully sure.
              </p>
              <Button variant="outline" size="sm" onClick={onResync}>
                Re-sync
              </Button>
            </div>
          </div>
        ) : null}

        {noLyrics ? (
          <Card className="border-white/10 bg-white/5 text-white">
            <CardContent className="space-y-4 p-5">
              <p className="text-base font-semibold">We hear the song — but the lyrics never dropped in our library.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary">Understand the vibe</Button>
                <Button variant="secondary">Artist context</Button>
                <Button variant="secondary">Search a line</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-white/70">Tap any line to understand it</p>
            <div className="space-y-2">
              {visibleLines.map((line) => {
                const isCurrent = currentLineIndex >= 0 && lines[currentLineIndex]?.id === line.id;
                return (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => onTapLine(line)}
                    className={`w-full rounded-xl px-4 py-3 text-left transition ${
                      isCurrent
                        ? 'border border-[oklch(0.72_0.18_272)] bg-[oklch(0.72_0.18_272_/_0.14)] text-white shadow-[0_0_20px_rgba(167,139,250,0.25)]'
                        : 'text-white/65 hover:bg-white/5'
                    }`}
                  >
                    <p className={isCurrent ? 'font-serif text-[28px] italic leading-tight' : 'font-serif text-[20px] italic leading-tight'}>
                      {line.t}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!noLyrics ? (
          <div className="mt-6 space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-[oklch(0.72_0.18_272)] transition-all"
                style={{ width: `${Math.min(100, totalDurationMs > 0 ? (positionMs / totalDurationMs) * 100 : 0)}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-white/60">
                {Math.floor(positionMs / 1000)}s / {Math.floor(totalDurationMs / 1000)}s
              </p>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsPlaying((v) => !v)}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
        <SheetContent side="bottom" className="h-[86vh] rounded-t-3xl border-white/10 bg-live-obsidian2 text-white">
          <SheetHeader>
            <SheetTitle className="font-serif text-2xl italic text-white">{selectedLine?.t || 'Line meaning'}</SheetTitle>
            <SheetDescription className="text-white/70">
              Current line · {Math.floor(positionMs / 1000)}s
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4">
            <Tabs defaultValue="meaning" className="w-full">
              <TabsList className={`grid w-full ${hasAlternates ? 'grid-cols-3' : 'grid-cols-2'} bg-white/10`}>
                <TabsTrigger value="meaning">Meaning</TabsTrigger>
                {hasAlternates ? <TabsTrigger value="alternates">Breakdown</TabsTrigger> : null}
                <TabsTrigger value="related">Related</TabsTrigger>
              </TabsList>

              <TabsContent value="meaning" className="space-y-3 pt-4">
                {explainMutation.isPending ? (
                  <p className="text-sm text-white/70">Loading meaning...</p>
                ) : explainMutation.data ? (
                  <>
                    <Card className="border-white/10 bg-white/5 text-white">
                      <CardContent className="space-y-2 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/60">Literal</p>
                        <p>{explainMutation.data.literal}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-[oklch(0.72_0.18_272_/_0.35)] bg-[oklch(0.72_0.18_272_/_0.14)] text-white">
                      <CardContent className="space-y-2 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/70">Cultural</p>
                        <p>{explainMutation.data.cultural}</p>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <p className="text-sm text-white/70">Tap a line to load meaning.</p>
                )}
              </TabsContent>

              {hasAlternates ? (
                <TabsContent value="alternates" className="space-y-3 pt-4">
                  <div className="rounded-xl border border-dashed border-live-amber bg-live-amber/10 p-3 text-sm text-live-amber">
                    Multiple meanings dey here
                  </div>
                  {explainMutation.data?.alternates?.map((item, index) => (
                    <Card key={`${item.title}-${index}`} className="border-white/10 bg-white/5 text-white">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">{item.title}</p>
                          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-white/75">
                            {Math.round((item.confidence || 0) * 100)}%
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-white/80">{item.body}</p>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              ) : null}

              <TabsContent value="related" className="space-y-3 pt-4">
                <div className="flex flex-wrap gap-2">
                  {(explainMutation.data?.relatedPhrases || []).map((phrase) => (
                    <span key={phrase} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs">
                      {phrase}
                    </span>
                  ))}
                </div>
                {explainMutation.data?.artistNote ? (
                  <p className="text-sm text-white/80">{explainMutation.data.artistNote}</p>
                ) : null}
              </TabsContent>
            </Tabs>
          </div>

          <div className="mt-6">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={!selectedLine}
                onClick={onFlagLine}
                data-testid="button-flag-line"
              >
                Flag line
              </Button>
              <Button
                className="flex-1"
                disabled={!selectedLine || !explainMutation.data}
                onClick={() => navigate(`/song/${id}/live/explain/${selectedLine?.id || 'current'}`)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Open full meaning
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
