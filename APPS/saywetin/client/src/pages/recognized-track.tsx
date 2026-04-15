import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInteractionLogger } from '@/hooks/use-interaction-logger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  Sparkles,
  MapPin,
  Send,
  BookOpen,
  User,
  Info,
  ChevronDown,
  Zap,
  Gamepad2,
  CircleAlert,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { SlangMatchGame } from '@/components/slang-match-game';
import { ListeningOrb } from '@/components/listening-orb';
import { trackRecognitionSucceeded } from '@/lib/analytics';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { getApiUrl } from '@/lib/api-config';
import { LISTEN_MODE_PATH } from '@/lib/navigation';
import { STORY_MODE_ENABLED } from '@/lib/features';
import {
  parseAnalysesWithSlang,
  buildOrderedLyricLines,
  buildPhraseCaptureModel,
  estimateMomentLineIndex,
  type LyricAnalysis,
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

type LineFeedbackState = {
  status: 'loading' | 'unavailable' | 'failed';
  message?: string;
};

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

function LineStateBadge({
  row,
  feedback,
}: {
  row: OrderedLyricLine;
  feedback?: LineFeedbackState;
}) {
  if (feedback?.status === 'loading') {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading
      </Badge>
    );
  }

  if (feedback?.status === 'unavailable' || feedback?.status === 'failed') {
    return (
      <Badge variant="outline" className="gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300">
        <CircleAlert className="h-3.5 w-3.5" />
        Unavailable
      </Badge>
    );
  }

  if (row.analysis) {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Analyzed
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5 border-primary/25 text-primary">
      <Sparkles className="h-3.5 w-3.5" />
      Tap to analyze
    </Badge>
  );
}

