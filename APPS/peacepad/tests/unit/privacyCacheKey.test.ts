import { describe, expect, it } from "vitest";
import { createCacheKey } from "../../server/aiHelper";

describe("privacy-safe AI cache keys", () => {
  it("hashes the full normalized content without retaining a readable snippet", () => {
    const secret = "Private parenting message about a scheduled handoff";
    const key = createCacheKey("tone", secret);

    expect(key).toMatch(/^tone:[a-f0-9]{64}$/);
    expect(key).not.toContain("private");
    expect(key).not.toContain(secret);
    expect(createCacheKey("tone", `  ${secret.toUpperCase()}  `)).toBe(key);
  });

  it("does not collapse messages that only differ after the first 200 characters", () => {
    const commonPrefix = "a".repeat(200);

    expect(createCacheKey("tone", `${commonPrefix}first`)).not.toBe(
      createCacheKey("tone", `${commonPrefix}second`),
    );
  });
});
