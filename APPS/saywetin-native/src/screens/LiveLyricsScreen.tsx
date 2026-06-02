import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchLineExplain, fetchSyncedLyrics, postSignal } from '../api/live-lyrics';
import { TapExplainSheet } from '../components/TapExplainSheet';
import type { RitualTrack, SyncedLyricLine } from '../state/ritual-state';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;
const PROVISIONAL_LINE_MS = 1800;
const AUTO_CALIBRATION_LIMIT = 2;
const AUTO_CALIBRATION_THRESHOLD_MS = 900;
const AUTO_CALIBRATION_MAX_STEP_MS = 900;

function firstSentence(input: string | null | undefined, maxChars = 140): string {
  if (!input) return '';
  const collapsed = input.replace(/\s+/g, ' ').trim();
  if (!collapsed) return '';
  const match = collapsed.match(/[^.!?]+[.!?]/);
  const candidate = (match ? match[0] : collapsed).trim();
  if (candidate.length <= maxChars) return candidate;
  return candidate.slice(0, maxChars - 1).trimEnd() + '…';
}

function shortVibeTag(input: string | null | undefined, maxChars = 32): string {
  if (!input) return '';
  const collapsed = input.replace(/\s+/g, ' ').trim();
  if (!collapsed) return '';
  const candidate = collapsed.split(/[.,;:·]/)[0].trim();
  if (candidate.length <= maxChars) return candidate;
  return candidate.slice(0, maxChars - 1).trimEnd() + '…';
}

function buildProvisionalLyrics(lyricText: string | null | undefined, startOffsetMs: number): SyncedLyricLine[] {
  const text = (lyricText || '').trim();
  if (!text) {
    return [];
  }

  const rawLines = text
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 24);

  return rawLines.map((line, index) => {
    const startMs = Math.max(0, startOffsetMs + index * PROVISIONAL_LINE_MS);
    const endMs = startMs + PROVISIONAL_LINE_MS;
    return {
      id: `prov-${index}`,
      text: line,
      startMs,
      endMs,
      tappable: false,
      meaning: '',
      vibe: '',
      culture: '',
      artistIntent: '',
      reply: '',
      alternates: [],
      related: [],
    };
  });
}

type LiveLyricsScreenProps = {
  track: RitualTrack;
  onBack: () => void;
};

// ContextTab inline UI removed: live lyrics now shows a compact preview that
// opens the full TapExplainSheet on tap.

