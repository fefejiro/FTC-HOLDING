import React from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useLocalization, type MessageKey } from "../localization/LocalizationProvider";
import { colors, spacing, typography, usesLargeTextLayout } from "../theme";

export type PrimaryTaskScreen = "home" | "messages" | "calendar" | "records" | "more";

const tasks: readonly { id: PrimaryTaskScreen; labelKey: MessageKey; symbol: string }[] = [
  { id: "home", labelKey: "navigation.home", symbol: "⌂" },
  { id: "messages", labelKey: "navigation.messages", symbol: "✉" },
  { id: "calendar", labelKey: "navigation.calendar", symbol: "□" },
  { id: "records", labelKey: "navigation.records", symbol: "▤" },
  { id: "more", labelKey: "navigation.more", symbol: "•••" }
];

export function TaskNavigation({ active, onSelect }: { active: PrimaryTaskScreen; onSelect: (screen: PrimaryTaskScreen) => void }) {
  const largeText = usesLargeTextLayout(useWindowDimensions().fontScale);
  const { t } = useLocalization();
  return (
    <View accessibilityLabel={t("navigation.primary")} accessibilityRole="tablist" style={[styles.bar, largeText ? styles.barLargeText : null]}>
      {tasks.map((task) => {
        const selected = task.id === active;
        const label = t(task.labelKey);
        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={task.id}
            onPress={() => onSelect(task.id)}
            style={({ pressed }) => [styles.item, largeText ? styles.itemLargeText : null, pressed ? styles.pressed : null]}
          >
            <Text accessible={false} style={[styles.symbol, selected ? styles.selected : null]}>{task.symbol}</Text>
            <Text accessible={false} style={[styles.label, selected ? styles.selected : null]} numberOfLines={largeText ? 2 : 1}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { alignItems: "center", backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-around", paddingBottom: spacing.sm, paddingHorizontal: spacing.xs, paddingTop: spacing.sm },
  barLargeText: { paddingTop: spacing.md },
  item: { alignItems: "center", flex: 1, gap: 2, minHeight: 48, justifyContent: "center" },
  itemLargeText: { minHeight: 68 },
  pressed: { opacity: 0.65 },
  symbol: { color: colors.muted, fontSize: 20, fontWeight: "800" },
  label: { ...typography.caption, color: colors.muted, fontSize: 10, fontWeight: "700" },
  selected: { color: colors.brand }
});
