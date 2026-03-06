import type {
  InsertParentingTip,
  InsertWeatherActivity,
  ParentingTip,
  WeatherActivity,
} from "@shared/schema";

const DEFAULT_DATE = new Date("2026-01-01T00:00:00.000Z");

const WEATHER_FAMILY_FALLBACKS: Record<string, string[]> = {
  cold: ["cold", "snowy", "rainy", "cloudy"],
  rainy: ["rainy", "cloudy", "cold"],
  snowy: ["snowy", "cold"],
  cloudy: ["cloudy", "rainy", "sunny"],
  windy: ["windy", "cloudy", "sunny"],
  sunny: ["sunny", "cloudy"],
  hot: ["hot", "sunny"],
};

function asDate(value: Date | null | undefined): Date {
  return value instanceof Date ? value : DEFAULT_DATE;
}

function toParentingTip(
  tip: InsertParentingTip,
  index: number,
): ParentingTip {
  return {
    id: `seed-parenting-tip-${index + 1}`,
    title: tip.title,
    content: tip.content,
    excerpt: tip.excerpt ?? null,
    category: tip.category,
    ageMinMonths: tip.ageMinMonths,
    ageMaxMonths: tip.ageMaxMonths,
    imageUrl: tip.imageUrl ?? null,
    author: tip.author ?? null,
    tags: tip.tags ?? null,
    readTimeMinutes: tip.readTimeMinutes ?? null,
    publishedAt: asDate(tip.publishedAt),
    createdAt: DEFAULT_DATE,
    updatedAt: DEFAULT_DATE,
  };
}

function toWeatherActivity(
  activity: InsertWeatherActivity,
  index: number,
): WeatherActivity {
  return {
    id: `seed-weather-activity-${index + 1}`,
    title: activity.title,
    description: activity.description,
    ageMinMonths: activity.ageMinMonths,
    ageMaxMonths: activity.ageMaxMonths,
    activityType: activity.activityType,
    weatherConditions: activity.weatherConditions,
    category: activity.category,
    durationMinutes: activity.durationMinutes ?? null,
    materialsNeeded: activity.materialsNeeded ?? null,
    createdAt: DEFAULT_DATE,
    updatedAt: DEFAULT_DATE,
  };
}

function matchesAgeRange(
  ageMinMonths: string,
  ageMaxMonths: string,
  childAgeMonths?: number,
): boolean {
  if (childAgeMonths === undefined) {
    return true;
  }

  const minAge = Number.parseInt(ageMinMonths, 10);
  const maxAge = Number.parseInt(ageMaxMonths, 10);
  return childAgeMonths >= minAge && childAgeMonths <= maxAge;
}

function normalizeValue(value?: string | null): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

export function normalizeParentingCategory(value?: string | null): string | undefined {
  const normalized = normalizeValue(value);
  if (!normalized || normalized === "all" || normalized === "all categories") {
    return undefined;
  }

  return normalized.replace(/\s+/g, "-");
}

export function normalizeWeatherCondition(value?: string | null): string | undefined {
  const normalized = normalizeValue(value);
  if (!normalized || normalized === "all" || normalized === "all weather") {
    return undefined;
  }

  const synonyms: Record<string, string> = {
    clear: "sunny",
    overcast: "cloudy",
    rain: "rainy",
    showers: "rainy",
    snow: "snowy",
    freezing: "cold",
    chilly: "cold",
    breezy: "windy",
    warm: "hot",
  };

  return synonyms[normalized] || normalized;
}

export function buildParentingTipFallbackCatalog(
  seedTips: InsertParentingTip[],
): ParentingTip[] {
  return seedTips.map(toParentingTip).sort((first, second) => {
    return second.publishedAt.getTime() - first.publishedAt.getTime();
  });
}