export function LiveLyricsScreen({ track, onBack }: LiveLyricsScreenProps) {
  // Initialize timing references at component mount time for accuracy
  const screenMountTimeRef = useRef(Date.now());
  const now = screenMountTimeRef.current;
  
  const effectiveResultShownAtMs = track.resultShownAtMs ?? now;
  const effectiveMidpointAtMs =
    track.audioSampleMidpointAtMs ?? track.sampleCapturedAtMs ?? effectiveResultShownAtMs;
  const effectiveMatchedOffsetMs =
    track.matchedSongOffsetMs ?? track.providerSongOffsetMs ?? track.lyricsAnchorOffsetMs ?? 0;

  // A "real anchor" means we trust that matchedSongOffsetMs reflects where in
  // the song the captured audio actually was. Without that we should not pin
  // playback to 0:01 — we should tell the user timing is unavailable instead.
  const hasReliableTiming =
    typeof track.matchedSongOffsetMs === 'number' && track.matchedSongOffsetMs >= 0 &&
    typeof track.audioSampleMidpointAtMs === 'number' && track.audioSampleMidpointAtMs > 0;

  const derivedDisplaySongOffsetMs = Math.max(
    0,
    effectiveMatchedOffsetMs + (effectiveResultShownAtMs - effectiveMidpointAtMs),
  );

  const initialDisplaySongOffsetMs = Math.max(
    0,
    track.displaySongOffsetMs ?? derivedDisplaySongOffsetMs,
  );

  // Only calculate elapsed if result was shown in the past (avoid future timestamps)
  const elapsedSinceResultShownMs = Math.max(0, Math.min(Date.now() - effectiveResultShownAtMs, 120000)); // Cap at 2 min
  const initialSongOffsetMs = initialDisplaySongOffsetMs + elapsedSinceResultShownMs;
  const initialLyrics =
    track.syncedLyrics.length > 0 ? track.syncedLyrics : buildProvisionalLyrics(track.lyric, initialSongOffsetMs);

  const [lyrics, setLyrics] = useState<SyncedLyricLine[]>(initialLyrics);
  const [usingProvisionalLyrics, setUsingProvisionalLyrics] = useState(
    track.syncedLyrics.length === 0 && initialLyrics.length > 0,
  );
  const [positionMs, setPositionMs] = useState(initialSongOffsetMs);
  const [syncWarn, setSyncWarn] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<SyncedLyricLine | null>(null);
  const [manualOffsetMs, setManualOffsetMs] = useState(0);
  const [lineMeaningCache, setLineMeaningCache] = useState<Record<string, SyncedLyricLine>>({});
  const [lineLoadingById, setLineLoadingById] = useState<Record<string, boolean>>({});

  const baseDisplayOffsetRef = useRef(initialDisplaySongOffsetMs);
  const resultShownAtRef = useRef(effectiveResultShownAtMs);
  const driftSinceMs = useRef<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lineHeights = useRef<Record<number, number>>({});
  const inFlightExplainRef = useRef<Record<string, Promise<SyncedLyricLine>>>({});
  const previousLineIndexRef = useRef(0);
  const autoCalibrationRemainingRef = useRef(AUTO_CALIBRATION_LIMIT);

  // Handle hardware back button to return to Result (not reset)
  useFocusEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });

    return () => backHandler.remove();
  });

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const loaded = await fetchSyncedLyrics(track.id);
      if (!mounted) {
        return;
      }

      if (loaded && loaded.lines.length > 0) {
        setLyrics(loaded.lines);
        setUsingProvisionalLyrics(false);
        if (loaded.songOffsetMs > 0 && !track.displaySongOffsetMs) {
          baseDisplayOffsetRef.current = loaded.songOffsetMs;
        }
        setFallbackReason(null);
        return;
      }

      if (initialLyrics.length === 0) {
        setLyrics([]);
        setFallbackReason('notiming');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [track.id, track.displaySongOffsetMs]);

  // If we have lyrics but no real timing anchor, do not pretend playback is at
  // 0:01 — surface the unavailable banner instead.
  useEffect(() => {
    if (lyrics.length > 0 && !hasReliableTiming) {
      setFallbackReason((prev) => prev ?? 'notiming');
    }
  }, [lyrics.length, hasReliableTiming]);

  useEffect(() => {
    let frame = 0;

    const tick = () => {
      const elapsed = Math.max(0, Date.now() - resultShownAtRef.current);
      const activeOffsetMs = Math.max(0, baseDisplayOffsetRef.current + elapsed + manualOffsetMs);
      setPositionMs(activeOffsetMs);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [manualOffsetMs]);

  useEffect(() => {
    return () => {
      void postSignal('exit', track.id);
    };
  }, [track.id]);

  const currentLineIndex = useMemo(() => {
    if (lyrics.length === 0) {
      return 0;
    }

    const matchIndex = lyrics.findIndex((line) => line.startMs <= positionMs && positionMs < line.endMs);
    if (matchIndex >= 0) {
      return matchIndex;
    }

    const nearestPast = lyrics.reduce((best, line, index) => {
      if (line.startMs <= positionMs) {
        return index;
      }
      return best;
    }, -1);

    return nearestPast >= 0 ? nearestPast : 0;
  }, [lyrics, positionMs]);

  const activeLine = lyrics[currentLineIndex] ?? null;

  useEffect(() => {
    if (lyrics.length === 0) {
      previousLineIndexRef.current = 0;
      return;
    }

    const previousIndex = previousLineIndexRef.current;
    previousLineIndexRef.current = currentLineIndex;

    if (currentLineIndex === previousIndex || usingProvisionalLyrics || fallbackReason) {
      return;
    }

    if (autoCalibrationRemainingRef.current <= 0) {
      return;
    }

    const targetLine = lyrics[currentLineIndex];
    if (!targetLine) {
      return;
    }

    const driftMs = targetLine.startMs - positionMs;
    if (Math.abs(driftMs) < AUTO_CALIBRATION_THRESHOLD_MS) {
      return;
    }

    const correctionMs = Math.max(
      -AUTO_CALIBRATION_MAX_STEP_MS,
      Math.min(AUTO_CALIBRATION_MAX_STEP_MS, driftMs),
    );

    autoCalibrationRemainingRef.current -= 1;
    setManualOffsetMs((current) => current + correctionMs);
  }, [currentLineIndex, lyrics, positionMs, usingProvisionalLyrics, fallbackReason]);

  const initialScrollDoneRef = useRef(false);

  useEffect(() => {
    if (!scrollRef.current || currentLineIndex <= 0) {
      return;
    }

    let offset = 0;
    for (let i = 0; i < currentLineIndex; i += 1) {
      offset += lineHeights.current[i] ?? 80;
    }
    const targetY = Math.max(0, offset - 160);
    // First scroll: jump without animation so the top of lyrics never flashes
    // before we land on the active line. Subsequent scrolls animate.
    const animated = initialScrollDoneRef.current;
    scrollRef.current.scrollTo({ y: targetY, animated });
    initialScrollDoneRef.current = true;
  }, [currentLineIndex]);

  const hydrateLineMeaning = async (line: SyncedLyricLine): Promise<SyncedLyricLine> => {
    if (lineMeaningCache[line.id]) {
      return lineMeaningCache[line.id];
    }

    if (line.id in inFlightExplainRef.current) {
      return inFlightExplainRef.current[line.id];
    }

    setLineLoadingById((current) => ({
      ...current,
      [line.id]: true,
    }));

    const hydrationPromise = (async () => {
      const explain = await fetchLineExplain(track.id, line, positionMs);
      if (!explain) {
        return line;
      }

      const merged: SyncedLyricLine = {
        ...line,
        meaning: explain.meaning || line.meaning,
        vibe: explain.vibe || line.vibe,
        culture: explain.culture || line.culture,
        artistIntent: explain.artistIntent || line.artistIntent,
        reply: explain.reply || line.reply,
        alternates: explain.alternates.length > 0 ? explain.alternates : line.alternates,
        related: explain.related.length > 0 ? explain.related : line.related,
      };

      setLineMeaningCache((current) => ({
        ...current,
        [line.id]: merged,
      }));

      return merged;
    })();

    inFlightExplainRef.current[line.id] = hydrationPromise;

    try {
      return await hydrationPromise;
    } finally {
      setLineLoadingById((current) => ({
        ...current,
        [line.id]: false,
      }));
      delete inFlightExplainRef.current[line.id];
    }
  };

  const prefetchNearby = async (centerIndex: number) => {
    const candidates = [centerIndex - 2, centerIndex - 1, centerIndex, centerIndex + 1, centerIndex + 2]
      .filter((index) => index >= 0 && index < lyrics.length)
      .map((index) => lyrics[index]);

    await Promise.all(candidates.map((candidate) => hydrateLineMeaning(candidate)));
  };

  const openExplain = (line: SyncedLyricLine, index: number) => {
    void postSignal('tap', track.id, line.id);
    setSelectedLine(line);
    void prefetchNearby(index);
    void (async () => {
      const hydrated = await hydrateLineMeaning(line);
      setSelectedLine(hydrated);
    })();
  };

  useEffect(() => {
    if (lyrics.length === 0) {
      return;
    }

    void prefetchNearby(currentLineIndex);
  }, [currentLineIndex, lyrics]);

  // Only render lyrics within a window to prevent "pop all at once" effect
  const displayedLyrics = useMemo(() => {
    if (lyrics.length === 0) return [];
    
    const VISIBLE_WINDOW = 8; // Show 8 lines around current line
    const start = Math.max(0, currentLineIndex - VISIBLE_WINDOW);
    const end = Math.min(lyrics.length, currentLineIndex + VISIBLE_WINDOW + 1);
    
    return lyrics.slice(start, end).map((line, displayIndex) => ({
      line,
      originalIndex: start + displayIndex,
    }));
  }, [lyrics, currentLineIndex]);

  const onResync = () => {
    resultShownAtRef.current = Date.now();
    baseDisplayOffsetRef.current = initialDisplaySongOffsetMs;
    autoCalibrationRemainingRef.current = AUTO_CALIBRATION_LIMIT;
    setManualOffsetMs(0);
    setPositionMs(initialDisplaySongOffsetMs);
    setSyncWarn(false);
    driftSinceMs.current = null;
    void postSignal('resync', track.id);
  };

  const adjustSync = (deltaMs: number) => {
    setManualOffsetMs((current) => current + deltaMs);
    setSyncWarn(false);
  };

  const inlineIndicator = fallbackReason
    ? 'Exact lyric timing is unavailable.'
    : usingProvisionalLyrics
      ? 'Syncing timed lyrics...'
      : syncWarn
        ? 'Timing drift detected. Tap Re-sync if lines feel off.'
        : null;

  return (
    <View style={styles.screen} collapsable={false}>
      <View style={styles.ambientGlow} pointerEvents="none" />

      <View style={styles.topRow}>
        <View style={styles.syncControlRow}>
          <Pressable onPress={() => adjustSync(-5000)} style={styles.syncButton}>
            <Text style={styles.syncButtonText}>Sync -5s</Text>
          </Pressable>
          <Pressable onPress={() => adjustSync(5000)} style={styles.syncButton}>
            <Text style={styles.syncButtonText}>Sync +5s</Text>
          </Pressable>
          <Pressable onPress={onResync} style={styles.resyncButton}>
            <Text style={styles.resyncButtonText}>Re-sync</Text>
          </Pressable>
        </View>

        <Pressable onPress={onBack} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      </View>

      {inlineIndicator ? (
        <View style={styles.syncNotice}>
          <Text style={styles.syncNoticeText}>{inlineIndicator}</Text>
        </View>
      ) : null}

      <ScrollView ref={scrollRef} contentContainerStyle={styles.lyricsWrap} showsVerticalScrollIndicator={false}>
        {lyrics.length === 0 ? (
          <View style={styles.loadingState}>
            <View style={styles.loadingPill} />
            <View style={[styles.loadingPill, styles.loadingPillShort]} />
            <Text style={styles.waitingText}>Preparing lyrics...</Text>
          </View>
        ) : null}

        {displayedLyrics.map(({ line, originalIndex }) => {
          const active = originalIndex === currentLineIndex;
          const distance = Math.abs(originalIndex - currentLineIndex);
          const opacity = active ? 1 : distance === 1 ? 0.45 : distance === 2 ? 0.22 : 0.12;
          const fontSize = active ? 30 : distance === 1 ? 20 : 16;

          return (
            <Pressable
              key={line.id}
              onPress={() => openExplain(line, originalIndex)}
              onLayout={(event) => {
                lineHeights.current[originalIndex] = event.nativeEvent.layout.height;
              }}
              style={styles.linePressable}
            >
              <Text style={[styles.lineText, { opacity, fontSize, lineHeight: fontSize * 1.35 }]}>{line.text}</Text>

              {active ? (
                <Pressable
                  style={styles.contextPreview}
                  onPress={() => openExplain(line, originalIndex)}
                >
                  <View style={styles.contextPreviewBody}>
                    <Text style={styles.contextPreviewMeaning} numberOfLines={2}>
                      {firstSentence(activeLine?.meaning) || 'Tap Explain for meaning, slang, vibe, and culture.'}
                    </Text>
                    {shortVibeTag(activeLine?.vibe) ? (
                      <View style={styles.contextVibeChip}>
                        <Text style={styles.contextVibeChipText} numberOfLines={1}>
                          {shortVibeTag(activeLine?.vibe)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.contextPreviewCta}>Tap Explain →</Text>
                </Pressable>
              ) : null}
            </Pressable>
          );
        })}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.footerArtist} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      <TapExplainSheet
        visible={Boolean(selectedLine)}
        line={selectedLine}
        loading={Boolean(selectedLine && lineLoadingById[selectedLine.id])}
        onClose={() => setSelectedLine(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    backgroundColor: '#08060F',
    zIndex: 10,
  },
  ambientGlow: {
    position: 'absolute',
    top: '25%',
    left: -80,
    right: -80,
    height: 320,
    borderRadius: 999,
    backgroundColor: 'rgba(90,55,180,0.18)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  syncControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  syncButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  syncButtonText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  doneButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  doneButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  resyncButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.amber,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(232,184,76,0.1)',
  },
  resyncButtonText: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
  },
  syncNotice: {
    marginHorizontal: 20,
    marginBottom: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(232,184,76,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232,184,76,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  syncNoticeText: {
    color: '#F0C08A',
    fontSize: 12,
  },
  lyricsWrap: {
    paddingTop: 40,
    paddingHorizontal: 28,
    paddingBottom: 20,
    gap: 4,
  },
  waitingText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingState: {
    alignItems: 'center',
    marginTop: 54,
    gap: 12,
  },
  loadingPill: {
    width: 190,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  loadingPillShort: {
    width: 128,
    backgroundColor: 'rgba(139,124,246,0.2)',
  },
  linePressable: {
    paddingVertical: 10,
  },
  lineText: {
    color: colors.text,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'left',
  },
  contextCard: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    backgroundColor: 'rgba(90,55,180,0.18)',
    overflow: 'hidden',
  },
  contextTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.violetEdge,
    flexWrap: 'wrap',
  },
  contextTab: {
    flexGrow: 1,
    minWidth: '20%',
    paddingVertical: 9,
    alignItems: 'center',
  },
  contextTabActive: {
    backgroundColor: 'rgba(139,124,246,0.22)',
  },
  contextTabText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  contextTabTextActive: {
    color: colors.violetSoft,
  },
  contextBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    padding: 12,
  },
  contextPreview: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    backgroundColor: 'rgba(90,55,180,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  contextPreviewBody: {
    flex: 1,
    gap: 6,
  },
  contextPreviewMeaning: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  contextVibeChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(139,124,246,0.22)',
    borderWidth: 1,
    borderColor: colors.violetEdge,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  contextVibeChipText: {
    color: colors.violetSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  contextPreviewCta: {
    color: colors.violetSoft,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footer: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(8,6,15,0.92)',
    gap: 2,
  },
  footerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  footerArtist: {
    color: colors.textMuted,
    fontSize: 13,
  },
  bottomSpacer: {
    height: 200,
  },
});
