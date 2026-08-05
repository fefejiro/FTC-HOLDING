import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LabButton } from "./components/LabButton";
import {
  calmRewriteSample,
  exportChecklistItems,
  goalOptions,
  parentingOutcomeOptions,
  sourceTypeOptions
} from "./data/mockPeacePad";
import { hasBinderValidationErrors, validateBinderDraft, type BinderDraft, type BinderValidationErrors } from "./lib/binderValidation";
import {
  hasEvidenceValidationErrors,
  validateEvidenceDraft,
  type EvidenceDraft,
  type EvidenceValidationErrors
} from "./lib/evidenceValidation";
import { colors, spacing, typography } from "./theme";
import { syntheticFilePlaceholder, useLabState, type LabGoal } from "./state/LabState";

export type LabScreen =
  | "home"
  | "messages"
  | "calendar"
  | "invite"
  | "records"
  | "more"
  | "onboarding"
  | "binder"
  | "compose"
  | "logs"
  | "vault"
  | "evidence-detail"
  | "timeline"
  | "export";

type ScreenProps = {
  selectedGoal: LabGoal;
  setSelectedGoal: (goal: LabGoal) => void;
  draft: string;
  setDraft: (draft: string) => void;
  setScreen: (screen: LabScreen) => void;
};

export function OnboardingScreen({ selectedGoal, setSelectedGoal, setScreen }: ScreenProps) {
  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>What do you need first?</Text>
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
        label={selectedGoal === "calm-next-message" ? "Continue to compose" : "Continue to binder"}
        onPress={() => setScreen(selectedGoal === "calm-next-message" ? "compose" : "binder")}
      />
    </View>
  );
}

export function BinderScreen({ setScreen }: ScreenProps) {
  const { binder, saveBinder } = useLabState();
  const [binderDraft, setBinderDraft] = useState<BinderDraft>({
    binderName: binder?.name ?? "",
    childInitials: binder?.childLabel ?? "",
    supportContact: binder?.supportContact ?? "",
    selectedSourceTypes: binder?.sourceTypes ?? []
  });
  const [errors, setErrors] = useState<BinderValidationErrors>({});

  const updateDraft = (field: keyof BinderDraft, value: string) => {
    setBinderDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const toggleSourceType = (sourceType: string) => {
    setBinderDraft((current) => {
      const selectedSourceTypes = current.selectedSourceTypes.includes(sourceType)
        ? current.selectedSourceTypes.filter((item) => item !== sourceType)
        : [...current.selectedSourceTypes, sourceType];

      return { ...current, selectedSourceTypes };
    });
    setErrors((current) => ({ ...current, selectedSourceTypes: undefined }));
  };

  const continueToVault = () => {
    const nextErrors = validateBinderDraft(binderDraft);
    setErrors(nextErrors);
    if (!hasBinderValidationErrors(nextErrors)) {
      saveBinder({
        id: binder?.id ?? "binder-synthetic-001",
        name: binderDraft.binderName.trim(),
        childLabel: binderDraft.childInitials.trim(),
        supportContact: binderDraft.supportContact.trim() || undefined,
        sourceTypes: binderDraft.selectedSourceTypes
      });
      setScreen("vault");
    }
  };

  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>Create a binder</Text>
      <Text style={styles.body}>Keep related records together.</Text>
      <View style={styles.card}>
        <Text style={styles.choiceTitle}>Binder details</Text>
        <Text style={styles.fieldLabel}>Binder name</Text>
        <TextInput
          accessibilityLabel="Binder name"
          onChangeText={(value) => updateDraft("binderName", value)}
          placeholder="Example: parenting contact record"
          style={[styles.input, styles.singleLineInput, errors.binderName ? styles.inputError : null]}
          value={binderDraft.binderName}
        />
        {errors.binderName ? <Text style={styles.errorText}>{errors.binderName}</Text> : null}
        <Text style={styles.fieldLabel}>Child label</Text>
        <TextInput
          accessibilityLabel="Child label"
          onChangeText={(value) => updateDraft("childInitials", value)}
          placeholder="Use initials or a neutral label"
          style={[styles.input, styles.singleLineInput, errors.childInitials ? styles.inputError : null]}
          value={binderDraft.childInitials}
        />
        {errors.childInitials ? <Text style={styles.errorText}>{errors.childInitials}</Text> : null}
        <Text style={styles.fieldLabel}>Professional or support contact (optional)</Text>
        <TextInput
          accessibilityLabel="Support contact"
          onChangeText={(value) => updateDraft("supportContact", value)}
          placeholder="Example: lawyer, mediator, support worker"
          style={[styles.input, styles.singleLineInput]}
          value={binderDraft.supportContact}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.choiceTitle}>Records to include</Text>
        {sourceTypeOptions.map((sourceType) => {
          const selected = binderDraft.selectedSourceTypes.includes(sourceType.id);
          return (
            <Pressable
              accessibilityRole="button"
              key={sourceType.id}
              onPress={() => toggleSourceType(sourceType.id)}
              style={[styles.checkRow, selected ? styles.checkRowActive : null]}
            >
              <Text style={styles.checkMark}>{selected ? "✓" : "○"}</Text>
              <View style={styles.checkText}>
                <Text style={styles.choiceTitle}>{sourceType.label}</Text>
                <Text style={styles.body}>{sourceType.description}</Text>
              </View>
            </Pressable>
          );
        })}
        {errors.selectedSourceTypes ? <Text style={styles.errorText}>{errors.selectedSourceTypes}</Text> : null}
      </View>
      <LabButton label="Continue" onPress={continueToVault} />
    </View>
  );
}

