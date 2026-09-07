import { buildCalmDraft } from "./coachDraft";

describe("PeaceBot local draft fallback", () => {
  it("turns a private topic into reviewable calm wording", () => {
    expect(buildCalmDraft("  pickup time  ", "frustrated")).toBe(
      "I would like to talk about pickup time. I am feeling frustrated, so I would like us to keep this conversation calm. Could we agree on a clear next step?"
    );
  });

  it("keeps calm requests neutral and collapses repeated whitespace", () => {
    expect(buildCalmDraft("schedule   change", "calm")).toContain(
      "I would like to talk about schedule change. I would like us to keep this conversation calm and practical."
    );
  });

  it("supports responding to a received message", () => {
    expect(buildCalmDraft("Saturday pickup", "anxious", "received")).toBe(
      "I received a message about Saturday pickup. I am feeling anxious, so I would like us to keep this conversation calm. Could we agree on a clear next step?"
    );
  });

  it("returns an empty draft for an empty topic", () => {
    expect(buildCalmDraft("   ")).toBe("");
  });
});
