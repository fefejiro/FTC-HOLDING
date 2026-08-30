import { activitySuggestions, filterActivitySuggestions } from "./ActivitySuggestions";

describe("legacy activity catalogue", () => {
  it("ports real product suggestions without treating them as family data", () => {
    expect(activitySuggestions.length).toBeGreaterThan(10);
    expect(activitySuggestions.every((activity) => activity.id && activity.title && activity.materials.length)).toBe(true);
  });

  it("filters a practical suggestion by both age and chosen weather", () => {
    const rainyToddlerIdeas = filterActivitySuggestions({ ageMonths: 30, weather: "rainy" });
    expect(rainyToddlerIdeas.map((idea) => idea.id)).toContain("indoor-fort");
    expect(rainyToddlerIdeas.map((idea) => idea.id)).not.toContain("water-balloon-toss");
  });

  it("does not invent a location or weather condition when none was chosen", () => {
    expect(filterActivitySuggestions({}).length).toBe(activitySuggestions.length);
  });
});
