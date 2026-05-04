import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { FadeInView } from '../components/FadeInView';
import { BrandOrb } from '../components/BrandOrb';
import { ritualTokens } from '../theme/tokens';
import { explainSlang, type SlangExplanation } from '../api/slang';
import { identifyByText, uploadListenSample } from '../api/listen';
import { analyzeLyricLine } from '../api/cultural-analysis';
import { useAudioSession } from '../audio/useAudioSession';
import { useAudioRoute, type InputRoute } from '../audio/useAudioRoute';
import type { RitualStackParamList } from '../navigation/RitualNavigator';
import type { CulturalAnalysisEntry, RitualController, RitualTrack, SyncedLyricLine } from '../state/ritual-state';

const { colors } = ritualTokens;

const CAPTURE_DURATION_MS = 5000;
type Phase = 'idle' | 'listening' | 'matching' | 'result';

function inferInputRoute(nameOrType: string): InputRoute {
  const sample = nameOrType.toLowerCase();
  if (sample.includes('bluetooth') || sample.includes('bt') || sample.includes('sco') || sample.includes('ble') || sample.includes('airpods')) return 'bluetooth_mic';
  if (sample.includes('wired') || sample.includes('headset') || sample.includes('headphone') || sample.includes('usb')) return 'wired_mic';
  if (sample.includes('built-in') || sample.includes('builtin') || sample.includes('internal') || sample.includes('mic')) return 'built_in_mic';
  return 'unknown';
}

function scoreRecorderInput(name: string, type: string) {
  const sample = `${name} ${type}`.toLowerCase();
  // Built-in mic is best for ambient music capture — positioned to hear room audio.
  // BT mic is a headset mic near the mouth — worst for recognizing playback.
  if (sample.includes('built-in') || sample.includes('builtin') || sample.includes('internal') || sample.includes('mic')) return 3;
  if (sample.includes('wired') || sample.includes('headset') || sample.includes('headphone') || sample.includes('usb')) return 2;
  if (sample.includes('bluetooth') || sample.includes('bt') || sample.includes('sco') || sample.includes('ble') || sample.includes('airpods')) return 1;
  return 0;
}

