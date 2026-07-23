import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { PremiumModule } from "../data/mockPeacePad";
import { colors, spacing, typography } from "../theme";

type Props = {
  module: PremiumModule;
};

export function ModuleCard({ module }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{module.title}</Text>
        <Text style={styles.badge}>{module.status}</Text>
      </View>
      <Text style={styles.promise}>{module.promise}</Text>
      <Text style={styles.testFocus}>Test: {module.testFocus}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.sm
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  title: {
    ...typography.subheading,
    color: colors.text,
    flex: 1
  },
  badge: {
    ...typography.caption,
    color: colors.brand,
    backgroundColor: colors.brandSoft,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    textTransform: "uppercase"
  },
  promise: {
    ...typography.body,
    color: colors.text
  },
  testFocus: {
    ...typography.caption,
    color: colors.muted
  }
});

