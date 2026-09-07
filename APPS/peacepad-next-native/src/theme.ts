import { DynamicColorIOS, Platform, type ColorValue } from "react-native";

export const lightColors = {
  background: "#FFF8F2",
  surface: "#FFFFFF",
  brand: "#6B4A86",
  brandSoft: "#F3E7F1",
  coral: "#F26B5E",
  sun: "#F7C948",
  aqua: "#2E9D91",
  cream: "#FFF1DF",
  accent: "#257A70",
  text: "#2B2038",
  muted: "#6E6374",
  border: "#E9D8D6",
  warning: "#8A4D00",
  onBrand: "#FFFFFF",
  subtleSurface: "#FFF0E9",
  successSurface: "#E9F9F4",
  successBorder: "#B8E8D9",
  successText: "#087A64",
  warningSurface: "#FFF7E8",
  warningBorder: "#F3D398",
  dangerSurface: "#FFF3F3",
  dangerBorder: "#E7A9A9",
  dangerText: "#8B2323",
  shadow: "#4A304F"
} as const;

type Palette = { [Token in keyof typeof lightColors]: string };

export const darkColors: Palette = {
  background: "#120D1B",
  surface: "#1E162A",
  brand: "#7B43C7",
  brandSoft: "#35244E",
  coral: "#FF8B7F",
  sun: "#F6D36A",
  aqua: "#63D6C8",
  cream: "#2A211D",
  accent: "#63D6BE",
  text: "#F8F3FF",
  muted: "#C8BCD4",
  border: "#493A5B",
  warning: "#FFC56D",
  onBrand: "#FFFFFF",
  subtleSurface: "#2B2038",
  successSurface: "#15382F",
  successBorder: "#286453",
  successText: "#7BE2CB",
  warningSurface: "#3A2B17",
  warningBorder: "#70552B",
  dangerSurface: "#3B1D24",
  dangerBorder: "#74404A",
  dangerText: "#FFB4BC",
  shadow: "#000000"
};

type ColorToken = keyof typeof lightColors;

function adaptiveColor(token: ColorToken): ColorValue {
  if (Platform.OS !== "ios") return lightColors[token];
  return DynamicColorIOS({ dark: darkColors[token], light: lightColors[token] });
}

export const colors: Record<ColorToken, ColorValue> = Object.fromEntries(
  (Object.keys(lightColors) as ColorToken[]).map((token) => [token, adaptiveColor(token)])
) as Record<ColorToken, ColorValue>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28
};

export const largeTextScaleThreshold = 1.35;

export function usesLargeTextLayout(fontScale: number): boolean {
  return Number.isFinite(fontScale) && fontScale >= largeTextScaleThreshold;
}

export const typography = {
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800" as const
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800" as const
  },
  subheading: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700" as const
  },
  body: {
    fontSize: 15,
    lineHeight: 22
  },
  caption: {
    fontSize: 12,
    lineHeight: 17
  }
};
