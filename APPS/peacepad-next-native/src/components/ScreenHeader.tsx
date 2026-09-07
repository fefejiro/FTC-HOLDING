import React from "react";
import { StyleSheet, Text, useWindowDimensions, View, type ColorValue } from "react-native";
import { AccessibleHeading } from "./AccessibleHeading";
import { PeacePadIcon, type PeacePadIconName } from "./PeacePadIcon";
import { colors, spacing, typography, usesLargeTextLayout } from "../theme";

export function ScreenHeader({ kicker, title, subtitle, icon = "sparkles-outline", accent = colors.brand, softBackground = colors.brandSoft }: { kicker: string; title: string; subtitle: string; icon?: PeacePadIconName; accent?: ColorValue; softBackground?: ColorValue }) {
  const { fontScale } = useWindowDimensions();
  const largeText = usesLargeTextLayout(fontScale);
  return (
    <View style={[styles.container, largeText ? styles.containerLargeText : null, { backgroundColor: softBackground }]}>
      <View style={[styles.iconTile, { backgroundColor: colors.surface }]}>
        <PeacePadIcon name={icon} size={25} color={accent} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.kicker, { color: accent }]}>{kicker.toUpperCase()}</Text>
        <AccessibleHeading style={styles.title}>{title}</AccessibleHeading>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", borderRadius: 26, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  containerLargeText: { alignItems: "flex-start", flexDirection: "column" },
  iconTile: { alignItems: "center", borderRadius: 18, height: 56, justifyContent: "center", width: 56 },
  copy: { flex: 1, gap: spacing.xs },
  kicker: { ...typography.caption, fontWeight: "900", letterSpacing: 1.1 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.muted },
});
