import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { RitualTrack } from '../state/ritual-state';
import { FadeInView } from '../components/FadeInView';
import { ritualTokens } from '../theme/tokens';
import { fetchLyricSection, fetchMeaningSection, isSectionError } from '../api/result-sections';
import RetryPersistence from '../api/retry-persistence';
import ResultScreenAnalytics from '../api/analytics';

const { colors } = ritualTokens;

type SectionState = {
  ready: boolean;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
};

const SLOW_SECTION_THRESHOLD_MS = 3000;

type ResultScreenProps = {
  track: RitualTrack;
  onReset: () => void;
  onFollowLiveLyrics: () => void | Promise<void>;
};

function confidenceLabel(score: number) {
  if (score >= 70) {
    return 'Strong match';
  }
  return 'Possible match';
}

function firstNonEmptyLine(input: string | null | undefined): string {
  if (!input) {
    return '';
  }
  for (const raw of input.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return '';
}

function shortMeaningPreview(input: string | null | undefined, maxChars = 160): string {
  if (!input) {
    return '';
  }
  const collapsed = input.replace(/\s+/g, ' ').trim();
  if (!collapsed) {
    return '';
  }
  const firstSentenceMatch = collapsed.match(/[^.!?]+[.!?]/);
  const candidate = (firstSentenceMatch ? firstSentenceMatch[0] : collapsed).trim();
  if (candidate.length <= maxChars) {
    return candidate;
  }
  return candidate.slice(0, maxChars - 1).trimEnd() + '…';
}

export function ResultScreen({ track, onReset, onFollowLiveLyrics }: ResultScreenProps) {
  const [openingLiveLyrics, setOpeningLiveLyrics] = useState(false);
  const [lyricsSection, setLyricsSection] = useState<SectionState>({
    ready: (track.lyric || '').trim().length > 0,
    loading: false,
    error: null,
    errorCode: null,
  });
  const [meaningSection, setMeaningSection] = useState<SectionState>({
    ready: (track.meaning || '').trim().length > 0 || track.culturalAnalyses.length > 0,
    loading: false,
    error: null,
    errorCode: null,
  });
  const [resultShownAtMs] = useState(Date.now());
  const [sectionsCheckedAtMs, setSectionsCheckedAtMs] = useState<number | null>(null);
  const [fetchedLyric, setFetchedLyric] = useState<string | null>(null);
  const [fetchedAnalyses, setFetchedAnalyses] = useState<typeof track.culturalAnalyses | null>(null);

  const retryPersistenceRef = useRef(RetryPersistence.getInstance());
  const analyticsRef = useRef(ResultScreenAnalytics.getInstance());
  const sectionLoadStartTimesRef = useRef<Record<string, number>>({});
  const autoFetchAttemptRef = useRef<{ lyricTrackId: string | null; meaningTrackId: string | null }>({
    lyricTrackId: null,
    meaningTrackId: null,
  });

  const fallbackQuery = `${track.artist} ${track.title}`.trim();
  const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(fallbackQuery)}`;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(fallbackQuery)}`;
  const genreChips = track.chips.filter((chip) => chip.trim().length > 0);
  const metadataText = [track.year, ...genreChips].filter((item) => Boolean(item)).join(' • ');
  const confidenceText = `${confidenceLabel(track.matchConfidence)} · ${track.matchConfidence}%`;

  const openSpotify = async () => {
    const candidates = [track.spotify.uri, track.spotify.url, track.spotifyUrl, spotifySearchUrl].filter(
      (candidate): candidate is string => Boolean(candidate && candidate.trim().length > 0),
    );

    for (const candidate of candidates) {
      try {
        await Linking.openURL(candidate);
        return;
      } catch {
        // Try next candidate.
      }
    }

    Alert.alert('Link unavailable', 'Could not open Spotify right now.');
  };

  const openYoutube = async () => {
    const directVideoId = track.youtube.videoId;
    const directUrl = directVideoId
      ? `https://www.youtube.com/watch?v=${encodeURIComponent(directVideoId)}`
      : null;

    // Prioritize HTTPS URL first for better compatibility, then fallback to other schemes
    const candidates = [
      directUrl,  // Try direct HTTPS link first
      directVideoId ? `youtube://watch?v=${directVideoId}` : null,  // YouTube app deep link
      track.youtube.url,
      track.youtubeUrl,
      youtubeSearchUrl,
    ].filter((candidate): candidate is string => Boolean(candidate && candidate.trim().length > 0));

    for (const candidate of candidates) {
      try {
        await Linking.openURL(candidate);
        return;
      } catch {
        // Try next candidate.
      }
    }

    Alert.alert('Link unavailable', 'Could not open YouTube right now.');
  };

  useEffect(() => {
    setSectionsCheckedAtMs(Date.now());
  }, [track.id]);

  useEffect(() => {
    const initializeAndSync = async () => {
      try {
        await retryPersistenceRef.current.initialize();
        await analyticsRef.current.initialize();
        analyticsRef.current.startSession();

        // Sync any pending retries from previous sessions
        await retryPersistenceRef.current.syncPendingRetries(
          (trackId, sectionType) => {
            // Retry succeeded
            if (sectionType === 'lyrics' && trackId === track.id) {
              retryLyricsSection();
            } else if (sectionType === 'meaning' && trackId === track.id) {
              retryMeaningSection();
            }
          },
          (trackId, sectionType, error) => {
            // Retry failed, will be re-queued
            console.log('[result-screen] retry sync failed', { trackId, sectionType, error });
          },
        );
      } catch (error) {
        console.error('[result-screen] initialization failed', error);
      }
    };

    initializeAndSync();

    return () => {
      analyticsRef.current.endSession();
    };
  }, [track.id]);

  // Handle hardware back button to reset state before navigating
  useFocusEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onReset();
      return true;
    });

    return () => backHandler.remove();
  });

  const inlineLyrics = (fetchedLyric || track.lyric || '').trim();
  const meaningText = (track.meaning || '').trim();
  const analysesToUse = fetchedAnalyses || track.culturalAnalyses;
  const culturalDetail = analysesToUse[0];
  const culturalSummary = [culturalDetail?.culturalContext, culturalDetail?.deeperMeaning]
    .filter((part) => Boolean(part && part.trim().length > 0))
    .join(' ')
    .trim();

  const elapsedSinceResultMs = Date.now() - resultShownAtMs;
  const isLyricsStalled = !lyricsSection.ready && !lyricsSection.loading && !lyricsSection.error && elapsedSinceResultMs > SLOW_SECTION_THRESHOLD_MS;
  const isMeaningStalled = !meaningSection.ready && !meaningSection.loading && !meaningSection.error && elapsedSinceResultMs > SLOW_SECTION_THRESHOLD_MS;

  const retryLyricsSection = async () => {
    if (lyricsSection.loading) return;
    setLyricsSection({ ready: false, loading: true, error: null, errorCode: null });
    
    const startTimeMs = Date.now();
    sectionLoadStartTimesRef.current['lyrics'] = startTimeMs;
    
    try {
      const result = await fetchLyricSection(track.id);
      const durationMs = Date.now() - startTimeMs;
      
      if (isSectionError(result)) {
        setLyricsSection({ ready: false, loading: false, error: result.message, errorCode: result.code });
        
        // Track failed load and add to retry queue
        analyticsRef.current.recordSectionLoad({
          trackId: track.id,
          sectionType: 'lyrics',
          success: false,
          durationMs,
          errorType: result.code,
          isRetry: lyricsSection.error !== null,
          attemptNumber: 1,
        });
        
        await retryPersistenceRef.current.addRetryItem(track.id, 'lyrics', result.message);
      } else {
        setFetchedLyric(result.lyric);
        setLyricsSection({ ready: true, loading: false, error: null, errorCode: null });
        
        // Track successful load
        analyticsRef.current.recordSectionLoad({
          trackId: track.id,
          sectionType: 'lyrics',
          success: true,
          durationMs,
          isRetry: lyricsSection.error !== null,
          attemptNumber: 1,
        });
        
        // Remove from retry queue if present
        await retryPersistenceRef.current.removeRetryItem(track.id, 'lyrics');
      }
    } catch (err) {
      const durationMs = Date.now() - startTimeMs;
      const errorMsg = err instanceof Error ? err.message : 'Failed to load lyrics. Try again?';
      setLyricsSection({ ready: false, loading: false, error: errorMsg, errorCode: 'network_error' });
      
      // Track error and add to retry queue
      analyticsRef.current.recordSectionLoad({
        trackId: track.id,
        sectionType: 'lyrics',
        success: false,
        durationMs,
        errorType: 'network_error',
        isRetry: lyricsSection.error !== null,
        attemptNumber: 1,
      });
      
      await retryPersistenceRef.current.addRetryItem(track.id, 'lyrics', errorMsg);
    }
  };

  const retryMeaningSection = async () => {
    if (meaningSection.loading) return;
    setMeaningSection({ ready: false, loading: true, error: null, errorCode: null });
    
    const startTimeMs = Date.now();
    sectionLoadStartTimesRef.current['meaning'] = startTimeMs;
    
    try {
      const result = await fetchMeaningSection(track.id);
      const durationMs = Date.now() - startTimeMs;
      
      if (isSectionError(result)) {
        setMeaningSection({ ready: false, loading: false, error: result.message, errorCode: result.code });
        
        // Track failed load and add to retry queue
        analyticsRef.current.recordSectionLoad({
          trackId: track.id,
          sectionType: 'meaning',
          success: false,
          durationMs,
          errorType: result.code,
          isRetry: meaningSection.error !== null,
          attemptNumber: 1,
        });
        
        await retryPersistenceRef.current.addRetryItem(track.id, 'meaning', result.message);
      } else {
        if (result.culturalAnalyses.length > 0) {
          setFetchedAnalyses(result.culturalAnalyses);
          setMeaningSection({ ready: true, loading: false, error: null, errorCode: null });
          
          // Track successful load
          analyticsRef.current.recordSectionLoad({
            trackId: track.id,
            sectionType: 'meaning',
            success: true,
            durationMs,
            isRetry: meaningSection.error !== null,
            attemptNumber: 1,
          });
          
          // Remove from retry queue if present
          await retryPersistenceRef.current.removeRetryItem(track.id, 'meaning');
        } else {
          const errorMsg = 'Meaning analysis not available yet. Check Live Lyrics for context.';
          setMeaningSection({ ready: false, loading: false, error: errorMsg, errorCode: 'unavailable' });
          
          // Track as unavailable
          analyticsRef.current.recordSectionLoad({
            trackId: track.id,
            sectionType: 'meaning',
            success: false,
            durationMs,
            errorType: 'unavailable',
            isRetry: meaningSection.error !== null,
            attemptNumber: 1,
          });
        }
      }
    } catch (err) {
      const durationMs = Date.now() - startTimeMs;
      const errorMsg = err instanceof Error ? err.message : 'Failed to load meaning. Try again?';
      setMeaningSection({ ready: false, loading: false, error: errorMsg, errorCode: 'network_error' });
      
      // Track error and add to retry queue
      analyticsRef.current.recordSectionLoad({
        trackId: track.id,
        sectionType: 'meaning',
        success: false,
        durationMs,
        errorType: 'network_error',
        isRetry: meaningSection.error !== null,
        attemptNumber: 1,
      });
      
      await retryPersistenceRef.current.addRetryItem(track.id, 'meaning', errorMsg);
    }
  };

  useEffect(() => {
    if (!track.id) {
      return;
    }

    // Auto-fetch lyrics once per track when payload does not include inline lyric text.
    if (
      !lyricsSection.ready &&
      !lyricsSection.loading &&
      !lyricsSection.error &&
      autoFetchAttemptRef.current.lyricTrackId !== track.id
    ) {
      autoFetchAttemptRef.current.lyricTrackId = track.id;
      retryLyricsSection();
    }

    // Auto-fetch meaning once per track when payload does not include meaning/analysis.
    if (
      !meaningSection.ready &&
      !meaningSection.loading &&
      !meaningSection.error &&
      autoFetchAttemptRef.current.meaningTrackId !== track.id
    ) {
      autoFetchAttemptRef.current.meaningTrackId = track.id;
      retryMeaningSection();
    }
  }, [
    track.id,
    lyricsSection.ready,
    lyricsSection.loading,
    lyricsSection.error,
    meaningSection.ready,
    meaningSection.loading,
    meaningSection.error,
  ]);

  const openLiveLyrics = async () => {
    if (openingLiveLyrics) {
      return;
    }

    setOpeningLiveLyrics(true);
    try {
      await onFollowLiveLyrics();
    } finally {
      setOpeningLiveLyrics(false);
    }
  };

  const isSoftLyricsDelay = lyricsSection.errorCode === 'timeout';
  const isSoftMeaningDelay = meaningSection.errorCode === 'timeout';
  const spotifyDirectAvailable = Boolean(track.spotify.trackId || track.spotify.uri);
  const youtubeDirectAvailable = Boolean(track.youtube.videoId);

  const matchedLine = firstNonEmptyLine(inlineLyrics);
  const meaningPreview = shortMeaningPreview(meaningText || culturalSummary);

  const lyricsCardText = lyricsSection.loading
    ? 'Finding the best lyric match…'
    : lyricsSection.error
      ? isSoftLyricsDelay
        ? 'Finding the best lyric match…'
        : 'Lyric not available yet.'
      : matchedLine
        ? matchedLine
        : isLyricsStalled
          ? 'Finding the best lyric match…'
          : 'Finding the best lyric match…';

  const meaningCardText = meaningSection.loading
    ? 'Preparing meaning…'
    : meaningSection.error
      ? isSoftMeaningDelay
        ? 'Meaning is not available yet for this line.'
        : 'Meaning is not available yet for this line.'
      : meaningPreview
        ? meaningPreview
        : isMeaningStalled
          ? 'Meaning is not available yet for this line.'
          : 'Preparing meaning…';

  const matchedLineReady = Boolean(matchedLine) && !lyricsSection.loading;
  const meaningReady = Boolean(meaningPreview) && !meaningSection.loading;

  return (
    <FadeInView>
      <View style={styles.screen}>
        <View style={styles.ambientGlow} />

        <ScrollView contentContainerStyle={styles.container}>
          {track.albumArt ? <Image source={{ uri: track.albumArt }} style={styles.cover} /> : null}

          <Text style={styles.title}>{track.title}</Text>
          <Text style={styles.artist}>{track.artist}</Text>
          {metadataText ? <Text style={styles.metadata}>{metadataText}</Text> : null}
          <View style={styles.badgesRow}>
            <Text style={styles.badge}>{confidenceText}</Text>
          </View>

          <View style={styles.matchedLineCard}>
            <Text style={styles.cardLabel}>Matched line</Text>
            <Text style={matchedLineReady ? styles.matchedLineText : styles.cardPlaceholder}>
              {lyricsCardText}
            </Text>
            {lyricsSection.error ? (
              <Pressable onPress={retryLyricsSection} style={styles.sectionRetry}>
                <Text style={styles.sectionRetryText}>Retry lyrics</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.meaningCard}>
            <Text style={styles.cardLabel}>Meaning</Text>
            <Text style={meaningReady ? styles.meaningPreviewText : styles.cardPlaceholder}>
              {meaningCardText}
            </Text>
            {meaningSection.error ? (
              <Pressable onPress={retryMeaningSection} style={styles.sectionRetry}>
                <Text style={styles.sectionRetryText}>Retry meaning</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={openLiveLyrics}
              style={[styles.primaryButton, openingLiveLyrics && styles.primaryButtonBusy]}
            >
              <Text style={styles.primaryButtonText}>
                {openingLiveLyrics ? 'Opening Live Lyrics…' : 'Follow Live Lyrics'}
              </Text>
            </Pressable>

            <View style={styles.linksRow}>
              <Pressable onPress={openSpotify} style={styles.linkButton}>
                <Text style={styles.linkButtonText}>
                  {spotifyDirectAvailable ? 'Spotify' : 'Search Spotify'}
                </Text>
              </Pressable>
              <Pressable onPress={openYoutube} style={styles.linkButton}>
                <Text style={styles.linkButtonText}>
                  {youtubeDirectAvailable ? 'YouTube' : 'Search YouTube'}
                </Text>
              </Pressable>
            </View>

            <Pressable onPress={onReset} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Listen again</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 12,
    backgroundColor: '#08060F',
  },
  ambientGlow: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: colors.violetWash,
  },
  container: {
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    marginTop: 8,
  },
  artist: {
    color: colors.textMuted,
    fontSize: 17,
    marginTop: -8,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    color: colors.violetSoft,
    backgroundColor: colors.violetWash,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cover: {
    width: 200,
    height: 200,
    borderRadius: 20,
    alignSelf: 'center',
  },
  matchedLineCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(216,196,255,0.28)',
    backgroundColor: 'rgba(16,12,30,0.94)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  meaningCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,184,76,0.24)',
    backgroundColor: 'rgba(17,13,31,0.96)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  cardLabel: {
    color: '#D6C9F6',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '700',
  },
  matchedLineText: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 26,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
  },
  meaningPreviewText: {
    color: '#F5F0FF',
    fontSize: 14,
    lineHeight: 21,
  },
  cardPlaceholder: {
    color: '#C9BCE9',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  lyricCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 14,
    gap: 10,
  },
  lyricText: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 28,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
  },
  lyricHint: {
    color: colors.textMuted,
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionRetry: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.violetWash,
    borderWidth: 1,
    borderColor: colors.violetEdge,
  },
  sectionRetryText: {
    color: colors.violetSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  metadata: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.5,
    marginVertical: 8,
  },
  loadingText: {
    color: colors.violetSoft,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  errorText: {
    color: colors.amber,
    fontSize: 13,
    lineHeight: 19,
  },
  pendingText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  meaningText: {
    color: colors.amber,
    fontSize: 14,
    lineHeight: 20,
  },
  culturalText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.9,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipItem: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  linksRow: {
    flexDirection: 'row',
    gap: 10,
  },
  linkButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(216,196,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.075)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  actionsRow: {
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: colors.violet,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonBusy: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(216,196,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.075)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
