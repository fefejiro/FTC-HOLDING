import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LabButton } from "../components/LabButton";
import { ScreenHeader } from "../components/ScreenHeader";
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
    <ScreenHeader
      accent={colors.coral}
      icon="call-outline"
      kicker="Calls"
      softBackground={colors.cream}
      subtitle={text("body")}
      title={text("title")}
    />
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
  page: { gap: spacing.md },
  heading: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  callCard: { backgroundColor: colors.successSurface, borderColor: colors.successBorder, borderRadius: 24, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  duration: { ...typography.title, color: colors.accent, fontVariant: ["tabular-nums"], textAlign: "center" },
  error: { ...typography.body, color: colors.dangerText }
});
