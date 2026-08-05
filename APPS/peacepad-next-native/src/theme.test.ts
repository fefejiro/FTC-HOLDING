import { darkColors, largeTextScaleThreshold, lightColors, usesLargeTextLayout } from "./theme";

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

describe("responsive text layout policy", () => {
  it("switches to the large-text layout at the documented threshold", () => {
    expect(usesLargeTextLayout(1)).toBe(false);
    expect(usesLargeTextLayout(largeTextScaleThreshold - 0.01)).toBe(false);
    expect(usesLargeTextLayout(largeTextScaleThreshold)).toBe(true);
    expect(usesLargeTextLayout(2)).toBe(true);
  });

  it("fails safely for invalid font-scale values", () => {
    expect(usesLargeTextLayout(Number.NaN)).toBe(false);
    expect(usesLargeTextLayout(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("adaptive colour contract", () => {
  it("keeps light and dark semantic palettes structurally aligned", () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
    expect(darkColors.background).not.toBe(lightColors.background);
    expect(darkColors.surface).not.toBe(lightColors.surface);
  });

  it.each([
    ["light body", lightColors.text, lightColors.background],
    ["light secondary", lightColors.muted, lightColors.background],
    ["light primary action", lightColors.onBrand, lightColors.brand],
    ["dark body", darkColors.text, darkColors.background],
    ["dark secondary", darkColors.muted, darkColors.background],
    ["dark primary action", darkColors.onBrand, darkColors.brand],
    ["dark success", darkColors.successText, darkColors.successSurface],
    ["dark error", darkColors.dangerText, darkColors.dangerSurface]
  ])("keeps %s at WCAG AA text contrast", (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
