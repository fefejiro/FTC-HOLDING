import { buildCalmDraft } from "./prepChat";

describe("legacy Prep Chat drafting", () => {
  it("turns a solo topic into a reviewable calm draft", () => {
    expect(buildCalmDraft("  pickup time  ", "frustrated")).toBe(
      "I would like to talk about pickup time. I am feeling frustrated, so I would like us to keep this conversation calm. Could we agree on a clear next step?"
    );
  });

  it("keeps calm requests neutral and collapses repeated whitespace", () => {
    expect(buildCalmDraft("schedule   change", "calm")).toContain(
      "I would like to talk about schedule change. I would like us to keep this conversation calm and practical."
    );
  });

  it("returns an empty draft for an empty topic", () => {
    expect(buildCalmDraft("   ")).toBe("");
  });
});

