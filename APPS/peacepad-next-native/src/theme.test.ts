import { largeTextScaleThreshold, usesLargeTextLayout } from "./theme";

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
