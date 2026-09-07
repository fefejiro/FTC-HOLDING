import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { File } from "expo-file-system";
import * as Speech from "expo-speech";
import { LabButton } from "../components/LabButton";
import { colors, spacing, typography } from "../theme";
import { buildCalmDraft, type CoachEntryMode, type CoachFeeling } from "./coachDraft";
import type { CoachConversationMessage, CoachConversationTurn } from "../api/CoordinationApi";

const feelings: readonly CoachFeeling[] = ["calm", "anxious", "frustrated", "overwhelmed", "sad", "angry"];

type CoachConversationProps = Readonly<{
  onTranscribe: (bytes: ArrayBuffer, mediaType: "audio/m4a") => Promise<string>;
  onConversationTurn?: (input: { topic: string; feeling: CoachFeeling; entryMode: CoachEntryMode; messages: readonly CoachConversationMessage[] }) => Promise<CoachConversationTurn>;
  onUseDraft: (draft: string) => void;
}>;

export function CoachConversation({ onTranscribe, onConversationTurn, onUseDraft }: CoachConversationProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [open, setOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<CoachEntryMode>("sending");
  const [feeling, setFeeling] = useState<CoachFeeling>("calm");
  const [conversation, setConversation] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [turns, setTurns] = useState<readonly CoachConversationMessage[]>([]);
  const [turnBusy, setTurnBusy] = useState(false);

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

  const askCoach = async () => {
    const topic = conversation.trim();
    if (!topic) return;
    setTurnBusy(true);
    setError("");
    try {
      const result = onConversationTurn
        ? await onConversationTurn({ topic, feeling, entryMode, messages: [...turns, { role: "parent", content: topic }] })
        : { reply: "Let us keep this focused on the child and one clear next step.", draft: buildCalmDraft(topic, feeling, entryMode) || null, note: null, provider: "local-fallback" as const };
      setTurns((current) => [...current, { role: "parent", content: topic }, { role: "coach", content: result.reply }]);
      if (result.draft) setDraft(result.draft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Coach is unavailable right now. You can still prepare a draft locally.");
    } finally {
      setTurnBusy(false);
    }
  };

  const toggleDraftSpeech = async () => {
    if (speaking) {
      await Speech.stop();
      setSpeaking(false);
      return;
    }
    if (!draft.trim()) return;
    setSpeaking(true);
    Speech.speak(draft.trim(), {
      language: "en-CA",
      pitch: 1,
      rate: 0.92,
      onDone: () => setSpeaking(false),
      onError: () => {
        setSpeaking(false);
        setError("Coach could not read this draft aloud. You can still review and use the text.");
      },
      onStopped: () => setSpeaking(false)
    });
  };

  return (
    <View accessibilityLabel="PeaceBot Coach" style={styles.card}>
      <View style={styles.heroRow}>
        <View style={styles.coachMark}><Text style={styles.coachMarkText}>P</Text></View>
        <View style={styles.heroCopy}>
          <Text accessibilityRole="header" style={styles.heading}>Talk it through with PeaceBot</Text>
          <Text style={styles.body}>Speak or type privately. PeaceBot Coach helps you prepare child-focused wording; nothing is shared until you choose it.</Text>
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
        <LabButton disabled={busy || turnBusy || !conversation.trim()} label={turnBusy ? "Coach is thinking..." : "Ask Coach"} onPress={() => void askCoach()} variant="secondary" />
        {turns.length ? <View accessibilityLabel="Coach conversation history" style={styles.turnsCard}>
          <Text style={styles.heading}>Coach conversation</Text>
          {turns.map((turn, index) => <View key={`${turn.role}-${index}`} style={[styles.turn, turn.role === "coach" ? styles.coachTurn : styles.parentTurn]}><Text style={styles.turnLabel}>{turn.role === "coach" ? "Coach" : "You"}</Text><Text style={styles.body}>{turn.content}</Text></View>)}
        </View> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {draft ? <View accessibilityLabel="Coach draft" style={styles.draftCard}>
          <Text style={styles.heading}>Your editable draft</Text>
          <TextInput accessibilityLabel="Edit Coach draft" multiline onChangeText={setDraft} style={styles.input} value={draft} />
          <Text style={styles.caption}>Review it yourself. Coach does not diagnose either parent and does not send anything automatically.</Text>
          <LabButton label={speaking ? "Stop listening" : "Listen to draft"} onPress={() => void toggleDraftSpeech()} variant="secondary" />
          <LabButton disabled={!draft.trim()} label="Use in message" onPress={() => onUseDraft(draft.trim())} />
          <LabButton label="Start over" onPress={() => { setConversation(""); setDraft(""); setTurns([]); setError(""); }} variant="secondary" />
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
  turnsCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  turn: { borderRadius: 14, gap: spacing.xs, padding: spacing.sm },
  parentTurn: { backgroundColor: colors.cream },
  coachTurn: { backgroundColor: colors.successSurface },
  turnLabel: { ...typography.caption, color: colors.muted, fontWeight: "800" },
  error: { ...typography.body, color: colors.dangerText }
});
