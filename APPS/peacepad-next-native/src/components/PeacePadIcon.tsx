import React, { type ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, type ColorValue } from "react-native";
import { colors } from "../theme";

export type PeacePadIconName = ComponentProps<typeof Ionicons>["name"];

export function PeacePadIcon({ name, size = 22, color = colors.brand }: { name: PeacePadIconName; size?: number; color?: ColorValue }) {
  return <Ionicons accessibilityElementsHidden name={name} size={size} color={color} importantForAccessibility="no" />;
}

export function PeacePadIconTile({ name, backgroundColor, color = colors.brand, size = 22 }: { name: PeacePadIconName; backgroundColor: ColorValue; color?: ColorValue; size?: number }) {
  return (
    <PeacePadIconTileView style={{ backgroundColor }}>
      <PeacePadIcon name={name} size={size} color={color} />
    </PeacePadIconTileView>
  );
}

function PeacePadIconTileView({ children, style }: { children: React.ReactNode; style: { backgroundColor: ColorValue } }) {
  return <View accessibilityElementsHidden style={[styles.tile, style]}>{children}</View>;
}

const styles = {
  tile: { alignItems: "center" as const, borderRadius: 18, height: 56, justifyContent: "center" as const, width: 56 },
};
