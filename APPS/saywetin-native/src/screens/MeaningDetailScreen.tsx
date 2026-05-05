import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SyncedLyricLine } from '../state/ritual-state';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;

type MeaningDetailBodyProps = {
  line: SyncedLyricLine;
};

export function MeaningDetailBody({ line }: MeaningDetailBodyProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Meaning</Text>
      <Text style={styles.bodyText}>{line.meaning}</Text>

      <Pressable onPress={() => setExpanded((value) => !value)} style={styles.moreButton}>
        <Text style={styles.moreButtonText}>{expanded ? 'Hide context' : 'More context'}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.contextPanel}>
          <Text style={styles.contextTitle}>Story</Text>
          <Text style={styles.contextText}>
            The line sits inside a confidence arc that projects motion and control.
          </Text>
          <Text style={styles.contextTitle}>Artist Intent</Text>
          <Text style={styles.contextText}>
            Delivery is direct on purpose. The artist signals certainty over hesitation.
          </Text>
          <Text style={styles.contextTitle}>Language Note</Text>
          <Text style={styles.contextText}>
            Pidgin compression keeps rhythm tight while preserving layered meaning.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type MeaningDetailScreenProps = {
  line: SyncedLyricLine;
};

export function MeaningDetailScreen({ line }: MeaningDetailScreenProps) {
  return (
    <View style={styles.screen}>
      <MeaningDetailBody line={line} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
  },
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  heading: {
    color: colors.violetSoft,
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  bodyText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  moreButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  moreButtonText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
  contextPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 6,
  },
  contextTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  contextText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
