import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { File } from "expo-file-system";
import { LabButton } from "../components/LabButton";
import { colors, spacing, typography } from "../theme";

type ConversationVoiceNoteProps = Readonly<{
  busy: boolean;
  onUpload: (input: Readonly<{ originalFileName: string; mediaType: "audio/m4a"; bytes: ArrayBuffer }>) => Promise<void>;
}>;

export function ConversationVoiceNote({ busy, onUpload }: ConversationVoiceNoteProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setError("");
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError("Microphone access is off. Enable it in phone settings to record a voice note.");
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record({ forDuration: 120 });
  };

  const stopAndShare = async () => {
    setSending(true);
    setError("");
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!recorder.uri) throw new Error("PeacePad could not open that voice note.");
      const bytes = await new File(recorder.uri).arrayBuffer();
      if (!bytes.byteLength) throw new Error("That voice note was empty. Please record it again.");
      await onUpload({
        originalFileName: `PeacePad-voice-note-${new Date().toISOString().replace(/[:.]/g, "-")}.m4a`,
        mediaType: "audio/m4a",
        bytes
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "PeacePad could not share that voice note.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View accessibilityLabel="Conversation voice note" style={styles.card}>
      <Text style={styles.title}>{recorderState.isRecording ? `Recording · ${Math.ceil(recorderState.durationMillis / 1000)}s` : "Record a voice note"}</Text>
      <Text style={styles.caption}>Up to two minutes. It is shared only when you stop and send it here.</Text>
      <LabButton
        disabled={busy || sending}
        label={recorderState.isRecording ? "Stop and share voice note" : sending ? "Sharing securely..." : "Start recording"}
        onPress={() => void (recorderState.isRecording ? stopAndShare() : start())}
        variant="secondary"
      />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cream, borderColor: colors.warningBorder, borderRadius: 18, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  title: { ...typography.body, color: colors.text, fontWeight: "800" },
  caption: { ...typography.caption, color: colors.muted },
  error: { ...typography.body, color: colors.dangerText }
});
