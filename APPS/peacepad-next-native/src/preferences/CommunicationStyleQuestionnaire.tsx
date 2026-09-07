import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { PersonalityType } from "../api/CoordinationApi";
import type { CommunicationAssessmentAnswer } from "../domain/parentCore";
import { LabButton } from "../components/LabButton";
import { colors, spacing, typography } from "../theme";

const questions: readonly Readonly<{ id: CommunicationAssessmentAnswer["questionId"]; prompt: string; low: string; high: string }>[] = [
  { id: "pace", prompt: "When something needs discussion, what pace helps you?", low: "Time to reflect", high: "Talk it through" },
  { id: "detail", prompt: "What makes a message useful?", low: "Concrete details", high: "The bigger picture" },
  { id: "conflict", prompt: "When tension rises, what grounds you?", low: "Clear facts", high: "How people are affected" },
  { id: "planning", prompt: "How do plans feel easiest to manage?", low: "Room to adapt", high: "A settled structure" },
  { id: "emotion", prompt: "How much feeling do you prefer in practical messages?", low: "Keep it practical", high: "Acknowledge feelings" },
  { id: "decisions", prompt: "What helps you decide?", low: "Options first", high: "A clear next step" }
] as const;

function suggestion(answers: readonly CommunicationAssessmentAnswer[]): PersonalityType {
  const score = (id: CommunicationAssessmentAnswer["questionId"]) => answers.find((answer) => answer.questionId === id)?.score ?? 3;
  const ei = score("pace") >= 4 ? "E" : "I";
  const sn = score("detail") >= 4 ? "N" : "S";
  const tf = (score("conflict") + score("emotion")) / 2 >= 3.5 ? "F" : "T";
  const jp = (score("planning") + score("decisions")) / 2 >= 3.5 ? "J" : "P";
  return `${ei}${sn}${tf}${jp}` as PersonalityType;
}

export function CommunicationStyleQuestionnaire({ identityId, onChoose }: Readonly<{ identityId: string; onChoose: (type: PersonalityType) => void }>) {
  const key = `peacepad.communication-assessment.${identityId}`;
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<readonly CommunicationAssessmentAnswer[]>([]);
  const [saved, setSaved] = useState(false);
  const suggested = useMemo(() => answers.length === questions.length ? suggestion(answers) : undefined, [answers]);

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(key).then((value) => {
      if (!active || !value) return;
      try {
        const parsed = JSON.parse(value) as { answers?: CommunicationAssessmentAnswer[] };
        if (Array.isArray(parsed.answers)) setAnswers(parsed.answers);
      } catch { /* Invalid local assessment is ignored and can be retaken. */ }
    });
    return () => { active = false; };
  }, [key]);

  const answer = (questionId: CommunicationAssessmentAnswer["questionId"], score: 1 | 3 | 5) => {
    setSaved(false);
    setAnswers((current) => [...current.filter((item) => item.questionId !== questionId), { questionId, score }]);
  };

  const save = async () => {
    if (!suggested) return;
    await SecureStore.setItemAsync(key, JSON.stringify({ answers, suggestedType: suggested, completedAt: new Date().toISOString() }), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    onChoose(suggested);
    setSaved(true);
  };

  return <View style={styles.card}>
    <Text accessibilityRole="header" style={styles.title}>Not sure which style fits?</Text>
    <Text style={styles.body}>Take a private six-question check-in. It suggests a starting point about you only; you can override or clear it anytime.</Text>
    <LabButton label={open ? "Close questions" : answers.length ? "Review my answers" : "Start the short check-in"} onPress={() => setOpen((value) => !value)} variant="secondary" />
    {open ? <View style={styles.stack}>
      {questions.map((question, index) => {
        const selected = answers.find((item) => item.questionId === question.id)?.score;
        return <View key={question.id} style={styles.question}>
          <Text style={styles.questionTitle}>{index + 1}. {question.prompt}</Text>
          <View style={styles.scale}>
            {([1, 3, 5] as const).map((score) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected === score }} key={score} onPress={() => answer(question.id, score)} style={[styles.choice, selected === score ? styles.choiceActive : null]}><Text style={[styles.choiceText, selected === score ? styles.choiceTextActive : null]}>{score === 1 ? question.low : score === 5 ? question.high : "A mix"}</Text></Pressable>)}
          </View>
        </View>;
      })}
      {suggested ? <View style={styles.result}>
        <Text style={styles.resultTitle}>Suggested starting style: {suggested}</Text>
        <Text style={styles.body}>This is communication guidance, not a diagnosis. PeacePad never applies it to the other parent.</Text>
        <LabButton label="Use this style" onPress={() => void save()} />
        {saved ? <Text accessibilityLiveRegion="polite" style={styles.success}>Saved privately on this device and applied to your PeacePad profile.</Text> : null}
      </View> : <Text style={styles.caption}>Answer all six to see a suggestion.</Text>}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.successSurface, borderColor: colors.successBorder, borderRadius: 20, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  stack: { gap: spacing.md },
  title: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  caption: { ...typography.caption, color: colors.muted },
  question: { backgroundColor: colors.surface, borderRadius: 16, gap: spacing.sm, padding: spacing.md },
  questionTitle: { ...typography.body, color: colors.text, fontWeight: "700" },
  scale: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  choiceActive: { backgroundColor: colors.aqua, borderColor: colors.aqua },
  choiceText: { ...typography.caption, color: colors.text, fontWeight: "700" },
  choiceTextActive: { color: colors.onBrand },
  result: { backgroundColor: colors.cream, borderColor: colors.warningBorder, borderRadius: 16, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  resultTitle: { ...typography.subheading, color: colors.text },
  success: { ...typography.caption, color: colors.successText, fontWeight: "700" }
});
