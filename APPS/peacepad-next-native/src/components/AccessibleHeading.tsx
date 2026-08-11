import React, { type ReactNode } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

type Props = {
  children: ReactNode;
  maxFontSizeMultiplier?: number;
  style?: StyleProp<TextStyle>;
};

export function AccessibleHeading({ children, maxFontSizeMultiplier, style }: Props) {
  return <Text accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier} style={style}>{children}</Text>;
}
