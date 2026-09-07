import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccessibleHeading } from "../components/AccessibleHeading";
import { useLocalization } from "../localization/LocalizationProvider";
import { colors, spacing, typography } from "../theme";
import type { PeacePadStagingRegion, PeacePadSupabaseConfig } from "./environment";

const regionStorageKey = "peacepad_v2_staging_region";

export type StagingRegionStore = Readonly<{
  read(): Promise<string | null>;
  save(region: PeacePadStagingRegion): Promise<void>;
}>;

export const secureStagingRegionStore: StagingRegionStore = {
  read: () => SecureStore.getItemAsync(regionStorageKey),
  save: (region) => SecureStore.setItemAsync(regionStorageKey, region, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  })
};

export function StagingRegionGate({
  configs,
  onSelect,
  store = secureStagingRegionStore
}: {
  configs: readonly PeacePadSupabaseConfig[];
  onSelect(config: PeacePadSupabaseConfig): void;
  store?: StagingRegionStore;
}) {
  if (configs.length !== 1) throw new Error("PeacePad requires exactly one verified staging region.");
  const { t } = useLocalization();
  const [selectedRegion, setSelectedRegion] = useState<PeacePadStagingRegion>(configs[0].region);
  const [busy, setBusy] = useState(false);
  const allowedRegions = useMemo(() => new Set(configs.map((config) => config.region)), [configs]);

  useEffect(() => {
    let active = true;
    void store.read().then((stored) => {
      if (active && stored === "ca" && allowedRegions.has(stored)) setSelectedRegion(stored);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [allowedRegions, store]);

  const selectedConfig = configs.find((config) => config.region === selectedRegion) ?? configs[0];
  const regionLabel = (_region: PeacePadStagingRegion) => t("runtime.regionCanada");
  const continueToRegion = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    await store.save(selectedConfig.region).catch(() => undefined);
    onSelect(selectedConfig);
  }, [busy, onSelect, selectedConfig, store]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <AccessibleHeading style={styles.title}>{t("runtime.regionSelectTitle")}</AccessibleHeading>
        <Text style={styles.body}>{t("runtime.regionSelectBody")}</Text>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {configs.map((config) => {
            const selected = config.region === selectedConfig.region;
            return (
              <Pressable
                accessibilityHint={t("runtime.regionChoiceHint")}
                accessibilityLabel={regionLabel(config.region)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={config.region}
                onPress={() => setSelectedRegion(config.region)}
                style={({ pressed }) => [styles.option, selected ? styles.optionSelected : null, pressed ? styles.pressed : null]}
              >
                <Text accessible={false} style={styles.optionLabel}>{regionLabel(config.region)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => void continueToRegion()}
          style={({ pressed }) => [styles.continueButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.continueLabel}>{t("runtime.regionContinue", { region: regionLabel(selectedConfig.region) })}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, gap: spacing.md, padding: spacing.xl },
  title: { color: colors.text, ...typography.title },
  body: { color: colors.muted, ...typography.body },
  options: { gap: spacing.sm },
  option: { borderColor: colors.border, borderRadius: 16, borderWidth: 1, justifyContent: "center", minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  optionSelected: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  optionLabel: { color: colors.text, ...typography.subheading },
  continueButton: { alignItems: "center", backgroundColor: colors.brand, borderRadius: 16, justifyContent: "center", minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  continueLabel: { color: colors.onBrand, ...typography.subheading },
  pressed: { opacity: 0.72 }
});
