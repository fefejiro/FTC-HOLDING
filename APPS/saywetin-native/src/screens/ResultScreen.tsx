import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MatchSource, RitualTrack } from '../state/ritual-state';
import { ritualTokens } from '../theme/tokens';
import { FadeInView } from '../components/FadeInView';

const { colors } = ritualTokens;

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
  onFollowLiveLyrics: () => void;
};

export function ResultScreen({ track, onReset, onFollowLiveLyrics }: ResultScreenProps) {
  const openLink = async (url: string, fallbackQuery: string, platformName: 'Spotify' | 'YouTube') => {
    const trimmedUrl = url.trim();
    const fallbackUrl =
      platformName === 'Spotify'
        ? `https://open.spotify.com/search/${encodeURIComponent(fallbackQuery)}`
        : `https://www.youtube.com/results?search_query=${encodeURIComponent(fallbackQuery)}`;

    try {
      const canOpenPrimary = await Linking.canOpenURL(trimmedUrl);
      if (canOpenPrimary) {
        await Linking.openURL(trimmedUrl);
        return;
      }

      const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
      if (canOpenFallback) {
        await Linking.openURL(fallbackUrl);
        return;
      }

      Alert.alert('Link unavailable', `Could not open ${platformName} right now.`);
    } catch {
      Alert.alert('Link unavailable', `Could not open ${platformName}. Please try again.`);
    }
  };

  return (
    <FadeInView>
      <View style={styles.screen}>
        <View style={styles.ambientGlow} />

        <View style={styles.headerRow}>
          <Text style={styles.headerMeta}>Matched in {track.matchedInMs}ms</Text>
          <Pressable onPress={onReset} style={styles.closeButton}>
            <Text style={styles.closeText}>x</Text>
          </Pressable>
        </View>

        <View style={styles.matchSourceBadge}>
          <Text style={styles.matchSourceText}>{MATCH_SOURCE_LABELS[track.matchSource]}</Text>
        </View>

        <View style={styles.coverWrap}>
          <View style={styles.coverGlow} />
          {track.albumArt ? (
            <Image source={{ uri: track.albumArt }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={styles.cover}>
              <Text style={styles.coverText}>Album Art</Text>
            </View>
          )}
          <View style={styles.chipMatch}>
            <Text style={styles.chipMatchText}>{track.matchConfidence}% match</Text>
          </View>
        </View>

        <Text style={styles.title}>{track.title}</Text>
        <Text style={styles.subTitle}>
          {track.artist} · {track.year}
        </Text>

        <View style={styles.lyricCard}>
          <Text style={styles.playingNow}>Playing now · 1:24</Text>
          <Text style={styles.lyricLine}>{track.lyric}</Text>
          <Text style={styles.meaningLine}>{track.meaning}</Text>
          <View style={styles.chipsRow}>
            {track.chips.map((chip) => (
              <View key={chip} style={styles.chipItem}>
                <Text style={styles.chipText}>{chip}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionRow}>
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

        <Pressable onPress={onFollowLiveLyrics} style={styles.primaryButtonFull}>
          <Text style={styles.primaryButtonText}>Follow live lyrics</Text>
        </Pressable>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerMeta: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'lowercase',
    letterSpacing: 0.6,
  },
  matchSourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.violetWash,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,198,255,0.35)',
  },
  matchSourceText: {
    color: colors.violetSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panelSoft,
  },
  closeText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  coverWrap: {
    alignSelf: 'center',
    width: 188,
    height: 188,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverGlow: {
    position: 'absolute',
    width: 188,
    height: 188,
    borderRadius: 32,
    backgroundColor: colors.violetWash,
  },
  cover: {
    width: 168,
    height: 168,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    backgroundColor: colors.panelSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverText: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  chipMatch: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    borderRadius: 999,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.mint,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipMatchText: {
    color: colors.mint,
    fontWeight: '700',
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    textAlign: 'center',
  },
  subTitle: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
  lyricCard: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    padding: 14,
    gap: 8,
  },
  playingNow: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'lowercase',
  },
  lyricLine: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
  },
  meaningLine: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  linkButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButtonFull: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 4,
  },
  primaryButtonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});