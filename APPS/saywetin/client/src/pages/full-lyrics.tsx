import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ArrowLeft,
  Music,
  Globe,
  Loader2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronDown,
  CircleAlert,
  Gamepad2,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { getApiUrl } from '@/lib/api-config';
import { LISTEN_MODE_PATH } from '@/lib/navigation';
import { STORY_MODE_ENABLED } from '@/lib/features';
import {
  parseAnalysesWithSlang,
  buildOrderedLyricLines,
  buildPhraseCaptureModel,
  estimateMomentLineIndex,
  type OrderedLyricLine,
} from '@/lib/lyrics-utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AiTranslation {
  id: string;
  originalText: string;
  translation: string;
  culturalContext?: string;
  artistIntent?: string;
  deeperMeaning?: string;
  languageNotes?: string;
  detectedLanguage?: string;
  slangTerms?: string | null;
  upvotes: number;
  downvotes: number;
}

interface SlangTerm {
  term: string;
  meaning: string;
  language: string;
}

type LineFeedbackState = {
  status: 'loading' | 'unavailable' | 'failed';
  message?: string;
  background?: boolean;
};

type LyricRowVisualState = 'idle' | 'loading' | 'analyzed' | 'unavailable';

interface RecognizedTrackDetail {
  track: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    genre?: string;
    playOffsetMs?: number;
    trackDurationMs?: number;
    confidenceScore?: number;
    analysisStatus?: string;
    lyricsStatus?: string;
  };
  lyrics?: { text: string; language: string; source: string };
  culturalAnalysis?: AiTranslation[];
  status?: {
    lyrics: string;
    analysis: string;
    aiConfigured: boolean;
    aiProvider: string;
  };
}

interface ContinuationSuggestion {
  suggestion: {
    id: string;
    title: string;
    artist: string;
  } | null;
  matchReason?: string;
  reason?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeLineKey(value: string): string {
  return value.trim().toLowerCase();
}

function serializeSlangTerms(value?: string | SlangTerm[] | null): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function buildOptimisticAnalysis(
  lyricText: string,
  analysis: Partial<AiTranslation> & { slangTerms?: string | SlangTerm[] | null },
): AiTranslation {
  return {
    id: `lazy-${normalizeLineKey(lyricText)}-${Date.now()}`,
    originalText: lyricText.trim(),
    translation: analysis.translation || 'Meaning ready',
    culturalContext: analysis.culturalContext,
    artistIntent: analysis.artistIntent,
    deeperMeaning: analysis.deeperMeaning,
    languageNotes: analysis.languageNotes,
    detectedLanguage: analysis.detectedLanguage,
    slangTerms: serializeSlangTerms(analysis.slangTerms),
    upvotes: 0,
    downvotes: 0,
  };
}

function parseStreamingAnalysisPayload(payload: unknown) {
  if (payload && typeof payload === 'object') {
    return payload as Partial<AiTranslation> & { slangTerms?: string | SlangTerm[] | null };
  }
  if (typeof payload !== 'string') return null;
  const trimmed = payload.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as Partial<AiTranslation> & { slangTerms?: string | SlangTerm[] | null };
  } catch {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]) as Partial<AiTranslation> & { slangTerms?: string | SlangTerm[] | null };
    } catch {
      return null;
    }
  }
}

