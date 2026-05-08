import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MatchSource, RitualTrack } from '../state/ritual-state';
import { FadeInView } from '../components/FadeInView';
import { ritualTokens } from '../theme/tokens';
import { fetchLyricSection, fetchMeaningSection, isSectionError } from '../api/result-sections';
import {
  getRecognitionDurationLabel,
  getRecognitionPerformanceHint,
  isFastRecognition,
  isSlowRecognition,
} from '../utils/timing';
import RetryPersistence from '../api/retry-persistence';
import ResultScreenAnalytics from '../api/analytics';

const { colors } = ritualTokens;

type SectionState = {
  ready: boolean;
  loading: boolean;
  error: string | null;
};

const SLOW_SECTION_THRESHOLD_MS = 3000;
const SECTION_RETRY_DELAY_MS = 500;

const MATCH_SOURCE_LABELS: Record<MatchSource, string> = {
  acrcloud: 'Matched by audio',
  ai_transcript: 'Matched by transcript',
  lyric_text: 'Matched by lyric',
  manual: 'Manual entry',
  spotify: 'From Spotify',
  unknown: 'Matched',
};

type ResultScreenProps = {
  track: RitualTrack;
  onReset: () => void;
  onFollowLiveLyrics: () => void | Promise<void>;
};

function confidenceLabel(score: number) {
  if (score >= 85) {
    return 'Strong match';
  }
  if (score >= 65) {
    return 'High confidence';
  }
  if (score >= 45) {
    return 'Likely match';
  }
  return 'Tentative match';
}

