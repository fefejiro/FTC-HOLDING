import React from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, spacing, typography, usesLargeTextLayout } from "../theme";

export type PrimaryTaskScreen = "home" | "messages" | "calendar" | "records" | "more";

const tasks: readonly { id: PrimaryTaskScreen; label: string; symbol: string }[] = [
  { id: "home", label: "Home", symbol: "⌂" },
  { id: "messages", label: "Messages", symbol: "✉" },
  { id: "calendar", label: "Calendar", symbol: "□" },
  { id: "records", label: "Records", symbol: "▤" },
  { id: "more", label: "More", symbol: "•••" }
];

export function TaskNavigation({
  active,
  onSelect
}: {
  active: PrimaryTaskScreen;
  onSelect: (screen: PrimaryTaskScreen) => void;
}) {
  const largeText = usesLargeTextLayout(useWindowDimensions().fontScale);

  return (
    <View accessibilityLabel="Primary navigation" style={[styles.bar, largeText ? styles.barLargeText : null]}>
      {tasks.map((task) => {
        const selected = task.id === active;
        return (
          <Pressable
            accessibilityLabel={task.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={task.id}
            onPress={() => onSelect(task.id)}
            style={({ pressed }) => [styles.item, largeText ? styles.itemLargeText : null, pressed ? styles.pressed : null]}
          >
            <Text style={[styles.symbol, selected ? styles.selected : null]}>{task.symbol}</Text>
            <Text style={[styles.label, selected ? styles.selected : null]} numberOfLines={largeText ? 2 : 1}>{task.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm
  },
  barLargeText: { paddingTop: spacing.md },
  item: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    minHeight: 48,
    justifyContent: "center"
  },
  itemLargeText: { minHeight: 68 },
  pressed: { opacity: 0.65 },
  symbol: { color: colors.muted, fontSize: 20, fontWeight: "800" },
  label: { ...typography.caption, color: colors.muted, fontSize: 10, fontWeight: "700" },
  selected: { color: colors.brand }
});
