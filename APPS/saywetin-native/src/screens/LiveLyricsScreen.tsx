import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const [positionMs, setPositionMs] = useState(track.matchedInMs ?? 0);
  const [syncWarn, setSyncWarn] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<SyncedLyricLine | null>(null);
  const [contextTab, setContextTab] = useState<'meaning' | 'alternates' | 'related'>('meaning');
  const [lineMeaningCache, setLineMeaningCache] = useState<Record<string, SyncedLyricLine>>({});
  const startedAtRef = useRef(Date.now());
  const startOffsetMs = useRef(track.matchedInMs ?? 0);
  const driftSinceMs = useRef<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lineHeights = useRef<Record<number, number>>({});

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const loaded = await fetchSyncedLyrics(track.id);
      if (!mounted) {
        return;
      }

      if (loaded && loaded.lines.length > 0) {
        setLyrics(loaded.lines);
        setFallbackReason(null);
        return;
      }

      // Prevent flash from index 0 if timing/target is unresolved
      setLyrics([]);
      setFallbackReason('notiming');
    })();

    return () => {
      mounted = false;
    };
  }, [track.id]);

  useEffect(() => {
    let frame = 0;

    const tick = () => {
      const elapsed = Date.now() - startedAtRef.current;
      setPositionMs(startOffsetMs.current + elapsed);
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

    return matchIndex >= 0 ? matchIndex : 0;
  }, [lyrics, positionMs]);

  const activeLine = lyrics[currentLineIndex] ?? null;

  // Auto-scroll to keep active line roughly centered
  useEffect(() => {
    if (!scrollRef.current || currentLineIndex <= 0) return;
    let offset = 0;
    for (let i = 0; i < currentLineIndex; i++) {
      offset += lineHeights.current[i] ?? 80;
    }
    offset = Math.max(0, offset - 160);
    scrollRef.current.scrollTo({ y: offset, animated: true });
  }, [currentLineIndex]);

  const prefetchNearby = async (centerIndex: number) => {
    const candidates = [centerIndex - 2, centerIndex - 1, centerIndex, centerIndex + 1, centerIndex + 2]
      .filter((position) => position >= 0 && position < lyrics.length)
      .map((position) => lyrics[position]);

    await Promise.all(candidates.map((candidate) => hydrateLineMeaning(candidate)));
  };

  const hydrateLineMeaning = async (line: SyncedLyricLine): Promise<SyncedLyricLine> => {
    if (lineMeaningCache[line.id]) {
      return lineMeaningCache[line.id];
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
    startOffsetMs.current = 0;
    setPositionMs(0);
    setSyncWarn(false);
    driftSinceMs.current = null;
    void postSignal('resync', track.id);
  };

  const inlineIndicator = fallbackReason
    ? 'Synced lyrics are not ready yet. Showing best available line.'
    : syncWarn
      ? 'Timing drift detected. Tap Re-sync if lines feel off.'
      : null;

  return (
    <View style={styles.screen}>
      {/* Ambient glow behind active area */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* Top controls */}
      <View style={styles.topRow}>
        {syncWarn ? (
          <Pressable onPress={onResync} style={styles.resyncButton}>
            <Text style={styles.resyncButtonText}>Re-sync</Text>
          </Pressable>
        ) : (
          <View style={styles.topSpacer} />
        )}
        <Pressable onPress={onBack} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      </View>

      {fallbackReason ? (
        <View style={styles.syncNotice}>
          <Text style={styles.syncNoticeText}>Synced lyrics are not ready yet — showing best available.</Text>
        </View>
      ) : null}

      {/* Immersive lyric scroll */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.lyricsWrap}
        showsVerticalScrollIndicator={false}
      >
        {lyrics.length === 0 ? (
          <Text style={styles.waitingText}>Waiting for lyrics…</Text>
        ) : null}
        {lyrics.map((line, index) => {
          const active = index === currentLineIndex;
          const distance = Math.abs(index - currentLineIndex);
          const opacity = active ? 1 : distance === 1 ? 0.45 : distance === 2 ? 0.22 : 0.12;
          const fontSize = active ? 30 : distance === 1 ? 20 : 16;
          return (
            <Pressable
              key={line.id}
              onPress={() => { openExplain(line, index); setContextTab('meaning'); }}
              onLayout={(e) => { lineHeights.current[index] = e.nativeEvent.layout.height; }}
              style={styles.linePressable}
            >
              <Text
                style={[styles.lineText, { opacity, fontSize, lineHeight: fontSize * 1.35 }]}
              >
                {line.text}
              </Text>
              {/* Inline context card for active line */}
              {active && activeLine?.meaning ? (
                <View style={styles.contextCard}>
                  <View style={styles.contextTabRow}>
                    {(['meaning', 'alternates', 'related'] as const).map((t) => (
                      <Pressable
                        key={t}
                        style={[styles.contextTab, contextTab === t && styles.contextTabActive]}
                        onPress={() => setContextTab(t)}
                      >
                        <Text style={[styles.contextTabText, contextTab === t && styles.contextTabTextActive]}>
                          {t === 'meaning' ? 'Meaning' : t === 'alternates' ? 'Slang' : 'Culture'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.contextBody}>
                    {contextTab === 'meaning'
                      ? activeLine.meaning
                      : contextTab === 'alternates'
                        ? (activeLine.alternates.length > 0 ? activeLine.alternates.join(' · ') : 'No slang notes yet.')
                        : (activeLine.related.length > 0 ? activeLine.related.join(' · ') : 'No cultural notes yet.')}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
        {/* Bottom padding so last line can scroll to center */}
        <View style={{ height: 200 }} />
      </ScrollView>

      {/* Footer: song meta */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.footerArtist} numberOfLines={1}>{track.artist}</Text>
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
    backgroundColor: '#08060F',
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
  },
  topSpacer: { width: 60 },
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
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  linePressable: {
    paddingVertical: 10,
  },
  lineText: {
    color: colors.text,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
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
  },
  contextTab: {
    flex: 1,
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
});
