import { describe, expect, it } from "vitest";
import {
  buildParentingTipFallbackCatalog,
  buildWeatherActivityFallbackCatalog,
  getFallbackParentingTips,
  getFallbackWeatherActivities,
} from "./contentFallbacks";
import { parentingTipsSeed } from "../seedParentingTips";
import { weatherActivitiesSeed } from "../seedWeatherActivities";

describe("content fallbacks", () => {
  it("returns general parenting tips for broad/default filters", () => {
    const catalog = buildParentingTipFallbackCatalog(parentingTipsSeed);
    const tips = getFallbackParentingTips(catalog);

    expect(tips.length).toBeGreaterThan(0);
    expect(tips.some((tip) => tip.title === "The Importance of Routine")).toBe(true);
  });

  it("falls back to age-appropriate weather activities for toddler plus cold", () => {
    const catalog = buildWeatherActivityFallbackCatalog(weatherActivitiesSeed);
    const activities = getFallbackWeatherActivities(catalog, 24, "cold");

    expect(activities.length).toBeGreaterThan(0);
    expect(activities.some((activity) => activity.title === "Indoor Fort Building")).toBe(true);
    expect(activities[0]?.activityType).toBe("indoor");
  });
});
