import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInteractionLogger } from '@/hooks/use-interaction-logger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  TrendingUp,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Sparkles,
  MapPin,
  Send,
  BookOpen,
  User,
  Info,
  ChevronDown,
  Disc3,
  Zap,
  Gamepad2,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { SlangMatchGame } from '@/components/slang-match-game';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { getApiUrl } from '@/lib/api-config';
import { LISTEN_MODE_PATH } from '@/lib/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  parseAnalysesWithSlang,
  calculateYouWereHereIndex,
  buildBlocksWithAnalyses,
  getDisplayBlocks,
  extractTheMoment,
  extractRawMomentLines,
  type LyricAnalysis,
  type SlangTerm,
  type AnalysisWithBlock,
  type LyricBlockWithAnalyses,
  type TheMoment,
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

interface ProgressBarProps {
  lyricsStatus?: ProcessingStatus;
  analysisStatus?: ProcessingStatus;
  analysisCount?: number;
}

const INITIAL_DOCUMENT_LOCATION =
  typeof window !== 'undefined'
    ? `${window.location.pathname}${window.location.search}${window.location.hash}`
    : null;

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
    if (analysisStatus === 'generating_analysis') return 'Unlocking the story...';
    if (analysisStatus === 'completed') return 'Story unlocked!';
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
  const { toast } = useToast();
  const trackId = params.id;
  const [isProcessing, setIsProcessing] = useState(true);
  const [prevAnalysisCount, setPrevAnalysisCount] = useState(0);
  
  // Contribute lyrics state
  const [contributedLyrics, setContributedLyrics] = useState('');
  const [showContributeForm, setShowContributeForm] = useState(false);
  
  // X-Ray artist info state - auto-show when track loads
  const [showXRay, setShowXRay] = useState(true);
  const hasAutoShownXRay = useRef(false);
  const [hasShownUnlockedMessage, setHasShownUnlockedMessage] = useState(false);
  
  // Mini-game state
  const [showMiniGame, setShowMiniGame] = useState(false);
  
  // Lazy-load analysis state - tracks which lines are being analyzed on-demand
  const [loadingLines, setLoadingLines] = useState<Set<string>>(new Set());
  // Streaming state - tracks partial content for typing effect
  const [streamingContent, setStreamingContent] = useState<Map<string, string>>(new Map());
  const [artworkLoadFailed, setArtworkLoadFailed] = useState(false);
  const directEntryFallbackSeeded = useRef(false);

  // Anonymous interaction logging for behavioral analytics
  const { logInteraction } = useInteractionLogger(trackId, undefined);
  const hasLoggedRecognition = useRef(false);
  const prevShowXRay = useRef(showXRay);

  const clearLineState = (lyricText: string) => {
    setLoadingLines(prev => {
      const next = new Set(prev);
      next.delete(lyricText);
      return next;
    });
    setStreamingContent(prev => {
      const next = new Map(prev);
      next.delete(lyricText);
      return next;
    });
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
        try {
          const payload = await response.json();
          failureMessage = payload?.message || payload?.error || failureMessage;
        } catch {
          failureMessage = `HTTP ${response.status}`;
        }
        throw new Error(failureMessage);
      }
      
      const result = await response.json();
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['/api/recognized-tracks', trackId] });
      } else {
        toast({
          title: 'Analysis failed',
          description: result.message || 'Could not analyze this line.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[ANALYZE] Fetch fallback failed:', err);
      toast({
        title: 'Analysis failed',
        description: err instanceof Error ? err.message : 'Could not analyze this line. Please try again.',
        variant: 'destructive',
      });
    } finally {
      clearLineState(lyricText);
    }
  };

  const handleLazyAnalyze = (lyricText: string) => {
    if (!data || loadingLines.has(lyricText)) return;
    
    setLoadingLines(prev => new Set(prev).add(lyricText));
    setStreamingContent(prev => new Map(prev).set(lyricText, ''));

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
          setStreamingContent(prev => {
            const current = prev.get(lyricText) || '';
            return new Map(prev).set(lyricText, current + parsed.data);
          });
        } else if (parsed.type === 'complete' || parsed.type === 'cached') {
          clearTimeout(sseTimeout);
          clearLineState(lyricText);
          queryClient.invalidateQueries({ queryKey: ['/api/recognized-tracks', trackId] });
          eventSource.close();
        } else if (parsed.type === 'error') {
          clearTimeout(sseTimeout);
          clearLineState(lyricText);
          toast({
            title: 'Analysis failed',
            description: parsed.data || 'Could not analyze this line.',
            variant: 'destructive',
          });
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
      toast({
        title: 'Lyrics submitted!',
        description: 'Generating cultural analysis now...',
      });
      setShowContributeForm(false);
      setContributedLyrics('');
      setIsProcessing(true);
      setSseComplete(false);
      setSseData(null);
      queryClient.invalidateQueries({ queryKey: ['/api/recognized-tracks', trackId] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to submit lyrics. Please try again.',
        variant: 'destructive',
      });
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
  }, [trackId]);

  useEffect(() => {
    if (!trackId) return;
    
    const url = getApiUrl(`/api/recognized-tracks/${trackId}/stream`);
    const es = new EventSource(url);
    eventSourceRef.current = es;
    
    es.addEventListener('update', (event) => {
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

  useEffect(() => {
    if (typeof window === 'undefined' || !trackId || directEntryFallbackSeeded.current) {
      return;
    }

    const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const openedDirectlyOnCurrentTrack = INITIAL_DOCUMENT_LOCATION === currentLocation;

    if (!openedDirectlyOnCurrentTrack) {
      return;
    }

    const currentState = window.history.state || {};
    if ((currentState as { __saywetinFallbackSeeded?: boolean }).__saywetinFallbackSeeded) {
      directEntryFallbackSeeded.current = true;
      return;
    }

    window.history.replaceState(
      { ...(currentState as Record<string, unknown>), __saywetinListenFallback: true },
      '',
      LISTEN_MODE_PATH,
    );
    window.history.pushState(
      { ...(currentState as Record<string, unknown>), __saywetinFallbackSeeded: true },
      '',
      currentLocation,
    );
    directEntryFallbackSeeded.current = true;
  }, [trackId]);
  
  // Regular query as fallback (used when SSE is done or for cached data)
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
  });
  
  // Use SSE data while streaming, then switch to query data
  const data = sseData || queryData;
  const isLoading = !data && queryLoading && !sseData;
  const analysisViewState = data?.status?.analysis;
  const analysisUnavailableMessage =
    data?.status?.analysisMessage || 'Song recognized. Deeper breakdown unavailable right now.';

  const handleBackNavigation = () => {
    if (typeof window !== 'undefined') {
      const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const currentHistoryState = (window.history.state || {}) as { __saywetinFallbackSeeded?: boolean };
      const hasUsefulHistoryTarget =
        window.history.length > 1 &&
        (
          INITIAL_DOCUMENT_LOCATION !== currentLocation ||
          currentHistoryState.__saywetinFallbackSeeded === true
        );

      if (hasUsefulHistoryTarget) {
        window.history.back();
        return;
      }
    }

    navigate(LISTEN_MODE_PATH);
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
    if (data?.track?.id && !hasAutoShownXRay.current) {
      hasAutoShownXRay.current = true;
      logInteraction('open_artist_info', { isAuto: true });
    }
  }, [data?.track?.id, logInteraction]);

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

  // Show "Stories unlocked!" toast when processing completes
  useEffect(() => {
    if (data && !isInProcessingState && !hasShownUnlockedMessage && data.culturalAnalysis && data.culturalAnalysis.length > 0) {
      setHasShownUnlockedMessage(true);
      toast({
        title: "Stories unlocked!",
        description: "Tap a line to explore.",
      });
    }
  }, [data, isInProcessingState, hasShownUnlockedMessage, toast]);


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

  // State to toggle between priority view (first 5) and full view
  const [showAllAnalyses, setShowAllAnalyses] = useState(false);
  const [unanalyzedLimit, setUnanalyzedLimit] = useState(10);
  const initialDisplayCount = 5;

  // Parse analyses with slang terms, build block structure, and calculate "You were here" index
  const { displayBlocks, youWereHereIndex, showYouWereHere, totalCount, youWereHereBlockIndex, theMoment, allBlocks } = useMemo(() => {
    if (!data?.culturalAnalysis) {
      return { displayBlocks: [], youWereHereIndex: 0, showYouWereHere: false, totalCount: 0, youWereHereBlockIndex: 0, theMoment: null, allBlocks: [] };
    }

    const parsed = parseAnalysesWithSlang(data.culturalAnalysis);
    const lyricsText = data.lyrics?.text || '';
    
    const blockStructures = buildBlocksWithAnalyses(parsed, lyricsText);
    const totalAnalyses = blockStructures.reduce((sum, b) => sum + b.analyses.length, 0);
    
    const youWereHereIdx = calculateYouWereHereIndex(
      totalAnalyses,
      data.track.playOffsetMs,
      data.track.trackDurationMs
    );

    const hasPlayOffset = !!data.track.playOffsetMs && data.track.playOffsetMs > 0;
    
    // Extract "the moment" - the specific lines the user was hearing
    const moment = extractTheMoment(blockStructures, youWereHereIdx, data.track.playOffsetMs, lyricsText, data.track.trackDurationMs);
    
    const { blocks, totalAnalyses: total, youWereHereBlockIndex: youWereHereBlockIdx } = getDisplayBlocks(
      blockStructures, 
      youWereHereIdx, 
      initialDisplayCount, 
      showAllAnalyses
    );

    return {
      displayBlocks: blocks,
      youWereHereIndex: youWereHereIdx,
      showYouWereHere: hasPlayOffset && totalAnalyses > 1,
      totalCount: total,
      youWereHereBlockIndex: youWereHereBlockIdx,
      theMoment: moment,
      allBlocks: blockStructures,
    };
  }, [data?.culturalAnalysis, data?.lyrics?.text, data?.track.playOffsetMs, data?.track.trackDurationMs, showAllAnalyses]);

  // State to control showing full lyrics vs just the moment
  const [showFullLyrics, setShowFullLyrics] = useState(false);

  // Ref for auto-scrolling to "You Were Here" line in full lyrics
  const youWereHereRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);
  const hasTriggeredMomentAnalysis = useRef(false);

  // Reset per-track refs when trackId changes
  useEffect(() => {
    hasAutoScrolled.current = false;
    hasTriggeredMomentAnalysis.current = false;
  }, [trackId]);

  // Auto-scroll to "You Were Here" line when switching to full lyrics view
  useEffect(() => {
    if (showFullLyrics && showYouWereHere && youWereHereRef.current && !hasAutoScrolled.current) {
      hasAutoScrolled.current = true;
      setTimeout(() => {
        youWereHereRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [showFullLyrics, showYouWereHere]);

  // Auto-trigger analysis on moment lines that haven't been analyzed yet
  useEffect(() => {
    if (hasTriggeredMomentAnalysis.current || !theMoment || !data) return;
    if (theMoment.hasAnalysis) return;
    if (theMoment.rawLines.length === 0) return;
    if (data.track.analysisStatus === 'generating_analysis' || data.track.analysisStatus === 'pending') return;

    hasTriggeredMomentAnalysis.current = true;

    const analyzedTexts = new Set(
      (data.culturalAnalysis || []).map((a: any) => a.originalText.trim().toLowerCase())
    );

    const unanalyzedMomentLines = theMoment.rawLines.filter(
      line => !analyzedTexts.has(line.trim().toLowerCase()) && line.trim().length > 3
    );

    for (const line of unanalyzedMomentLines.slice(0, 3)) {
      handleLazyAnalyze(line.trim());
    }
  }, [theMoment, data]);

  if (isLoading) {
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
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
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
              <h3 className="text-lg font-medium mb-2">Track Not Found</h3>
              <p className="text-sm text-muted-foreground mb-6">
                The song you're looking for doesn't exist or has expired.
              </p>
              <Button onClick={() => navigate(LISTEN_MODE_PATH)}>
                Return Home
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

              <div className="flex items-center gap-2 flex-wrap">
                {track.album && (
                  <Badge variant="secondary" data-testid="badge-album">
                    <Music className="h-3 w-3 mr-1" />
                    {track.album}
                  </Badge>
                )}
                {track.releaseYear && (
                  <Badge variant="secondary" data-testid="badge-year">
                    {track.releaseYear}
                  </Badge>
                )}
                {track.genre && (
                  <Badge variant="secondary" data-testid="badge-genre">
                    {track.genre}
                  </Badge>
                )}
                {track.confidenceScore && (
                  <Badge variant="default" data-testid="badge-confidence">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {track.confidenceScore >= 80 ? 'E match well well' : `${track.confidenceScore}%`}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {track.spotifyId && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    data-testid="button-spotify"
                    onClick={() => logInteraction('open_spotify')}
                  >
                    <a
                      href={`https://open.spotify.com/track/${track.spotifyId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Spotify
                    </a>
                  </Button>
                )}
                {track.youtubeId && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    data-testid="button-youtube"
                  >
                    <a
                      href={`https://www.youtube.com/watch?v=${track.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      YouTube
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowXRay(!showXRay)}
                  data-testid="button-xray"
                  className={showXRay ? 'bg-primary/10' : ''}
                >
                  <Info className="h-4 w-4 mr-2" />
                  {showXRay ? 'Hide' : 'About'} Artist & Song
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-6">

          {/* THE MOMENT - What the user just heard, shown first */}
          {theMoment && !showFullLyrics && (theMoment.hasAnalysis || theMoment.rawLines.length > 0) && (
            <Card data-testid="card-the-moment" className="border-primary/30 bg-gradient-to-br from-primary/5 to-background overflow-hidden">
              <CardHeader className="border-b border-primary/20 pb-4">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    What you just heard
                  </CardTitle>
                  {theMoment.timestamp && (
                    <p className="text-sm text-muted-foreground">
                      {theMoment.timestamp}{theMoment.blockLabel ? ` • ${theMoment.blockLabel}` : ''}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {theMoment.hasAnalysis ? (
                  theMoment.lines.map((line, idx) => (
                    <div key={line.id || idx} className="space-y-2">
                      <p className="font-serif text-lg font-medium text-foreground">
                        "{line.originalText}"
                      </p>
                      {line.translation && (
                        <p className="text-primary font-medium">
                          {line.translation}
                        </p>
                      )}
                      {line.culturalContext && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {line.culturalContext}
                        </p>
                      )}
                      {line.artistIntent && (
                        <p className="text-sm text-muted-foreground/80 italic">
                          {line.artistIntent}
                        </p>
                      )}
                      {idx < theMoment.lines.length - 1 && (
                        <div className="border-b border-border/50 my-3" />
                      )}
                    </div>
                  ))
                ) : (
                  theMoment.rawLines.map((line, idx) => {
                    const isAnalyzing = loadingLines.has(line);
                    const streamContent = streamingContent.get(line);
                    return (
                      <div key={`raw-moment-${idx}`} className="space-y-2">
                        <p className="font-serif text-lg font-medium text-foreground">
                          "{line}"
                        </p>
                        {isAnalyzing && !streamContent && (
                          <div className="flex items-center gap-2 text-sm text-primary">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Breaking this line down...</span>
                          </div>
                        )}
                        {streamContent && (
                          <p className="text-primary font-medium animate-in fade-in">
                            {streamContent}
                          </p>
                        )}
                        {idx < theMoment.rawLines.length - 1 && (
                          <div className="border-b border-border/50 my-3" />
                        )}
                      </div>
                    );
                  })
                )}
                
                {/* See full lyrics button */}
                <div className="pt-4 border-t border-border/50">
                  <Button
                    variant="ghost"
                    className="w-full text-primary"
                    onClick={() => setShowFullLyrics(true)}
                    data-testid="button-see-full-lyrics"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    See full lyrics & meanings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                          Artist background limited right now
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {artistInfo.message || 'We recognized the song, but the richer artist breakdown is unavailable right now.'}
                        </p>
                      </div>
                    )}
                    {artistInfo.verification === 'unverified' && (
                      <div className="sm:col-span-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                          Profile never fully verified yet
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {artistInfo.verificationNote || 'We dey show only safe details to avoid wrong artist story.'}
                        </p>
                      </div>
                    )}
                    <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 dark:bg-muted/20">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                        <User className="h-3.5 w-3.5" />
                        Who Be Dis Artist?
                      </div>
                      <p className="text-sm leading-relaxed">{artistInfo.artistBio}</p>
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
                        <Disc3 className="h-3.5 w-3.5" />
                        Dis Song Say Wetin?
                      </div>
                      <p className="text-sm leading-relaxed">{artistInfo.songBackground}</p>
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
          {data && track.lyricsStatus !== 'no_lyrics' && track.lyricsStatus !== 'failed' && 
           (track.lyricsStatus === 'pending' || track.lyricsStatus === 'fetching_lyrics' || 
            track.analysisStatus === 'pending' || track.analysisStatus === 'generating_analysis') && (
            <Card data-testid="card-processing-status" className="border-primary/20 bg-primary/5">
              <CardContent className="py-6 px-6">
                <div className="flex flex-col items-center">
                  <Sparkles className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {(data.culturalAnalysis?.length || 0) > 5 
                      ? "E dey hot! Almost done o..." 
                      : "Dey find am..."}
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
                              <Disc3 className="h-3 w-3" /> About this track
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
                              {fragmentInterpretation.message || 'We recognized the song, but deeper title interpretation is unavailable right now.'}
                            </p>
                          </div>
                        )}
                        {/* Title Meaning */}
                        {fragmentInterpretation.titleMeaning && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                              <Languages className="h-4 w-4" />
                              What the Title Means
                            </div>
                            <p className="text-sm leading-relaxed pl-6">
                              {fragmentInterpretation.titleMeaning}
                            </p>
                          </div>
                        )}
                        
                        {/* Detected Phrases */}
                        {fragmentInterpretation.detectedPhrases.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                              <Sparkles className="h-4 w-4" />
                              Wetin Dem Talk?
                            </div>
                            <div className="space-y-3 pl-6">
                              {fragmentInterpretation.detectedPhrases.map((phrase, idx) => (
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
                        {fragmentInterpretation.culturalNote && (
                          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                            <p className="text-sm italic text-muted-foreground">
                              {fragmentInterpretation.culturalNote}
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

          {/* Lyrics and Cultural Analysis - Show when completed */}
          {lyrics && (showFullLyrics || !theMoment?.hasAnalysis) && (
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
                {displayBlocks.length > 0 && displayBlocks.some(b => b.hasAnalyses) ? (
                  <div className="px-6 py-4">
                    {/* Clean flowing lyrics - only show blocks with analyses */}
                    {displayBlocks.filter(b => b.analyses.length > 0).map((block, blockIdx) => {
                      const isYouWereHereBlock = block.blockIndex === youWereHereBlockIndex;
                      
                      return (
                        <div key={`block-${block.blockIndex}`} className="mb-4 last:mb-0">
                          {/* Subtle section divider (not on first block) */}
                          {blockIdx > 0 && (
                            <div className="h-3" />
                          )}
                          
                          {/* Lyrics flow naturally */}
                          <div className="space-y-1">
                            {block.analyses.map((analysis) => {
                              const originalIndex = analysis.originalIndex;
                              const isYouWereHere = showYouWereHere && originalIndex === youWereHereIndex;
                              const hasContext = analysis.culturalContext || analysis.artistIntent || analysis.deeperMeaning || analysis.languageNotes || analysis.lyricBreakdown;
                              
                              return (
                                <div key={analysis.id} ref={isYouWereHere ? youWereHereRef : undefined}>
                                <Collapsible 
                                  data-testid={`lyric-item-${originalIndex}`}
                                  className={`rounded-md transition-colors ${isYouWereHere ? 'bg-primary/10' : ''}`}
                                >
                                  <CollapsibleTrigger className="w-full text-left py-2 px-3 -mx-3 rounded-md hover:bg-muted/50 transition-colors group">
                                    <div className="space-y-1.5">
                                      {/* Original lyric - clean, poetic */}
                                      <p className={`font-serif text-lg leading-relaxed ${hasContext ? 'border-b border-dotted border-primary/30 inline' : ''}`} data-testid={`text-original-${originalIndex}`}>
                                        {analysis.originalText}
                                      </p>
                                      {/* Translation - subtle */}
                                      <p className="text-sm text-muted-foreground italic">
                                        {analysis.translation}
                                      </p>
                                      {/* Slang terms */}
                                      {analysis.slangTerms && analysis.slangTerms.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                                          {analysis.slangTerms.map((slang, slangIdx) => (
                                            <Popover key={slangIdx}>
                                              <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Badge 
                                                  variant="secondary" 
                                                  className="cursor-pointer text-xs hover-elevate"
                                                  data-testid={`slang-badge-${originalIndex}-${slangIdx}`}
                                                >
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
                                      )}
                                    </div>
                                  </CollapsibleTrigger>
                                  {hasContext && (
                                    <CollapsibleContent className="pb-2 pt-1">
                                      <div className="pl-3 border-l-2 border-primary/30 space-y-1.5 text-sm text-muted-foreground">
                                        {analysis.lyricBreakdown && (
                                          <p data-testid={`text-breakdown-${originalIndex}`} className="font-mono text-xs bg-muted/50 px-2 py-1 rounded">
                                            {analysis.lyricBreakdown}
                                          </p>
                                        )}
                                        {analysis.culturalContext && (
                                          <p data-testid={`text-cultural-${originalIndex}`}>
                                            <span className="text-primary font-medium">Story:</span> {analysis.culturalContext}
                                          </p>
                                        )}
                                        {analysis.artistIntent && (
                                          <p data-testid={`text-intent-${originalIndex}`}>
                                            <span className="text-primary font-medium">Intent:</span> {analysis.artistIntent}
                                          </p>
                                        )}
                                        {analysis.deeperMeaning && (
                                          <p data-testid={`text-meaning-${originalIndex}`}>
                                            <span className="text-primary font-medium">Meaning:</span> {analysis.deeperMeaning}
                                          </p>
                                        )}
                                        {analysis.languageNotes && (
                                          <p data-testid={`text-language-notes-${originalIndex}`}>
                                            <span className="text-primary font-medium">Language:</span> {analysis.languageNotes}
                                          </p>
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  )}
                                </Collapsible>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* See full lyrics link */}
                    {!showAllAnalyses && (
                      <div className="text-center pt-4 mt-4 border-t">
                        <button 
                          onClick={() => setShowAllAnalyses(true)}
                          className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1.5"
                          data-testid="button-see-full-lyrics"
                        >
                          See full lyrics & context
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    
                    {/* Unanalyzed lines - tap to analyze on-demand */}
                    {lyrics && showAllAnalyses && (() => {
                      const analyzedTexts = new Set(
                        (culturalAnalysis || []).map(a => a.originalText.trim().toLowerCase())
                      );
                      const allLines = lyrics.text.split('\n').filter(l => l.trim().length > 3);
                      const unanalyzedLines = allLines.filter(
                        line => !analyzedTexts.has(line.trim().toLowerCase())
                      );
                      
                      if (unanalyzedLines.length === 0) return null;
                      
                      return (
                        <div className="mt-6 pt-4 border-t">
                          <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            {unanalyzedLines.length} more lines available - tap to analyze
                          </p>
                          <div className="space-y-1">
                            {unanalyzedLines.slice(0, unanalyzedLimit).map((line, idx) => {
                              const trimmedLine = line.trim();
                              const isLoading = loadingLines.has(trimmedLine);
                              
                              return (
                                <div key={`unanalyzed-${idx}`}>
                                  <button
                                    className="w-full text-left py-2 px-3 -mx-3 rounded-md hover:bg-muted/50 transition-colors group flex items-center gap-2"
                                    onClick={() => handleLazyAnalyze(trimmedLine)}
                                    disabled={isLoading}
                                    data-testid={`unanalyzed-line-${idx}`}
                                  >
                                    <p className="font-serif text-lg leading-relaxed text-muted-foreground flex-1">
                                      {line}
                                    </p>
                                    {isLoading ? (
                                      <div className="flex items-center gap-1.5 text-xs text-primary">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>Analyzing...</span>
                                      </div>
                                    ) : (
                                      <Sparkles className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                            {unanalyzedLines.length > unanalyzedLimit && (
                              <button 
                                onClick={() => setUnanalyzedLimit(prev => prev + 20)}
                                className="w-full text-center py-3 text-sm text-primary hover:underline"
                                data-testid="button-show-more-unanalyzed"
                              >
                                +{unanalyzedLines.length - unanalyzedLimit} more lines
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : analysisViewState === 'unavailable' ? (
                  <div className="text-center py-12 space-y-3">
                    <AlertCircle className="h-5 w-5 text-primary mx-auto" />
                    <p className="font-medium">
                      Song recognized
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {analysisUnavailableMessage}
                    </p>
                  </div>
                ) : track.analysisStatus === 'generating_analysis' || track.analysisStatus === 'pending' ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="font-medium">
                        Uncovering the story...
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Finding translations, slang meanings, and cultural context in each line.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      We found the song and lyrics, but the deeper breakdown did not finish this time.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
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
