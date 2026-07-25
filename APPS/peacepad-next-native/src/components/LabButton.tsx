import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, spacing, typography } from "../theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
};

export function LabButton({ label, onPress, variant = "primary" }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.base,
        variant === "primary" ? styles.primary : styles.secondary,
        pressed ? styles.pressed : null
      ]}
    >
      <Text style={variant === "primary" ? styles.primaryText : styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  primary: {
    backgroundColor: colors.brand
  },
  secondary: {
    backgroundColor: colors.brandSoft
  },
  pressed: {
    opacity: 0.78
  },
  primaryText: {
    ...typography.subheading,
    color: colors.white
  },
  secondaryText: {
    ...typography.subheading,
    color: colors.brand
  }
});