export function ComposeScreen({ draft, setDraft, setScreen }: ScreenProps) {
  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>Check your message</Text>
      <Text style={styles.body}>Review tone and clarity before you decide what to send.</Text>
      <TextInput
        multiline
        onChangeText={setDraft}
        placeholder="Paste or type the message you want to calm down..."
        style={styles.input}
        value={draft}
      />
      <View style={styles.suggestion}>
        <Text style={styles.eyebrowDark}>Suggested rewrite</Text>
        <Text style={styles.body}>{calmRewriteSample}</Text>
      </View>
      <Text style={styles.caption}>PeacePad does not send automatically.</Text>
      <LabButton label="Go to messages" onPress={() => setScreen("messages")} />
    </View>
  );
}

export function LogsScreen({ setScreen }: ScreenProps) {
  const [selectedOutcome, setSelectedOutcome] = useState("Completed");

  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>Calls and parenting time</Text>
      <View style={styles.card}>
        <Text style={styles.choiceTitle}>New entry</Text>
        <Text style={styles.fieldLabel}>Type</Text>
        <Text style={styles.body}>Weekly child call</Text>
        <Text style={styles.fieldLabel}>Outcome</Text>
        <Text style={styles.body}>{selectedOutcome}</Text>
      </View>
      {parentingOutcomeOptions.map((option) => (
        <Pressable
          accessibilityRole="button"
          key={option.id}
          onPress={() => setSelectedOutcome(option.label)}
          style={[styles.choice, selectedOutcome === option.label ? styles.choiceActive : null]}
        >
          <Text style={styles.choiceTitle}>{option.label}</Text>
          <Text style={styles.body}>{option.description}</Text>
        </Pressable>
      ))}
      <LabButton label="View timeline" onPress={() => setScreen("timeline")} />
    </View>
  );
}