export function HomeScreen({ ritual }: { ritual: RitualController }) {
  const navigation = useNavigation<NativeStackNavigationProp<RitualStackParamList>>();
  const [phrase, setPhrase] = useState('');
  const [searchMode, setSearchMode] = useState<'lyrics' | 'song' | 'artist' | 'slang' | 'vibe'>('lyrics');
  const [slangBusy, setSlangBusy] = useState(false);
  const [slangError, setSlangError] = useState<string | null>(null);
  const [slangResult, setSlangResult] = useState<SlangExplanation | null>(null);
  const [decodeOpen, setDecodeOpen] = useState(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [track, setTrack] = useState<RitualTrack | null>(null);
  const [bypassPrivateGuard, setBypassPrivateGuard] = useState(false);
  const stopCaptureRef = useRef<(() => void) | null>(null);
  const selectedInputRouteRef = useRef<InputRoute>('unknown');
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioRoute = useAudioRoute();
  useAudioSession();

  const [lineMeaning, setLineMeaning] = useState<{ line: string; entry: CulturalAnalysisEntry | null; loading: boolean; error: string | null } | null>(null);
  const [lineCache, setLineCache] = useState<Record<string, CulturalAnalysisEntry>>({});
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const playbackStartRef = useRef<number | null>(null);
  const lyricsScrollRef = useRef<ScrollView | null>(null);
  const lineYRef = useRef<Record<number, number>>({});

  const pulse = useRef(new Animated.Value(1)).current;
  // Shazam-style outward pulse rings — staggered launch for continuous wave feel.
  const PULSE_DELAYS = [0, 700, 1400, 2100, 2800];
  const pulses = useRef(PULSE_DELAYS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (phase === 'listening' || phase === 'matching') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.14, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(1);
  }, [phase, pulse]);

  // Shazam-style outward ring loops (always on, intensify when active).
  useEffect(() => {
    const loops = pulses.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(PULSE_DELAYS[i]),
          Animated.timing(v, {
            toValue: 1,
            duration: 3500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [pulses]);

  const decode = async () => {
    const trimmed = phrase.trim();
    if (trimmed.length < 2) {
      setSlangError('Type at least 2 characters.');
      return;
    }
    setSlangBusy(true);
    setSlangError(null);
    try {
      const explanation = await explainSlang(trimmed);
      setSlangResult(explanation);
    } catch (err: any) {
      setSlangError(err?.message || 'Could not decode that phrase.');
    } finally {
      setSlangBusy(false);
    }
  };

  const closeDecode = () => {
    setDecodeOpen(false);
    setSlangError(null);
  };

  const stopCaptureEarly = () => {
    if (stopCaptureRef.current) {
      stopCaptureRef.current();
      stopCaptureRef.current = null;
    }
  };

  const startListening = async (forceBypass = false) => {
    if (phase === 'listening') {
      stopCaptureEarly();
      return;
    }
    if (phase === 'matching') return;

    setErrorMessage(null);
    setTrack(null);
    const isPrivateRoute = audioRoute.isPrivateListening || audioRoute.outputRoute === 'bluetooth' || audioRoute.outputRoute === 'wired_headphones';
    if (isPrivateRoute && !forceBypass && !bypassPrivateGuard) {
      console.warn('[home-listen] advisory: private listening route detected', audioRoute);
      setErrorMessage('Headphones detected. The phone mic may not hear private playback. Switch to phone speaker for best results, or tap below to try anyway.');
      setPhase('idle');
      return;
    }
    if (isPrivateRoute) {
      setBypassPrivateGuard(true);
      console.log('[home-listen] proceeding with built-in mic bypass', audioRoute);
    }
    setPhase('listening');
    ritual.startListening();
    selectedInputRouteRef.current = 'unknown';
    console.log('[home-listen] audio route snapshot', audioRoute);

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission denied');
      }

      await audioRecorder.prepareToRecordAsync();

      try {
        const inputs = audioRecorder.getAvailableInputs();
        if (Array.isArray(inputs) && inputs.length > 0) {
          console.log('[home-listen] available inputs:', inputs.map((i) => ({ name: i.name, type: i.type, uid: i.uid })));
          const ranked = [...inputs].sort((a, b) => scoreRecorderInput(b.name, b.type) - scoreRecorderInput(a.name, a.type));
          const preferred = ranked[0];
          if (preferred?.uid && scoreRecorderInput(preferred.name, preferred.type) > 0) audioRecorder.setInput(preferred.uid);
          const sel = await audioRecorder.getCurrentInput();
          if (sel) {
            selectedInputRouteRef.current = inferInputRoute(`${sel.name} ${sel.type}`);
            console.log('[home-listen] selected input route:', sel.name, sel.type, selectedInputRouteRef.current);
          }
        }
      } catch (inputErr: any) {
        console.warn('[home-listen] input route selection failed:', inputErr?.message || String(inputErr));
      }

      await audioRecorder.record();

      await new Promise((resolve) => {
        const timer = setTimeout(resolve, CAPTURE_DURATION_MS);
        stopCaptureRef.current = () => {
          clearTimeout(timer);
          resolve(null);
        };
      });

      await audioRecorder.stop();
      const recordingUri = audioRecorder.uri;
      if (!recordingUri) throw new Error('No recording captured');

      setPhase('matching');
      const recognized = await uploadListenSample(recordingUri, CAPTURE_DURATION_MS);
      ritual.setRecognizedTrack(recognized);
      ritual.revealResult();
      setTrack(recognized);
      setPhase('result');
    } catch (err: any) {
      console.warn('[home-listen] failed:', err?.message);
      setErrorMessage(err?.message || 'Could not identify song. Try again.');
      setPhase('idle');
    } finally {
      stopCaptureRef.current = null;
    }
  };

  const lyricFallback = async () => {
    const trimmed = phrase.trim();
    if (trimmed.length < 3) {
      setSlangError('Type at least 3 characters of a lyric.');
      return;
    }
    setSlangBusy(true);
    try {
      const recognized = await identifyByText(trimmed);
      ritual.setRecognizedTrack(recognized);
      ritual.revealResult();
      setTrack(recognized);
      setPhase('result');
      closeDecode();
    } catch (err: any) {
      setSlangError(err?.message || 'No lyric match found.');
    } finally {
      setSlangBusy(false);
    }
  };

  const isUsableLink = (url?: string) => {
    if (!url) return false;
    const u = url.trim();
    if (!u) return false;
    // Filter out demo placeholders that point at a service homepage.
    if (/^https?:\/\/(open\.spotify\.com|www\.youtube\.com|youtube\.com)\/?$/i.test(u)) return false;
    return /^https?:\/\//i.test(u);
  };

  const openLink = async (url: string, label: string) => {
    if (!isUsableLink(url)) {
      Alert.alert('Link unavailable', `No ${label} link for this track yet.`);
      return;
    }
    try {
      // Prefer native app via deep link if we recognize the host.
      let deepLink: string | null = null;
      const trackMatch = url.match(/spotify\.com\/track\/([A-Za-z0-9]+)/i);
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
      if (trackMatch) deepLink = `spotify:track:${trackMatch[1]}`;
      else if (ytMatch) deepLink = `vnd.youtube://${ytMatch[1]}`;
      if (deepLink && (await Linking.canOpenURL(deepLink))) {
        await Linking.openURL(deepLink);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Link unavailable', `Could not open ${label}.`);
    }
  };

  const reset = () => {
    setTrack(null);
    setPhase('idle');
    setErrorMessage(null);
    setBypassPrivateGuard(false);
    ritual.reset();
  };

  const orbLabel =
    phase === 'listening' ? 'Listening…' :
    phase === 'matching' ? 'Identifying…' :
    phase === 'result' ? 'Tap S to listen again' :
    'Tap to SayWetin';

  // Prefer time-synced lines when the backend supplied them; fall back to plain text split.
  const synced: SyncedLyricLine[] = track?.syncedLyrics || [];
  const hasSynced = synced.length > 0;

  const lyricLines = useMemo<{ id: string; text: string; startMs: number; endMs: number }[]>(() => {
    if (hasSynced) {
      return synced.map((l, i) => ({
        id: l.id || `s-${i}`,
        text: l.text,
        startMs: l.startMs,
        endMs: l.endMs,
      }));
    }
    const text = (track?.lyric || '').trim();
    if (!text) return [];
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line, i) => ({ id: `t-${i}`, text: line, startMs: 0, endMs: 0 }));
  }, [hasSynced, synced, track?.lyric]);

  const meaningText = track?.meaning?.trim() || '';

  // Start playback clock when a result lands.
  useEffect(() => {
    if (phase === 'result' && track) {
      playbackStartRef.current = Date.now();
      setActiveLineIndex(0);
    } else {
      playbackStartRef.current = null;
    }
  }, [phase, track?.id]);

  // Drive active line based on elapsed time when we have synced lyrics.
  useEffect(() => {
    if (!hasSynced || phase !== 'result') return;
    const tick = () => {
      const start = playbackStartRef.current;
      if (!start) return;
      const elapsed = Date.now() - start;
      const idx = synced.findIndex((l) => elapsed >= l.startMs && elapsed < l.endMs);
      if (idx >= 0) setActiveLineIndex(idx);
    };
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [hasSynced, phase, synced]);

  // Auto-scroll to the active line.
  useEffect(() => {
    if (!hasSynced) return;
    const y = lineYRef.current[activeLineIndex];
    if (typeof y === 'number' && lyricsScrollRef.current) {
      lyricsScrollRef.current.scrollTo({ y: Math.max(0, y - 40), animated: true });
    }
  }, [activeLineIndex, hasSynced]);

  const fetchAndCacheLine = async (line: string) => {
    if (lineCache[line]) return lineCache[line];
    try {
      const entry = await analyzeLyricLine({
        lyricText: line,
        songTitle: track?.title,
        artistName: track?.artist,
      });
      setLineCache((c) => ({ ...c, [line]: entry }));
      return entry;
    } catch (err) {
      throw err;
    }
  };

  // Auto-prefetch translation for the active line + next 2 upcoming lines
  // so taps ahead feel instant.
  useEffect(() => {
    if (phase !== 'result') return;
    for (let offset = 0; offset <= 2; offset++) {
      const target = lyricLines[activeLineIndex + offset];
      if (!target?.text) continue;
      if (lineCache[target.text]) continue;
      void fetchAndCacheLine(target.text).catch(() => {});
    }
  }, [activeLineIndex, lyricLines, phase]);

  const onLineTap = async (line: string, _index: number) => {
    const cached = lineCache[line];
    if (cached) {
      setLineMeaning({ line, entry: cached, loading: false, error: null });
      return;
    }
    setLineMeaning({ line, entry: null, loading: true, error: null });
    try {
      const entry = await fetchAndCacheLine(line);
      setLineMeaning((current) =>
        current && current.line === line ? { line, entry, loading: false, error: null } : current,
      );
    } catch (err: any) {
      setLineMeaning((current) =>
        current && current.line === line
          ? { line, entry: null, loading: false, error: err?.message || 'Could not load meaning.' }
          : current,
      );
    }
  };

  return (
    <FadeInView>
      <View style={styles.screen}>
        <View style={styles.bgVignetteTop} pointerEvents="none" />
        <View style={styles.bgVignetteBottom} pointerEvents="none" />

        <View style={styles.centerStack}>
          <Text style={styles.tapTitle}>SayWetin</Text>
          <Text style={styles.tapSubtitle}>{orbLabel}</Text>

          <Pressable style={styles.orbTap} onPress={() => startListening()} disabled={phase === 'matching'}>
            {pulses.map((v, i) => (
              <Animated.View
                key={`pulse-${i}`}
                pointerEvents="none"
                style={[
                  styles.pulseRing,
                  {
                    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
                    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 2.4] }) }],
                  },
                ]}
              />
            ))}
            <Animated.View
              style={[
                styles.orbHeroWrap,
                { transform: [{ scale: pulse }] },
              ]}
            >
              <BrandOrb
                size={186}
                variant="hero"
                animated
                showGlow
                phase={phase === 'matching' ? 'matching' : phase === 'listening' ? 'listening' : 'idle'}
              />
            </Animated.View>
          </Pressable>

          {phase === 'idle' || phase === 'result' ? (
            <Pressable
              style={styles.searchPill}
              onPress={() => setDecodeOpen(true)}
              accessibilityLabel="Decode lyric or slang"
            >
              <Text style={styles.searchGlyph}>{'\u{1F50D}'}</Text>
            </Pressable>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBlock}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              {(audioRoute.outputRoute === 'bluetooth' || audioRoute.outputRoute === 'wired_headphones') && !bypassPrivateGuard ? (
                <Pressable style={styles.tryAnywayBtn} onPress={() => startListening(true)}>
                  <Text style={styles.tryAnywayText}>Try with phone mic</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {phase === 'result' && track ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              {track.albumArt ? (
                <Image source={{ uri: track.albumArt }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Text style={styles.coverPlaceholderText}>{track.title.slice(0, 1)}</Text>
                </View>
              )}
              <View style={styles.resultMeta}>
                <Text style={styles.resultTitle} numberOfLines={1}>{track.title}</Text>
                <Text style={styles.resultArtist} numberOfLines={1}>{track.artist}</Text>
                {track.matchConfidence > 0 ? (
                  <Text style={styles.resultConfidence}>{track.matchConfidence}% match</Text>
                ) : null}
              </View>
              <Pressable onPress={reset} style={styles.resultClose}>
                <Text style={styles.resultCloseText}>×</Text>
              </Pressable>
            </View>

            <ScrollView ref={lyricsScrollRef} style={styles.lyricsScroll} nestedScrollEnabled>
              {lyricLines.length > 0 ? (
                <>
                  <Text style={styles.tapHint}>
                    {hasSynced ? 'Live captions • tap any line for full context' : 'Tap any line to see the meaning'}
                  </Text>
                  {lyricLines.map((line, i) => {
                    const isActive = hasSynced && i === activeLineIndex;
                    const cached = lineCache[line.text];
                    return (
                      <Pressable
                        key={`${i}-${line.id}`}
                        onPress={() => onLineTap(line.text, i)}
                        onLayout={(e) => {
                          lineYRef.current[i] = e.nativeEvent.layout.y;
                        }}
                        style={({ pressed }) => [
                          styles.lyricLine,
                          isActive && styles.lyricLineActive,
                          pressed && styles.lyricLinePressed,
                        ]}
                      >
                        <Text style={[styles.lyricLineText, isActive && styles.lyricLineTextActive]}>
                          {line.text}
                        </Text>
                        {cached?.translation ? (
                          <Text style={styles.inlineTranslation}>{cached.translation}</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </>
              ) : (
                <Text style={styles.lyricsHint}>Lyrics syncing…</Text>
              )}
              {meaningText ? (
                <>
                  <Text style={styles.meaningLabel}>Overall meaning</Text>
                  <Text style={styles.meaningText}>{meaningText}</Text>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.actionRow}>
              {track.syncedLyrics.length > 0 ? (
                <Pressable onPress={() => navigation.navigate('LiveLyrics')} style={styles.liveLyricsButton}>
                  <Text style={styles.liveLyricsButtonText}>Live lyrics</Text>
                </Pressable>
              ) : null}
              {isUsableLink(track.spotifyUrl) ? (
                <Pressable onPress={() => openLink(track.spotifyUrl, 'Spotify')} style={styles.linkButton}>
                  <Text style={styles.linkButtonText}>Spotify</Text>
                </Pressable>
              ) : null}
              {isUsableLink(track.youtubeUrl) ? (
                <Pressable onPress={() => openLink(track.youtubeUrl, 'YouTube')} style={styles.linkButton}>
                  <Text style={styles.linkButtonText}>YouTube</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <Modal
          visible={!!lineMeaning}
          transparent
          animationType="fade"
          onRequestClose={() => setLineMeaning(null)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setLineMeaning(null)}>
            <Pressable style={styles.meaningSheet} onPress={() => undefined}>
              <View style={styles.sheetHandle} />
              {lineMeaning ? (
                <ScrollView>
                  <Text style={styles.meaningQuote}>“{lineMeaning.line}”</Text>
                  {lineMeaning.loading ? (
                    <Text style={styles.meaningBody}>Translating…</Text>
                  ) : null}
                  {lineMeaning.error ? (
                    <Text style={styles.errorText}>{lineMeaning.error}</Text>
                  ) : null}
                  {lineMeaning.entry?.translation ? (
                    <Text style={[styles.meaningBody, { fontWeight: '600' }]}>
                      {lineMeaning.entry.translation}
                    </Text>
                  ) : null}
                  {lineMeaning.entry?.culturalContext || lineMeaning.entry?.deeperMeaning ? (
                    <>
                      <Text style={styles.meaningLabel}>What it means</Text>
                      <Text style={styles.meaningBody}>
                        {[lineMeaning.entry?.culturalContext, lineMeaning.entry?.deeperMeaning]
                          .filter((s) => s && s.trim().length > 0)
                          .join(' ')}
                      </Text>
                    </>
                  ) : null}
                </ScrollView>
              ) : null}
              <Pressable onPress={() => setLineMeaning(null)} style={styles.meaningClose}>
                <Text style={styles.meaningCloseText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={decodeOpen} transparent animationType="slide" onRequestClose={closeDecode}>
          <Pressable style={styles.modalBackdrop} onPress={closeDecode}>
            <Pressable style={styles.modalSheet} onPress={() => undefined}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Wetin be this?</Text>
              <Text style={styles.sheetHint}>Decode pidgin/slang, or match a song from a lyric line.</Text>

              <View style={styles.chipRow}>
                {(['lyrics', 'song', 'artist', 'slang', 'vibe'] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    style={[styles.chip, searchMode === mode && styles.chipActive]}
                    onPress={() => setSearchMode(mode)}
                  >
                    <Text style={[styles.chipText, searchMode === mode && styles.chipTextActive]}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={phrase}
                onChangeText={setPhrase}
                placeholder={
                  searchMode === 'lyrics'
                    ? 'that Burna Boy destiny line…'
                    : searchMode === 'song'
                      ? 'Asake lonely at the top'
                      : searchMode === 'artist'
                        ? 'Afrobeats churchy street anthem'
                        : searchMode === 'slang'
                          ? "what does 'omo ope' mean?"
                          : 'confident confrontational street energy'
                }
                placeholderTextColor={colors.textMuted}
                style={styles.slangInput}
                multiline
                editable={!slangBusy}
                autoFocus
              />

              <View style={styles.sheetActions}>
                <Pressable onPress={closeDecode} style={styles.sheetCancel}>
                  <Text style={styles.sheetCancelText}>Close</Text>
                </Pressable>
                <Pressable onPress={lyricFallback} style={[styles.linkButton, slangBusy && styles.disabled]} disabled={slangBusy}>
                  <Text style={styles.linkButtonText}>Match song</Text>
                </Pressable>
                <Pressable onPress={decode} style={[styles.slangButton, slangBusy && styles.disabled]} disabled={slangBusy}>
                  <Text style={styles.slangButtonText}>{slangBusy ? '...' : 'Decode'}</Text>
                </Pressable>
                <Pressable onPress={lyricFallback} style={[styles.linkButton, slangBusy && styles.disabled]} disabled={slangBusy}>
                  <Text style={styles.linkButtonText}>Search lyrics</Text>
                </Pressable>
              </View>

              {slangError ? <Text style={styles.errorText}>{slangError}</Text> : null}

              {slangResult ? (
                <ScrollView style={styles.sheetScroll}>
                  <Text style={styles.slangResultLabel}>Literal</Text>
                  <Text style={styles.slangResultText}>{slangResult.literal}</Text>
                  <Text style={styles.slangResultLabel}>Cultural</Text>
                  <Text style={styles.slangResultText}>{slangResult.cultural}</Text>
                </ScrollView>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </FadeInView>
  );
}

const ORB_SIZE = 220;

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 8, backgroundColor: '#0A0812' },
  bgVignetteTop: {
    position: 'absolute',
    top: -120,
    left: -60,
    right: -60,
    height: 320,
    borderRadius: 280,
    backgroundColor: 'rgba(130,82,210,0.16)',
  },
  bgVignetteBottom: {
    position: 'absolute',
    bottom: -180,
    left: -80,
    right: -80,
    height: 360,
    borderRadius: 300,
    backgroundColor: 'rgba(78,44,150,0.12)',
  },
  centerStack: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  tapTitle: { color: colors.text, fontSize: 34, fontWeight: '700', letterSpacing: 0.4 },
  tapSubtitle: { color: colors.textMuted, fontSize: 14, fontWeight: '500', letterSpacing: 0.25, marginBottom: 8 },
  errorText: { marginTop: 10, color: colors.amber, fontSize: 13, textAlign: 'center', maxWidth: 320 },
  errorBlock: { marginTop: 10, alignItems: 'center', gap: 8, maxWidth: 320 },
  tryAnywayBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    backgroundColor: colors.violetWash,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  tryAnywayText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  orbTap: { width: ORB_SIZE + 60, height: ORB_SIZE + 60, justifyContent: 'center', alignItems: 'center' },

  orbHeroWrap: { justifyContent: 'center', alignItems: 'center' },
  pulseRing: {
    position: 'absolute', width: ORB_SIZE, height: ORB_SIZE, borderRadius: 999,
    borderWidth: 1.5, borderColor: 'rgba(207,198,255,0.38)',
  },

  searchPill: {
    width: 56, height: 56, borderRadius: 999,
    backgroundColor: colors.panelSoft, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  searchGlyph: { fontSize: 22, color: colors.text },

  resultCard: {
    position: 'absolute', left: 12, right: 12, bottom: 18,
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: 22, padding: 14, gap: 12, maxHeight: '62%',
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cover: { width: 60, height: 60, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  coverPlaceholderText: { color: colors.text, fontSize: 22, fontWeight: '700' },
  resultMeta: { flex: 1, gap: 2 },
  resultTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  resultArtist: { color: colors.textMuted, fontSize: 13 },
  resultConfidence: { color: colors.violetSoft, fontSize: 11, fontWeight: '700', marginTop: 2 },
  resultClose: { width: 32, height: 32, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
  resultCloseText: { color: colors.textMuted, fontSize: 22, lineHeight: 22 },
  lyricsScroll: { maxHeight: 240 },
  tapHint: {
    color: colors.violetSoft, fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: 6,
  },
  lyricLine: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginVertical: 1 },
  lyricLinePressed: { backgroundColor: 'rgba(160,140,255,0.18)' },
  lyricLineActive: {
    backgroundColor: 'rgba(160,140,255,0.22)',
    borderLeftWidth: 3,
    borderLeftColor: colors.violetSoft,
  },
  lyricLineText: { color: colors.text, fontSize: 14, lineHeight: 22 },
  lyricLineTextActive: { color: colors.text, fontWeight: '700' },
  inlineTranslation: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    fontStyle: 'italic',
  },
  lyricsHint: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  meaningLabel: {
    color: colors.violetSoft, fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    textTransform: 'uppercase', marginTop: 12,
  },
  meaningText: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 4 },
  meaningBody: { color: colors.text, fontSize: 14, lineHeight: 21, marginTop: 4 },
  meaningQuote: {
    color: colors.text, fontSize: 18, lineHeight: 26, fontStyle: 'italic',
    fontFamily: 'PlayfairDisplay_400Regular_Italic', marginTop: 6, marginBottom: 4,
  },

  actionRow: { flexDirection: 'row', gap: 10 },
  linkButton: {
    flex: 1, backgroundColor: colors.violet, borderRadius: 999,
    paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center',
  },
  linkButtonText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.6 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 18, paddingBottom: 28, gap: 10, maxHeight: '85%',
  },
  meaningSheet: {
    backgroundColor: colors.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 18, paddingBottom: 28, gap: 6, maxHeight: '80%',
  },
  meaningClose: {
    alignSelf: 'center', marginTop: 14,
    backgroundColor: colors.violet, borderRadius: 999,
    paddingVertical: 10, paddingHorizontal: 28,
  },
  meaningCloseText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  sheetHandle: {
    alignSelf: 'center', width: 44, height: 4, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 6,
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  sheetHint: { color: colors.textMuted, fontSize: 13 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipActive: {
    borderColor: colors.violet,
    backgroundColor: 'rgba(139,124,246,0.24)',
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.text,
  },
  slangInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12, color: colors.text, fontSize: 14,
    minHeight: 64, textAlignVertical: 'top',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetActions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  sheetCancel: { paddingVertical: 10, paddingHorizontal: 12 },
  sheetCancelText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  slangButton: {
    backgroundColor: colors.violet, borderRadius: 999,
    paddingVertical: 10, paddingHorizontal: 18,
  },
  slangButtonText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  liveLyricsButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  liveLyricsButtonText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  sheetScroll: { maxHeight: 220, marginTop: 6 },
  slangResultLabel: {
    color: colors.violetSoft, fontSize: 11, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 6,
  },
  slangResultText: { color: colors.text, fontSize: 14, lineHeight: 20 },
});
