export const colors = {
  background: "#F8F5FF",
  surface: "#FFFFFF",
  brand: "#6E28D9",
  brandSoft: "#EEE4FF",
  accent: "#13A389",
  text: "#211336",
  muted: "#6C6179",
  border: "#E5DAF4",
  warning: "#A15C00",
  white: "#FFFFFF"
};

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