export function VaultScreen({ setScreen }: ScreenProps) {
  const { binder, evidence, saveEvidence } = useLabState();
  const [evidenceDraft, setEvidenceDraft] = useState<EvidenceDraft>({
    title: evidence?.title ?? "",
    category: evidence?.category ?? "screenshots",
    eventDate: evidence?.eventDate ?? "",
    source: evidence?.source ?? "",
    description: evidence?.description ?? "",
    originalFileName: evidence?.originalFile.fileName ?? syntheticFilePlaceholder.fileName
  });
  const [errors, setErrors] = useState<EvidenceValidationErrors>({});

  const updateDraft = (field: keyof EvidenceDraft, value: string) => {
    setEvidenceDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const continueToDetail = () => {
    const nextErrors = validateEvidenceDraft(evidenceDraft);
    setErrors(nextErrors);
    if (!hasEvidenceValidationErrors(nextErrors)) {
      saveEvidence({
        id: evidence?.id ?? "evidence-synthetic-001",
        binderId: binder?.id ?? "binder-synthetic-001",
        title: evidenceDraft.title.trim(),
        category: evidenceDraft.category,
        eventDate: evidenceDraft.eventDate.trim(),
        source: evidenceDraft.source.trim(),
        description: evidenceDraft.description.trim(),
        originalFile: {
          ...syntheticFilePlaceholder,
          fileName: evidenceDraft.originalFileName.trim()
        },
        reviewStatus: evidence?.reviewStatus ?? "draft"
      });
      setScreen("evidence-detail");
    }
  };

  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>Add record details</Text>
      <Text style={styles.body}>Add context now so the record is easier to understand later.</Text>
      <View style={styles.card}>
        <Text style={styles.choiceTitle}>Record information</Text>
        <Text style={styles.fieldLabel}>Source title</Text>
        <TextInput
          accessibilityLabel="Evidence title"
          onChangeText={(value) => updateDraft("title", value)}
          placeholder="Example: weekly child call screenshot"
          style={[styles.input, styles.singleLineInput, errors.title ? styles.inputError : null]}
          value={evidenceDraft.title}
        />
        {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
        <Text style={styles.fieldLabel}>Source type</Text>
        <View style={styles.inlineOptions}>
          {sourceTypeOptions.map((sourceType) => {
            const selected = evidenceDraft.category === sourceType.id;
            return (
              <Pressable
                accessibilityRole="button"
                key={sourceType.id}
                onPress={() => updateDraft("category", sourceType.id)}
                style={[styles.inlineOption, selected ? styles.inlineOptionActive : null]}
              >
                <Text style={[styles.inlineOptionText, selected ? styles.inlineOptionTextActive : null]}>
                  {sourceType.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
        <Text style={styles.fieldLabel}>Event date</Text>
        <TextInput
          accessibilityLabel="Evidence event date"
          onChangeText={(value) => updateDraft("eventDate", value)}
          placeholder="YYYY-MM-DD"
          style={[styles.input, styles.singleLineInput, errors.eventDate ? styles.inputError : null]}
          value={evidenceDraft.eventDate}
        />
        {errors.eventDate ? <Text style={styles.errorText}>{errors.eventDate}</Text> : null}
        <Text style={styles.fieldLabel}>Source</Text>
        <TextInput
          accessibilityLabel="Evidence source"
          onChangeText={(value) => updateDraft("source", value)}
          placeholder="Example: message thread or school email"
          style={[styles.input, styles.singleLineInput, errors.source ? styles.inputError : null]}
          value={evidenceDraft.source}
        />
        {errors.source ? <Text style={styles.errorText}>{errors.source}</Text> : null}
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          accessibilityLabel="Evidence description"
          multiline
          onChangeText={(value) => updateDraft("description", value)}
          placeholder="Short factual description. No legal conclusions."
          style={[styles.input, styles.noteInput, errors.description ? styles.inputError : null]}
          value={evidenceDraft.description}
        />
        {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
      </View>
      <LabButton label="Review details" onPress={continueToDetail} />
    </View>
  );
}

export function EvidenceDetailScreen({ setScreen }: ScreenProps) {
  const { evidence, confirmEvidence } = useLabState();

  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>Record details</Text>
      {evidence ? <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.choiceTitle}>{evidence.title}</Text>
          <Text style={styles.statusPill}>{evidence.reviewStatus}</Text>
        </View>
        <Text style={styles.body}>Category: {evidence.category}</Text>
        <Text style={styles.body}>Event date: {evidence.eventDate}</Text>
        <Text style={styles.body}>Source: {evidence.source}</Text>
        <Text style={styles.body}>Description: {evidence.description}</Text>
      </View> : <View style={styles.card}>
        <Text style={styles.choiceTitle}>No record selected</Text>
        <Text style={styles.body}>Add record details before reviewing them.</Text>
      </View>}
      {evidence?.reviewStatus === "confirmed" ? (
        <LabButton label="View generated timeline entry" onPress={() => setScreen("timeline")} />
      ) : evidence ? (
        <LabButton
          label="Confirm review"
          onPress={() => {
            confirmEvidence();
            setScreen("timeline");
          }}
        />
      ) : null}
      <LabButton label="Back to records" onPress={() => setScreen("vault")} variant="secondary" />
    </View>
  );
}

export function TimelineScreen({ setScreen }: ScreenProps) {
  const { timelineEntry } = useLabState();
  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>Timeline</Text>
      <Text style={styles.body}>Confirmed records appear here in date order.</Text>
      {timelineEntry ? (
        <View style={styles.card}>
          <Text style={styles.choiceTitle}>{timelineEntry.title}</Text>
          <Text style={styles.body}>Date: {timelineEntry.eventDate}</Text>
          <Text style={styles.body}>{timelineEntry.description}</Text>
          <Text style={styles.caption}>Source: {timelineEntry.sourceLabel}</Text>
        </View>
      ) : <View style={styles.card}><Text style={styles.body}>No timeline entries yet.</Text></View>}
      <View style={styles.guardrail}>
        <Text style={styles.guardrailTitle}>About this timeline</Text>
        <Text style={styles.body}>
          PeacePad organizes what you enter. It does not decide legal meaning or guarantee court use.
        </Text>
      </View>
      <LabButton label="Build export preview" onPress={() => setScreen("export")} />
    </View>
  );
}

export function ExportScreen({ setScreen }: ScreenProps) {
  const {
    evidence,
    timelineEntry,
    exportSelection,
    setEvidenceSelectedForExport,
    setTimelineSelectedForExport
  } = useLabState();
  const [included, setIncluded] = useState<Record<string, boolean>>(
    Object.fromEntries(exportChecklistItems.map((item) => [item.id, item.includedByDefault]))
  );

  const toggle = (id: string) => {
    setIncluded((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>Export preview</Text>
      <Text style={styles.body}>Choose what to include before sharing.</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose records</Text>
        {evidence ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setEvidenceSelectedForExport(!exportSelection.evidenceIds.includes(evidence.id))}
            style={[styles.checkRow, exportSelection.evidenceIds.includes(evidence.id) ? styles.checkRowActive : null]}
          >
            <Text style={styles.checkMark}>{exportSelection.evidenceIds.includes(evidence.id) ? "On" : "Off"}</Text>
            <Text style={styles.body}>Evidence: {evidence.title}</Text>
          </Pressable>
        ) : null}
        {timelineEntry ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setTimelineSelectedForExport(!exportSelection.timelineEntryIds.includes(timelineEntry.id))
            }
            style={[
              styles.checkRow,
              exportSelection.timelineEntryIds.includes(timelineEntry.id) ? styles.checkRowActive : null
            ]}
          >
            <Text style={styles.checkMark}>
              {exportSelection.timelineEntryIds.includes(timelineEntry.id) ? "On" : "Off"}
            </Text>
            <Text style={styles.body}>Timeline: {timelineEntry.title}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.caption}>
          Selected: {exportSelection.evidenceIds.length} evidence and {exportSelection.timelineEntryIds.length} timeline
        </Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export checklist</Text>
        {exportChecklistItems.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.id}
            onPress={() => toggle(item.id)}
            style={[styles.checkRow, included[item.id] ? styles.checkRowActive : null]}
          >
            <Text style={styles.checkMark}>{included[item.id] ? "✓" : "○"}</Text>
            <Text style={styles.body}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.guardrail}>
        <Text style={styles.guardrailTitle}>Review before sharing</Text>
        <Text style={styles.body}>
          Confirm every included record. Generated summaries remain drafts and cite their sources.
        </Text>
      </View>
      <LabButton label="Back to home" onPress={() => setScreen("home")} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  hero: {
    backgroundColor: colors.brand,
    borderRadius: 28,
    gap: spacing.md,
    padding: spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6
  },
  heroActions: { gap: spacing.sm },
  heroPills: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingTop: spacing.xs },
  heroPill: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6
  },
  heroPillText: { color: colors.onBrand, fontSize: 12, fontWeight: "800", letterSpacing: 0.2 },
  eyebrow: {
    color: colors.brandSoft,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  eyebrowDark: { ...typography.caption, color: colors.brand, fontWeight: "800", textTransform: "uppercase" },
  title: { ...typography.title, color: colors.onBrand },
  heroBody: { ...typography.body, color: colors.brandSoft },
  section: { gap: spacing.md },
  eyebrowBlock: { gap: spacing.xs },
  sectionTitle: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  caption: { ...typography.caption, color: colors.muted },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexBasis: "30%",
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2
  },
  metricValue: { ...typography.title, color: colors.brand },
  metricLabel: { ...typography.caption, color: colors.text, fontWeight: "800", textTransform: "uppercase" },
  quickActions: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2
  },
  quickActionsHeader: { gap: spacing.xs },
  quickActionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  quickAction: {
    backgroundColor: colors.brandSoft,
    borderRadius: 14,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: "center"
  },
  quickActionText: { ...typography.caption, color: colors.brand, fontWeight: "800" },
  choice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg
  },
  choiceActive: { borderColor: colors.brand, borderWidth: 2 },
  choiceTitle: { ...typography.subheading, color: colors.text },
  workflowCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1
  },
  premiumSignal: { ...typography.caption, color: colors.brand, fontWeight: "800" },
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
  singleLineInput: {
    minHeight: 52,
    textAlignVertical: "center"
  },
  noteInput: {
    minHeight: 88
  },
  inputError: {
    borderColor: colors.dangerBorder,
    borderWidth: 2
  },
  fieldLabel: { ...typography.caption, color: colors.text, fontWeight: "800", textTransform: "uppercase" },
  errorText: { ...typography.caption, color: colors.dangerText, fontWeight: "700" },
  suggestion: { backgroundColor: colors.brandSoft, borderRadius: 20, gap: spacing.sm, padding: spacing.lg },
  premiumInsight: {
    backgroundColor: colors.successSurface,
    borderColor: colors.successBorder,
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
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1
  },
  cardPremium: {
    backgroundColor: colors.warningSurface,
    borderColor: colors.warningBorder,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1
  },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
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
  lockedPill: { backgroundColor: colors.subtleSurface, color: colors.muted },
  guardrail: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, padding: spacing.lg },
  guardrailTitle: { ...typography.subheading, color: colors.text },
  exportCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1
  },
  exportCaution: { ...typography.caption, color: colors.warning, fontWeight: "700", marginTop: spacing.sm },
  checkRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  checkText: { flex: 1, gap: spacing.xs },
  checkRowActive: { borderColor: colors.accent, backgroundColor: colors.successSurface },
  checkMark: { color: colors.accent, fontSize: 22, fontWeight: "800" },
  inlineOptions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  inlineOption: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  inlineOptionActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  inlineOptionText: { ...typography.caption, color: colors.muted, fontWeight: "800" },
  inlineOptionTextActive: { color: colors.onBrand }
});

