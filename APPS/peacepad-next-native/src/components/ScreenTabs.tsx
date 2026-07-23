import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme";
import type { LabScreen } from "../screens";

type Props = {
  active: LabScreen;
  onSelect: (screen: LabScreen) => void;
};

const tabs: Array<{ id: LabScreen; label: string }> = [
  { id: "home", label: "Premium" },
  { id: "onboarding", label: "Onboard" },
  { id: "compose", label: "Compose" },
  { id: "logs", label: "Logs" },
  { id: "vault", label: "Vault" },
  { id: "timeline", label: "Timeline" },
  { id: "export", label: "Export" }
];

export function ScreenTabs({ active, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => (
        <Pressable
          accessibilityRole="button"
          key={tab.id}
          onPress={() => onSelect(tab.id)}
          style={[styles.tab, active === tab.id ? styles.activeTab : null]}
        >
          <Text style={[styles.label, active === tab.id ? styles.activeLabel : null]}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  tab: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  activeTab: {
    backgroundColor: colors.brand,
    borderColor: colors.brand
  },
  label: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "700"
  },
  activeLabel: {
    color: colors.white
  }
});
