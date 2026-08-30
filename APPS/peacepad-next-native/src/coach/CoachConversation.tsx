import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { File } from "expo-file-system";
import { LabButton } from "../components/LabButton";
import { colors, spacing, typography } from "../theme";
import { buildCalmDraft, type PrepEntryMode, type PrepFeeling } from "../legacy/prepChat";

const feelings: readonly PrepFeeling[] = ["calm", "anxious", "frustrated", "overwhelmed", "sad", "angry"];

type CoachConversationProps = Readonly<{
  onTranscribe: (bytes: ArrayBuffer, mediaType: "audio/m4a") => Promise<string>;
  onUseDraft: (draft: string) => void;
}>;

export function CoachConversation({ onTranscribe, onUseDraft }: CoachConversationProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [open, setOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<PrepEntryMode>("sending");
  const [feeling, setFeeling] = useState<PrepFeeling>("calm");
  const [conversation, setConversation] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const startRecording = async () => {
    setError("");
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError("Microphone access is off. You can still type to Coach, or enable it in phone settings.");
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record({ forDuration: 120 });
  };

  const stopAndTranscribe = async () => {
    setBusy(true);
    setError("");
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!recorder.uri) throw new Error("PeacePad could not open that recording.");
      const bytes = await new File(recorder.uri).arrayBuffer();
      const transcript = await onTranscribe(bytes, "audio/m4a");
      setConversation((current) => current.trim() ? `${current.trim()}\n${transcript}` : transcript);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Coach could not transcribe that recording.");
    } finally {
      setBusy(false);
    }
  };

  const prepare = () => {
    const result = buildCalmDraft(conversation, feeling, entryMode);
    if (!result) {
      setError("Tell Coach what happened or what you want to say first.");
      return;
    }
    setError("");
    setDraft(result);
  };

  return (
    <View accessibilityLabel="PeacePad Coach" style={styles.card}>
      <View style={styles.heroRow}>
        <View style={styles.coachMark}><Text style={styles.coachMarkText}>P</Text></View>
        <View style={styles.heroCopy}>
          <Text accessibilityRole="header" style={styles.heading}>Talk it through with Coach</Text>
          <Text style={styles.body}>Speak or type privately. Coach helps you prepare child-focused wording; nothing is shared until you choose it.</Text>
        </View>
      </View>
      <LabButton label={open ? "Close Coach" : "Open Coach"} onPress={() => setOpen((current) => !current)} variant="secondary" />
      {open ? <View style={styles.stack}>
        <Text style={styles.label}>I am preparing to</Text>
        <View accessibilityRole="radiogroup" style={styles.wrap}>
          {(["sending", "received"] as const).map((mode) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: mode === entryMode }} key={mode} onPress={() => setEntryMode(mode)} style={[styles.chip, mode === entryMode ? styles.chipActive : null]}><Text style={[styles.chipText, mode === entryMode ? styles.chipTextActive : null]}>{mode === "sending" ? "Send a message" : "Respond to a message"}</Text></Pressable>)}
        </View>
        <Text style={styles.label}>How I feel</Text>
        <View accessibilityRole="radiogroup" style={styles.wrap}>
          {feelings.map((value) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: value === feeling }} key={value} onPress={() => setFeeling(value)} style={[styles.chip, value === feeling ? styles.feelingActive : null]}><Text style={[styles.chipText, value === feeling ? styles.feelingTextActive : null]}>{value}</Text></Pressable>)}
        </View>
        <TextInput accessibilityLabel="Coach conversation" multiline onChangeText={(value) => { setConversation(value); setError(""); }} placeholder="Tell Coach what is happening and the practical outcome you need..." placeholderTextColor={colors.muted} style={styles.input} value={conversation} />
        <View style={styles.voiceCard}>
          <Text style={styles.voiceTitle}>{recorderState.isRecording ? `Listening · ${Math.ceil(recorderState.durationMillis / 1000)}s` : "Prefer to speak?"}</Text>
          <Text style={styles.caption}>Record up to two minutes. Audio is sent only for transcription and is not attached to the conversation.</Text>
          <LabButton disabled={busy} label={recorderState.isRecording ? "Stop and transcribe" : busy ? "Transcribing..." : "Speak to Coach"} onPress={() => void (recorderState.isRecording ? stopAndTranscribe() : startRecording())} />
        </View>
        <LabButton disabled={busy || !conversation.trim()} label="Prepare calm wording" onPress={prepare} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {draft ? <View accessibilityLabel="Coach draft" style={styles.draftCard}>
          <Text style={styles.heading}>Your editable draft</Text>
          <TextInput accessibilityLabel="Edit Coach draft" multiline onChangeText={setDraft} style={styles.input} value={draft} />
          <Text style={styles.caption}>Review it yourself. Coach does not diagnose either parent and does not send anything automatically.</Text>
          <LabButton disabled={!draft.trim()} label="Use in message" onPress={() => onUseDraft(draft.trim())} />
          <LabButton label="Start over" onPress={() => { setConversation(""); setDraft(""); setError(""); }} variant="secondary" />
        </View> : null}
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cream, borderColor: colors.warningBorder, borderRadius: 24, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  heroRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  heroCopy: { flex: 1, gap: spacing.xs },
  coachMark: { alignItems: "center", backgroundColor: colors.coral, borderRadius: 18, height: 44, justifyContent: "center", width: 44 },
  coachMarkText: { ...typography.heading, color: colors.onBrand },
  stack: { gap: spacing.md },
  heading: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.text },
  caption: { ...typography.caption, color: colors.muted },
  label: { ...typography.caption, color: colors.text, fontWeight: "800", textTransform: "uppercase" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  feelingActive: { backgroundColor: colors.aqua, borderColor: colors.aqua },
  chipText: { ...typography.caption, color: colors.muted, fontWeight: "700", textTransform: "capitalize" },
  chipTextActive: { color: colors.onBrand },
  feelingTextActive: { color: colors.onBrand },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, color: colors.text, minHeight: 96, padding: spacing.md, textAlignVertical: "top" },
  voiceCard: { backgroundColor: colors.successSurface, borderColor: colors.successBorder, borderRadius: 18, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  voiceTitle: { ...typography.body, color: colors.successText, fontWeight: "800" },
  draftCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  error: { ...typography.body, color: colors.dangerText }
});
