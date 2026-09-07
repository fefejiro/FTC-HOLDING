import { describe, expect, it } from "vitest";
import { sanitizeAnalyticsProperties } from "../../client/src/lib/analytics";

describe("privacy-preserving product analytics", () => {
  it("removes content and identifying fields before capture", () => {
    expect(
      sanitizeAnalyticsProperties({
        entry_point: "home",
        turn_number: 2,
        is_guest: true,
        message_content: "private family message",
        draft: "private draft",
        email: "parent@example.com",
        location: "43.65,-79.38",
      }),
    ).toEqual({ entry_point: "home", turn_number: 2, is_guest: true });
  });

  it("drops nested and unexpectedly long values", () => {
    expect(
      sanitizeAnalyticsProperties({
        safe_bucket: "retained",
        nested: { unsafe: true },
        long_value: "x".repeat(81),
      }),
    ).toEqual({ safe_bucket: "retained" });
  });
});
