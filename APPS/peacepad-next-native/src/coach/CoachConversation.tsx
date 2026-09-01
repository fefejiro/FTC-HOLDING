import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { File } from "expo-file-system";
import * as Speech from "expo-speech";
import { LabButton } from "../components/LabButton";
import { colors, spacing, typography } from "../theme";
import { buildCalmDraft, type CoachEntryMode, type CoachFeeling } from "./coachDraft";
import type { CoachConversationMessage, CoachConversationTurn } from "../api/CoordinationApi";

const feelings: readonly CoachFeeling[] = ["calm", "anxious", "frustrated", "overwhelmed", "sad", "angry"];

type CoachConversationProps = Readonly<{
  initiallyOpen?: boolean;
  onTranscribe: (bytes: ArrayBuffer, mediaType: "audio/m4a") => Promise<string>;
  onConversationTurn?: (input: { topic: string; feeling: CoachFeeling; entryMode: CoachEntryMode; messages: readonly CoachConversationMessage[] }) => Promise<CoachConversationTurn>;
  onUseDraft: (draft: string) => void;
}>;

export function CoachConversation({ initiallyOpen = false, onTranscribe, onConversationTurn, onUseDraft }: CoachConversationProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [open, setOpen] = useState(initiallyOpen);
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

  const askCoach = async (spokenTopic?: string) => {
    const topic = (spokenTopic ?? conversation).trim();
    if (!topic) return;
    setTurnBusy(true);
    setError("");
    try {
      const result = onConversationTurn
        ? await onConversationTurn({ topic, feeling, entryMode, messages: [...turns, { role: "parent", content: topic }] })
        : { reply: "Let us keep this focused on the child and one clear next step.", draft: buildCalmDraft(topic, feeling, entryMode) || null, note: null, provider: "local-fallback" as const };
      setTurns((current) => [...current, { role: "parent", content: topic }, { role: "coach", content: result.reply }]);
      if (result.draft) setDraft(result.draft);
      Speech.speak(result.reply, { language: "en-CA", pitch: 1, rate: 0.94 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Coach is unavailable right now. You can still prepare a draft locally.");
    } finally {
      setTurnBusy(false);
    }
  };

  const stopAndTalk = async () => {
    setBusy(true);
    setError("");
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!recorder.uri) throw new Error("PeacePad could not open that recording.");
      const transcript = await onTranscribe(await new File(recorder.uri).arrayBuffer(), "audio/m4a");
      setConversation(transcript);
      await askCoach(transcript);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Coach could not understand that recording. You can still type.");
    } finally {
      setBusy(false);
    }
  };

  const prepareLocalDraft = () => {
    const result = buildCalmDraft(conversation, feeling, entryMode);
    if (!result) return setError("Tell Coach what happened or what you want to say first.");
    setError("");
    setDraft(result);
  };

  const toggleDraftSpeech = async () => {
    if (speaking) {
      await Speech.stop();
      setSpeaking(false);
      return;
    }
    if (!draft.trim()) return;
    setSpeaking(true);
    Speech.speak(draft.trim(), { language: "en-CA", pitch: 1, rate: 0.92, onDone: () => setSpeaking(false), onError: () => setSpeaking(false), onStopped: () => setSpeaking(false) });
  };

  const reset = () => {
    void Speech.stop();
    setConversation("");
    setDraft("");
    setTurns([]);
    setError("");
  };

  return <View accessibilityLabel="PeaceBot Coach" style={[styles.card, open ? styles.voiceStage : null]}>
    <View style={styles.heroRow}>
      <Image accessibilityLabel="PeacePad conch" source={require("../foundation/peacepad-conch.png")} style={styles.coachMark} />
      <View style={styles.heroCopy}>
        <Text accessibilityRole="header" style={styles.heading}>{open ? "Conch Coach" : "Talk it through with PeaceBot"}</Text>
        <Text style={styles.body}>{open ? "A private, voice-first conversation. Listen, speak, or type. Nothing is shared until you choose it." : "Speak or type privately. Nothing is shared until you choose it."}</Text>
      </View>
    </View>
    {!open ? <LabButton label="Open Conch Coach" onPress={() => setOpen(true)} variant="secondary" /> : <View style={styles.stack}>
      <View style={styles.voiceFocus}>
        <View style={[styles.conchOrb, recorderState.isRecording ? styles.conchOrbListening : turnBusy ? styles.conchOrbThinking : null]}>
          <Image accessibilityLabel="Conch Coach voice" source={require("../foundation/peacepad-conch.png")} style={styles.conchImage} />
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.voiceStatus}>{recorderState.isRecording ? `Listening... ${Math.ceil(recorderState.durationMillis / 1000)}s` : turnBusy ? "Thinking with you..." : "Tap the conch and speak"}</Text>
        <Text style={styles.caption}>Audio is used only for this private Coach turn. PeacePad does not keep a call recording or hidden transcript.</Text>
        <Pressable accessibilityLabel={recorderState.isRecording ? "Stop and talk to Coach" : "Talk to Conch Coach"} accessibilityRole="button" disabled={busy || turnBusy} onPress={() => void (recorderState.isRecording ? stopAndTalk() : startRecording())} style={({ pressed }) => [styles.voiceButton, recorderState.isRecording ? styles.voiceButtonActive : null, pressed ? styles.pressed : null]}>
          <Text style={styles.voiceButtonText}>{recorderState.isRecording ? "Stop" : "Talk"}</Text>
        </Pressable>
      </View>

      {turns.length ? <View accessibilityLabel="Coach conversation history" style={styles.turnsCard}>
        <Text style={styles.heading}>Conversation</Text>
        {turns.map((turn, index) => <View key={`${turn.role}-${index}`} style={[styles.turn, turn.role === "coach" ? styles.coachTurn : styles.parentTurn]}><Text style={styles.turnLabel}>{turn.role === "coach" ? "Coach" : "You"}</Text><Text style={styles.body}>{turn.content}</Text></View>)}
      </View> : null}

      <View style={styles.typeCard}>
        <Text style={styles.label}>Or type to Coach</Text>
        <TextInput accessibilityLabel="Coach conversation" multiline onChangeText={(value) => { setConversation(value); setError(""); }} placeholder="What is happening?" placeholderTextColor={colors.muted} style={styles.input} value={conversation} />
        <LabButton disabled={busy || turnBusy || !conversation.trim()} label={turnBusy ? "Coach is thinking..." : "Send to Coach"} onPress={() => void askCoach()} />
      </View>

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      {draft ? <View accessibilityLabel="Coach draft" style={styles.draftCard}>
        <Text style={styles.heading}>Your editable draft</Text>
        <TextInput accessibilityLabel="Edit Coach draft" multiline onChangeText={setDraft} style={styles.input} value={draft} />
        <Text style={styles.caption}>Review it yourself. Coach never diagnoses either parent and sends nothing automatically.</Text>
        <LabButton label={speaking ? "Stop listening" : "Listen to draft"} onPress={() => void toggleDraftSpeech()} variant="secondary" />
        <LabButton disabled={!draft.trim()} label="Use in message" onPress={() => onUseDraft(draft.trim())} />
        <LabButton label="Start over" onPress={reset} variant="secondary" />
      </View> : null}

      <View style={styles.contextCard}>
        <Text style={styles.label}>Conversation context</Text>
        <View accessibilityRole="radiogroup" style={styles.wrap}>{(["sending", "received"] as const).map((mode) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: mode === entryMode }} key={mode} onPress={() => setEntryMode(mode)} style={[styles.chip, mode === entryMode ? styles.chipActive : null]}><Text style={[styles.chipText, mode === entryMode ? styles.chipTextActive : null]}>{mode === "sending" ? "I want to say something" : "I received a message"}</Text></Pressable>)}</View>
        <View accessibilityRole="radiogroup" style={styles.wrap}>{feelings.map((value) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: value === feeling }} key={value} onPress={() => setFeeling(value)} style={[styles.chip, value === feeling ? styles.feelingActive : null]}><Text style={[styles.chipText, value === feeling ? styles.feelingTextActive : null]}>{value}</Text></Pressable>)}</View>
        <LabButton disabled={busy || !conversation.trim()} label="Create a calm draft without AI" onPress={prepareLocalDraft} variant="secondary" />
      </View>
      {!initiallyOpen ? <LabButton label="Close Conch Coach" onPress={() => { reset(); setOpen(false); }} variant="secondary" /> : null}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cream, borderColor: colors.warningBorder, borderRadius: 24, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  voiceStage: { backgroundColor: "#F7F2FF", borderColor: "#D4B7F3", borderRadius: 32, paddingVertical: spacing.xl },
  heroRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  heroCopy: { flex: 1, gap: spacing.xs },
  coachMark: { borderRadius: 18, height: 48, width: 48 },
  stack: { gap: spacing.md },
  voiceFocus: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  conchOrb: { alignItems: "center", backgroundColor: "#6F2CDA", borderColor: "#B98BF0", borderRadius: 100, borderWidth: 8, height: 184, justifyContent: "center", shadowColor: colors.brand, shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.28, shadowRadius: 18, width: 184 },
  conchOrbListening: { backgroundColor: colors.coral, borderColor: "#FFD0C9" },
  conchOrbThinking: { backgroundColor: colors.aqua, borderColor: "#C2F4EC" },
  conchImage: { height: 112, width: 112 },
  voiceStatus: { ...typography.subheading, color: colors.text, textAlign: "center" },
  voiceButton: { alignItems: "center", backgroundColor: colors.text, borderRadius: 999, justifyContent: "center", minHeight: 64, minWidth: 140, paddingHorizontal: spacing.xl },
  voiceButtonActive: { backgroundColor: colors.coral },
  voiceButtonText: { ...typography.body, color: colors.onBrand, fontWeight: "900" },
  typeCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  contextCard: { backgroundColor: colors.cream, borderColor: colors.warningBorder, borderRadius: 20, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  heading: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.text },
  caption: { ...typography.caption, color: colors.muted, textAlign: "center" },
  label: { ...typography.caption, color: colors.text, fontWeight: "800", textTransform: "uppercase" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  feelingActive: { backgroundColor: colors.aqua, borderColor: colors.aqua },
  chipText: { ...typography.caption, color: colors.muted, fontWeight: "700" },
  chipTextActive: { color: colors.onBrand },
  feelingTextActive: { color: colors.onBrand },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, color: colors.text, minHeight: 96, padding: spacing.md, textAlignVertical: "top" },
  draftCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  turnsCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  turn: { borderRadius: 14, gap: spacing.xs, padding: spacing.sm },
  parentTurn: { backgroundColor: colors.cream },
  coachTurn: { backgroundColor: colors.successSurface },
  turnLabel: { ...typography.caption, color: colors.muted, fontWeight: "800" },
  error: { ...typography.body, color: colors.dangerText },
  pressed: { opacity: 0.76 }
});
