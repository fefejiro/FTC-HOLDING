import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;

type ShellCardProps = {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  onPress: () => void;
};

export function ShellCard({ eyebrow, title, body, ctaLabel, onPress }: ShellCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable onPress={onPress} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

export const shellCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  eyebrow: {
    color: colors.violetSoft,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
  },
  body: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: colors.violet,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});

const styles = shellCardStyles;