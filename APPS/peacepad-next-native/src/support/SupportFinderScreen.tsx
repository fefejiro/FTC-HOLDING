import React, { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { LabButton } from "../components/LabButton";
import { PeacePadIcon, type PeacePadIconName } from "../components/PeacePadIcon";
import { ScreenHeader } from "../components/ScreenHeader";
import type { SupportResourceKind } from "../domain/parentCore";
import { useParentCoreState } from "../parentCore/ParentCoreState";
import { colors, spacing, typography } from "../theme";

type Need = Readonly<{ kind?: SupportResourceKind; label: string; icon: PeacePadIconName }>;
type Coordinates = Readonly<{ latitude: number; longitude: number }>;

const needs: readonly Need[] = [
  { kind: "counselling", label: "Someone to talk to", icon: "chatbubble-ellipses-outline" },
  { kind: "crisis", label: "Abuse & safety", icon: "shield-checkmark-outline" },
  { kind: "counselling", label: "Counselling", icon: "heart-circle-outline" },
  { kind: "legal", label: "Legal help", icon: "document-text-outline" },
  { kind: "family-service", label: "Housing & family help", icon: "home-outline" },
  { kind: "parenting", label: "Support for children", icon: "happy-outline" },
];

const radii = [5, 10, 25, 50, 100] as const;

export function SupportFinderScreen() {
  const state = useParentCoreState();
  const [need, setNeed] = useState<Need>();
  const [place, setPlace] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates>();
  const [radiusKm, setRadiusKm] = useState<(typeof radii)[number]>(25);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string>();
  const [searched, setSearched] = useState(false);

  const visibleResources = useMemo(() => state.supportResources.filter((resource) => (
    resource.distanceKm === null || resource.distanceKm <= radiusKm
  )), [radiusKm, state.supportResources]);

  const useCurrentLocation = async () => {
    setLocationError(undefined);
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationError("Location was not allowed. You can enter a city or postal code instead.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextCoordinates = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setCoordinates(nextCoordinates);
      const addresses = await Location.reverseGeocodeAsync(nextCoordinates).catch(() => []);
      const address = addresses[0];
      const label = [address?.city ?? address?.subregion, address?.region ?? address?.postalCode].filter(Boolean).join(", ");
      setPlace(label || "Near my current location");
    } catch {
      setLocationError("PeacePad could not read your location. Enter a city or postal code instead.");
    } finally {
      setLocating(false);
    }
  };

  const search = async () => {
    if (!need || place.trim().length < 2) return;
    setSearched(true);
    await state.searchSupport(
      place.trim(),
      need.kind,
      coordinates ? { ...coordinates, radiusKm } : undefined,
    );
  };

  return <View style={styles.stack}>
    <ScreenHeader
      accent={colors.brand}
      icon="heart-outline"
      kicker="REAL-WORLD HELP"
      softBackground="#F3E7F1"
      subtitle="A private, simple way to find people and services near you."
      title="What kind of help do you need?"
    />

    <View accessibilityRole="radiogroup" style={styles.needList}>
      {needs.map((item) => {
        const selected = need?.label === item.label;
        return <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: selected }}
          key={item.label}
          onPress={() => { setNeed(item); setSearched(false); }}
          style={({ pressed }) => [styles.needCard, selected ? styles.needCardSelected : null, pressed ? styles.pressed : null]}
        >
          <View style={[styles.iconTile, selected ? styles.iconTileSelected : null]}><PeacePadIcon color={selected ? colors.onBrand : colors.brand} name={item.icon} size={23} /></View>
          <Text style={[styles.needLabel, selected ? styles.needLabelSelected : null]}>{item.label}</Text>
          <PeacePadIcon color={selected ? colors.onBrand : colors.muted} name={selected ? "checkmark-circle" : "chevron-forward"} size={22} />
        </Pressable>;
      })}
    </View>

    {need ? <View style={styles.stepCard}>
      <Text accessibilityRole="header" style={styles.heading}>Where should we search?</Text>
      <Text style={styles.body}>Your location is used only for this search. It is not shared with your co-parent.</Text>
      <LabButton disabled={locating} label={locating ? "Finding your location..." : "Use my current location"} onPress={() => void useCurrentLocation()} variant="secondary" />
      {locating ? <ActivityIndicator color={colors.brand} /> : null}
      <Text style={styles.or}>or</Text>
      <TextInput
        accessibilityLabel="City or postal code"
        autoCapitalize="words"
        onChangeText={(value) => { setPlace(value); setCoordinates(undefined); setSearched(false); }}
        placeholder="Enter city or postal code"
        style={styles.input}
        value={place}
      />
      {locationError ? <Text accessibilityRole="alert" style={styles.error}>{locationError}</Text> : null}

      <Text accessibilityRole="header" style={styles.heading}>How far should we look?</Text>
      <View accessibilityRole="radiogroup" style={styles.radiusRow}>
        {radii.map((radius) => <Pressable
          accessibilityLabel={`${radius} kilometres`}
          accessibilityRole="radio"
          accessibilityState={{ checked: radiusKm === radius }}
          key={radius}
          onPress={() => { setRadiusKm(radius); setSearched(false); }}
          style={[styles.radiusChip, radiusKm === radius ? styles.radiusChipSelected : null]}
        ><Text style={[styles.radiusText, radiusKm === radius ? styles.radiusTextSelected : null]}>{radius} km</Text></Pressable>)}
      </View>
      <LabButton disabled={state.busy || place.trim().length < 2} label={state.busy ? "Searching..." : `Find help within ${radiusKm} km`} onPress={() => void search().catch(() => undefined)} />
    </View> : null}

    {state.error ? <Text accessibilityRole="alert" style={styles.errorCard}>{state.error}</Text> : null}
    {searched && !state.busy && !state.error && !visibleResources.length ? <View style={styles.emptyCard}><PeacePadIcon color={colors.brand} name="search-outline" size={26} /><Text style={styles.heading}>No nearby match yet</Text><Text style={styles.body}>Try a wider distance or another city. PeacePad will not invent provider results.</Text></View> : null}

    {visibleResources.map((resource) => <View key={resource.providerId} style={styles.resultCard}>
      <View style={styles.resultHeading}><Text style={styles.resultTitle}>{resource.name}</Text>{resource.emergency ? <Text style={styles.urgent}>URGENT HELP</Text> : null}</View>
      <Text style={styles.body}>{resource.description}</Text>
      <Text style={styles.meta}>{[resource.locality, resource.subdivision, resource.distanceKm === null ? "Online or wider-area service" : `${resource.distanceKm.toFixed(1)} km away`].filter(Boolean).join(" · ")}</Text>
      <View style={styles.actions}>
        {resource.phone ? <LabButton label={`Call ${resource.phone}`} onPress={() => void Linking.openURL(`tel:${resource.phone}`)} variant="secondary" /> : null}
        {resource.website ? <LabButton label="View service" onPress={() => void Linking.openURL(resource.website!)} variant="secondary" /> : null}
      </View>
    </View>)}

    <View style={styles.privacyCard}><PeacePadIcon color={colors.successText} name="shield-checkmark-outline" size={24} /><Text style={styles.privacyText}>Support searches stay private from your family space. If you are in immediate danger, contact local emergency services.</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  needList: { gap: spacing.sm },
  needCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 64, padding: spacing.md },
  needCardSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  iconTile: { alignItems: "center", backgroundColor: colors.brandSoft, borderRadius: 16, height: 44, justifyContent: "center", width: 44 },
  iconTileSelected: { backgroundColor: "rgba(255,255,255,0.18)" },
  needLabel: { ...typography.body, color: colors.text, flex: 1, fontWeight: "800" },
  needLabelSelected: { color: colors.onBrand },
  stepCard: { backgroundColor: "#FFFDF8", borderColor: colors.border, borderRadius: 24, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  heading: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  or: { ...typography.caption, color: colors.muted, textAlign: "center" },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, color: colors.text, minHeight: 52, padding: spacing.md },
  error: { ...typography.caption, color: colors.dangerText, fontWeight: "700" },
  errorCard: { ...typography.body, backgroundColor: colors.dangerSurface, borderColor: colors.dangerBorder, borderRadius: 18, borderWidth: 1, color: colors.dangerText, padding: spacing.md },
  radiusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  radiusChip: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, minHeight: 44, minWidth: 64, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  radiusChipSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  radiusText: { ...typography.caption, color: colors.text, fontWeight: "800" },
  radiusTextSelected: { color: colors.onBrand },
  emptyCard: { alignItems: "center", backgroundColor: colors.cream, borderRadius: 22, gap: spacing.sm, padding: spacing.xl },
  resultCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  resultHeading: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  resultTitle: { ...typography.subheading, color: colors.text, flex: 1 },
  urgent: { ...typography.caption, color: colors.dangerText, fontWeight: "900" },
  meta: { ...typography.caption, color: colors.brand, fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  privacyCard: { alignItems: "center", backgroundColor: colors.successSurface, borderColor: colors.successBorder, borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  privacyText: { ...typography.caption, color: colors.successText, flex: 1 },
  pressed: { opacity: 0.75 },
});
