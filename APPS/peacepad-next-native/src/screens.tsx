import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LabButton } from "./components/LabButton";
import { ModuleCard } from "./components/ModuleCard";
import { TimelineItemCard } from "./components/TimelineItemCard";
import {
  binderMetrics,
  binderSetupSteps,
  calmRewriteSample,
  evidenceItems,
  evidencePrepStatuses,
  exportChecklistItems,
  exportPackages,
  goalOptions,
  parentingOutcomeOptions,
  premiumModules,
  premiumWorkflows,
  sourceTypeOptions,
  timelineItems
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

export function HomeScreen({ setScreen }: ScreenProps) {
  const quickActions: Array<{ label: string; screen: LabScreen }> = [
    { label: "Goal Setup", screen: "onboarding" },
    { label: "Case Binder", screen: "binder" },
    { label: "Calm Compose", screen: "compose" },
    { label: "Parenting Logs", screen: "logs" },
    { label: "Evidence Vault", screen: "vault" },
    { label: "Evidence Detail", screen: "evidence-detail" },
    { label: "Timeline", screen: "timeline" },
    { label: "Export Preview", screen: "export" }
  ];

  return (
    <View style={styles.stack}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>PeacePad Premium Lab</Text>
        <Text style={styles.title}>A calm operating system for parenting records.</Text>
        <Text style={styles.heroBody}>
          Premium is not just "more features." It is the difference between scattered screenshots and a clean,
          source-linked parenting record the user can understand and review with support.
        </Text>
        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>Source-linked</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>Lab-only data</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>Premium preview</Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          <LabButton label="Start premium flow" onPress={() => setScreen("onboarding")} />
          <LabButton label="Review export" onPress={() => setScreen("export")} variant="secondary" />
          <LabButton label="Open evidence detail" onPress={() => setScreen("evidence-detail")} variant="secondary" />
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

      <View style={styles.quickActions}>
        <View style={styles.quickActionsHeader}>
          <Text style={styles.sectionTitle}>Lab ops quick actions</Text>
          <Text style={styles.caption}>Jump straight to a QA route</Text>
        </View>
        <View style={styles.quickActionGrid}>
          {quickActions.map((action) => (
            <Pressable
              accessibilityLabel={`Open ${action.label}`}
              accessibilityRole="button"
              key={action.screen}
              onPress={() => setScreen(action.screen)}
              style={styles.quickAction}
            >
              <Text style={styles.quickActionText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Premium workflows</Text>
        {premiumWorkflows.map((workflow) => (
          <Pressable
            accessibilityRole="button"
            key={workflow.id}
            onPress={() => setScreen(workflow.id === "binder" ? "binder" : workflow.id === "contact-proof" ? "logs" : "export")}
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
      <Text style={styles.eyebrow}>Premium routing</Text>
      <Text style={styles.sectionTitle}>What do you need first?</Text>
      <Text style={styles.body}>
        PeacePad starts by routing users to the next useful action, not a long onboarding wall.
      </Text>
      <View style={styles.cardPremium}>
        <Text style={styles.choiceTitle}>Premium promise</Text>
        <Text style={styles.body}>
          The app should feel calm, guided, and specific from the first tap.
        </Text>
      </View>
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
    binderName: binder?.name ?? "Parenting contact record",
    childInitials: binder?.childLabel ?? "Child A",
    supportContact: binder?.supportContact ?? "",
    selectedSourceTypes: binder?.sourceTypes ?? ["screenshots", "call-logs"]
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
      <Text style={styles.eyebrow}>Premium setup</Text>
      <Text style={styles.sectionTitle}>Case Binder setup</Text>
      <Text style={styles.body}>
        The binder is the Premium home base: one calm workspace for people, source types, logs, and export readiness.
      </Text>
      <View style={styles.cardPremium}>
        <Text style={styles.choiceTitle}>Premium setup flow</Text>
        <Text style={styles.body}>
          Keep the first setup minimal, but make the structure and language feel deliberate.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.choiceTitle}>Binder details</Text>
        <Text style={styles.caption}>Lab form only. No data is saved or uploaded.</Text>
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
        <Text style={styles.fieldLabel}>Trusted reviewer or support contact optional</Text>
        <TextInput
          accessibilityLabel="Support contact"
          onChangeText={(value) => updateDraft("supportContact", value)}
          placeholder="Example: lawyer, mediator, support worker"
          style={[styles.input, styles.singleLineInput]}
          value={binderDraft.supportContact}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.choiceTitle}>Source types to organize first</Text>
        <Text style={styles.caption}>Pick the records PeacePad should help structure before anything gets exported.</Text>
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
      {binderSetupSteps.map((step) => (
        <View key={step.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.choiceTitle}>{step.title}</Text>
            <Text style={[styles.statusPill, step.status === "locked" ? styles.lockedPill : null]}>{step.status}</Text>
          </View>
          <Text style={styles.body}>{step.description}</Text>
        </View>
      ))}
      <View style={styles.cardPremium}>
        <Text style={styles.choiceTitle}>Premium setup principle</Text>
        <Text style={styles.body}>
          Ask for the minimum needed to organize records. Let users add sensitive details later, deliberately.
        </Text>
      </View>
      <LabButton label="Validate and continue to evidence vault" onPress={continueToVault} />
    </View>
  );
}

export function ComposeScreen({ draft, setDraft, setScreen }: ScreenProps) {
  return (
    <View style={styles.stack}>
      <Text style={styles.eyebrow}>Premium messaging</Text>
      <Text style={styles.sectionTitle}>Calm Compose</Text>
      <Text style={styles.body}>
        Draft stays local in this lab. The suggestion is mock output, not a sent message.
      </Text>
      <View style={styles.cardPremium}>
        <Text style={styles.choiceTitle}>Premium tone support</Text>
        <Text style={styles.body}>
          The goal is to lower escalation and make next-step writing feel confident, not cold.
        </Text>
      </View>
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
  const [selectedOutcome, setSelectedOutcome] = useState("Completed");

  return (
    <View style={styles.stack}>
      <Text style={styles.eyebrow}>Premium records</Text>
      <Text style={styles.sectionTitle}>Parenting-time and child-call logs</Text>
      <Text style={styles.body}>This screen tests neutral, factual logging language before building real storage.</Text>
      <View style={styles.cardPremium}>
        <Text style={styles.choiceTitle}>Premium record design</Text>
        <Text style={styles.body}>
          Entries should read like clear history, not argument. That keeps the record trustworthy.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.choiceTitle}>New log prototype</Text>
        <Text style={styles.body}>Type: weekly child call</Text>
        <Text style={styles.body}>Selected outcome: {selectedOutcome}</Text>
        <Text style={styles.body}>Tone: factual, child-centred, non-accusatory</Text>
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
  const { binder, evidence, saveEvidence } = useLabState();
  const [evidenceDraft, setEvidenceDraft] = useState<EvidenceDraft>({
    title: evidence?.title ?? "Weekly child call screenshot",
    category: evidence?.category ?? "screenshots",
    eventDate: evidence?.eventDate ?? "2026-07-21",
    source: evidence?.source ?? "Synthetic parenting communication",
    description: evidence?.description ?? "Synthetic screenshot showing a completed weekly child call.",
    originalFileName: evidence?.originalFile.fileName ?? syntheticFilePlaceholder.fileName
  });
  const [errors, setErrors] = useState<EvidenceValidationErrors>({});
  const [prepStatus, setPrepStatus] = useState("metadata-ready");

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
      <Text style={styles.eyebrow}>Premium evidence</Text>
      <Text style={styles.sectionTitle}>Evidence Vault concept</Text>
      <Text style={styles.body}>
        Mock metadata only. No real court files, screenshots, or private records are stored here.
      </Text>
      <View style={styles.cardPremium}>
        <Text style={styles.choiceTitle}>Premium vault principle</Text>
        <Text style={styles.body}>
          Source context comes first; uploading and exporting should feel deliberate, not accidental.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.choiceTitle}>Prepare a source before upload</Text>
        <Text style={styles.caption}>Premium rule: context first, upload later. This keeps sensitive files deliberate.</Text>
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
          placeholder="Example: synthetic parenting communication"
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
        <Text style={styles.fieldLabel}>Original file placeholder</Text>
        <TextInput
          accessibilityLabel="Original file placeholder"
          onChangeText={(value) => updateDraft("originalFileName", value)}
          placeholder="Synthetic file name only"
          style={[styles.input, styles.singleLineInput, errors.originalFileName ? styles.inputError : null]}
          value={evidenceDraft.originalFileName}
        />
        {errors.originalFileName ? <Text style={styles.errorText}>{errors.originalFileName}</Text> : null}
      </View>
      <LabButton label="Validate metadata and open detail" onPress={continueToDetail} variant="secondary" />
      <View style={styles.cardPremium}>
        <Text style={styles.choiceTitle}>Upload-readiness status</Text>
        {evidencePrepStatuses.map((status) => (
          <Pressable
            accessibilityRole="button"
            key={status.id}
            onPress={() => setPrepStatus(status.id)}
            style={[styles.checkRow, prepStatus === status.id ? styles.checkRowActive : null]}
          >
            <Text style={styles.checkMark}>{prepStatus === status.id ? "On" : "Off"}</Text>
            <View style={styles.checkText}>
              <Text style={styles.choiceTitle}>{status.label}</Text>
              <Text style={styles.body}>{status.description}</Text>
            </View>
          </Pressable>
        ))}
      </View>
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

export function EvidenceDetailScreen({ setScreen }: ScreenProps) {
  const { evidence, confirmEvidence } = useLabState();
  const item = evidenceItems[0];

  return (
    <View style={styles.stack}>
      <Text style={styles.eyebrow}>Premium review</Text>
      <Text style={styles.sectionTitle}>Evidence detail</Text>
      <Text style={styles.body}>
        This is the screen where Premium starts feeling serious: every source gets context before it becomes part of a
        timeline or export package.
      </Text>
      <View style={styles.cardPremium}>
        <Text style={styles.choiceTitle}>Premium review gate</Text>
        <Text style={styles.body}>
          The screen should feel like a careful review room: source first, interpretation second.
        </Text>
      </View>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.choiceTitle}>{evidence?.title ?? item.title}</Text>
          <Text style={styles.statusPill}>{evidence?.reviewStatus ?? "sample"}</Text>
        </View>
        <Text style={styles.body}>Category: {evidence?.category ?? item.kind}</Text>
        <Text style={styles.body}>Event date: {evidence?.eventDate ?? "Synthetic sample"}</Text>
        <Text style={styles.body}>Source: {evidence?.source ?? item.linkedEvent}</Text>
        <Text style={styles.body}>Description: {evidence?.description ?? item.integrityNote}</Text>
        <Text style={styles.caption}>
          Original placeholder: {evidence?.originalFile.fileName ?? "No saved vertical-slice record yet"}
        </Text>
      </View>
      <View style={styles.guardrail}>
        <Text style={styles.guardrailTitle}>AI summary gate</Text>
        <Text style={styles.body}>
          AI can summarize this record only after extraction. The user reviews the summary before it is saved or exported.
        </Text>
      </View>
      {evidence?.reviewStatus === "confirmed" ? (
        <LabButton label="View generated timeline entry" onPress={() => setScreen("timeline")} />
      ) : (
        <LabButton
          label="Confirm evidence review"
          onPress={() => {
            confirmEvidence();
            setScreen("timeline");
          }}
        />
      )}
      <LabButton label="Back to vault" onPress={() => setScreen("vault")} variant="secondary" />
    </View>
  );
}

export function TimelineScreen({ setScreen }: ScreenProps) {
  const { timelineEntry } = useLabState();
  return (
    <View style={styles.stack}>
      <Text style={styles.eyebrow}>Premium chronology</Text>
      <Text style={styles.sectionTitle}>Source-linked timeline</Text>
      <Text style={styles.body}>Each timeline card should link back to source records and avoid legal conclusions.</Text>
      <View style={styles.cardPremium}>
        <Text style={styles.choiceTitle}>Premium timeline logic</Text>
        <Text style={styles.body}>
          Each entry should feel traceable, readable, and safe to review later.
        </Text>
      </View>
      {timelineEntry ? (
        <View style={styles.card}>
          <Text style={styles.choiceTitle}>{timelineEntry.title}</Text>
          <Text style={styles.body}>Date: {timelineEntry.eventDate}</Text>
          <Text style={styles.body}>{timelineEntry.description}</Text>
          <Text style={styles.caption}>Source: {timelineEntry.sourceLabel}</Text>
          <Text style={styles.premiumSignal}>Linked evidence: {timelineEntry.evidenceId}</Text>
        </View>
      ) : null}
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
      <Text style={styles.eyebrow}>Premium package</Text>
      <Text style={styles.sectionTitle}>Premium export preview</Text>
      <Text style={styles.body}>
        The old Premium Delta idea was strongest here: users need a clean package, not another pile of files.
      </Text>
      <View style={styles.cardPremium}>
        <Text style={styles.choiceTitle}>Premium export principle</Text>
        <Text style={styles.body}>
          The package should read like a curated case packet, not a folder dump.
        </Text>
      </View>
      {exportPackages.map((pack) => (
        <View key={pack.id} style={styles.exportCard}>
          <Text style={styles.choiceTitle}>{pack.title}</Text>
          {pack.includes.map((item) => (
            <Text key={item} style={styles.body}>- {item}</Text>
          ))}
          <Text style={styles.exportCaution}>{pack.caution}</Text>
        </View>
      ))}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vertical-slice items</Text>
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
  stack: { gap: spacing.lg },
  hero: {
    backgroundColor: colors.brand,
    borderRadius: 28,
    gap: spacing.md,
    padding: spacing.xl,
    shadowColor: "#2D0C66",
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
  heroPillText: { color: colors.white, fontSize: 12, fontWeight: "800", letterSpacing: 0.2 },
  eyebrow: {
    color: colors.brandSoft,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  eyebrowDark: { ...typography.caption, color: colors.brand, fontWeight: "800", textTransform: "uppercase" },
  title: { ...typography.title, color: colors.white },
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
    shadowColor: "#2D0C66",
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
    shadowColor: "#2D0C66",
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
    shadowColor: "#2D0C66",
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
    borderColor: "#DC2626",
    borderWidth: 2
  },
  fieldLabel: { ...typography.caption, color: colors.text, fontWeight: "800", textTransform: "uppercase" },
  errorText: { ...typography.caption, color: "#B91C1C", fontWeight: "700" },
  suggestion: { backgroundColor: colors.brandSoft, borderRadius: 20, gap: spacing.sm, padding: spacing.lg },
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
    padding: spacing.lg,
    shadowColor: "#2D0C66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1
  },
  cardPremium: {
    backgroundColor: "#FFF8E8",
    borderColor: "#F0D48B",
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    shadowColor: "#2D0C66",
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
  lockedPill: { backgroundColor: "#F3F4F6", color: colors.muted },
  guardrail: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, padding: spacing.lg },
  guardrailTitle: { ...typography.subheading, color: colors.text },
  exportCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    shadowColor: "#2D0C66",
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
  checkRowActive: { borderColor: colors.accent, backgroundColor: "#ECFDF7" },
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
  inlineOptionTextActive: { color: colors.white }
});

