import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MatchSource, RitualTrack } from '../state/ritual-state';
import { FadeInView } from '../components/FadeInView';
import { ritualTokens } from '../theme/tokens';

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

  const inlineLyrics = (track.lyric || '').trim();

  return (
    <FadeInView>
      <View style={styles.screen}>
        <View style={styles.ambientGlow} />

        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>{track.title}</Text>
          <Text style={styles.artist}>{track.artist}</Text>

          <View style={styles.badgesRow}>
            <Text style={styles.badge}>{MATCH_SOURCE_LABELS[track.matchSource]}</Text>
            {track.matchedInMs > 0 ? (
              <Text style={styles.badge}>matched in {(track.matchedInMs / 1000).toFixed(1)}s</Text>
            ) : null}
          </View>

          {track.albumArt ? <Image source={{ uri: track.albumArt }} style={styles.cover} /> : null}

          <View style={styles.lyricCard}>
            {inlineLyrics ? (
              <Text style={styles.lyricText}>{inlineLyrics}</Text>
            ) : (
              <Text style={styles.lyricHint}>Lyrics are not available for this track yet.</Text>
            )}
            {track.meaning ? <Text style={styles.meaningText}>{track.meaning}</Text> : null}
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
            <Pressable onPress={onFollowLiveLyrics} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Follow Live Lyrics</Text>
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
  meaningText: {
    color: colors.amber,
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
