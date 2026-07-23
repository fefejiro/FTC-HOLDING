import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LabButton } from "./components/LabButton";
import { ModuleCard } from "./components/ModuleCard";
import { TimelineItemCard } from "./components/TimelineItemCard";
import {
  binderMetrics,
  calmRewriteSample,
  evidenceItems,
  exportPackages,
  goalOptions,
  premiumModules,
  premiumWorkflows,
  timelineItems
} from "./data/mockPeacePad";
import { colors, spacing, typography } from "./theme";

export type LabScreen = "home" | "onboarding" | "compose" | "logs" | "vault" | "timeline" | "export";

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
        <Text style={styles.eyebrow}>PeacePad Premium Lab</Text>
        <Text style={styles.title}>A calm operating system for parenting records.</Text>
        <Text style={styles.heroBody}>
          Premium is not just "more features." It is the difference between scattered screenshots and a clean,
          source-linked parenting record the user can understand and review with support.
        </Text>
        <View style={styles.heroActions}>
          <LabButton label="Start premium flow" onPress={() => setScreen("onboarding")} />
          <LabButton label="Review export" onPress={() => setScreen("export")} variant="secondary" />
        </View>
      </View>

      <View style={styles.metricGrid}>
        {binderMetrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.caption}>{metric.note}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Premium workflows</Text>
        {premiumWorkflows.map((workflow) => (
          <Pressable
            accessibilityRole="button"
            key={workflow.id}
            onPress={() => setScreen(workflow.id === "binder" ? "vault" : workflow.id === "contact-proof" ? "logs" : "export")}
            style={styles.workflowCard}
          >
            <Text style={styles.choiceTitle}>{workflow.title}</Text>
            <Text style={styles.body}>{workflow.subtitle}</Text>
            <Text style={styles.premiumSignal}>{workflow.premiumSignal}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modules behind the experience</Text>
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
      <View style={styles.premiumInsight}>
        <Text style={styles.choiceTitle}>Premium insight</Text>
        <Text style={styles.body}>
          Tone risk lowered. Parenting request detected. Suggested next step: attach this to the pickup-time timeline
          only if it becomes relevant.
        </Text>
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
        This screen tests neutral, factual logging language before building real storage.
      </Text>
      <View style={styles.card}>
        <Text style={styles.choiceTitle}>New log prototype</Text>
        <Text style={styles.body}>Type: weekly child call</Text>
        <Text style={styles.body}>Outcome: completed</Text>
        <Text style={styles.body}>Tone: factual, child-centred, non-accusatory</Text>
      </View>
      <View style={styles.cardPremium}>
        <Text style={styles.choiceTitle}>Peace Calls proof-first design</Text>
        <Text style={styles.body}>Initial Premium focus is schedule + attempt + outcome + source note.</Text>
        <Text style={styles.caption}>Recording/transcription remains excluded until consent and jurisdiction review.</Text>
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
          <View style={styles.cardHeader}>
            <Text style={styles.choiceTitle}>{item.title}</Text>
            <Text style={styles.statusPill}>{item.status}</Text>
          </View>
          <Text style={styles.body}>Kind: {item.kind}</Text>
          <Text style={styles.body}>Tag: {item.tag}</Text>
          <Text style={styles.body}>Linked event: {item.linkedEvent}</Text>
          <Text style={styles.caption}>{item.integrityNote}</Text>
        </View>
      ))}
      <View style={styles.cardPremium}>
        <Text style={styles.choiceTitle}>Missing evidence prompts</Text>
        <Text style={styles.body}>3 call logs have no source attachment. 2 visit notes need date/source review.</Text>
      </View>
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
      <LabButton label="Build export preview" onPress={() => setScreen("export")} />
    </View>
  );
}

export function ExportScreen({ setScreen }: ScreenProps) {
  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>Premium export preview</Text>
      <Text style={styles.body}>
        The old Premium Delta idea was strongest here: users need a clean package, not another pile of files.
      </Text>
      {exportPackages.map((pack) => (
        <View key={pack.id} style={styles.exportCard}>
          <Text style={styles.choiceTitle}>{pack.title}</Text>
          {pack.includes.map((item) => (
            <Text key={item} style={styles.body}>• {item}</Text>
          ))}
          <Text style={styles.exportCaution}>{pack.caution}</Text>
        </View>
      ))}
      <View style={styles.guardrail}>
        <Text style={styles.guardrailTitle}>Export review gate</Text>
        <Text style={styles.body}>
          Before sharing, the user confirms every included record. AI summaries remain drafts and cite source items.
        </Text>
      </View>
      <LabButton label="Back to premium dashboard" onPress={() => setScreen("home")} variant="secondary" />
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
  heroActions: {
    gap: spacing.sm
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
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexBasis: "30%",
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.lg
  },
  metricValue: {
    ...typography.title,
    color: colors.brand
  },
  metricLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "800",
    textTransform: "uppercase"
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
  workflowCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  premiumSignal: {
    ...typography.caption,
    color: colors.brand,
    fontWeight: "800"
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
  premiumInsight: {
    backgroundColor: "#ECFDF7",
    borderColor: "#BFEBDD",
    borderRadius: 20,
    borderWidth: 1,
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
  cardPremium: {
    backgroundColor: "#FFFAEB",
    borderColor: "#F4D88B",
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  statusPill: {
    ...typography.caption,
    backgroundColor: colors.brandSoft,
    borderRadius: 999,
    color: colors.brand,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    textTransform: "uppercase"
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
  },
  exportCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  exportCaution: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: "700",
    marginTop: spacing.sm
  }
});
