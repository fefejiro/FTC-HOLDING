import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AccessibleHeading } from "../components/AccessibleHeading";
import { useLocalization } from "../localization/LocalizationProvider";
import { PERSONALITY_TYPES, type PersonalityType } from "../api/CoordinationApi";
import { useOptionalStagingAccountActions } from "../session/StagingAccountActions";
import { colors, spacing, typography } from "../theme";

/**
 * An optional, self-selected communication preference. This is deliberately
 * not a questionnaire and never guesses a co-parent's personality.
 */
export function PersonalityProfilePanel() {
  const actions = useOptionalStagingAccountActions();
  const { t } = useLocalization();
  if (!actions?.updatePersonality || !actions.personalityPreference) return null;

  const selected = actions.personalityPreference.personalityType;
  const save = (personalityType: PersonalityType | null) => {
    if (actions.updatingPersonality || personalityType === selected) return;
    void actions.updatePersonality!(personalityType).catch(() => undefined);
  };

  return (
    <View style={styles.card}>
      <AccessibleHeading style={styles.title}>{t("personality.title")}</AccessibleHeading>
      <Text style={styles.body}>{t("personality.body")}</Text>
      <View accessibilityLabel={t("personality.title")} accessibilityRole="radiogroup" style={styles.options}>
        {PERSONALITY_TYPES.map((personalityType) => {
          const isSelected = selected === personalityType;
          return (
            <Pressable
              accessibilityHint={t("personality.optionHint")}
              accessibilityLabel={personalityType}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled: actions.updatingPersonality }}
              disabled={actions.updatingPersonality}
              key={personalityType}
              onPress={() => save(personalityType)}
              style={({ pressed }) => [styles.option, isSelected ? styles.selected : null, pressed ? styles.pressed : null]}
            >
              <Text accessible={false} style={styles.optionText}>{personalityType}</Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityHint={t("personality.optionHint")}
          accessibilityLabel={t("personality.notSure")}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === null, disabled: actions.updatingPersonality }}
          disabled={actions.updatingPersonality}
          onPress={() => save(null)}
          style={({ pressed }) => [styles.option, selected === null ? styles.selected : null, pressed ? styles.pressed : null]}
        >
          <Text accessible={false} style={styles.optionText}>{t("personality.notSure")}</Text>
        </Pressable>
      </View>
      {actions.updatingPersonality ? <Text accessibilityLiveRegion="polite" style={styles.caption}>{t("personality.saving")}</Text> : null}
      {!actions.updatingPersonality && actions.personalityPreference.updatedAt ? <Text accessibilityLiveRegion="polite" style={styles.success}>{t("personality.saved")}</Text> : null}
      {actions.personalityError ? <Text accessibilityRole="alert" style={styles.error}>{actions.personalityError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  title: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 68,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  selected: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  optionText: { ...typography.caption, color: colors.text, fontWeight: "800" },
  caption: { ...typography.caption, color: colors.muted },
  success: { ...typography.caption, color: colors.successText },
  error: { ...typography.caption, color: colors.dangerText },
  pressed: { opacity: 0.72 }
});
