import { describe, expect, it } from "vitest";
import { analyzeTone } from "../../server/toneClassifier";

describe("toneClassifier", () => {
  it("classifies collaborative language as calm", () => {
    const result = analyzeTone("Can we find a time that works for both of us?");

    expect(result.category).toBe("calm");
    expect(result.emoji).toBe("✅");
    expect(result.rewordingSuggestion).toBeNull();
  });

  it("classifies accusatory language as tense", () => {
    const result = analyzeTone("You never pick them up on time!");

    expect(result.category).toBe("tense");
    expect(result.emoji).toBe("⚠️");
    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.rewordingSuggestion).toContain("I'd appreciate it");
  });

  it("classifies blame and shouting as escalating", () => {
    const result = analyzeTone("This is YOUR fault!! You ALWAYS do this!");

    expect(result.category).toBe("escalating");
    expect(result.emoji).toBe("🔥");
    expect(result.flags.some((flag) => flag.toLowerCase().includes("blame"))).toBe(true);
    expect(result.rewordingSuggestion).not.toBeNull();
  });
});