function parseSlangTerms(value?: string | SlangTerm[] | null): SlangTerm[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getLyricRowVisualState(
  row: OrderedLyricLine,
  feedback: LineFeedbackState | undefined,
  isExpanded: boolean,
): LyricRowVisualState {
  if (feedback?.background && !isExpanded) return row.analysis ? 'analyzed' : 'idle';
  if (feedback?.status === 'loading') return 'loading';
  if (feedback?.status === 'unavailable' || feedback?.status === 'failed') return 'unavailable';
  if (row.analysis) return 'analyzed';
  return 'idle';
}

function getLineFallbackMessage(feedback?: LineFeedbackState): string {
  if (feedback?.status === 'unavailable') return 'Meaning for this line is not ready yet.';
  return 'This line did not open this time.';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LineStateBadge({ state }: { state: LyricRowVisualState }) {
  if (state === 'loading') {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading meaning
      </Badge>
    );
  }
  if (state === 'unavailable') {
    return (
      <Badge variant="outline" className="gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300">
        <CircleAlert className="h-3.5 w-3.5" />
        Unavailable
      </Badge>
    );
  }
  if (state === 'analyzed') {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Meaning ready
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 border-primary/25 text-primary">
      <Sparkles className="h-3.5 w-3.5" />
      View meaning
    </Badge>
  );
}

function LyricInsightBody({ analysis }: { analysis: OrderedLyricLine['analysis'] }) {
  if (!analysis) return null;

  const hasContext =
    analysis.culturalContext ||
    analysis.artistIntent ||
    analysis.deeperMeaning ||
    analysis.languageNotes ||
    analysis.lyricBreakdown;

  if (!hasContext) return null;

  const insightBlocks = [
    analysis.deeperMeaning ? { label: 'Meaning', value: analysis.deeperMeaning } : null,
    analysis.culturalContext ? { label: 'Story', value: analysis.culturalContext } : null,
    analysis.artistIntent ? { label: 'Artist intent', value: analysis.artistIntent } : null,
    analysis.languageNotes ? { label: 'Language note', value: analysis.languageNotes } : null,
  ].filter((block): block is { label: string; value: string } => Boolean(block));

  return (
    <div className="mt-5 border-t border-border/70 pt-5">
      <div className="space-y-4">
        {analysis.lyricBreakdown && (
          <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Line detail</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{analysis.lyricBreakdown}</p>
          </div>
        )}
        {insightBlocks.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {insightBlocks.map((block) => (
              <div key={block.label} className="rounded-2xl border border-border/70 bg-background/85 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{block.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">{block.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {analysis.slangTerms && analysis.slangTerms.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border/70 bg-muted/25 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Key phrases</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.slangTerms.map((slang, slangIdx) => (
              <Popover key={`${analysis.id}-${slangIdx}`}>
                <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Badge variant="secondary" className="cursor-pointer text-xs hover-elevate">
                    {slang.term}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" side="top">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{slang.term}</span>
                      <Badge variant="outline" className="text-xs">{slang.language}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{slang.meaning}</p>
                  </div>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UnifiedLyricRow({
  row,
  feedback,
  isExpanded,
  isCurrentMoment,
  onPress,
  onRetry,
}: {
  row: OrderedLyricLine;
  feedback?: LineFeedbackState;
  isExpanded: boolean;
  isCurrentMoment: boolean;
  onPress: () => void;
  onRetry: () => void;
}) {
  const visualState = getLyricRowVisualState(row, feedback, isExpanded);
  const hasAnalysis = visualState === 'analyzed';
  const collapsedSupportText =
    visualState === 'analyzed'
      ? row.analysis?.translation
      : visualState === 'loading'
        ? 'Loading meaning for this line...'
        : visualState === 'unavailable'
          ? getLineFallbackMessage(feedback)
          : null;

  return (
    <div
      className={`overflow-hidden rounded-[1.35rem] border transition-all ${
        isExpanded
          ? 'border-primary/35 bg-primary/[0.045] shadow-[0_16px_40px_rgba(249,115,22,0.08)]'
          : isCurrentMoment
            ? 'border-primary/25 bg-primary/[0.03] shadow-[0_8px_24px_rgba(249,115,22,0.05)]'
            : 'border-border/70 bg-background/85 hover:border-primary/20 hover:bg-muted/20'
      }`}
      data-testid={`lyric-row-${row.lineIndex}`}
    >
      <button
        type="button"
        onClick={onPress}
        className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left"
        data-testid={`lyric-item-${row.lineIndex}`}
      >
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
              {isCurrentMoment && (
                <Badge variant="outline" className="border-primary/35 bg-primary/5 text-primary">
                  Likely line
                </Badge>
              )}
            <LineStateBadge state={visualState} />
          </div>
          <p className="font-serif text-[1.05rem] leading-8 text-foreground sm:text-[1.12rem]" data-testid={`text-original-${row.lineIndex}`}>
            {row.text}
          </p>
          {collapsedSupportText && (
            <p className={`text-sm leading-relaxed ${
              visualState === 'loading'
                ? 'text-primary'
                : visualState === 'unavailable'
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'italic text-muted-foreground'
            }`}>
              {collapsedSupportText}
            </p>
          )}
        </div>
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/80">
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        hasAnalysis ? (
          <div className="px-5 pb-5">
            <LyricInsightBody analysis={row.analysis} />
          </div>
        ) : visualState === 'loading' ? (
          <div className="px-5 pb-5">
            <div className="border-t border-border/70 pt-5">
              <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading meaning
                </div>
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-9/12" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-5">
            <div className="border-t border-border/70 pt-5">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{getLineFallbackMessage(feedback)}</p>
                    <p className="text-xs text-muted-foreground">Try opening this line again.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={onRetry} data-testid={`button-retry-line-${row.lineIndex}`}>
                    Try again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FullLyricsPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const trackId = params.id;

  const [loadingLines, setLoadingLines] = useState<Set<string>>(new Set());
  const [lineFeedback, setLineFeedback] = useState<Map<string, LineFeedbackState>>(new Map());
  const [selectedLineKey, setSelectedLineKey] = useState<string | null>(null);
  const youWereHereRef = useRef<HTMLDivElement>(null);
  const hasTriggeredMomentAnalysis = useRef(false);
  const prefetchTimeoutsRef = useRef<number[]>([]);
  const scheduledRefreshRef = useRef<number | null>(null);

  const isNativeAndroid =
    typeof document !== 'undefined' && document.body.classList.contains('capacitor-android');

  const clearLineState = (rowKey: string) => {
    setLoadingLines((prev) => {
      const next = new Set(prev);
      next.delete(rowKey);
      return next;
    });
  };

  const setLineFeedbackState = (rowKey: string, feedback?: LineFeedbackState) => {
    setLineFeedback((prev) => {
      const next = new Map(prev);
      if (feedback) next.set(rowKey, feedback);
      else next.delete(rowKey);
      return next;
    });
  };

  const clearPrefetchTimeouts = () => {
    if (typeof window === 'undefined') return;
    prefetchTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    prefetchTimeoutsRef.current = [];
  };

  const clearScheduledRefresh = () => {
    if (typeof window === 'undefined' || scheduledRefreshRef.current === null) {
      scheduledRefreshRef.current = null;
      return;
    }
    window.clearTimeout(scheduledRefreshRef.current);
    scheduledRefreshRef.current = null;
  };

  const scheduleTrackRefresh = () => {
    if (!trackId) return;
    if (typeof window === 'undefined') {
      queryClient.invalidateQueries({ queryKey: ['/api/recognized-tracks', trackId] });
      return;
    }
    clearScheduledRefresh();
    scheduledRefreshRef.current = window.setTimeout(() => {
      scheduledRefreshRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['/api/recognized-tracks', trackId] });
    }, 450);
  };

  const hasCachedAnalysisForLine = (lyricText: string): boolean => {
    if (!trackId) return false;
    const normalizedText = lyricText.trim().toLowerCase();
    const current = queryClient.getQueryData<RecognizedTrackDetail | undefined>([
      '/api/recognized-tracks',
      trackId,
    ]);

    return (current?.culturalAnalysis || []).some(
      (entry) => entry.originalText.trim().toLowerCase() === normalizedText,
    );
  };

  const upsertAnalysisIntoCache = (
    lyricText: string,
    analysis: Partial<AiTranslation> & { slangTerms?: string | SlangTerm[] | null },
  ) => {
    if (!trackId) return;
    queryClient.setQueryData<RecognizedTrackDetail | undefined>(
      ['/api/recognized-tracks', trackId],
      (current) => {
        if (!current) return current;
        const normalizedText = lyricText.trim().toLowerCase();
        const exists = (current.culturalAnalysis || []).some(
          (e) => e.originalText.trim().toLowerCase() === normalizedText,
        );
        if (exists) return current;
        return {
          ...current,
          culturalAnalysis: [
            ...(current.culturalAnalysis || []),
            buildOptimisticAnalysis(lyricText, analysis),
          ],
        };
      },
    );
  };

  const { data, isLoading } = useQuery<RecognizedTrackDetail>({
    queryKey: ['/api/recognized-tracks', trackId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/recognized-tracks/${trackId}`), {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!trackId,
    staleTime: 0,
    refetchInterval: (query) => {
      const d = query.state.data as RecognizedTrackDetail | undefined;
      if (!d) return false;
      const still = d.track.analysisStatus === 'generating_analysis' || d.track.analysisStatus === 'pending';
      return still ? 3000 : false;
    },
  });

  const retryEnrichmentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl(`/api/recognized-tracks/${trackId}/retry-analysis`), {
        method: 'POST',
        credentials: 'include',
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.message || payload?.error || 'Retry failed.');
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recognized-tracks', trackId] });
    },
    onError: (err) => {
      console.error('[RETRY] Enrichment retry failed:', err);
    },
  });

  const previousTrackId = sessionStorage.getItem('saywetin_prev_track');
  const { data: continuation } = useQuery<ContinuationSuggestion>({
    queryKey: ['/api/continuation', trackId, previousTrackId],
    queryFn: async () => {
      const url = previousTrackId
        ? getApiUrl(`/api/continuation/${trackId}?excludeId=${previousTrackId}`)
        : getApiUrl(`/api/continuation/${trackId}`);
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch continuation');
      return res.json();
    },
    enabled: !!trackId && (data?.culturalAnalysis?.length || 0) > 0,
    staleTime: 1000 * 60 * 60,
  });

  const handleContinuationClick = (suggestionId: string) => {
    sessionStorage.setItem('saywetin_prev_track', trackId!);
    navigate(`/song/${suggestionId}`);
  };

  const analyzeFallback = async (
    row: OrderedLyricLine,
    options?: { background?: boolean },
  ) => {
    try {
      const endpoint = getApiUrl('/api/analyze-line');
      const requestBody = {
        lyricText: row.text,
        trackId: data!.track.id,
        songTitle: data!.track.title,
        artistName: data!.track.artist,
        genre: data!.track.genre || '',
        language: data?.lyrics?.language || '',
      };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const rawBody = await response.text();
        let failureStatus: LineFeedbackState['status'] = 'failed';
        try {
          const payload = rawBody ? JSON.parse(rawBody) : null;
          failureStatus = payload?.status === 'unavailable' ? 'unavailable' : 'failed';
          console.error('[ANALYZE] analyze-line failed', {
            endpoint,
            httpStatus: response.status,
            feedbackStatus: failureStatus,
            trackId: requestBody.trackId,
            lyricPreview: row.text.slice(0, 80),
            responseBody: payload,
          });
        } catch {
          console.error('[ANALYZE] analyze-line failed (non-JSON)', {
            endpoint,
            httpStatus: response.status,
            rawBody,
          });
        }
        throw Object.assign(new Error('This line did not open this time.'), { feedbackStatus: failureStatus });
      }

      const result = await response.json();
      if (result.success) {
        if (result.analysis) upsertAnalysisIntoCache(row.text, result.analysis);
        setLineFeedbackState(row.key);
        scheduleTrackRefresh();
      } else {
        console.warn('[ANALYZE] Analysis issue:', result.message);
        setLineFeedbackState(row.key, {
          status: result.status === 'unavailable' ? 'unavailable' : 'failed',
          message: result.status === 'unavailable'
            ? 'Meaning for this line is not ready yet.'
            : 'This line did not open this time.',
          background: options?.background,
        });
      }
    } catch (err: any) {
      console.error('[ANALYZE] Fetch fallback failed:', err);
      setLineFeedbackState(row.key, {
        status: err?.feedbackStatus === 'unavailable' ? 'unavailable' : 'failed',
        message: err?.feedbackStatus === 'unavailable'
          ? 'Meaning for this line is not ready yet.'
          : 'This line did not open this time.',
        background: options?.background,
      });
    } finally {
      clearLineState(row.key);
    }
  };

  const requestLineAnalysis = (
    row: OrderedLyricLine,
    options?: { activate?: boolean; background?: boolean },
  ) => {
    if (!data) return;

    if (options?.activate) {
      setSelectedLineKey(row.key);
    }
    if (row.analysis || hasCachedAnalysisForLine(row.text) || loadingLines.has(row.key)) {
      setLineFeedbackState(row.key);
      return;
    }

    const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
    const streamEndpoint = getApiUrl('/api/analyze-line/stream');
    console.info('[ANALYZE] Requesting line meaning', {
      transport: isNative ? 'fetch' : 'sse',
      endpoint: isNative ? getApiUrl('/api/analyze-line') : streamEndpoint,
      trackId: data.track.id,
      songTitle: data.track.title,
      artistName: data.track.artist,
      background: Boolean(options?.background),
      lyricPreview: row.text.slice(0, 80),
    });

    setLoadingLines((prev) => new Set(prev).add(row.key));
    setLineFeedbackState(row.key, { status: 'loading', background: options?.background });

    if (isNative) {
      analyzeFallback(row, options);
      return;
    }

    const searchParams = new URLSearchParams({
      lyricText: row.text,
      trackId: data.track.id,
      songTitle: data.track.title,
      artistName: data.track.artist,
      genre: data.track.genre || '',
      language: data.lyrics?.language || '',
    });

    let receivedMessage = false;
    const es = new EventSource(`${streamEndpoint}?${searchParams.toString()}`);

    const sseTimeout = setTimeout(() => {
      if (!receivedMessage) {
        console.warn('[ANALYZE] SSE timeout, falling back to fetch');
        es.close();
        analyzeFallback(row, options);
      }
    }, 8000);

    es.onmessage = (event) => {
      receivedMessage = true;
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'chunk') return;
        if (parsed.type === 'complete' || parsed.type === 'cached') {
          clearTimeout(sseTimeout);
          const analysis = parseStreamingAnalysisPayload(parsed.data);
          if (analysis) {
            upsertAnalysisIntoCache(row.text, analysis);
          } else {
            console.warn('[ANALYZE] Could not parse streaming payload, falling back');
            es.close();
            analyzeFallback(row, options);
            return;
          }
          clearLineState(row.key);
          setLineFeedbackState(row.key);
          scheduleTrackRefresh();
          es.close();
        } else if (parsed.type === 'error') {
          clearTimeout(sseTimeout);
          clearLineState(row.key);
          setLineFeedbackState(row.key, {
            status: 'unavailable',
            message: 'Meaning for this line is not ready yet.',
            background: options?.background,
          });
          console.warn('[ANALYZE] SSE error event:', parsed.data);
          es.close();
        }
      } catch (e) {
        console.error('[ANALYZE] SSE parse error:', e);
      }
    };

    es.onerror = () => {
      clearTimeout(sseTimeout);
      es.close();
      if (!receivedMessage) {
        console.warn('[ANALYZE] SSE onerror before first message, falling back');
        analyzeFallback(row, options);
      } else {
        clearLineState(row.key);
      }
    };
  };

  const orderedLyricLines = useMemo(() => {
    const text = data?.lyrics?.text || '';
    if (!text) return [];
    const parsed = parseAnalysesWithSlang(data?.culturalAnalysis || []);
    return buildOrderedLyricLines(text, parsed);
  }, [data?.culturalAnalysis, data?.lyrics?.text]);

  const estimatedMomentIndex = useMemo(
    () => estimateMomentLineIndex(orderedLyricLines.length, data?.track.playOffsetMs, data?.track.trackDurationMs),
    [orderedLyricLines.length, data?.track.playOffsetMs, data?.track.trackDurationMs],
  );

  const phraseCapture = useMemo(
    () => buildPhraseCaptureModel(orderedLyricLines, data?.track.playOffsetMs, data?.track.trackDurationMs, data?.track.confidenceScore),
    [orderedLyricLines, data?.track.playOffsetMs, data?.track.trackDurationMs, data?.track.confidenceScore],
  );

  const momentRows = useMemo(
    () =>
      phraseCapture.highlightedLineIndexes
        .map((lineIndex) => orderedLyricLines.find((line) => line.lineIndex === lineIndex))
        .filter((line): line is OrderedLyricLine => Boolean(line)),
    [orderedLyricLines, phraseCapture.highlightedLineIndexes],
  );
  const defaultMomentRow = useMemo(() => {
    const anchoredRow =
      typeof phraseCapture.anchoredLineIndex === 'number'
        ? orderedLyricLines.find((line) => line.lineIndex === phraseCapture.anchoredLineIndex)
        : undefined;

    if (anchoredRow) return anchoredRow;
    if (estimatedMomentIndex !== null) {
      const estimatedRow = orderedLyricLines.find((line) => line.lineIndex === estimatedMomentIndex);
      if (estimatedRow) return estimatedRow;
    }

    return orderedLyricLines[0] || null;
  }, [estimatedMomentIndex, orderedLyricLines, phraseCapture.anchoredLineIndex]);
  const prioritizedMomentRows = useMemo(() => {
    if (!defaultMomentRow) return [];

    const seen = new Set<string>([defaultMomentRow.key]);
    const neighbors = [...momentRows]
      .filter((row) => row.key !== defaultMomentRow.key)
      .sort((left, right) => {
        const leftDistance = Math.abs(left.lineIndex - defaultMomentRow.lineIndex);
        const rightDistance = Math.abs(right.lineIndex - defaultMomentRow.lineIndex);
        return leftDistance - rightDistance;
      });

    return [defaultMomentRow, ...neighbors]
      .filter((row) => {
        if (seen.has(row.key)) return row.key === defaultMomentRow.key;
        seen.add(row.key);
        return true;
      })
      .slice(0, 3);
  }, [defaultMomentRow, momentRows]);

  const analysisViewState = data?.status?.analysis;
  const canRetryEnrichment =
    STORY_MODE_ENABLED &&
    !!trackId &&
    !!data?.lyrics &&
    !retryEnrichmentMutation.isPending &&
    (analysisViewState === 'failed' ||
      data?.track.analysisStatus === 'failed' ||
      ((data?.culturalAnalysis?.length || 0) === 0 && data?.track.analysisStatus !== 'generating_analysis'));

  const hasSlangTerms = (data?.culturalAnalysis || []).some((a) => a.slangTerms);

  // Reset on track change
  useEffect(() => {
    hasTriggeredMomentAnalysis.current = false;
    clearPrefetchTimeouts();
    clearScheduledRefresh();
    setLoadingLines(new Set());
    setSelectedLineKey(null);
    setLineFeedback(new Map());
  }, [trackId]);

  // Auto-enrich the default line first, then nearby lines without stealing focus.
  useEffect(() => {
    if (hasTriggeredMomentAnalysis.current || !data) return;
    if (data.track.analysisStatus === 'generating_analysis' || data.track.analysisStatus === 'pending') return;
    const unresolved = prioritizedMomentRows.filter((row) => !row.analysis);
    if (unresolved.length === 0) return;

    hasTriggeredMomentAnalysis.current = true;
    clearPrefetchTimeouts();

    const [primaryRow, ...nearbyRows] = unresolved;
    requestLineAnalysis(primaryRow, { activate: true, background: false });

    nearbyRows.slice(0, 2).forEach((row, index) => {
      if (typeof window === 'undefined') {
        requestLineAnalysis(row, { background: true });
        return;
      }

      const timeoutId = window.setTimeout(() => {
        requestLineAnalysis(row, { background: true });
        prefetchTimeoutsRef.current = prefetchTimeoutsRef.current.filter((id) => id !== timeoutId);
      }, 260 * (index + 1));

      prefetchTimeoutsRef.current.push(timeoutId);
    });

    return () => {
      clearPrefetchTimeouts();
    };
  }, [data, prioritizedMomentRows]);

  useEffect(() => {
    return () => {
      clearPrefetchTimeouts();
      clearScheduledRefresh();
    };
  }, []);

  // Clear feedback for lines that got analyzed
  useEffect(() => {
    const hasAnyAnalyzedLine = orderedLyricLines.some((row) => row.analysis);
    if (!hasAnyAnalyzedLine) return;
    setLineFeedback((prev) => {
      const next = new Map(prev);
      let changed = false;
      orderedLyricLines.forEach((row) => {
        if (row.analysis && next.has(row.key)) {
          next.delete(row.key);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [orderedLyricLines]);

  // Default open the best matched line without waiting for a tap.
  useEffect(() => {
    if (selectedLineKey || orderedLyricLines.length === 0) return;
    if (defaultMomentRow) setSelectedLineKey(defaultMomentRow.key);
  }, [defaultMomentRow, orderedLyricLines.length, selectedLineKey]);

  const handleLyricRowPress = (row: OrderedLyricLine) => {
    const feedback = lineFeedback.get(row.key);

    if (selectedLineKey === row.key && row.analysis) {
      setSelectedLineKey(null);
      return;
    }

    setSelectedLineKey(row.key);
    if (row.analysis || feedback?.status === 'loading') return;
    requestLineAnalysis(row);
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <header className={`sticky top-0 z-50 border-b ${isNativeAndroid ? 'bg-background/98' : 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'}`}>
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(trackId ? `/song/${trackId}` : '/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading lyrics...</p>
        </div>
      </div>
    );
  }

  if (!data.lyrics) {
    return (
      <div className="min-h-screen bg-background">
        <header className={`sticky top-0 z-50 border-b ${isNativeAndroid ? 'bg-background/98' : 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'}`}>
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/song/${trackId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
          <Music className="h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No lyrics available</p>
          <p className="text-sm text-muted-foreground">Lyrics for this track haven't been mapped yet.</p>
          <Button variant="outline" onClick={() => navigate(`/song/${trackId}`)}>Back to result</Button>
        </div>
      </div>
    );
  }

  const { track } = data;

  return (
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } }}
    >
      <header className={`sticky top-0 z-50 border-b ${isNativeAndroid ? 'bg-background/98' : 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'}`}>
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/song/${trackId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            <Globe className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold truncate">{track.title}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-6">
          {/* Header summary */}
          <div className="space-y-1">
            <h1 className="text-xl font-bold">{track.title}</h1>
            <p className="text-muted-foreground">{track.artist}</p>
            <p className="text-xs text-muted-foreground">
              {orderedLyricLines.length} lines ready to explore
            </p>
          </div>

          {/* Retry if analysis failed */}
          {canRetryEnrichment && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => retryEnrichmentMutation.mutate()}
              disabled={retryEnrichmentMutation.isPending}
              data-testid="button-retry-deeper-gist"
            >
              {retryEnrichmentMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Retrying...</>
              ) : 'Load deeper context'}
            </Button>
          )}

          {/* Lyric rows */}
          <Card data-testid="card-lyrics" className="border-border overflow-hidden">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Globe className="h-5 w-5 text-primary" />
                    Full lyrics
                  </CardTitle>
                  <CardDescription className="mt-1">Best-matched line opens first. Nearby meanings load in the background.</CardDescription>
                </div>
                {false && hasSlangTerms && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/game?trackId=${trackId}`)}
                    data-testid="button-play-game"
                    className="gap-2"
                  >
                    <Gamepad2 className="h-4 w-4" />
                    Play Game
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {orderedLyricLines.length > 0 ? (
                <div className="px-6 py-5">
                  <div className="space-y-4">
                    {orderedLyricLines.map((row, rowIndex) => {
                      const feedback = lineFeedback.get(row.key);
                      const isExpanded = selectedLineKey === row.key;
                      const isCurrentMoment = phraseCapture.highlightedLineIndexes.includes(row.lineIndex);
                      const showBlockLabel =
                        rowIndex === 0 || orderedLyricLines[rowIndex - 1].blockIndex !== row.blockIndex;

                      return (
                        <div key={row.key} className="space-y-4">
                          {showBlockLabel && (
                            <div className="pt-3 first:pt-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                {row.blockLabel}
                              </p>
                            </div>
                          )}
                          <div ref={estimatedMomentIndex === row.lineIndex ? youWereHereRef : undefined}>
                            <UnifiedLyricRow
                              row={row}
                              feedback={feedback}
                              isExpanded={isExpanded}
                              isCurrentMoment={isCurrentMoment}
                              onPress={() => handleLyricRowPress(row)}
                              onRetry={() => requestLineAnalysis(row)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : data.track.analysisStatus === 'generating_analysis' || data.track.analysisStatus === 'pending' ? (
                <div className="text-center py-12 space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="font-medium">Building the meaning...</p>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Pulling together lyric meaning and context for the lines you heard.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Continuation */}
          {continuation?.suggestion && (
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-amber-500/5 overflow-visible">
              <CardContent className="py-5 px-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0 shadow-md">
                    <Music className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">If this resonates, try:</p>
                    <button
                      onClick={() => handleContinuationClick(continuation.suggestion!.id)}
                      className="text-left rounded-md"
                      data-testid="button-continuation-suggestion"
                    >
                      <span className="font-semibold text-foreground">{continuation.suggestion.title}</span>
                      <span className="text-muted-foreground"> by {continuation.suggestion.artist}</span>
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleContinuationClick(continuation.suggestion!.id)}
                    className="shrink-0"
                    data-testid="button-continuation-go"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-center py-6 text-xs text-muted-foreground/60">
            Feel the rhythm, know the roots.
          </div>
        </div>
      </div>
    </motion.div>
  );
}
