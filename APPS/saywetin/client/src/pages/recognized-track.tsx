import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { useInteractionLogger } from '@/hooks/use-interaction-logger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Music,
  Globe,
  Heart,
  Lightbulb,
  Languages,
  ExternalLink,
  Loader2,
  CheckCircle2,
  FileText,
  MapPin,
  Send,
  BookOpen,
  User,
  Info,
  Zap,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { ListeningOrb } from '@/components/listening-orb';
import { trackRecognitionSucceeded } from '@/lib/analytics';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { getApiUrl } from '@/lib/api-config';
import { LISTEN_MODE_PATH } from '@/lib/navigation';
import {
  parseAnalysesWithSlang,
  buildOrderedLyricLines,
  buildPhraseCaptureModel,
  estimateMomentLineIndex,
  type SlangTerm,
  type OrderedLyricLine,
} from '@/lib/lyrics-utils';

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

type ProcessingStatus = 'pending' | 'fetching_lyrics' | 'generating_analysis' | 'completed' | 'failed' | 'no_lyrics';

interface ArtistSongInfo {
  artistBio: string;
  artistOrigin: string;
  musicStyle: string;
  songBackground: string;
  albumInfo?: string;
  funFact?: string;
  verification?: 'verified' | 'unverified';
  verificationNote?: string;
  status?: 'complete' | 'unavailable' | 'failed';
  message?: string;
}

interface FragmentInterpretation {
  titleMeaning?: string;
  detectedPhrases: Array<{
    phrase: string;
    meaning: string;
    culturalContext: string;
    emotionalIntent: string;
  }>;
  likelyThemes: string[];
  culturalNote: string;
  status?: 'complete' | 'unavailable' | 'failed';
  message?: string;
}

interface ResultContinuationSuggestion {
  suggestion: {
    id: string;
    title: string;
    artist: string;
  } | null;
  reason?: string;
}

interface RecognizedTrackDetail {
  track: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    releaseYear?: number;
    genre?: string;
    confidenceScore?: number;
    spotifyId?: string;
    youtubeId?: string;
    coverArtUrl?: string | null;
    isrc?: string;
    playOffsetMs?: number;
    trackDurationMs?: number;
    lyricsStatus?: ProcessingStatus;
    analysisStatus?: ProcessingStatus;
    processingStartedAt?: string;
  };
  lyrics?: {
    text: string;
    language: string;
    source: string;
  };
  culturalAnalysis?: AiTranslation[];
  status?: {
    lyrics: 'pending' | 'complete' | 'unavailable' | 'failed';
    analysis: 'pending' | 'complete' | 'unavailable' | 'failed';
    aiConfigured: boolean;
    aiProvider: 'openai' | 'openrouter' | 'none';
    lyricsProvider?: string;
    analysisMessage?: string;
  };
}

interface InsightBadgeModel {
  label: string;
}

interface PrimaryGistModel {
  title: string;
  summary: string;
  support?: string;
}

function getPrimaryMomentMeaning(row?: OrderedLyricLine | null): {
  headline?: string;
  detail?: string;
} {
  const analysis = row?.analysis;
  if (!analysis) {
    return {};
  }

  return {
    headline:
      analysis.translation ||
      analysis.deeperMeaning ||
      analysis.culturalContext ||
      analysis.artistIntent,
    detail:
      analysis.deeperMeaning ||
      analysis.culturalContext ||
      analysis.artistIntent ||
      analysis.languageNotes,
  };
}



function getArtistStatusCopy(status: ArtistSongInfo['status'] | undefined): string {
  if (status === 'failed') {
    return 'We already found the song. Richer artist context hit a small delay.';
  }

  return 'We already found the song. Richer artist context is still coming in.';
}

function getFragmentStatusCopy(status: FragmentInterpretation['status'] | undefined): string {
  if (status === 'failed') {
    return 'We already found the song. More title meaning hit a small delay.';
  }

  return 'We already found the song. More title meaning is still coming in.';
}