export function ResultScreen({ track, onReset, onFollowLiveLyrics }: ResultScreenProps) {
  const [openingLiveLyrics, setOpeningLiveLyrics] = useState(false);
  const [lyricsSection, setLyricsSection] = useState<SectionState>({
    ready: (track.lyric || '').trim().length > 0,
    loading: false,
    error: null,
  });
  const [meaningSection, setMeaningSection] = useState<SectionState>({
    ready: (track.meaning || '').trim().length > 0 || track.culturalAnalyses.length > 0,
    loading: false,
    error: null,
  });
  const [resultShownAtMs] = useState(Date.now());
  const [sectionsCheckedAtMs, setSectionsCheckedAtMs] = useState<number | null>(null);
  const [fetchedLyric, setFetchedLyric] = useState<string | null>(null);
  const [fetchedAnalyses, setFetchedAnalyses] = useState<typeof track.culturalAnalyses | null>(null);

  const retryPersistenceRef = useRef(RetryPersistence.getInstance());
  const analyticsRef = useRef(ResultScreenAnalytics.getInstance());
  const sectionLoadStartTimesRef = useRef<Record<string, number>>({});

  const extractSpotifyTrackId = (url: string) => {
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    return match?.[1] ?? null;
  };

  const extractYoutubeVideoId = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtu.be')) {
        return parsed.pathname.replace('/', '') || null;
      }
      return parsed.searchParams.get('v');
    } catch {
      return null;
    }
  };

  const openLink = async (url: string, fallbackQuery: string, platformName: 'Spotify' | 'YouTube') => {
    const trimmedUrl = url.trim();
    const fallbackUrl =
      platformName === 'Spotify'
        ? `https://open.spotify.com/search/${encodeURIComponent(fallbackQuery)}`
        : `https://www.youtube.com/results?search_query=${encodeURIComponent(fallbackQuery)}`;

    const appUri =
      platformName === 'Spotify'
        ? (() => {
            const trackId = extractSpotifyTrackId(trimmedUrl);
            return trackId ? `spotify:track:${trackId}` : null;
          })()
        : (() => {
            const videoId = extractYoutubeVideoId(trimmedUrl);
            return videoId ? `vnd.youtube://${videoId}` : null;
          })();

    const candidates = [appUri, trimmedUrl, fallbackUrl].filter(
      (candidate): candidate is string => Boolean(candidate),
    );

    try {
      for (const candidate of candidates) {
        try {
          await Linking.openURL(candidate);
          return;
        } catch {
          // Try next candidate.
        }
      }

      Alert.alert('Link unavailable', `Could not open ${platformName} right now.`);
    } catch {
      Alert.alert('Link unavailable', `Could not open ${platformName}. Please try again.`);
    }
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
    setLyricsSection({ ready: false, loading: true, error: null });
    
    const startTimeMs = Date.now();
    sectionLoadStartTimesRef.current['lyrics'] = startTimeMs;
    
    try {
      const result = await fetchLyricSection(track.id);
      const durationMs = Date.now() - startTimeMs;
      
      if (isSectionError(result)) {
        setLyricsSection({ ready: false, loading: false, error: result.message });
        
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
        setLyricsSection({ ready: true, loading: false, error: null });
        
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
      setLyricsSection({ ready: false, loading: false, error: errorMsg });
      
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
    setMeaningSection({ ready: false, loading: true, error: null });
    
    const startTimeMs = Date.now();
    sectionLoadStartTimesRef.current['meaning'] = startTimeMs;
    
    try {
      const result = await fetchMeaningSection(track.id);
      const durationMs = Date.now() - startTimeMs;
      
      if (isSectionError(result)) {
        setMeaningSection({ ready: false, loading: false, error: result.message });
        
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
          setMeaningSection({ ready: true, loading: false, error: null });
          
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
          setMeaningSection({ ready: false, loading: false, error: errorMsg });
          
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
      setMeaningSection({ ready: false, loading: false, error: errorMsg });
      
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

  return (
    <FadeInView>
      <View style={styles.screen}>
        <View style={styles.ambientGlow} />

        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>{track.title}</Text>
          <Text style={styles.artist}>{track.artist}</Text>

          <View style={styles.badgesRow}>
            <Text style={styles.badge}>{MATCH_SOURCE_LABELS[track.matchSource]}</Text>
            <Text style={styles.badge}>{confidenceLabel(track.matchConfidence)}</Text>
            {track.matchedInMs > 0 ? (
              <Text style={styles.badge}>matched in {(track.matchedInMs / 1000).toFixed(1)}s</Text>
            ) : null}
          </View>

          {(() => {
            const durationLabel = getRecognitionDurationLabel(
              track.listenStartedAtMs,
              track.recognitionReceivedAtMs,
            );
            const performanceHint = getRecognitionPerformanceHint(
              track.listenStartedAtMs,
              track.recognitionReceivedAtMs,
            );
            const fast = isFastRecognition(track.listenStartedAtMs, track.recognitionReceivedAtMs);
            const slow = isSlowRecognition(track.listenStartedAtMs, track.recognitionReceivedAtMs);

            return durationLabel || performanceHint ? (
              <View style={styles.timingHintRow}>
                {durationLabel ? (
                  <Text
                    style={[
                      styles.timingHintText,
                      fast && styles.timingHintFast,
                      slow && styles.timingHintSlow,
                    ]}
                  >
                    {durationLabel}
                  </Text>
                ) : null}
                {performanceHint ? (
                  <Text
                    style={[
                      styles.timingHintText,
                      fast && styles.timingHintFast,
                      slow && styles.timingHintSlow,
                    ]}
                  >
                    {performanceHint}
                  </Text>
                ) : null}
              </View>
            ) : null;
          })()}

          {track.albumArt ? <Image source={{ uri: track.albumArt }} style={styles.cover} /> : null}

          <View style={styles.lyricCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Lyrics</Text>
              {lyricsSection.error && (
                <Pressable onPress={retryLyricsSection} style={styles.sectionRetry}>
                  <Text style={styles.sectionRetryText}>Retry</Text>
                </Pressable>
              )}
            </View>
            {lyricsSection.loading ? (
              <Text style={styles.loadingText}>Loading lyrics…</Text>
            ) : lyricsSection.error ? (
              <Text style={styles.errorText}>{lyricsSection.error}</Text>
            ) : inlineLyrics ? (
              <Text style={styles.lyricText}>{inlineLyrics}</Text>
            ) : isLyricsStalled ? (
              <Text style={styles.stalledText}>Lyrics taking longer than expected. Open Live Lyrics or retry.</Text>
            ) : (
              <Text style={styles.pendingText}>Lyrics are still loading. Open Live Lyrics to fetch more lines.</Text>
            )}

            <View style={styles.sectionDivider} />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Meaning</Text>
              {meaningSection.error && (
                <Pressable onPress={retryMeaningSection} style={styles.sectionRetry}>
                  <Text style={styles.sectionRetryText}>Retry</Text>
                </Pressable>
              )}
            </View>
            {meaningSection.loading ? (
              <Text style={styles.loadingText}>Loading meaning…</Text>
            ) : meaningSection.error ? (
              <Text style={styles.errorText}>{meaningSection.error}</Text>
            ) : meaningText ? (
              <Text style={styles.meaningText}>{meaningText}</Text>
            ) : isMeaningStalled ? (
              <Text style={styles.stalledText}>Meaning analysis is slow. Check back shortly or open Live Lyrics.</Text>
            ) : (
              <Text style={styles.pendingText}>Meaning is still loading for this track.</Text>
            )}

            {culturalSummary && (
              <Text style={styles.culturalText}>{culturalSummary}</Text>
            )}
          </View>

          {track.chips.length > 0 ? (
            <View style={styles.chipsRow}>
              {track.chips.map((chip) => (
                <View key={chip} style={styles.chipItem}>
                  <Text style={styles.chipText}>{chip}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.linksRow}>
            <Pressable
              onPress={() => openLink(track.spotifyUrl, `${track.artist} ${track.title}`, 'Spotify')}
              style={styles.linkButton}
            >
              <Text style={styles.linkButtonText}>Spotify</Text>
            </Pressable>
            <Pressable
              onPress={() => openLink(track.youtubeUrl, `${track.artist} ${track.title}`, 'YouTube')}
              style={styles.linkButton}
            >
              <Text style={styles.linkButtonText}>YouTube</Text>
            </Pressable>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={openLiveLyrics}
              style={[styles.primaryButton, openingLiveLyrics && styles.primaryButtonBusy]}
            >
              <Text style={styles.primaryButtonText}>
                {openingLiveLyrics ? 'Opening live lyrics…' : 'Follow Live Lyrics'}
              </Text>
            </Pressable>
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
    gap: 14,
    paddingBottom: 24,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
  },
  artist: {
    color: colors.textMuted,
    fontSize: 18,
    marginTop: -6,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  timingHintRow: {
    gap: 8,
    marginVertical: 4,
  },
  timingHintText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  timingHintFast: {
    color: colors.violetSoft,
  },
  timingHintSlow: {
    color: colors.amber,
  },
  cover: {
    width: 180,
    height: 180,
    borderRadius: 18,
    alignSelf: 'center',
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
  stalledText: {
    color: colors.amber,
    fontSize: 14,
    lineHeight: 20,
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
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  actionsRow: {
    gap: 10,
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
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
