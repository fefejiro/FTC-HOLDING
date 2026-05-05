import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SyncedLyricLine } from '../state/ritual-state';
import { ritualTokens } from '../theme/tokens';
import { MeaningDetailBody } from '../screens/MeaningDetailScreen';

const { colors } = ritualTokens;

type TabKey = 'meaning' | 'alternates' | 'related';

type TapExplainSheetProps = {
  visible: boolean;
  line: SyncedLyricLine | null;
  loading?: boolean;
  onClose: () => void;
};

export function TapExplainSheet({ visible, line, loading = false, onClose }: TapExplainSheetProps) {
  const [tab, setTab] = useState<TabKey>('meaning');

  useEffect(() => {
    setTab('meaning');
  }, [line?.id]);

  const tabLines = useMemo(() => {
    if (!line) {
      return [];
    }

    if (tab === 'alternates') {
      return line.alternates;
    }

    if (tab === 'related') {
      return line.related;
    }

    return [];
  }, [line, tab]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.grab} />
          <Text style={styles.sheetTitle}>Tap Explain</Text>
          <Text style={styles.sheetSubtitle}>{line?.text ?? 'No lyric selected'}</Text>

          <View style={styles.tabRow}>
            <TabButton label="Meaning" active={tab === 'meaning'} onPress={() => setTab('meaning')} />
            <TabButton
              label="Alternates"
              active={tab === 'alternates'}
              onPress={() => setTab('alternates')}
            />
            <TabButton label="Related" active={tab === 'related'} onPress={() => setTab('related')} />
          </View>

          {line ? (
            tab === 'meaning' ? (
              <MeaningDetailBody line={line} />
            ) : (
              <View style={styles.listWrap}>
                {loading ? (
                  <View style={styles.loadingState}>
                    <ActivityIndicator color={colors.violetSoft} size="small" />
                    <Text style={styles.emptyText}>Loading context…</Text>
                  </View>
                ) : tabLines.length === 0 ? (
                  <Text style={styles.emptyText}>No entries yet for this section.</Text>
                ) : (
                  tabLines.map((item) => (
                    <View key={item} style={styles.listItem}>
                      <View style={styles.dot} />
                      <Text style={styles.listText}>{item}</Text>
                    </View>
                  ))
                )}
              </View>
            )
          ) : (
            <Text style={styles.emptyText}>Pick a lyric line to see context.</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type TabButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function TabButton({ label, active, onPress }: TabButtonProps) {
  return (
    <Pressable style={[styles.tabButton, active ? styles.tabButtonActive : null]} onPress={onPress}>
      <Text style={[styles.tabButtonText, active ? styles.tabButtonTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    minHeight: '90%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    gap: 12,
  },
  grab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    paddingVertical: 10,
  },
  tabButtonActive: {
    borderColor: colors.violetSoft,
    backgroundColor: colors.violetWash,
  },
  tabButtonText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
  },
  tabButtonTextActive: {
    color: colors.text,
  },
  listWrap: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.violetSoft,
  },
  listText: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
