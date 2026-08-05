import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { TimelineItem } from "../data/mockPeacePad";
import { colors, spacing, typography } from "../theme";

type Props = {
  item: TimelineItem;
};

export function TimelineItemCard({ item }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.type}>{item.type}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.detail}>{item.detail}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{item.sourceCount} source item{item.sourceCount === 1 ? "" : "s"}</Text>
        <Text style={styles.meta}>{item.safetyLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderLeftColor: colors.accent,
    borderLeftWidth: 5,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.sm
  },
  type: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    ...typography.subheading,
    color: colors.text
  },
  detail: {
    ...typography.body,
    color: colors.muted
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  meta: {
    ...typography.caption,
    backgroundColor: colors.subtleSurface,
    borderRadius: 999,
    color: colors.muted,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  }
});

