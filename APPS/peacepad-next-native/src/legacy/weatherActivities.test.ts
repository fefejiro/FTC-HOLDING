import { filterLegacyWeatherActivities, legacyWeatherActivities } from "./weatherActivities";

describe("legacy weather activity catalogue", () => {
  it("keeps the port read-only and includes the legacy seed experience", () => {
    expect(legacyWeatherActivities.length).toBeGreaterThanOrEqual(20);
    expect(legacyWeatherActivities.find((activity) => activity.id === "indoor-fort-building")?.weatherConditions).toContain("rainy");
  });

  it("filters by age and weather using the legacy inclusive age ranges", () => {
    const rainyToddlerIdeas = filterLegacyWeatherActivities({ ageMonths: 24, weatherCondition: "rainy" });
    expect(rainyToddlerIdeas.map((activity) => activity.id)).toEqual(expect.arrayContaining(["indoor-fort-building", "rainy-day-puddle-jumping"]));
    expect(rainyToddlerIdeas.every((activity) => activity.ageMinMonths <= 24 && activity.ageMaxMonths >= 24)).toBe(true);
  });

  it("returns all age-eligible ideas when no weather is selected", () => {
    const teenIdeas = filterLegacyWeatherActivities({ ageMonths: 168 });
    expect(teenIdeas).toHaveLength(0);
    expect(filterLegacyWeatherActivities()).toHaveLength(legacyWeatherActivities.length);
  });
});
