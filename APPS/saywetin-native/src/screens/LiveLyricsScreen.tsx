import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchLineExplain, fetchSyncedLyrics, postSignal } from '../api/live-lyrics';
import { TapExplainSheet } from '../components/TapExplainSheet';
import type { RitualTrack, SyncedLyricLine } from '../state/ritual-state';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;

type LiveLyricsScreenProps = {
  track: RitualTrack;
  onBack: () => void;
};

export function LiveLyricsScreen({ track, onBack }: LiveLyricsScreenProps) {
  const [lyrics, setLyrics] = useState<SyncedLyricLine[]>(track.syncedLyrics);
  const [positionMs, setPositionMs] = useState(0);
  const [syncWarn, setSyncWarn] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<SyncedLyricLine | null>(null);
  const [lineMeaningCache, setLineMeaningCache] = useState<Record<string, SyncedLyricLine>>({});
  const startedAtRef = useRef(Date.now());
  const driftSinceMs = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const loaded = await fetchSyncedLyrics(track.id);
      if (!mounted) {
        return;
      }

      if (loaded && loaded.length > 0) {
        setLyrics(loaded);
        setFallbackReason(null);
        return;
      }

      const fallbackLineText = (track.lyric || '').trim() || 'No synced lyric line available yet.';
      setLyrics([
        {
          id: `${track.id}-fallback-line`,
          text: fallbackLineText,
          startMs: 0,
          endMs: 12000,
          tappable: true,
          meaning:
            (track.meaning || '').trim() ||
            'Meaning will improve as more lyric data is processed for this track.',
          alternates: [],
          related: [],
        },
      ]);
      setFallbackReason('nolyrics');
      void postSignal('fallback', track.id, undefined, 'nolyrics');
    })();

    return () => {
      mounted = false;
    };
  }, [track.id]);

  useEffect(() => {
    let frame = 0;

    const tick = () => {
      const elapsed = Date.now() - startedAtRef.current;
      setPositionMs(elapsed);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    return () => {
      void postSignal('exit', track.id);
    };
  }, [track.id]);

  const currentLineIndex = useMemo(() => {
    if (lyrics.length === 0) {
      return 0;
    }

    const matchIndex = lyrics.findIndex(
      (line) => line.startMs <= positionMs && positionMs < line.endMs,
    );

    if (matchIndex >= 0) {
      return matchIndex;
    }

    return 0;
  }, [lyrics, positionMs]);

  useEffect(() => {
    if (lyrics.length === 0) {
      return;
    }

    const hasMatch = lyrics.some((line) => line.startMs <= positionMs && positionMs < line.endMs);

    if (hasMatch) {
      driftSinceMs.current = null;
      setSyncWarn(false);
      return;
    }

    if (driftSinceMs.current === null) {
      driftSinceMs.current = Date.now();
      return;
    }

    if (Date.now() - driftSinceMs.current > 1500) {
      setSyncWarn(true);
    }
  }, [lyrics, positionMs]);

  const activeLine = useMemo(() => lyrics[currentLineIndex], [lyrics, currentLineIndex]);

  const hydrateLineMeaning = async (line: SyncedLyricLine) => {
    const cached = lineMeaningCache[line.id];
    if (cached?.meaning) {
      return cached;
    }

    const explain = await fetchLineExplain(track.id, line, positionMs);
    if (!explain) {
      return line;
    }

    const merged = {
      ...line,
      meaning: explain.meaning || line.meaning,
      alternates: explain.alternates.length > 0 ? explain.alternates : line.alternates,
      related: explain.related.length > 0 ? explain.related : line.related,
    };

    setLineMeaningCache((current) => ({
      ...current,
      [line.id]: merged,
    }));

    return merged;
  };

  const prefetchNearby = async (centerIndex: number) => {
    const candidates = [centerIndex - 2, centerIndex - 1, centerIndex, centerIndex + 1, centerIndex + 2]
      .filter((position) => position >= 0 && position < lyrics.length)
      .map((position) => lyrics[position]);

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

  const onResync = () => {
    startedAtRef.current = Date.now();
    setPositionMs(0);
    setSyncWarn(false);
    driftSinceMs.current = null;
    void postSignal('resync', track.id);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Live Lyrics</Text>
        <Pressable onPress={onBack} style={styles.headerClose}>
          <Text style={styles.headerCloseText}>Done</Text>
        </Pressable>
      </View>

      {fallbackReason ? (
        <View style={styles.syncWarnRow}>
          <Text style={styles.syncWarn}>Synced lyrics are not ready yet. We are showing the best available line now.</Text>
        </View>
      ) : null}

      {syncWarn ? (
        <View style={styles.syncWarnRow}>
          <Text style={styles.syncWarn}>Sync may be slightly off. We are following, but not fully sure.</Text>
          <Pressable onPress={onResync} style={styles.resyncButton}>
            <Text style={styles.resyncButtonText}>Re-sync</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.lyricsWrap}>
        {lyrics.map((line, index) => {
          const active = index === currentLineIndex;
          return (
            <Pressable key={line.id} onPress={() => openExplain(line, index)} style={styles.linePressable}>
              <View style={[styles.dot, active ? styles.dotActive : null]} />
              <View style={[styles.lineCard, active ? styles.lineCardActive : null]}>
                <Text style={[styles.lineText, active ? styles.lineTextActive : null]}>{line.text}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footerMeta}>
        <Text style={styles.footerMetaText}>Current line:</Text>
        <Text style={styles.footerMetaStrong}>{activeLine?.text ?? 'Waiting for lyrics...'}</Text>
      </View>

      <TapExplainSheet
        visible={Boolean(selectedLine)}
        line={selectedLine}
        onClose={() => setSelectedLine(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 22,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
  },
  headerClose: {
    borderRadius: 999,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerCloseText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  syncWarn: {
    color: colors.amber,
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.amber,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  syncWarnRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  resyncButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.amber,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.panelSoft,
  },
  resyncButtonText: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
  },
  lyricsWrap: {
    gap: 10,
    paddingBottom: 12,
  },
  linePressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.violetDim,
  },
  dotActive: {
    backgroundColor: colors.violetSoft,
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  lineCard: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    borderRadius: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  lineCardActive: {
    borderLeftColor: colors.violet,
    borderColor: colors.violetEdge,
  },
  lineText: {
    color: colors.textMuted,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
  },
  lineTextActive: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
  },
  footerMeta: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    padding: 10,
    gap: 4,
  },
  footerMetaText: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  footerMetaStrong: {
    color: colors.text,
    fontSize: 14,
  },
});
