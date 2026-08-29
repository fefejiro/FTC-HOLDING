import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOptionalLocalization } from "../localization/LocalizationProvider";
import { calendarText } from "../localization/calendarLocalization";
import { colors, spacing, typography } from "../theme";
import { filterLegacyWeatherActivities, type LegacyWeatherCondition } from "./weatherActivities";

const ageOptions: readonly { labelKey: "allAges" | "baby" | "toddler" | "preschool" | "schoolAge" | "teen"; months?: number }[] = [
  { labelKey: "allAges" },
  { labelKey: "baby", months: 6 },
  { labelKey: "toddler", months: 24 },
  { labelKey: "preschool", months: 48 },
  { labelKey: "schoolAge", months: 96 },
  { labelKey: "teen", months: 168 }
];

const weatherOptions: readonly { key: "all" | LegacyWeatherCondition; labelKey: "allWeather" | LegacyWeatherCondition }[] = [
  { key: "all", labelKey: "allWeather" },
  { key: "sunny", labelKey: "sunny" },
  { key: "rainy", labelKey: "rainy" },
  { key: "snowy", labelKey: "snowy" },
  { key: "cloudy", labelKey: "cloudy" },
  { key: "hot", labelKey: "hot" },
  { key: "cold", labelKey: "cold" },
  { key: "windy", labelKey: "windy" }
];

export function WeatherActivityIdeas() {
  const { locale } = useOptionalLocalization();
  const [ageMonths, setAgeMonths] = useState<number>();
  const [weatherCondition, setWeatherCondition] = useState<LegacyWeatherCondition>();
  const activities = useMemo(
    () => filterLegacyWeatherActivities({ ageMonths, weatherCondition }),
    [ageMonths, weatherCondition]
  );
  const c = (key: Parameters<typeof calendarText>[1], values?: Readonly<Record<string, string>>) => calendarText(locale, key, values);

  return (
    <View accessibilityLabel={c("activityIdeasTitle")} style={styles.card}>
      <View style={styles.stackTight}>
        <Text accessibilityRole="header" style={styles.heading}>{c("activityIdeasTitle")}</Text>
        <Text style={styles.body}>{c("activityIdeasBody")}</Text>
      </View>

      <Text style={styles.label}>{c("activityAge")}</Text>
      <View accessibilityRole="radiogroup" style={styles.wrap}>
        {ageOptions.map((option) => {
          const selected = ageMonths === option.months;
          return (
            <Pressable
              accessibilityLabel={c(option.labelKey)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.labelKey}
              onPress={() => setAgeMonths(option.months)}
              style={[styles.chip, selected ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>{c(option.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>{c("activityWeather")}</Text>
      <View accessibilityRole="radiogroup" style={styles.wrap}>
        {weatherOptions.map((option) => {
          const selected = weatherCondition === option.key || (option.key === "all" && weatherCondition === undefined);
          return (
            <Pressable
              accessibilityLabel={c(option.labelKey)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.key}
              onPress={() => setWeatherCondition(option.key === "all" ? undefined : option.key)}
              style={[styles.chip, selected ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>{c(option.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      {activities.length === 0 ? (
        <Text style={styles.body}>{c("noActivityIdeas")}</Text>
      ) : (
        <View accessibilityLabel={c("activityIdeasList")} style={styles.stackTight}>
          {activities.slice(0, 4).map((activity) => (
            <View accessibilityLabel={activity.title} key={activity.id} style={styles.activity}>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.body}>{activity.description}</Text>
              <Text style={styles.meta}>{activity.activityType} / {activity.category} / {activity.durationMinutes} {c("minutes")}</Text>
              <Text style={styles.meta}>{c("materials")}: {activity.materialsNeeded.join(", ")}</Text>
            </View>
          ))}
          {activities.length > 4 ? <Text style={styles.caption}>{c("moreActivityIdeas", { count: String(activities.length - 4) })}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  stackTight: { gap: spacing.sm },
  heading: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  caption: { ...typography.caption, color: colors.muted },
  label: { ...typography.caption, color: colors.text, fontWeight: "800", marginTop: spacing.xs, textTransform: "uppercase" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...typography.caption, color: colors.muted, fontWeight: "700" },
  chipTextActive: { color: colors.onBrand },
  activity: { backgroundColor: colors.brandSoft, borderRadius: 16, gap: spacing.xs, padding: spacing.md },
  activityTitle: { ...typography.body, color: colors.text, fontWeight: "800" },
  meta: { ...typography.caption, color: colors.muted }
});
