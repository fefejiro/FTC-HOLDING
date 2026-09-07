import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AccessibleHeading } from "../components/AccessibleHeading";
import { LabButton } from "../components/LabButton";
import { useOptionalLocalization } from "../localization/LocalizationProvider";
import { colors, spacing, typography } from "../theme";
import { activityCopy } from "./activityLocalization";
import { filterActivitySuggestions, type ActivityWeather } from "./ActivitySuggestions";
import { fetchCurrentWeather, findWeatherPlace, type WeatherSnapshot } from "./weather";

export function ActivitySuggestionsScreen({ onPlanActivity }: { onPlanActivity: (title: string) => void }) {
  const { locale } = useOptionalLocalization();
  const text = activityCopy(locale);
  const [weather, setWeather] = useState<ActivityWeather>();
  const [ageMonths, setAgeMonths] = useState<number>();
  const [place, setPlace] = useState("");
  const [weatherSnapshot, setWeatherSnapshot] = useState<WeatherSnapshot>();
  const [weatherPlace, setWeatherPlace] = useState("");
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [weatherError, setWeatherError] = useState<string>();
  const suggestions = useMemo(() => filterActivitySuggestions({ ageMonths, weather }), [ageMonths, weather]);
  const weatherChoices: readonly { value?: ActivityWeather; label: string }[] = [
    { label: text.allWeather },
    ...(["sunny", "cloudy", "rainy", "snowy", "hot", "cold"] as const).map((value) => ({ value, label: text.weatherChoices[value] }))
  ];
  const ageChoices: readonly { value?: number; label: string }[] = [
    { label: text.allAges },
    ...[18, 30, 54, 96, 156].map((value, index) => ({ value, label: text.ageChoices[index] }))
  ];
  const checkWeather = async () => {
    setWeatherBusy(true);
    setWeatherError(undefined);
    try {
      const resolved = await findWeatherPlace(place);
      const snapshot = await fetchCurrentWeather(resolved.latitude, resolved.longitude);
      setWeatherPlace(resolved.country ? `${resolved.name}, ${resolved.country}` : resolved.name);
      setWeatherSnapshot(snapshot);
      setWeather(snapshot.condition);
    } catch (cause) {
      setWeatherError(cause instanceof Error ? cause.message : text.weatherUnavailable);
    } finally {
      setWeatherBusy(false);
    }
  };

  return (
    <View style={styles.stack}>
      <AccessibleHeading style={styles.title}>{text.title}</AccessibleHeading>
      <Text style={styles.body}>{text.body}</Text>
      <Text style={styles.privacyNote}>{text.locationPrivacy}</Text>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>{text.weatherPlace}</Text>
        <TextInput
          accessibilityLabel={text.weatherPlace}
          autoCapitalize="words"
          autoCorrect={false}
          onChangeText={setPlace}
          onSubmitEditing={() => void checkWeather()}
          placeholder={text.weatherPlacePlaceholder}
          returnKeyType="search"
          style={styles.input}
          value={place}
        />
        <LabButton disabled={weatherBusy || place.trim().length < 2} label={weatherBusy ? text.loadingWeather : text.useCurrentWeather} onPress={() => void checkWeather()} variant="secondary" />
        {weatherSnapshot && weatherPlace ? <Text accessibilityLiveRegion="polite" style={styles.weatherSummary}>{text.currentWeather(weatherPlace, text.weatherChoices[weatherSnapshot.condition], weatherSnapshot.temperatureC.toFixed(1))}</Text> : null}
        {weatherError ? <Text accessibilityRole="alert" style={styles.error}>{weatherError}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>{text.weather}</Text>
        <View accessibilityLabel={text.weatherFilter} accessibilityRole="radiogroup" style={styles.chips}>
          {weatherChoices.map((choice) => (
            <Pressable
              accessibilityLabel={choice.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: weather === choice.value }}
              key={choice.label}
              onPress={() => setWeather(choice.value)}
              style={[styles.chip, weather === choice.value ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, weather === choice.value ? styles.chipTextActive : null]}>{choice.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text accessibilityRole="header" style={styles.heading}>{text.ageRange}</Text>
        <View accessibilityLabel={text.ageFilter} accessibilityRole="radiogroup" style={styles.chips}>
          {ageChoices.map((choice) => (
            <Pressable
              accessibilityLabel={choice.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: ageMonths === choice.value }}
              key={choice.label}
              onPress={() => setAgeMonths(choice.value)}
              style={[styles.chip, ageMonths === choice.value ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, ageMonths === choice.value ? styles.chipTextActive : null]}>{choice.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text accessibilityLabel="Activity result count" style={styles.caption}>{text.result(suggestions.length)}</Text>
      {suggestions.map((suggestion, index) => (
        <View key={suggestion.id} style={[styles.card, index % 3 === 0 ? styles.cardSun : index % 3 === 1 ? styles.cardAqua : styles.cardCoral]}>
          <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
          <Text style={styles.caption}>{suggestion.activityType} · {suggestion.category} · {suggestion.duration}</Text>
          <Text style={styles.body}>{suggestion.description}</Text>
          <Text style={styles.materials}>{text.materials}: {suggestion.materials.join(", ")}</Text>
          <LabButton label={text.plan(suggestion.title)} onPress={() => onPlanActivity(suggestion.title)} variant="secondary" />
        </View>
      ))}

      {!suggestions.length ? <Text accessibilityRole="alert" style={styles.empty}>{text.empty}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  title: { ...typography.title },
  heading: { ...typography.heading, marginTop: spacing.xs },
  body: { ...typography.body, color: colors.muted, lineHeight: 22 },
  privacyNote: { ...typography.caption, backgroundColor: "#DDF6F0", borderColor: "#76CCBE", borderRadius: 18, borderWidth: 1, color: colors.successText, padding: spacing.md },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: "#E7C8BD", borderRadius: 18, borderWidth: 1, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  weatherSummary: { ...typography.caption, color: colors.text, fontWeight: "700" },
  error: { ...typography.caption, color: colors.dangerText },
  caption: { ...typography.caption, color: colors.muted },
  card: { borderRadius: 22, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  cardSun: { backgroundColor: "#FFF1B8", borderColor: "#F0C940" },
  cardAqua: { backgroundColor: "#DDF6F0", borderColor: "#76CCBE" },
  cardCoral: { backgroundColor: "#FFE4D6", borderColor: "#F2A791" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipText: { ...typography.caption, color: colors.text, fontWeight: "700" },
  chipTextActive: { color: colors.surface },
  suggestionTitle: { ...typography.heading },
  materials: { ...typography.caption, color: colors.text, fontWeight: "700" },
  empty: { ...typography.body, color: colors.muted, textAlign: "center" }
});
