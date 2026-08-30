import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AccessibleHeading } from "../components/AccessibleHeading";
import { LabButton } from "../components/LabButton";
import { useOptionalLocalization } from "../localization/LocalizationProvider";
import { callText } from "../localization/callLocalization";
import { colors, spacing, typography } from "../theme";
import { useAudioCallState } from "./AudioCallState";

export function AudioCallScreen() {
  const { locale } = useOptionalLocalization();
  const text = (key: Parameters<typeof callText>[1]) => callText(locale, key);
  const state = useAudioCallState();
  const terminal = state.call && ["declined", "ended", "expired"].includes(state.call.status);
  const title = !state.call ? text("noCall")
    : state.call.status === "ringing" ? text(state.incoming ? "ringingIn" : "ringingOut")
      : state.call.status === "active" ? text(state.mediaState === "connected" ? "active" : "accepted") : text("ended");
  const statusBody = !state.call || terminal ? text("noCallBody")
    : state.call.status === "ringing" ? text("ringingBody")
      : text(state.mediaState);
  const duration = `${Math.floor(state.durationSeconds / 60).toString().padStart(2, "0")}:${(state.durationSeconds % 60).toString().padStart(2, "0")}`;

  return <View style={styles.page}>
    <View style={styles.hero}>
      <View style={styles.callIcon}><Text accessible={false} style={styles.callEmoji}>📞</Text></View>
      <View style={styles.heroCopy}>
        <AccessibleHeading style={styles.title}>{text("title")}</AccessibleHeading>
        <Text style={styles.body}>{text("body")}</Text>
      </View>
    </View>
    <View accessibilityLiveRegion="polite" style={styles.callCard}>
      <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
      <Text style={styles.body}>{statusBody}</Text>
      {state.call?.status === "active" ? <Text accessibilityLabel={`${text("duration")} ${duration}`} style={styles.duration}>{duration}</Text> : null}
      {!state.call || terminal ? <LabButton disabled={state.busy || !state.hydrated} label={text("start")} onPress={() => void state.start()} /> : null}
      {state.call?.status === "ringing" && state.incoming ? <>
        <LabButton disabled={state.busy} label={text("accept")} onPress={() => void state.accept()} />
        <LabButton disabled={state.busy} label={text("decline")} onPress={() => void state.decline()} variant="secondary" />
      </> : null}
      {state.call?.status === "ringing" && !state.incoming ? <LabButton disabled={state.busy} label={text("cancel")} onPress={() => void state.end()} variant="secondary" /> : null}
      {state.call?.status === "active" ? <>
        <LabButton disabled={state.busy || state.mediaState === "unavailable"} label={text(state.muted ? "unmute" : "mute")} onPress={state.toggleMute} variant="secondary" />
        {state.mediaState === "failed" ? <LabButton disabled={state.busy} label={text("reconnect")} onPress={state.retryMedia} variant="secondary" /> : null}
        <LabButton disabled={state.busy} label={text("end")} onPress={() => void state.end()} />
      </> : null}
      <LabButton disabled={state.busy} label={state.busy ? text("busy") : text("refresh")} onPress={() => void state.refresh()} variant="secondary" />
      {state.error ? <Text accessibilityRole="alert" style={styles.error}>{state.error || text("error")}</Text> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg },
  hero: { alignItems: "center", backgroundColor: "#E8E0FA", borderColor: "#B8A4E4", borderRadius: 28, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  callIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 999, height: 62, justifyContent: "center", width: 62 },
  callEmoji: { fontSize: 30 },
  heroCopy: { flex: 1, gap: spacing.xs },
  title: { ...typography.title, color: colors.text },
  heading: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  callCard: { backgroundColor: "#DDF6F0", borderColor: "#76CCBE", borderRadius: 26, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  duration: { ...typography.title, color: colors.accent, fontVariant: ["tabular-nums"], textAlign: "center" },
  error: { ...typography.body, color: colors.dangerText }
});