function isFallbackInsightText(value?: string | null): boolean {
  if (!value) return false;

  const normalized = value.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!normalized) return false;

  return [
    'unavailable right now',
    'still loading',
    'hit a small delay',
    'taking a little longer',
    'we recognized the song already',
    'we matched the song already',
    'we found the song already',
    'more title gist',
    'more artist gist',
    'more meaning',
    'deeper gist',
    'deeper breakdown',
    'will show when the ai layer is back on',
    'artist background still needs verification',
    'profile hidden until we can verify',
    'never fit verify a trusted public profile',
  ].some((phrase) => normalized.includes(phrase));
}

type PhraseHint = {
  phrase: string;
  meaning: string;
};

function cleanPhraseMeaning(value?: string | null): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s*\([^)]*\)/g, '').trim();
  return cleaned || undefined;
}

function parseSlangTerms(value?: string | SlangTerm[] | null): SlangTerm[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function RecognitionHoldingScreen({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  const isNativeAndroid =
    typeof document !== 'undefined' && document.body.classList.contains('capacitor-android');

  return (
    <div className="min-h-screen bg-background">
      <header
        className={`sticky top-0 z-50 border-b ${
          isNativeAndroid
            ? 'bg-background/98'
            : 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'
        }`}
      >
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-background to-background dark:from-orange-500/15" />
        {isNativeAndroid ? (
          <div className="absolute left-1/2 top-[42%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-orange-500/12 via-amber-400/10 to-green-400/10 blur-2xl" />
        ) : (
          <>
            <div className="absolute top-14 left-8 h-32 w-32 rounded-full bg-orange-500/12 blur-3xl" />
            <div className="absolute bottom-10 right-6 h-36 w-36 rounded-full bg-green-500/10 blur-3xl" />
          </>
        )}

        <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 text-center">
          <ListeningOrb mode="matching" size="hero" />

          <div className="space-y-2">
            <p className="text-2xl font-semibold">{title}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessingField({
  lyricsStatus,
  analysisStatus,
  analysisCount = 0,
}: {
  lyricsStatus?: ProcessingStatus;
  analysisStatus?: ProcessingStatus;
  analysisCount?: number;
}) {
  const lyricsReady = lyricsStatus === 'completed';
  const lyricsActive = lyricsStatus === 'pending' || lyricsStatus === 'fetching_lyrics';
  const meaningReady = analysisStatus === 'completed';
  const meaningActive = analysisStatus === 'pending' || analysisStatus === 'generating_analysis';

  const headline =
    analysisStatus === 'generating_analysis'
      ? 'Tightening the meaning'
      : lyricsStatus === 'fetching_lyrics'
        ? 'Listening deeper'
        : 'Holding the match';

  const detail =
    analysisStatus === 'generating_analysis'
      ? 'The same listening field is still active while we sharpen the meaning.'
      : lyricsStatus === 'fetching_lyrics'
        ? 'We already caught the song. Now the field is narrowing around the words.'
        : 'The song is locked in. We are keeping the motion alive while the next layer lands.';

  return (
    <div className="space-y-5 py-2">
      <div className="flex flex-col items-center text-center">
        <ListeningOrb mode="matching" size="compact" />
        <p className="mt-2 text-lg font-semibold text-foreground">{headline}</p>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{detail}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/10 bg-background/70 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {lyricsReady ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : lyricsActive ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            )}
            Lyrics
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {lyricsReady
              ? 'The vocal layer is in view.'
              : lyricsStatus === 'fetching_lyrics'
                ? 'Pulling the strongest vocal lines into focus.'
                : 'Opening the lyric layer.'}
          </p>
        </div>

        <div className="rounded-2xl border border-primary/10 bg-background/70 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {meaningReady ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : meaningActive ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            )}
            Meaning
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {meaningReady
              ? 'The interpretation is ready.'
              : analysisStatus === 'generating_analysis'
                ? 'Refining the meaning around the lines we just heard.'
                : 'Waiting for the tighter read.'}
          </p>
        </div>
      </div>

      {analysisCount > 0 && !meaningReady ? (
        <p className="text-center text-xs text-muted-foreground">
          {analysisCount} lyric {analysisCount === 1 ? 'line is' : 'lines are'} already in view while the field keeps tightening.
        </p>
      ) : null}
    </div>
  );
}

export default function RecognizedTrack() {
  const params = useParams();
  const [, navigate] = useLocation();
  const trackId = params.id;
  const [isProcessing, setIsProcessing] = useState(true);
  const [prevAnalysisCount, setPrevAnalysisCount] = useState(0);
  
  // Contribute lyrics state
  const [contributedLyrics, setContributedLyrics] = useState('');
  const [showContributeForm, setShowContributeForm] = useState(false);
  
  // X-Ray artist info state - auto-show when track loads
  const [showXRay, setShowXRay] = useState(false);
  const hasAutoShownXRay = useRef(false);
  const [artworkLoadFailed, setArtworkLoadFailed] = useState(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const albumHeaderRef = useRef<HTMLDivElement>(null);
  // Guard: true once SSE has started (connection opened), used to suppress premature error renders
  const [sseStarted, setSseStarted] = useState(false);
  // Anonymous interaction logging for behavioral analytics
  const { logInteraction } = useInteractionLogger(trackId, undefined);
  const hasLoggedRecognition = useRef(false);
  const hasTrackedRecognitionEvent = useRef<string | null>(null);
  const prevShowXRay = useRef(showXRay);

  const firstSentence = (value?: string | null): string | undefined => {
    if (!value) return undefined;
    const trimmed = value.replace(/\s+/g, ' ').trim();
    if (!trimmed) return undefined;

    const sentenceMatch = trimmed.match(/.+?[.!?](?=\s+[A-Z"']|$)/);
    return (sentenceMatch ? sentenceMatch[0] : trimmed).trim();
  };

  const compactText = (value?: string | null, maxLength = 180): string | undefined => {
    const sentence = firstSentence(value);
    if (!sentence) return undefined;
    if (sentence.length <= maxLength) return sentence;
    return `${sentence.slice(0, maxLength - 3).trimEnd()}...`;
  };

  const cleanInsightText = (value?: string | null, maxLength = 180): string | undefined => {
    const text = compactText(value, maxLength);
    if (!text || isFallbackInsightText(text)) {
      return undefined;
    }

    return text;
  };

  const buildPrimaryGist = (
    detail: RecognizedTrackDetail,
    artistInfo?: ArtistSongInfo,
    fragment?: FragmentInterpretation,
  ): PrimaryGistModel => {
    const phraseHintFromAnalysis = detail.culturalAnalysis
      ?.flatMap((analysis) => parseSlangTerms(analysis.slangTerms))
      .find((term) => term.term && term.meaning);
    const phraseHintFromFragment = fragment?.detectedPhrases?.find(
      (phrase) => phrase.phrase && phrase.meaning && !isFallbackInsightText(phrase.meaning),
    );
    const phraseHint: PhraseHint | undefined = phraseHintFromAnalysis
      ? {
          phrase: phraseHintFromAnalysis.term,
          meaning: phraseHintFromAnalysis.meaning,
        }
      : phraseHintFromFragment
        ? {
            phrase: phraseHintFromFragment.phrase,
            meaning: phraseHintFromFragment.meaning,
          }
        : undefined;

    const firstAnalysis = detail.culturalAnalysis?.find(
      (analysis) =>
        analysis.deeperMeaning ||
        analysis.artistIntent ||
        analysis.culturalContext ||
        analysis.translation,
    );

    const analysisSummary =
      cleanInsightText(firstAnalysis?.deeperMeaning) ||
      cleanInsightText(firstAnalysis?.artistIntent) ||
      cleanInsightText(firstAnalysis?.culturalContext);

    if (analysisSummary) {
      return {
        title: 'Meaning',
        summary: analysisSummary,
        support:
          cleanInsightText(firstAnalysis?.translation, 120) ||
          cleanInsightText(detail.lyrics?.text?.split('\n').find((line) => line.trim().length > 0), 120),
      };
    }

    const fragmentSummary =
      cleanInsightText(fragment?.titleMeaning) ||
      cleanInsightText(fragment?.culturalNote) ||
      cleanInsightText(fragment?.detectedPhrases?.[0]?.meaning);

    if (fragmentSummary) {
      return {
        title: 'Meaning',
        summary: fragmentSummary,
        support: cleanInsightText(fragment?.detectedPhrases?.[0]?.culturalContext, 140),
      };
    }

    const artistSummary =
      cleanInsightText(artistInfo?.songBackground) ||
      cleanInsightText(artistInfo?.musicStyle) ||
      cleanInsightText(artistInfo?.artistBio);

    if (artistSummary) {
      return {
        title: 'Meaning',
        summary: artistSummary,
        support: cleanInsightText(artistInfo?.funFact, 140),
      };
    }

    const genreLabel = detail.track.genre ? `${detail.track.genre} energy` : 'the mood inside the track';
    const firstLyricLine = compactText(
      detail.lyrics?.text
        ?.split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0 && line.length < 80),
      90,
    );

    return {
      title: 'Meaning',
      summary: phraseHint
        ? `${detail.track.artist} leans into ${detail.track.genre || 'Afrobeats'} energy here, with "${phraseHint.phrase}" anchoring the song in ${cleanPhraseMeaning(phraseHint.meaning)?.toLowerCase() || phraseHint.meaning.toLowerCase()}.`
        : firstLyricLine
          ? `${detail.track.title} leans into ${genreLabel}, using "${firstLyricLine}" as the emotional center of the record.`
          : detail.track.album
            ? `${detail.track.title} feels built as one standout moment inside ${detail.track.album}, with ${detail.track.artist} leaning into ${genreLabel}.`
            : detail.track.releaseYear && detail.track.genre
              ? `An ${detail.track.genre} cut from ${detail.track.artist} — ${detail.track.releaseYear}. ${detail.track.title} moves with confident ${detail.track.genre.toLowerCase()} energy.`
              : `${detail.track.title} leans into ${genreLabel}, with ${detail.track.artist} pushing a steady emotional mood through the record.`,
      support: detail.track.album
        ? `From ${detail.track.album}.`
        : detail.track.genre
          ? `Built around ${detail.track.genre.toLowerCase()} feeling.`
          : undefined,
    };
  };

  const getInsightBadges = (
    detail: RecognizedTrackDetail,
  ): InsightBadgeModel[] => {
    const badges: InsightBadgeModel[] = [];
    const hasVerifiedMatch = Boolean(detail.track.id);
    const hasMatchedLyrics = detail.status?.lyrics === 'complete' && Boolean(detail.lyrics?.text?.trim());
    const hasDeeperMeaning = Boolean(
      detail.culturalAnalysis?.some((analysis) => !String(analysis.id).startsWith('fallback-')),
    );

    if (hasVerifiedMatch) {
      badges.push({ label: 'Verified match' });
    }

    if (hasMatchedLyrics) {
      badges.push({ label: 'Lyrics matched' });
    }

    if (hasDeeperMeaning) {
      badges.push({ label: 'Deeper meaning' });
    }

    return badges;
  };


  // Mutation for contributing lyrics
  const contributeLyricsMutation = useMutation({
    mutationFn: async (lyrics: string) => {
      const response = await apiRequest('POST', `/api/recognized-tracks/${trackId}/contribute-lyrics`, {
        lyrics,
        language: 'en',
      });
      return response;
    },
    onSuccess: () => {
      setShowContributeForm(false);
      setContributedLyrics('');
      setIsProcessing(true);
      setSseComplete(false);
      setSseData(null);
      queryClient.invalidateQueries({ queryKey: ['/api/recognized-tracks', trackId] });
    },
    onError: () => {
      console.error('[CONTRIBUTE] Failed to submit lyrics.');
    },
  });

  // SSE-based real-time data fetching (replaces polling)
  const [sseData, setSseData] = useState<RecognizedTrackDetail | null>(null);
  const [sseComplete, setSseComplete] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setPrevAnalysisCount(0);
    setIsProcessing(true);
    setSseComplete(false);
    setSseData(null);
    setSseStarted(false);
  }, [trackId]);

  useEffect(() => {
    if (!trackId) return;

    const url = getApiUrl(`/api/recognized-tracks/${trackId}/stream`);
    const es = new EventSource(url);
    eventSourceRef.current = es;

    // Mark SSE as started as soon as the connection opens so we don't flash error
    // screens from stale React Query cache before SSE has a chance to deliver data.
    es.onopen = () => {
      setSseStarted(true);
    };
    // Also mark started on first message in case onopen fires late

    es.addEventListener('update', (event) => {
      setSseStarted(true);
      try {
        const parsed = JSON.parse(event.data) as RecognizedTrackDetail;
        setSseData(parsed);
        
        const currentCount = parsed.culturalAnalysis?.length || 0;
        if (currentCount > prevAnalysisCount) {
          setPrevAnalysisCount(currentCount);
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    });
    
    es.addEventListener('complete', () => {
      setSseComplete(true);
      setIsProcessing(false);
      es.close();
      queryClient.invalidateQueries({ queryKey: ['/api/recognized-tracks', trackId] });
    });
    
    es.addEventListener('timeout', () => {
      setSseComplete(true);
      setIsProcessing(false);
      es.close();
      queryClient.invalidateQueries({ queryKey: ['/api/recognized-tracks', trackId] });
    });
    
    es.addEventListener('error', () => {
      setSseComplete(true);
      setIsProcessing(false);
      es.close();
      queryClient.invalidateQueries({ queryKey: ['/api/recognized-tracks', trackId] });
    });
    
    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [trackId]);

  
  // Regular query as fallback (used when SSE is done or for cached data)
  // refetchInterval kicks in when SSE has ended but analysis is still running
  const { data: queryData, isLoading: queryLoading, error } = useQuery<RecognizedTrackDetail>({
    queryKey: ['/api/recognized-tracks', trackId],
    staleTime: 0,
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/recognized-tracks/${trackId}`), {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: sseComplete || !trackId,
    refetchInterval: (query) => {
      const d = query.state.data as RecognizedTrackDetail | undefined;
      if (!d) return false;
      const still = d.track.analysisStatus === 'generating_analysis' || d.track.analysisStatus === 'pending';
      return still ? 3000 : false;
    },
  });
  
  // Use SSE data while streaming, then switch to query data
  const data = sseData || queryData;
  const isLoading = !data && queryLoading && !sseData;
  // Hydrating = we have a trackId, no data yet, and SSE hasn't finished (or query still running).
  // Also treat as hydrating if SSE hasn't even started yet — prevents stale cache from flashing
  // an error screen before the EventSource connection opens.
  const isHydratingResult =
    !!trackId &&
    !data &&
    (!sseStarted || !sseComplete || queryLoading);
  // Only declare a hard failure after SSE has completed AND the fallback query has settled
  const hasFinalResultFailure =
    !trackId ||
    (!!trackId && !data && sseComplete && !queryLoading);
  const analysisViewState = data?.status?.analysis;

  const handleBackNavigation = () => {
    // Always navigate to Home idle — never re-enter listen mode from Back
    navigate('/', { replace: true });
  };

  useEffect(() => {
    setArtworkLoadFailed(false);
  }, [trackId, data?.track?.coverArtUrl]);

  useEffect(() => {
    const el = albumHeaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyHeader(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [data?.track?.id]);

  // Check if we're in processing state
  const isInProcessingState = data && 
    data.track.lyricsStatus !== 'no_lyrics' && 
    data.track.lyricsStatus !== 'failed' && 
    (data.track.lyricsStatus === 'pending' || 
     data.track.lyricsStatus === 'fetching_lyrics' || 
     data.track.analysisStatus === 'pending' || 
     data.track.analysisStatus === 'generating_analysis');

  
  // Log auto-show of artist info once when track loads
  useEffect(() => {
    if (data?.track?.id && showXRay && !hasAutoShownXRay.current) {
      hasAutoShownXRay.current = true;
      logInteraction('open_artist_info', { isAuto: true });
    }
  }, [data?.track?.id, logInteraction, showXRay]);

  // Log recognition success once when track data loads
  useEffect(() => {
    if (data?.track?.id && !hasLoggedRecognition.current) {
      hasLoggedRecognition.current = true;
      logInteraction('recognition_success');
    }
  }, [data?.track?.id, logInteraction]);

  // Log artist info panel toggle (manual only)
  useEffect(() => {
    if (prevShowXRay.current !== showXRay) {
      if (showXRay && !prevShowXRay.current) {
        logInteraction('open_artist_info', { isAuto: false });
      } else if (!showXRay && prevShowXRay.current) {
        logInteraction('collapse_section');
      }
      prevShowXRay.current = showXRay;
    }
  }, [showXRay, logInteraction]);

  const artistInfo: ArtistSongInfo | undefined = undefined;
  const fragmentInterpretation: FragmentInterpretation | undefined = undefined;
  const continuation: ResultContinuationSuggestion | undefined = undefined;
  const handleContinuationClick = (_suggestionId: string) => {};

  const orderedLyricLines = useMemo(() => {
    const lyricsText = data?.lyrics?.text || '';
    if (!lyricsText) {
      return [];
    }

    const parsedAnalyses = parseAnalysesWithSlang(data?.culturalAnalysis || []);
    return buildOrderedLyricLines(lyricsText, parsedAnalyses);
  }, [data?.culturalAnalysis, data?.lyrics?.text]);

  const estimatedMomentIndex = useMemo(
    () => estimateMomentLineIndex(
      orderedLyricLines.length,
      data?.track.playOffsetMs,
      data?.track.trackDurationMs,
    ),
    [orderedLyricLines.length, data?.track.playOffsetMs, data?.track.trackDurationMs],
  );

  const phraseCapture = useMemo(
    () => buildPhraseCaptureModel(
      orderedLyricLines,
      data?.track.playOffsetMs,
      data?.track.trackDurationMs,
      data?.track.confidenceScore,
    ),
    [orderedLyricLines, data?.track.playOffsetMs, data?.track.trackDurationMs, data?.track.confidenceScore],
  );

  const momentRows = useMemo(
    () =>
      phraseCapture.highlightedLineIndexes
        .map((lineIndex) => orderedLyricLines.find((line) => line.lineIndex === lineIndex))
        .filter((line): line is OrderedLyricLine => Boolean(line)),
    [orderedLyricLines, phraseCapture.highlightedLineIndexes],
  );

  const primaryGist = useMemo(
    () => (data ? buildPrimaryGist(data, artistInfo, fragmentInterpretation) : null),
    [data, artistInfo, fragmentInterpretation],
  );
  const primaryGistSupport = primaryGist?.support;
  const primaryMomentRow = useMemo(
    () =>
      phraseCapture.kind === 'exact_match' && typeof phraseCapture.anchoredLineIndex === 'number'
        ? orderedLyricLines.find((row) => row.lineIndex === phraseCapture.anchoredLineIndex) || null
        : null,
    [orderedLyricLines, phraseCapture.anchoredLineIndex, phraseCapture.kind],
  );
  const primaryMomentMeaning = useMemo(
    () => getPrimaryMomentMeaning(primaryMomentRow),
    [primaryMomentRow],
  );
  const canShowPrimaryMoment = Boolean(
    primaryMomentRow?.analysis && primaryMomentRow.text?.trim() && phraseCapture.kind === 'exact_match',
  );
  const primaryMomentFallback = {
    headline: 'We found the song, but not the exact lyric yet.',
    detail: 'Try another vocal part.',
  };
  const primaryMeaningHeadline =
    primaryMomentMeaning.headline ||
    cleanInsightText(primaryGist?.summary) ||
    undefined;
  const primaryMeaningDetail =
    primaryMomentMeaning.detail ||
    cleanInsightText(primaryGist?.support) ||
    undefined;

  useEffect(() => {
    if (!data?.track?.id || hasTrackedRecognitionEvent.current === data.track.id) {
      return;
    }

    hasTrackedRecognitionEvent.current = data.track.id;
    trackRecognitionSucceeded({
      trackId: data.track.id,
      hasLyrics: Boolean(data.lyrics?.text?.trim()),
      hasGist: Boolean(primaryGist?.summary),
    });
  }, [data?.track?.id, data?.lyrics?.text, primaryGist?.summary]);

  const artistStatusMessage = getArtistStatusCopy(artistInfo?.status);
  const fragmentStatusMessage = getFragmentStatusCopy(fragmentInterpretation?.status);
  const fragmentTitleMeaning = useMemo(
    () => cleanInsightText(fragmentInterpretation?.titleMeaning),
    [fragmentInterpretation],
  );
  const fragmentCulturalNote = useMemo(
    () => cleanInsightText(fragmentInterpretation?.culturalNote),
    [fragmentInterpretation],
  );
  const filteredDetectedPhrases = useMemo(
    () =>
      (fragmentInterpretation?.detectedPhrases || []).filter(
        (phrase) =>
          !isFallbackInsightText(phrase.meaning) &&
          !isFallbackInsightText(phrase.culturalContext) &&
          !isFallbackInsightText(phrase.emotionalIntent),
      ),
    [fragmentInterpretation],
  );
  const gistPhraseChip = useMemo(() => {
    const phrase = filteredDetectedPhrases[0];
    if (!phrase) return null;

    return `Known phrase: "${phrase.phrase}" = ${phrase.meaning}`;
  }, [filteredDetectedPhrases]);
  const artistBioText = useMemo(
    () =>
      cleanInsightText(artistInfo?.artistBio) ||
      (data?.track
        ? `${data.track.artist} carries a distinct sound here, and this record keeps that identity front and center.`
        : 'The artist carries a distinct sound here, and the record keeps that identity front and center.'),
    [artistInfo, data?.track],
  );
  const artistSongBackgroundText = useMemo(
    () =>
      cleanInsightText(artistInfo?.songBackground) ||
      (data?.track.album
        ? `${data.track.title} sits inside ${data.track.album}, with ${data.track.artist} leaning into ${data.track.genre || 'its current sound'}.`
        : data?.track
          ? `${data.track.title} stays rooted in the mood ${data.track.artist} is building here.`
          : 'The song holds a clear mood and identity even while more context catches up.'),
    [artistInfo, data?.track],
  );


  if (isLoading || isHydratingResult) {
    return (
      <RecognitionHoldingScreen
        title="Tightening the match"
        description="The field is narrowing around the song now."
        onBack={handleBackNavigation}
      />
    );
  }

  if ((error && sseComplete) || hasFinalResultFailure || !data) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackNavigation}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <Card data-testid="card-error">
            <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Music className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">We could not match that one</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Try again with the song a bit louder. Make sure the music can be heard clearly.
              </p>
              <Button onClick={() => navigate(LISTEN_MODE_PATH)}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { track, lyrics, culturalAnalysis } = data;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackNavigation}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Sticky mini track header — slides in once album art scrolls out of view */}
      <div
        className={`sticky top-14 sm:top-16 z-40 transition-all duration-200 ${
          showStickyHeader ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        } bg-background/90 backdrop-blur-md border-b border-border/40`}
      >
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-3">
          <div className="w-7 h-7 rounded-md overflow-hidden shrink-0 bg-muted/40">
            {track?.coverArtUrl && !artworkLoadFailed ? (
              <img src={track.coverArtUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="h-3.5 w-3.5 text-muted-foreground/60" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{track?.title}</p>
            <p className="text-xs text-muted-foreground truncate leading-tight">{track?.artist}</p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-background dark:from-orange-500/20 dark:via-amber-900/10 dark:to-background" />
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-orange-500/5 dark:bg-orange-500/10 blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-amber-500/5 dark:bg-amber-500/10 blur-3xl translate-x-1/3 -translate-y-1/3" />

        <div ref={albumHeaderRef} className="relative container max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-6 sm:pt-12 sm:pb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-xl shadow-black/10 shrink-0 bg-muted/40">
              {track.coverArtUrl && !artworkLoadFailed ? (
                <img
                  src={track.coverArtUrl}
                  alt={`${track.title} artwork`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setArtworkLoadFailed(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-2xl">
                  <Music className="h-14 w-14 sm:h-16 sm:w-16 text-muted-foreground/60" />
                </div>
              )}
            </div>

            <div className="space-y-3 min-w-0 flex-1">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-1 break-words" data-testid="heading-song-title">
                  {track.title}
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground" data-testid="text-artist">
                  {track.artist}
                </p>
              </div>
              {(track.spotifyId || track.youtubeId) && (
                <div className="flex flex-wrap gap-2">
                  {track.spotifyId && (
                    <a
                      href={`https://open.spotify.com/track/${track.spotifyId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/85 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      data-testid="link-result-spotify"
                    >
                      <span>Spotify</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {track.youtubeId && (
                    <a
                      href={`https://youtube.com/watch?v=${track.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/85 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      data-testid="link-result-youtube"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-6">
          <Card
            data-testid="card-the-moment"
            className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 to-background"
          >
            <CardContent className="space-y-6 p-6">
              {canShowPrimaryMoment && primaryMomentRow ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      Lyric
                    </p>
                    <blockquote className="max-w-3xl text-2xl font-semibold leading-relaxed text-foreground sm:text-3xl">
                      "{primaryMomentRow.text}"
                    </blockquote>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-primary/15 bg-background/80 p-5">
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      Meaning
                    </p>
                    {primaryMeaningHeadline ? (
                      <>
                        <p className="text-lg font-semibold leading-relaxed text-foreground">
                          {primaryMeaningHeadline}
                        </p>
                        {primaryMeaningDetail && primaryMeaningDetail !== primaryMeaningHeadline ? (
                          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                            {primaryMeaningDetail}
                          </p>
                        ) : null}
                      </>
                    ) : isInProcessingState ? (
                      <div className="space-y-2 pt-1">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-4/5" />
                        <Skeleton className="h-4 w-3/5 mt-3" />
                      </div>
                    ) : (
                      <p className="text-base text-muted-foreground">
                        Meaning not available for this line.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-border/50 bg-card px-6 py-6 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Music className="h-5 w-5" />
                    <span className="text-sm font-semibold">Song Identified</span>
                  </div>
                  <p className="text-base font-medium text-foreground">
                    We found the song, but didn't catch a clear lyric this time.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try again during a vocal section for phrase-level meaning.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    onClick={() => navigate(LISTEN_MODE_PATH)}
                  >
                    Listen Again
                  </Button>
                </div>
              )}

              {lyrics ? (
                <div className="border-t border-border/50 pt-2">
                  <Button
                    variant="ghost"
                    className="w-full text-primary"
                    onClick={() => navigate(`/song/${track.id}/lyrics`)}
                    data-testid="button-see-full-lyrics"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    See full lyrics
                  </Button>
                </div>
              ) : track.lyricsStatus === 'no_lyrics' || track.lyricsStatus === 'failed' ? (
                <div className="border-t border-border/50 pt-2">
                  <Button
                    variant="ghost"
                    className="w-full text-primary"
                    onClick={() => navigate(LISTEN_MODE_PATH)}
                    data-testid="button-try-another-vocal-part"
                  >
                    <Music className="mr-2 h-4 w-4" />
                    Try another vocal part
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>


          {/* Lightweight entry into full lyrics surface */}
          {false && lyrics && (
            <div>
            <Card data-testid="card-lyrics-entry" className="border-border overflow-hidden">
              <CardContent className="py-5 px-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Full lyrics</p>
                    <p className="font-semibold text-foreground truncate">{track.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {orderedLyricLines.length} lines · tap any line to get meaning
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/song/${track.id}/lyrics`)}
                    data-testid="button-explore-lyrics"
                    className="gap-2 shrink-0"
                  >
                    <Globe className="h-4 w-4" />
                    Explore
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          )}


          {/* Continuation Suggestion */}
          {false && continuation?.suggestion ? (
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
                      className="text-left hover-elevate active-elevate-2 rounded-md px-1 -mx-1"
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
          ) : continuation?.reason === 'Song DNA confidence too low for reliable recommendation' ? (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground/50 italic">
                This section has not been mapped in our database yet.
              </p>
            </div>
          ) : null}

          {/* Footer tagline */}
          <div className="hidden text-center py-6 text-xs text-muted-foreground/60">
            Feel the rhythm, know the roots.
          </div>
        </div>
      </div>
      </motion.div>
    </div>
  );
}
