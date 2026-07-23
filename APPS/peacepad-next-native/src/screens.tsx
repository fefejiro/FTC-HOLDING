import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LabButton } from "./components/LabButton";
import { ModuleCard } from "./components/ModuleCard";
import { TimelineItemCard } from "./components/TimelineItemCard";
import {
  calmRewriteSample,
  evidenceItems,
  goalOptions,
  premiumModules,
  timelineItems
} from "./data/mockPeacePad";
import { colors, spacing, typography } from "./theme";

export type LabScreen = "home" | "onboarding" | "compose" | "logs" | "vault" | "timeline";

type ScreenProps = {
  selectedGoal: string;
  setSelectedGoal: (goal: string) => void;
  draft: string;
  setDraft: (draft: string) => void;
  setScreen: (screen: LabScreen) => void;
};

export function HomeScreen({ setScreen }: ScreenProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>PeacePad Next Lab</Text>
        <Text style={styles.title}>Communicate calmly. Keep the record. Protect parenting time.</Text>
        <Text style={styles.heroBody}>
          A mock-data React Native prototype for testing Premium onboarding, parenting logs, evidence organization, and
          source-linked timelines without touching the submitted App Store build.
        </Text>
        <LabButton label="Start lab onboarding" onPress={() => setScreen("onboarding")} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Premium modules to test</Text>
        {premiumModules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </View>
    </View>
  );
}

export function OnboardingScreen({ selectedGoal, setSelectedGoal, setScreen }: ScreenProps) {
  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>What do you need first?</Text>
      <Text style={styles.body}>This tests whether PeacePad can route users to value before asking for heavy setup.</Text>
      {goalOptions.map((goal) => (
        <Pressable
          accessibilityRole="button"
          key={goal.id}
          onPress={() => setSelectedGoal(goal.id)}
          style={[styles.choice, selectedGoal === goal.id ? styles.choiceActive : null]}
        >
          <Text style={styles.choiceTitle}>{goal.title}</Text>
          <Text style={styles.body}>{goal.description}</Text>
        </Pressable>
      ))}
      <LabButton
        label={selectedGoal === "calm-next-message" ? "Continue to compose" : "Continue to timeline"}
        onPress={() => setScreen(selectedGoal === "calm-next-message" ? "compose" : "timeline")}
      />
    </View>
  );
}

export function ComposeScreen({ draft, setDraft, setScreen }: ScreenProps) {
  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>Calm Compose</Text>
      <Text style={styles.body}>Draft stays local in this lab. The suggestion is mock output, not a sent message.</Text>
      <TextInput
        multiline
        onChangeText={setDraft}
        placeholder="Paste or type the message you want to calm down..."
        style={styles.input}
        value={draft}
      />
      <View style={styles.suggestion}>
        <Text style={styles.eyebrowDark}>Mock calmer rewrite</Text>
        <Text style={styles.body}>{calmRewriteSample}</Text>
      </View>
      <LabButton label="Attach to timeline concept" onPress={() => setScreen("timeline")} />
    </View>
  );
}

export function LogsScreen({ setScreen }: ScreenProps) {
  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>Parenting-time and child-call logs</Text>
      <Text style={styles.body}>
        This screen is for testing neutral, factual logging language before building real storage.
      </Text>
      <View style={styles.card}>
        <Text style={styles.choiceTitle}>New log prototype</Text>
        <Text style={styles.body}>Type: weekly child call</Text>
        <Text style={styles.body}>Outcome: completed</Text>
        <Text style={styles.body}>Tone: factual, child-centred, non-accusatory</Text>
      </View>
      <LabButton label="View timeline impact" onPress={() => setScreen("timeline")} />
    </View>
  );
}

export function VaultScreen({ setScreen }: ScreenProps) {
  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>Evidence Vault concept</Text>
      <Text style={styles.body}>Mock metadata only. No real court files, screenshots, or private records are stored here.</Text>
      {evidenceItems.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.choiceTitle}>{item.title}</Text>
          <Text style={styles.body}>Kind: {item.kind}</Text>
          <Text style={styles.body}>Linked event: {item.linkedEvent}</Text>
          <Text style={styles.caption}>{item.integrityNote}</Text>
        </View>
      ))}
      <LabButton label="Review source-linked timeline" onPress={() => setScreen("timeline")} />
    </View>
  );
}

export function TimelineScreen({ setScreen }: ScreenProps) {
  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>Source-linked timeline</Text>
      <Text style={styles.body}>Each timeline card should link back to source records and avoid legal conclusions.</Text>
      {timelineItems.map((item) => (
        <TimelineItemCard key={item.id} item={item} />
      ))}
      <View style={styles.guardrail}>
        <Text style={styles.guardrailTitle}>Safety copy under test</Text>
        <Text style={styles.body}>
          PeacePad organizes what you enter. It does not decide legal meaning or guarantee court use.
        </Text>
      </View>
      <LabButton label="Back to home" onPress={() => setScreen("home")} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg
  },
  hero: {
    backgroundColor: colors.brand,
    borderRadius: 28,
    gap: spacing.md,
    padding: spacing.xl
  },
  eyebrow: {
    color: colors.brandSoft,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  eyebrowDark: {
    ...typography.caption,
    color: colors.brand,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    ...typography.title,
    color: colors.white
  },
  heroBody: {
    ...typography.body,
    color: colors.brandSoft
  },
  section: {
    gap: spacing.md
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text
  },
  body: {
    ...typography.body,
    color: colors.muted
  },
  caption: {
    ...typography.caption,
    color: colors.muted
  },
  choice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg
  },
  choiceActive: {
    borderColor: colors.brand,
    borderWidth: 2
  },
  choiceTitle: {
    ...typography.subheading,
    color: colors.text
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    color: colors.text,
    minHeight: 140,
    padding: spacing.lg,
    textAlignVertical: "top"
  },
  suggestion: {
    backgroundColor: colors.brandSoft,
    borderRadius: 20,
    gap: spacing.sm,
    padding: spacing.lg
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  guardrail: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.lg
  },
  guardrailTitle: {
    ...typography.subheading,
    color: colors.text
  }
});