export function getFallbackParentingTips(
  catalog: ParentingTip[],
  childAgeMonths?: number,
  category?: string,
): ParentingTip[] {
  const normalizedCategory = normalizeParentingCategory(category);
  const exactMatches = catalog.filter((tip) => {
    const matchesAge = matchesAgeRange(tip.ageMinMonths, tip.ageMaxMonths, childAgeMonths);
    const matchesCategory = !normalizedCategory || tip.category === normalizedCategory;
    return matchesAge && matchesCategory;
  });

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  if (childAgeMonths !== undefined && normalizedCategory) {
    const ageOnlyMatches = catalog.filter((tip) =>
      matchesAgeRange(tip.ageMinMonths, tip.ageMaxMonths, childAgeMonths),
    );
    if (ageOnlyMatches.length > 0) {
      return ageOnlyMatches;
    }
  }

  if (normalizedCategory) {
    const categoryOnlyMatches = catalog.filter((tip) => tip.category === normalizedCategory);
    if (categoryOnlyMatches.length > 0) {
      return categoryOnlyMatches;
    }
  }

  if (childAgeMonths !== undefined) {
    const expandedAgeMatches = catalog.filter((tip) => {
      const minAge = Number.parseInt(tip.ageMinMonths, 10) - 24;
      const maxAge = Number.parseInt(tip.ageMaxMonths, 10) + 24;
      return childAgeMonths >= minAge && childAgeMonths <= maxAge;
    });

    if (expandedAgeMatches.length > 0) {
      return expandedAgeMatches;
    }
  }

  const generalTips = catalog.filter((tip) => {
    return Number.parseInt(tip.ageMinMonths, 10) === 0 && Number.parseInt(tip.ageMaxMonths, 10) >= 144;
  });

  return generalTips.length > 0 ? generalTips : catalog.slice(0, 10);
}

export function buildWeatherActivityFallbackCatalog(
  seedActivities: InsertWeatherActivity[],
): WeatherActivity[] {
  return seedActivities.map(toWeatherActivity).sort((first, second) => {
    return first.title.localeCompare(second.title);
  });
}

function prioritizeIndoorActivities(
  activities: WeatherActivity[],
  preferredTypes: string[],
): WeatherActivity[] {
  return [...activities].sort((first, second) => {
    const firstIndex = preferredTypes.indexOf(first.activityType);
    const secondIndex = preferredTypes.indexOf(second.activityType);
    return (firstIndex === -1 ? preferredTypes.length : firstIndex)
      - (secondIndex === -1 ? preferredTypes.length : secondIndex);
  });
}

export function getFallbackWeatherActivities(
  catalog: WeatherActivity[],
  childAgeMonths?: number,
  weatherCondition?: string,
): WeatherActivity[] {
  const normalizedWeather = normalizeWeatherCondition(weatherCondition);
  const exactMatches = catalog.filter((activity) => {
    const matchesAge = matchesAgeRange(
      activity.ageMinMonths,
      activity.ageMaxMonths,
      childAgeMonths,
    );
    const matchesWeather =
      !normalizedWeather || activity.weatherConditions.includes(normalizedWeather);
    return matchesAge && matchesWeather;
  });

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  if (normalizedWeather) {
    const weatherOnlyMatches = catalog.filter((activity) =>
      activity.weatherConditions.includes(normalizedWeather),
    );
    if (weatherOnlyMatches.length > 0 && childAgeMonths === undefined) {
      return weatherOnlyMatches;
    }
  }

  if (childAgeMonths !== undefined) {
    const ageOnlyMatches = catalog.filter((activity) =>
      matchesAgeRange(activity.ageMinMonths, activity.ageMaxMonths, childAgeMonths),
    );
    if (ageOnlyMatches.length > 0 && !normalizedWeather) {
      return ageOnlyMatches;
    }
  }

  if (normalizedWeather) {
    const relatedWeather = WEATHER_FAMILY_FALLBACKS[normalizedWeather] || [normalizedWeather];
    const familyMatches = catalog.filter((activity) => {
      const matchesAge = matchesAgeRange(
        activity.ageMinMonths,
        activity.ageMaxMonths,
        childAgeMonths,
      );
      const matchesWeather = activity.weatherConditions.some((condition) =>
        relatedWeather.includes(condition),
      );
      return matchesAge && matchesWeather;
    });

    if (familyMatches.length > 0) {
      const preferredTypes =
        normalizedWeather === "cold" || normalizedWeather === "rainy" || normalizedWeather === "snowy"
          ? ["indoor", "flexible", "outdoor"]
          : ["outdoor", "flexible", "indoor"];
      return prioritizeIndoorActivities(familyMatches, preferredTypes);
    }
  }

  return catalog;
}
