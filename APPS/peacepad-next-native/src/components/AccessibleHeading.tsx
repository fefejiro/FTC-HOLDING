import React, { type ReactNode } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

export function AccessibleHeading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text accessibilityRole="header" style={style}>{children}</Text>;
}

