import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RitualTrack } from '../state/ritual-state';
import { ritualTokens } from '../theme/tokens';
import { shellCardStyles } from '../components/ShellCard';
import { FadeInView } from '../components/FadeInView';

const { colors } = ritualTokens;

export function ResultScreen({ track, onReset }: { track: RitualTrack; onReset: () => void }) {
  return (
    <FadeInView>
    <View style={shellCardStyles.card}>
      <Text style={shellCardStyles.eyebrow}>Result</Text>
      <Text style={shellCardStyles.title}>{track.title}</Text>
      <Text style={styles.subTitle}>{track.artist}</Text>
      <Text style={styles.resultLabel}>Lyric</Text>
      <Text style={shellCardStyles.body}>{track.lyric}</Text>
      <Text style={styles.resultLabel}>Meaning</Text>
      <Text style={shellCardStyles.body}>{track.meaning}</Text>
      <View style={styles.actionRow}>
        <Pressable onPress={onReset} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Reset ritual</Text>
        </Pressable>
        <Pressable onPress={onReset} style={styles.primaryButtonCompact}>
          <Text style={shellCardStyles.primaryButtonText}>Follow live lyrics</Text>
        </Pressable>
      </View>
    </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  subTitle: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '600',
    marginTop: -4,
  },
  resultLabel: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButtonCompact: {
    flex: 1,
    backgroundColor: colors.violet,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});