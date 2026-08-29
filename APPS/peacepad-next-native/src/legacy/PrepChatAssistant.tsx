import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useOptionalLocalization } from "../localization/LocalizationProvider";
import { prepChatText } from "../localization/prepChatLocalization";
import { colors, spacing, typography } from "../theme";
import { LabButton } from "../components/LabButton";
import { buildCalmDraft, type PrepFeeling } from "./prepChat";

const feelings: readonly PrepFeeling[] = ["calm", "anxious", "frustrated", "overwhelmed", "sad", "angry"];

export function PrepChatAssistant({ onUseDraft }: { onUseDraft: (draft: string) => void }) {
  const { locale } = useOptionalLocalization();
  const t = (key: Parameters<typeof prepChatText>[1]) => prepChatText(locale, key);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [feeling, setFeeling] = useState<PrepFeeling>("calm");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const createDraft = () => {
    const result = buildCalmDraft(topic, feeling);
    if (!result) {
      setDraft("");
      setError(t("empty"));
      return;
    }
    setError("");
    setDraft(result);
  };

  return (
    <View accessibilityLabel={t("title")} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.stackTight}>
          <Text accessibilityRole="header" style={styles.heading}>{t("title")}</Text>
          <Text style={styles.body}>{t("body")}</Text>
        </View>
        <LabButton label={open ? t("close") : t("open")} onPress={() => setOpen((current) => !current)} variant="secondary" />
      </View>

      {open ? (
        <View style={styles.stack}>
          <TextInput
            accessibilityLabel={t("topic")}
            multiline
            onChangeText={(value) => { setTopic(value); setError(""); }}
            placeholder={t("topicPlaceholder")}
            style={styles.input}
            value={topic}
          />
          <Text style={styles.label}>{t("feeling")}</Text>
          <View accessibilityRole="radiogroup" style={styles.wrap}>
            {feelings.map((candidate) => {
              const selected = candidate === feeling;
              return (
                <Pressable
                  accessibilityLabel={t(candidate)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={candidate}
                  onPress={() => setFeeling(candidate)}
                  style={[styles.chip, selected ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>{t(candidate)}</Text>
                </Pressable>
              );
            })}
          </View>
          <LabButton label={t("create")} onPress={createDraft} />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {draft ? (
            <View accessibilityLabel={t("draft")} style={styles.draftCard}>
              <Text style={styles.heading}>{t("draft")}</Text>
              <Text style={styles.body}>{draft}</Text>
              <Text style={styles.caption}>{t("localOnly")}</Text>
              <LabButton label={t("use")} onPress={() => onUseDraft(draft)} />
              <LabButton label={t("startOver")} onPress={() => { setDraft(""); setTopic(""); setError(""); }} variant="secondary" />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.brandSoft, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  header: { gap: spacing.md },
  stack: { gap: spacing.md },
  stackTight: { gap: spacing.sm },
  heading: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.text },
  caption: { ...typography.caption, color: colors.muted },
  label: { ...typography.caption, color: colors.text, fontWeight: "800", textTransform: "uppercase" },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, color: colors.text, minHeight: 78, padding: spacing.md },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...typography.caption, color: colors.muted, fontWeight: "700" },
  chipTextActive: { color: colors.onBrand },
  draftCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  error: { ...typography.body, color: colors.dangerText }
});