function LyricInsightBody({
  analysis,
}: {
  analysis: OrderedLyricLine['analysis'];
}) {
  if (!analysis) {
    return null;
  }

  const hasContext =
    analysis.culturalContext ||
    analysis.artistIntent ||
    analysis.deeperMeaning ||
    analysis.languageNotes ||
    analysis.lyricBreakdown;

  if (!hasContext) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-border/70 pt-4">
      <div className="space-y-3 border-l-2 border-primary/25 pl-4 text-sm text-muted-foreground">
        {analysis.lyricBreakdown && (
          <p className="rounded-md bg-muted/60 px-3 py-2 font-mono text-xs text-foreground/85">
            {analysis.lyricBreakdown}
          </p>
        )}
        {analysis.culturalContext && (
          <p>
            <span className="font-medium text-primary">Story:</span> {analysis.culturalContext}
          </p>
        )}
        {analysis.artistIntent && (
          <p>
            <span className="font-medium text-primary">Intent:</span> {analysis.artistIntent}
          </p>
        )}
        {analysis.deeperMeaning && (
          <p>
            <span className="font-medium text-primary">Meaning:</span> {analysis.deeperMeaning}
          </p>
        )}
        {analysis.languageNotes && (
          <p>
            <span className="font-medium text-primary">Language:</span> {analysis.languageNotes}
          </p>
        )}
      </div>

      {analysis.slangTerms && analysis.slangTerms.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {analysis.slangTerms.map((slang, slangIdx) => (
            <Popover key={`${analysis.id}-${slangIdx}`}>
              <PopoverTrigger asChild onClick={(event) => event.stopPropagation()}>
                <Badge
                  variant="secondary"
                  className="cursor-pointer text-xs hover-elevate"
                  data-testid={`slang-badge-${analysis.originalIndex}-${slangIdx}`}
                >
                  {slang.term}
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" side="top">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{slang.term}</span>
                    <Badge variant="outline" className="text-xs">
                      {slang.language}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{slang.meaning}</p>
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      ) : null}
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
  const hasAnalysis = Boolean(row.analysis);

  return (
    <div
      className={`rounded-2xl border px-4 py-4 transition-all ${
        isExpanded
          ? 'border-primary/40 bg-primary/5 shadow-sm shadow-primary/10'
          : isCurrentMoment
            ? 'border-primary/25 bg-primary/[0.03]'
            : 'border-border/70 bg-background/80 hover:border-primary/20 hover:bg-muted/20'
      }`}
      data-testid={`lyric-row-${row.lineIndex}`}
    >
      <button
        type="button"
        onClick={onPress}
        className="flex w-full items-start justify-between gap-4 text-left"
        data-testid={`lyric-item-${row.lineIndex}`}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {isCurrentMoment ? (
              <Badge variant="outline" className="border-primary/35 bg-primary/5 text-primary">
                Closest section
              </Badge>
            ) : null}
            <LineStateBadge row={row} feedback={feedback} />
          </div>

          <p
            className="font-serif text-lg leading-relaxed text-foreground"
            data-testid={`text-original-${row.lineIndex}`}
          >
            {row.text}
          </p>

          {row.analysis?.translation ? (
            <p className="text-sm italic text-muted-foreground">{row.analysis.translation}</p>
          ) : feedback?.status === 'loading' ? (
            <p className="text-sm text-primary">Breaking this line down now.</p>
          ) : feedback?.message ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">{feedback.message}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Tap for meaning, context, and language notes.</p>
          )}
        </div>

        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded ? (
        hasAnalysis ? (
          <LyricInsightBody analysis={row.analysis} />
        ) : feedback?.status === 'loading' ? (
          <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-4 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading the line meaning and context.</span>
          </div>
        ) : (
          <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
            <p className="text-sm text-muted-foreground">
              {feedback?.message || 'No deeper breakdown landed for this line yet.'}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry} data-testid={`button-retry-line-${row.lineIndex}`}>
              Try this line again
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
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

interface ProgressBarProps {
  lyricsStatus?: ProcessingStatus;
  analysisStatus?: ProcessingStatus;
  analysisCount?: number;
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
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
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
        <div className="absolute top-14 left-8 h-32 w-32 rounded-full bg-orange-500/12 blur-3xl" />
        <div className="absolute bottom-10 right-6 h-36 w-36 rounded-full bg-green-500/10 blur-3xl" />

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

function ProgressBar({ lyricsStatus, analysisStatus, analysisCount = 0 }: ProgressBarProps) {
  const getProgress = () => {
    if (lyricsStatus === 'pending') return 5;
    if (lyricsStatus === 'fetching_lyrics') return 20;
    if (lyricsStatus === 'no_lyrics' || lyricsStatus === 'failed') return 100;
    if (lyricsStatus === 'completed') {
      if (analysisStatus === 'pending') return 40;
      if (analysisStatus === 'generating_analysis') {
        return Math.min(40 + Math.max(analysisCount * 2, 10), 95);
      }
      if (analysisStatus === 'completed') return 100;
      if (analysisStatus === 'failed' || analysisStatus === 'no_lyrics') return 100;
    }
    return 10;
  };

  const getStatusMessage = () => {
    if (lyricsStatus === 'pending') return 'Getting ready...';
    if (lyricsStatus === 'fetching_lyrics') return 'Finding the lyrics...';
    if (lyricsStatus === 'no_lyrics') return 'Song recognized!';
    if (lyricsStatus === 'failed') return 'Song recognized!';
    if (analysisStatus === 'generating_analysis') return 'Building the meaning...';
    if (analysisStatus === 'completed') return 'Meaning ready';
    return 'Almost there...';
  };

  const progress = getProgress();
  const statusMessage = getStatusMessage();
  const isComplete = progress === 100;
  // No lyrics is not an error - recognition succeeded, lyrics just aren't mapped yet
  const isError = false;

  return (
    <div className="w-full space-y-4 py-6">
      <div className="flex items-center justify-between text-sm">
        <span className={`font-medium ${isError ? 'text-orange-500' : isComplete ? 'text-green-600' : 'text-primary'}`}>
          {statusMessage}
        </span>
        <span className="text-muted-foreground font-mono">{progress}%</span>
      </div>
      
      {/* Wavy snake loader - Pixel 7 style */}
      {!isComplete && !isError ? (
        <div className="relative h-3 flex items-center justify-center">
          <div className="wavy-loader flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                style={{
                  animation: `wavy-bounce 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out ${
              isError ? 'bg-orange-500' : 'bg-green-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {analysisCount > 0 && !isComplete && (
        <p className="text-xs text-muted-foreground text-center">
          {analysisCount} lines analyzed so far...
        </p>
      )}
      
      <style>{`
        @keyframes wavy-bounce {
          0%, 100% { 
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% { 
            transform: translateY(-8px) scale(1.2);
            opacity: 0.7;
          }
        }
      `}</style>
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
  // Mini-game state
  const [showMiniGame, setShowMiniGame] = useState(false);
  
  // Line interaction state - explicit per-line status for the unified lyrics surface
  const [loadingLines, setLoadingLines] = useState<Set<string>>(new Set());
  const [lineFeedback, setLineFeedback] = useState<Map<string, LineFeedbackState>>(new Map());
  const [selectedLineKey, setSelectedLineKey] = useState<string | null>(null);
  const [artworkLoadFailed, setArtworkLoadFailed] = useState(false);
  // Guard: true once SSE has started (connection opened), used to suppress premature error renders
  const [sseStarted, setSseStarted] = useState(false);
  // Anonymous interaction logging for behavioral analytics
  const { logInteraction } = useInteractionLogger(trackId, undefined);
  const hasLoggedRecognition = useRef(false);
  const hasTrackedRecognitionEvent = useRef<string | null>(null);
  const prevShowXRay = useRef(showXRay);

  const clearLineState = (lyricText: string) => {
    const normalizedLine = normalizeLineKey(lyricText);
    setLoadingLines(prev => {
      const next = new Set(prev);
      next.delete(normalizedLine);
      return next;
    });
  };

  const setLineFeedbackState = (lyricText: string, feedback?: LineFeedbackState) => {
    const normalizedLine = normalizeLineKey(lyricText);
    setLineFeedback(prev => {
      const next = new Map(prev);
      if (feedback) {
        next.set(normalizedLine, feedback);
      } else {
        next.delete(normalizedLine);
      }
      return next;
    });
  };

  const upsertAnalysisIntoCache = (lyricText: string, analysis: Partial<AiTranslation> & { slangTerms?: string | SlangTerm[] | null }) => {
    if (!trackId) return;

    queryClient.setQueryData<RecognizedTrackDetail | undefined>(
      ['/api/recognized-tracks', trackId],
      (current) => {
        if (!current) return current;

        const normalizedLine = normalizeLineKey(lyricText);
        const existingAnalysis = (current.culturalAnalysis || []).some(
          (entry) => normalizeLineKey(entry.originalText) === normalizedLine,
        );

        if (existingAnalysis) {
          return current;
        }

        return {
          ...current,
          culturalAnalysis: [...(current.culturalAnalysis || []), buildOptimisticAnalysis(lyricText, analysis)],
        };
      },
    );
  };

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
        title: 'What this means',
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
        title: 'What this means',
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
        title: 'What this means',
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
      title: 'What this means',
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

  const analyzeFallback = async (lyricText: string) => {
    try {
      const response = await fetch(getApiUrl('/api/analyze-line'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lyricText,
          trackId: data!.track.id,
          songTitle: data!.track.title,
          artistName: data!.track.artist,
          genre: data!.track.genre || '',
          language: data!.lyrics?.language || '',
        }),
      });

      if (!response.ok) {
        let failureMessage = 'Could not analyze this line.';
        let failureStatus: LineFeedbackState['status'] = 'failed';
        try {
          const payload = await response.json();
          failureMessage = payload?.message || payload?.error || failureMessage;
          failureStatus = payload?.status === 'unavailable' ? 'unavailable' : 'failed';
        } catch {
          failureMessage = `HTTP ${response.status}`;
        }
        throw Object.assign(new Error(failureMessage), { feedbackStatus: failureStatus });
      }

      const result = await response.json();
      if (result.success) {
        if (result.analysis) {
          upsertAnalysisIntoCache(lyricText, result.analysis);
        }
        setLineFeedbackState(lyricText);
        queryClient.invalidateQueries({ queryKey: ['/api/recognized-tracks', trackId] });
      } else {
        console.warn('[ANALYZE] Analysis issue:', result.message);
        setLineFeedbackState(lyricText, {
          status: result.status === 'unavailable' ? 'unavailable' : 'failed',
          message: result.message || 'No deeper breakdown landed for this line yet.',
        });
      }
    } catch (err: any) {
      console.error('[ANALYZE] Fetch fallback failed:', err);
      setLineFeedbackState(lyricText, {
        status: err?.feedbackStatus === 'unavailable' ? 'unavailable' : 'failed',
        message: err?.message || 'We could not analyze this line right now.',
      });
    } finally {
      clearLineState(lyricText);
    }
  };

  const handleLazyAnalyze = (lyricText: string) => {
    const normalizedLine = normalizeLineKey(lyricText);
    if (!data || loadingLines.has(normalizedLine)) return;
    
    setSelectedLineKey(normalizedLine);
    setLoadingLines(prev => new Set(prev).add(normalizedLine));
    setLineFeedbackState(lyricText, { status: 'loading' });

    const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

    if (isNative) {
      analyzeFallback(lyricText);
      return;
    }

    const params = new URLSearchParams({
      lyricText,
      trackId: data.track.id,
      songTitle: data.track.title,
      artistName: data.track.artist,
      genre: data.track.genre || '',
      language: data.lyrics?.language || '',
    });

    let receivedMessage = false;
    const eventSource = new EventSource(getApiUrl(`/api/analyze-line/stream?${params.toString()}`));

    const sseTimeout = setTimeout(() => {
      if (!receivedMessage) {
        console.warn('[ANALYZE] SSE timeout, falling back to fetch');
        eventSource.close();
        analyzeFallback(lyricText);
      }
    }, 8000);

    eventSource.onmessage = (event) => {
      receivedMessage = true;
      try {
        const parsed = JSON.parse(event.data);
        
        if (parsed.type === 'chunk') {
          return;
        } else if (parsed.type === 'complete' || parsed.type === 'cached') {
          clearTimeout(sseTimeout);
          try {
            const analysis = JSON.parse(parsed.data);
            upsertAnalysisIntoCache(lyricText, analysis);
          } catch (parseError) {
            console.warn('[ANALYZE] Could not parse streaming completion payload:', parseError);
          }
          clearLineState(lyricText);
          setLineFeedbackState(lyricText);
          queryClient.invalidateQueries({ queryKey: ['/api/recognized-tracks', trackId] });
          eventSource.close();
        } else if (parsed.type === 'error') {
          clearTimeout(sseTimeout);
          clearLineState(lyricText);
          setLineFeedbackState(lyricText, {
            status: 'unavailable',
            message: parsed.data || 'No deeper breakdown landed for this line yet.',
          });
          console.warn('[ANALYZE] SSE error:', parsed.data);
          eventSource.close();
        }
      } catch (e) {
        console.error('Error parsing SSE event:', e);
      }
    };

    eventSource.onerror = () => {
      clearTimeout(sseTimeout);
      eventSource.close();
      if (!receivedMessage) {
        console.warn('[ANALYZE] SSE error, falling back to fetch');
        analyzeFallback(lyricText);
      } else {
        clearLineState(lyricText);
      }
    };
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
    navigate('/');
  };

  useEffect(() => {
    setArtworkLoadFailed(false);
  }, [trackId, data?.track?.coverArtUrl]);

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

  // X-Ray artist info query - always fetch when track is available
  const { data: artistInfo, isLoading: isLoadingArtistInfo } = useQuery<ArtistSongInfo>({
    queryKey: ['/api/artist-info', trackId],
    enabled: !!trackId,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
  
  // Fragment interpretation - fetch when lyrics not available
  const lyricsUnavailable = data?.track?.lyricsStatus === 'no_lyrics' || data?.track?.lyricsStatus === 'failed';
  const { data: fragmentInterpretation, isLoading: isLoadingFragment } = useQuery<FragmentInterpretation>({
    queryKey: ['/api/fragment-interpretation', trackId],
    enabled: lyricsUnavailable && !!trackId,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  const retryEnrichmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(getApiUrl(`/api/recognized-tracks/${trackId}/retry-analysis`), {
        method: 'POST',
        credentials: 'include',
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            payload?.error ||
            'We no fit restart the deeper gist right now.',
        );
      }

      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recognized-tracks', trackId] });
    },
    onError: (error) => {
      console.error('[RETRY] Enrichment retry failed:', error);
    },
  });

  // Continuation Engine - fetch song suggestion after analysis completes
  // Session-aware: Track where user came from to prevent back-and-forth loops
  const previousTrackId = sessionStorage.getItem('saywetin_prev_track');
  
  interface ContinuationSuggestion {
    suggestion: {
      id: string;
      title: string;
      artist: string;
      emotionalTone?: string;
      genre?: string;
    } | null;
    matchReason?: 'emotional' | 'cultural' | 'regional';
    reason?: string;
  }
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
    enabled: !isInProcessingState && !!trackId && (data?.culturalAnalysis?.length || 0) > 0,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Store current track as previous when user navigates to a suggestion
  const handleContinuationClick = (suggestionId: string) => {
    sessionStorage.setItem('saywetin_prev_track', trackId!);
    navigate(`/song/${suggestionId}`);
  };

  const jumpToLyrics = () => {
    if (youWereHereRef.current) {
      youWereHereRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    lyricsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLyricRowPress = (row: OrderedLyricLine) => {
    const normalizedLine = normalizeLineKey(row.text);
    const feedback = lineFeedback.get(normalizedLine);

    if (selectedLineKey === normalizedLine && row.analysis) {
      setSelectedLineKey(null);
      return;
    }

    setSelectedLineKey(normalizedLine);

    if (row.analysis || feedback?.status === 'loading') {
      return;
    }

    handleLazyAnalyze(row.text);
  };

  const primaryGist = useMemo(
    () => (data ? buildPrimaryGist(data, artistInfo, fragmentInterpretation) : null),
    [data, artistInfo, fragmentInterpretation],
  );
  const primaryGistSupport = primaryGist?.support;
  const primaryMomentRow = useMemo(
    () => momentRows.find((row) => row.analysis) || momentRows[0] || null,
    [momentRows],
  );
  const primaryMomentMeaning = useMemo(
    () => getPrimaryMomentMeaning(primaryMomentRow),
    [primaryMomentRow],
  );
  const canShowPrimaryMoment = Boolean(
    primaryMomentRow?.text?.trim() && phraseCapture.alignmentConfidence === 'medium',
  );
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

  const lyricsPreviewLines = useMemo(
    () =>
      data?.lyrics?.text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, 4) ?? [],
    [data?.lyrics?.text],
  );

  const showInlineAnalysisFallback =
    !!data &&
    (analysisViewState === 'failed' ||
      analysisViewState === 'unavailable' ||
      data.track.analysisStatus === 'failed');

  const canRetryEnrichment =
    STORY_MODE_ENABLED &&
    !!trackId &&
    !!data?.lyrics &&
    !retryEnrichmentMutation.isPending &&
    (analysisViewState === 'failed' ||
      data?.track.analysisStatus === 'failed' ||
      ((data?.culturalAnalysis?.length || 0) === 0 && data?.track.analysisStatus !== 'generating_analysis'));



  // Get step status for loading indicator
  const getStepStatus = (status?: ProcessingStatus) => {
    switch (status) {
      case 'completed': return 'completed';
      case 'fetching_lyrics': 
      case 'generating_analysis': return 'in_progress';
      case 'failed': return 'failed';
      case 'no_lyrics': return 'no_lyrics';
      default: return 'pending';
    }
  };

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

  const lyricsSectionRef = useRef<HTMLDivElement>(null);
  // Ref for jumping to the closest matched line in the unified lyrics surface
  const youWereHereRef = useRef<HTMLDivElement>(null);
  const hasTriggeredMomentAnalysis = useRef(false);

  // Reset per-track refs when trackId changes
  useEffect(() => {
    hasTriggeredMomentAnalysis.current = false;
    setSelectedLineKey(null);
    setLineFeedback(new Map());
  }, [trackId]);

  // Auto-trigger analysis on moment lines that haven't been analyzed yet
  useEffect(() => {
    if (!STORY_MODE_ENABLED) return;
    if (hasTriggeredMomentAnalysis.current || !data) return;
    if (data.track.analysisStatus === 'generating_analysis' || data.track.analysisStatus === 'pending') return;
    const unresolvedMomentRows = momentRows.filter((row) => !row.analysis);
    if (unresolvedMomentRows.length === 0) return;

    hasTriggeredMomentAnalysis.current = true;

    for (const row of unresolvedMomentRows.slice(0, 3)) {
      handleLazyAnalyze(row.text);
    }
  }, [momentRows, data]);

  useEffect(() => {
    const analyzedKeys = new Set(
      orderedLyricLines
        .filter((row) => row.analysis)
        .map((row) => normalizeLineKey(row.text)),
    );

    if (analyzedKeys.size === 0) {
      return;
    }

    setLineFeedback((prev) => {
      const next = new Map(prev);
      let changed = false;

      analyzedKeys.forEach((key) => {
        if (next.has(key)) {
          next.delete(key);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [orderedLyricLines]);

  useEffect(() => {
    if (selectedLineKey || orderedLyricLines.length === 0) {
      return;
    }

    const defaultLine =
      (estimatedMomentIndex !== null
        ? orderedLyricLines.find((line) => line.lineIndex === estimatedMomentIndex)
        : undefined) || orderedLyricLines[0];

    if (defaultLine) {
      setSelectedLineKey(normalizeLineKey(defaultLine.text));
    }
  }, [orderedLyricLines, estimatedMomentIndex, selectedLineKey]);

  if (isLoading || isHydratingResult) {
    return (
      <RecognitionHoldingScreen
        title="Matching the song"
        description="Hold on while we lock it in."
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

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-background dark:from-orange-500/20 dark:via-amber-900/10 dark:to-background" />
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-orange-500/5 dark:bg-orange-500/10 blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-amber-500/5 dark:bg-amber-500/10 blur-3xl translate-x-1/3 -translate-y-1/3" />

        <div className="relative container max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-6 sm:pt-12 sm:pb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-xl shadow-orange-500/20 shrink-0 bg-gradient-to-br from-orange-500 via-amber-500 to-green-500">
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
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="h-14 w-14 sm:h-16 sm:w-16 text-white/90" />
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
            <CardHeader className="border-b border-primary/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Lyric you just heard
              </CardTitle>
            </CardHeader>
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
                      What it means
                    </p>
                    <p className="text-lg font-semibold leading-relaxed text-foreground">
                      {primaryMeaningHeadline || 'We are still unpacking what this line means.'}
                    </p>
                    {primaryMeaningDetail && primaryMeaningDetail !== primaryMeaningHeadline ? (
                      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                        {primaryMeaningDetail}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="space-y-2 rounded-2xl border border-dashed border-border/80 bg-background/70 px-5 py-5">
                  <p className="text-lg font-semibold text-foreground">
                    We found the song, but could not lock the exact lyric yet.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try another vocal line.
                  </p>
                </div>
              )}

              {lyrics && momentRows.length > 0 ? (
                <div className="border-t border-border/50 pt-2">
                  <Button
                    variant="ghost"
                    className="w-full text-primary"
                    onClick={jumpToLyrics}
                    data-testid="button-jump-to-lyrics"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    See the full lyrics
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* X-Ray Artist & Song Info Panel */}
          {showXRay && (
            <Card data-testid="card-xray" className="border-primary/20 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-green-500/10 dark:from-orange-500/15 dark:via-amber-500/10 dark:to-green-500/15">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    About {track.artist}
                  </CardTitle>
                </CardHeader>
              </div>
              <CardContent className="space-y-4 pt-4">
                {isLoadingArtistInfo ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : artistInfo ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {artistInfo.status && artistInfo.status !== 'complete' && (
                      <div className="sm:col-span-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <p className="text-xs font-semibold text-primary">
                          More artist context still loading
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {artistStatusMessage}
                        </p>
                      </div>
                    )}
                    <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 dark:bg-muted/20">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                        <User className="h-3.5 w-3.5" />
                        Who Be Dis Artist?
                      </div>
                      <p className="text-sm leading-relaxed">{artistBioText}</p>
                      {artistInfo.artistOrigin && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {artistInfo.artistOrigin}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 dark:bg-muted/20">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <Music className="h-3.5 w-3.5" />
                        Wetin Dem Dey Play
                      </div>
                      <p className="text-sm leading-relaxed">{artistInfo.musicStyle}</p>
                    </div>
                    <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 dark:bg-muted/20">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
                        <Music className="h-3.5 w-3.5" />
                        Dis Song Say Wetin?
                      </div>
                      <p className="text-sm leading-relaxed">{artistSongBackgroundText}</p>
                    </div>
                    {artistInfo.funFact && (
                      <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 dark:bg-muted/20">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <Zap className="h-3.5 w-3.5" />
                          You Know Say?
                        </div>
                        <p className="text-sm leading-relaxed">{artistInfo.funFact}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No wahala, richer artist info no load this time.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Processing Status Card - Show when still loading (but NOT when no_lyrics detected) */}
          {data && !primaryGist && track.lyricsStatus !== 'no_lyrics' && track.lyricsStatus !== 'failed' && 
           (track.lyricsStatus === 'pending' || track.lyricsStatus === 'fetching_lyrics' || 
            track.analysisStatus === 'pending' || track.analysisStatus === 'generating_analysis') && (
            <Card data-testid="card-processing-status" className="border-primary/20 bg-primary/5">
              <CardContent className="py-6 px-6">
                <div className="flex flex-col items-center">
                  <Sparkles className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {(data.culturalAnalysis?.length || 0) > 5 
                      ? "Meaning nearly ready"
                      : "Matching the meaning"}
                  </h3>
                </div>
                
                <ProgressBar 
                  lyricsStatus={track.lyricsStatus}
                  analysisStatus={track.analysisStatus}
                  analysisCount={data.culturalAnalysis?.length || 0}
                />

                {/* Step indicators - compact version */}
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    {track.lyricsStatus === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : track.lyricsStatus === 'fetching_lyrics' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className={track.lyricsStatus === 'completed' ? 'text-green-600' : 'text-muted-foreground'}>
                      Lyrics
                    </span>
                  </div>
                  
                  <div className="h-4 w-px bg-border" />
                  
                  <div className="flex items-center gap-2">
                    {track.analysisStatus === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : track.analysisStatus === 'generating_analysis' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className={track.analysisStatus === 'completed' ? 'text-green-600' : 'text-muted-foreground'}>
                      Story
                    </span>
                  </div>
                </div>

                {/* X-Ray Artist Info - shown during loading to make wait engaging */}
                {artistInfo && artistInfo.verification !== 'unverified' && artistInfo.status === 'complete' && (
                  <div className="mt-6 pt-5 border-t border-primary/10">
                    <div className="flex items-center gap-2 mb-3 text-sm font-medium text-primary">
                      <User className="h-4 w-4" />
                      While you wait, meet {track.artist}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 text-sm">
                      <div>
                        <p className="text-muted-foreground leading-relaxed">{artistInfo.artistBio}</p>
                        {artistInfo.artistOrigin && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {artistInfo.artistOrigin}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        {artistInfo.songBackground && (
                          <div>
                            <span className="text-xs font-medium text-primary flex items-center gap-1 mb-1">
                              <Music className="h-3 w-3" /> About this track
                            </span>
                            <p className="text-muted-foreground text-xs leading-relaxed">{artistInfo.songBackground}</p>
                          </div>
                        )}
                        {artistInfo.funFact && (
                          <div>
                            <span className="text-xs font-medium text-primary flex items-center gap-1 mb-1">
                              <Zap className="h-3 w-3" /> Fun fact
                            </span>
                            <p className="text-muted-foreground text-xs leading-relaxed">{artistInfo.funFact}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {isLoadingArtistInfo && (
                  <div className="mt-6 pt-5 border-t border-primary/10">
                    <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Dey load artist info...
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* No Lyrics Found State - With Fragment Interpretation & Contribution Form */}
          {data && (track.lyricsStatus === 'no_lyrics' || track.lyricsStatus === 'failed') && !lyrics && (
            <Card data-testid="card-no-lyrics" className="border-border">
              <CardContent className="py-6 px-6">
                {!showContributeForm ? (
                  <div className="space-y-6">
                    {/* Fragment Interpretation Section */}
                    {isLoadingFragment ? (
                      <div className="flex flex-col items-center justify-center py-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                        <p className="text-sm text-muted-foreground">Interpreting the title...</p>
                      </div>
                    ) : fragmentInterpretation ? (
                      <div className="space-y-4">
                        {fragmentInterpretation.status && fragmentInterpretation.status !== 'complete' && (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                            <p className="text-sm text-muted-foreground">
                              {fragmentStatusMessage}
                            </p>
                          </div>
                        )}
                        {/* Title Meaning */}
                        {fragmentTitleMeaning && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                              <Languages className="h-4 w-4" />
                              What the Title Means
                            </div>
                            <p className="text-sm leading-relaxed pl-6">
                              {fragmentTitleMeaning}
                            </p>
                          </div>
                        )}
                        
                        {/* Detected Phrases */}
                        {filteredDetectedPhrases.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                              <Sparkles className="h-4 w-4" />
                              Wetin Dem Talk?
                            </div>
                            <div className="space-y-3 pl-6">
                              {filteredDetectedPhrases.map((phrase, idx) => (
                                <div key={idx} className="bg-muted/50 rounded-lg p-3 space-y-1">
                                  <div className="font-medium">"{phrase.phrase}"</div>
                                  <p className="text-sm text-muted-foreground">{phrase.meaning}</p>
                                  <p className="text-xs text-muted-foreground/80 italic">{phrase.culturalContext}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Na Wetin E Mean - Themes */}
                        {fragmentInterpretation.likelyThemes.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                              <Lightbulb className="h-4 w-4" />
                              Na Wetin E Mean?
                            </div>
                            <div className="flex flex-wrap gap-2 pl-6">
                              {fragmentInterpretation.likelyThemes.map((theme, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {theme}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Cultural Note */}
                        {fragmentCulturalNote && (
                          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                            <p className="text-sm italic text-muted-foreground">
                              {fragmentCulturalNote}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                          <Music className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-muted-foreground text-sm max-w-md">
                          We recognized "{track.title}" but lyrics for this track haven't been mapped yet.
                        </p>
                      </div>
                    )}
                    
                    {/* Contribute Lyrics CTA */}
                    <div className="flex flex-col items-center pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-3 text-center">
                        Make you join epp am!
                      </p>
                      <Button 
                        onClick={() => {
                          setShowContributeForm(true);
                          logInteraction('add_lyrics_click');
                        }}
                        data-testid="button-contribute-lyrics"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Add Lyrics
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Add Lyrics for "{track.title}"
                      </h3>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowContributeForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Paste the song lyrics here...&#10;&#10;Each line will be analyzed for cultural meaning, translations, and slang terms."
                      value={contributedLyrics}
                      onChange={(e) => setContributedLyrics(e.target.value)}
                      className="min-h-[200px] font-serif"
                      data-testid="textarea-contribute-lyrics"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {contributedLyrics.length > 0 
                          ? `${contributedLyrics.split('\n').filter(l => l.trim()).length} lines` 
                          : 'Paste lyrics to get started'}
                      </p>
                      <Button 
                        onClick={() => contributeLyricsMutation.mutate(contributedLyrics)}
                        disabled={contributedLyrics.trim().length < 20 || contributeLyricsMutation.isPending}
                        data-testid="button-submit-lyrics"
                        className="gap-2"
                      >
                        {contributeLyricsMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {contributeLyricsMutation.isPending ? 'Working on it...' : 'Break Am Down'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Mini-Game - Show when there are slang terms */}
          {showMiniGame && culturalAnalysis && culturalAnalysis.length > 0 && (() => {
            const allSlangTerms: SlangTerm[] = [];
            culturalAnalysis.forEach(a => {
              if (a.slangTerms) {
                try {
                  const parsed = typeof a.slangTerms === 'string' ? JSON.parse(a.slangTerms) : a.slangTerms;
                  if (Array.isArray(parsed)) {
                    parsed.forEach(term => {
                      if (term.term && term.meaning) {
                        allSlangTerms.push(term);
                      }
                    });
                  }
                } catch {}
              }
            });
            if (allSlangTerms.length < 2) return null;
            return (
              <SlangMatchGame 
                slangTerms={allSlangTerms} 
                onClose={() => setShowMiniGame(false)} 
              />
            );
          })()}

          {/* Unified lyrics and cultural analysis surface */}
          {lyrics && (
            <div ref={lyricsSectionRef}>
            <Card data-testid="card-lyrics" className="border-border overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Globe className="h-5 w-5 text-primary" />
                      Lyrics & What They Mean
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Tap any line to break am down
                    </CardDescription>
                  </div>
                  {/* Mini-game button - only show when we have slang terms */}
                  {culturalAnalysis && culturalAnalysis.some(a => a.slangTerms) && !showMiniGame && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMiniGame(true)}
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
                  <div className="px-6 py-4">
                    {showInlineAnalysisFallback && !primaryGist && canRetryEnrichment && (
                      <div className="mb-5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryEnrichmentMutation.mutate()}
                          disabled={retryEnrichmentMutation.isPending}
                          data-testid="button-retry-deeper-gist-inline"
                        >
                          {retryEnrichmentMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Retrying...
                            </>
                          ) : (
                            'Load deeper context'
                          )}
                        </Button>
                      </div>
                    )}
                    <div className="space-y-3">
                      {orderedLyricLines.map((row, rowIndex) => {
                        const normalizedLine = normalizeLineKey(row.text);
                        const feedback = lineFeedback.get(normalizedLine);
                        const isExpanded = selectedLineKey === normalizedLine;
                        const isCurrentMoment = phraseCapture.highlightedLineIndexes.includes(row.lineIndex);
                        const showBlockLabel =
                          rowIndex === 0 ||
                          orderedLyricLines[rowIndex - 1].blockIndex !== row.blockIndex;

                        return (
                          <div key={row.key} className="space-y-3">
                            {showBlockLabel ? (
                              <div className="pt-2 first:pt-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  {row.blockLabel}
                                </p>
                              </div>
                            ) : null}
                            <div ref={estimatedMomentIndex === row.lineIndex ? youWereHereRef : undefined}>
                              <UnifiedLyricRow
                                row={row}
                                feedback={feedback}
                                isExpanded={isExpanded}
                                isCurrentMoment={isCurrentMoment}
                                onPress={() => handleLyricRowPress(row)}
                                onRetry={() => handleLazyAnalyze(row.text)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (analysisViewState === 'unavailable' || track.analysisStatus === 'failed') && !primaryGist ? (
                  <div className="px-6 py-6 space-y-5">
                    {canRetryEnrichment && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryEnrichmentMutation.mutate()}
                        disabled={retryEnrichmentMutation.isPending}
                        data-testid="button-retry-deeper-gist"
                      >
                        {retryEnrichmentMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          'Load deeper context'
                        )}
                      </Button>
                    )}

                    {lyricsPreviewLines.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Quick lyric preview
                        </p>
                        <div className="space-y-2">
                          {lyricsPreviewLines.map((line, idx) => (
                            <p key={`lyrics-preview-${idx}`} className="font-serif text-lg leading-relaxed text-foreground/90">
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {primaryGistSupport ? (
                      <p className="text-sm text-muted-foreground">
                        {primaryGistSupport}
                      </p>
                    ) : null}
                  </div>
                ) : track.analysisStatus === 'generating_analysis' || track.analysisStatus === 'pending' ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="font-medium">
                        Building the meaning...
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Pulling together lyric meaning and context for the lines you heard.
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
            </div>
          )}

          {/* Continuation Suggestion */}
          {continuation?.suggestion ? (
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
          <div className="text-center py-6 text-xs text-muted-foreground/60">
            Feel the rhythm, know the roots.
          </div>
        </div>
      </div>
    </div>
  );
}
