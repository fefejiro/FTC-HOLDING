import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LabButton } from "../components/LabButton";
import { formatCalendarDate } from "../localization/calendarLocalization";
import type { SupportedLocale } from "../localization/LocalizationProvider";
import { colors, spacing, typography } from "../theme";
import {
  buildCustodyBlocks,
  buildCustodyPreview,
  type CustodyBlock,
  type CustodyParent,
  type CustodyPattern,
  type CustodySchedule
} from "./custodySchedule";
import { custodyScheduleText } from "./custodyScheduleLocalization";

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CustodySchedulePlanner({
  locale,
  selectedLayerId,
  onAddBlocks,
  onScheduleChange
}: {
  locale: SupportedLocale;
  selectedLayerId: string;
  onAddBlocks: (blocks: readonly CustodyBlock[]) => Promise<void>;
  onScheduleChange?: (schedule: CustodySchedule | undefined) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [pattern, setPattern] = useState<CustodyPattern>("week_on_off");
  const [startDate, setStartDate] = useState(todayDateOnly);
  const [primaryParent, setPrimaryParent] = useState<CustodyParent>("you");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(false);
  const schedule = useMemo<CustodySchedule>(() => ({ enabled, pattern, startDate, primaryParent }), [enabled, pattern, primaryParent, startDate]);
  const previewSchedule = useMemo<CustodySchedule>(() => ({ ...schedule, enabled: true }), [schedule]);
  const preview = useMemo(() => buildCustodyPreview(previewSchedule, 28), [previewSchedule]);
  const blocks = useMemo(() => buildCustodyBlocks(previewSchedule, 28), [previewSchedule]);
  useEffect(() => {
    onScheduleChange?.(enabled ? schedule : undefined);
  }, [enabled, onScheduleChange, schedule]);
  const setScheduleValue = <T,>(setter: (value: T) => void, value: T) => {
    setAdded(false);
    setError(false);
    setter(value);
  };

  const parentLabel = (parent: CustodyParent) => custodyScheduleText(locale, parent === "you" ? "yourTime" : "otherTime");
  const formatDate = (value: string) => formatCalendarDate(locale, `${value}T00:00:00.000Z`, { month: "short", day: "numeric" });

  return (
    <View accessibilityLabel={custodyScheduleText(locale, "title")} style={styles.card}>
      <Text style={styles.heading}>{custodyScheduleText(locale, "title")}</Text>
      <Text style={styles.body}>{custodyScheduleText(locale, "body")}</Text>
      <LabButton
        label={custodyScheduleText(locale, enabled ? "disablePlan" : "enablePlan")}
        onPress={() => {
          setError(false);
          setAdded(false);
          setEnabled((current) => !current);
        }}
        variant="secondary"
      />

      <Text style={styles.fieldLabel}>{custodyScheduleText(locale, "pattern")}</Text>
      <View accessibilityRole="radiogroup" style={styles.wrap}>
        {(["week_on_off", "every_other_weekend", "two_two_three"] as const).map((candidate) => (
          <Pressable
            accessibilityLabel={custodyScheduleText(locale, candidate)}
            accessibilityRole="radio"
            accessibilityState={{ selected: pattern === candidate }}
            key={candidate}
            onPress={() => setScheduleValue(setPattern, candidate)}
            style={[styles.chip, pattern === candidate ? styles.chipActive : null]}
          >
            <Text style={[styles.chipText, pattern === candidate ? styles.chipTextActive : null]}>{custodyScheduleText(locale, candidate)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>{custodyScheduleText(locale, "startDate")}</Text>
      <TextInput
        accessibilityLabel={custodyScheduleText(locale, "startDate")}
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        onChangeText={(value) => setScheduleValue(setStartDate, value)}
        placeholder="YYYY-MM-DD"
        style={styles.input}
        value={startDate}
      />

      <Text style={styles.fieldLabel}>{custodyScheduleText(locale, "youStart")}</Text>
      <View accessibilityRole="radiogroup" style={styles.wrap}>
        {([
          ["you", custodyScheduleText(locale, "youStart")],
          ["other", custodyScheduleText(locale, "otherStart")]
        ] as const).map(([candidate, label]) => (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="radio"
            accessibilityState={{ selected: primaryParent === candidate }}
            key={candidate}
            onPress={() => setScheduleValue(setPrimaryParent, candidate)}
            style={[styles.chip, primaryParent === candidate ? styles.chipActive : null]}
          >
            <Text style={[styles.chipText, primaryParent === candidate ? styles.chipTextActive : null]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View accessibilityLiveRegion="polite" style={styles.previewCard}>
        <Text style={styles.previewTitle}>{custodyScheduleText(locale, "preview")}</Text>
        {preview.length ? (
          <View style={styles.previewList}>
            {blocks.slice(0, 8).map((block) => (
              <View accessibilityLabel={`${formatDate(block.startDate)} - ${formatDate(block.endDate)} ${parentLabel(block.parent)}`} key={`${block.startDate}-${block.parent}`} style={styles.previewRow}>
                <Text style={styles.previewDate}>{formatDate(block.startDate)} - {formatDate(block.endDate)}</Text>
                <Text style={[styles.previewParent, block.parent === "you" ? styles.yourTime : styles.otherTime]}>{parentLabel(block.parent)}</Text>
              </View>
            ))}
          </View>
        ) : <Text style={styles.body}>{custodyScheduleText(locale, "noPreview")}</Text>}
      </View>

      {!selectedLayerId ? <Text accessibilityRole="alert" style={styles.error}>{custodyScheduleText(locale, "noCalendar")}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{custodyScheduleText(locale, "addError")}</Text> : null}
      {added ? <Text accessibilityLiveRegion="polite" style={styles.success}>{custodyScheduleText(locale, "added")}</Text> : null}
      <LabButton
        disabled={!enabled || !selectedLayerId || !blocks.length || busy || added}
        label={busy ? custodyScheduleText(locale, "addDates") : custodyScheduleText(locale, "addDates")}
        onPress={() => {
          setBusy(true);
          setError(false);
          void onAddBlocks(blocks)
            .then(() => setAdded(true))
            .catch(() => setError(true))
            .finally(() => setBusy(false));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  heading: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  fieldLabel: { ...typography.caption, color: colors.text, fontWeight: "800", marginTop: spacing.sm, textTransform: "uppercase" },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, color: colors.text, minHeight: 52, padding: spacing.md },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...typography.caption, color: colors.muted, fontWeight: "700" },
  chipTextActive: { color: colors.onBrand },
  previewCard: { backgroundColor: colors.brandSoft, borderColor: colors.border, borderRadius: 18, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  previewTitle: { ...typography.body, color: colors.text, fontWeight: "800" },
  previewList: { gap: spacing.xs },
  previewRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  previewDate: { ...typography.caption, color: colors.text },
  previewParent: { ...typography.caption, fontWeight: "800" },
  yourTime: { color: colors.brand },
  otherTime: { color: colors.successText },
  error: { ...typography.caption, color: colors.dangerText, fontWeight: "700" },
  success: { ...typography.caption, color: colors.successText, fontWeight: "700" }
});
