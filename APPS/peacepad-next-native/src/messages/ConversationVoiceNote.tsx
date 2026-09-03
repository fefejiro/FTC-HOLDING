import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState
} from "expo-audio";
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
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const player = useAudioPlayer(recordingUri);
  const playerState = useAudioPlayerStatus(player);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setError("");
    setRecordingUri(null);
    setRecordedSeconds(0);
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError("Microphone access is off. Enable it in phone settings to record a voice note.");
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record({ forDuration: 120 });
  };

  const stop = async () => {
    setError("");
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!recorder.uri) throw new Error("PeacePad could not open that voice note.");
      const file = new File(recorder.uri);
      if (!file.size) throw new Error("That voice note was empty. Please record it again.");
      setRecordedSeconds(Math.max(1, Math.ceil(recorderState.durationMillis / 1000)));
      setRecordingUri(recorder.uri);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "PeacePad could not prepare that voice note.");
    }
  };

  const discard = () => {
    player.pause();
    if (recordingUri) {
      try { new File(recordingUri).delete(); } catch { /* The OS may already have removed this cache file. */ }
    }
    setRecordingUri(null);
    setRecordedSeconds(0);
    setError("");
  };

  const send = async () => {
    if (!recordingUri) return;
    setSending(true);
    setError("");
    try {
      player.pause();
      const bytes = await new File(recordingUri).arrayBuffer();
      if (!bytes.byteLength) throw new Error("That voice note was empty. Please record it again.");
      await onUpload({
        originalFileName: `PeacePad-voice-note-${new Date().toISOString().replace(/[:.]/g, "-")}.m4a`,
        mediaType: "audio/m4a",
        bytes
      });
      discard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "PeacePad could not share that voice note.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View accessibilityLabel="Conversation voice note" style={styles.card}>
      <Text style={styles.title}>{recorderState.isRecording ? `Recording · ${Math.ceil(recorderState.durationMillis / 1000)}s` : recordingUri ? `Voice note ready · ${recordedSeconds}s` : "Record a voice note"}</Text>
      <Text style={styles.caption}>{recordingUri ? "Listen before sending. Nothing is shared until you choose Send voice note." : "Up to two minutes. You can review or discard it before sharing."}</Text>
      {recordingUri ? <View accessibilityLabel="Voice note review" style={styles.reviewActions}>
        <LabButton disabled={busy || sending} label={playerState.playing ? "Pause preview" : "Play preview"} onPress={() => playerState.playing ? player.pause() : player.play()} variant="secondary" />
        <LabButton disabled={busy || sending} label={sending ? "Sharing securely..." : "Send voice note"} onPress={() => void send()} />
        <LabButton disabled={busy || sending} label="Discard recording" onPress={discard} variant="secondary" />
      </View> : <LabButton
        disabled={busy || sending}
        label={recorderState.isRecording ? "Stop recording" : "Start recording"}
        onPress={() => void (recorderState.isRecording ? stop() : start())}
        variant="secondary"
      />}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cream, borderColor: colors.warningBorder, borderRadius: 18, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  title: { ...typography.body, color: colors.text, fontWeight: "800" },
  caption: { ...typography.caption, color: colors.muted },
  reviewActions: { gap: spacing.sm },
  error: { ...typography.body, color: colors.dangerText }
});
