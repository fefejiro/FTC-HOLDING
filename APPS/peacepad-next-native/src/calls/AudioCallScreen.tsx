import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LabButton } from "../components/LabButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { useOptionalLocalization } from "../localization/LocalizationProvider";
import { callText } from "../localization/callLocalization";
import { colors, spacing, typography } from "../theme";
import { useAudioCallState } from "./AudioCallState";
import type { CallMediaType } from "../domain/parentCore";

export function AudioCallScreen({ initialMediaType }: { initialMediaType?: CallMediaType } = {}) {
  const { locale } = useOptionalLocalization();
  const text = (key: Parameters<typeof callText>[1]) => callText(locale, key);
  const state = useAudioCallState();
  React.useEffect(() => {
    if (initialMediaType) state.setSelectedMediaType(initialMediaType);
  }, [initialMediaType]);
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
      {!state.call || terminal ? <View accessibilityRole="radiogroup" style={styles.mediaChoices}>
        {(["audio", "video"] as const).map((type) => <Pressable accessibilityLabel={type === "video" ? text("videoChoice") : text("audioChoice")} accessibilityRole="radio" accessibilityState={{ checked: state.selectedMediaType === type }} key={type} onPress={() => state.setSelectedMediaType(type)} style={[styles.mediaChoice, state.selectedMediaType === type ? styles.mediaChoiceActive : null]}><Text style={[styles.mediaChoiceText, state.selectedMediaType === type ? styles.mediaChoiceTextActive : null]}>{type === "video" ? text("videoChoice") : text("audioChoice")}</Text></Pressable>)}
      </View> : null}
      <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
      <Text style={styles.body}>{statusBody}</Text>
      {state.call?.type === "video" && state.call.status === "active" ? <VideoStage cameraEnabled={state.cameraEnabled} localStreamUrl={state.localStreamUrl} remoteStreamUrl={state.remoteStreamUrl} /> : null}
      {state.call?.status === "active" ? <Text accessibilityLabel={`${text("duration")} ${duration}`} style={styles.duration}>{duration}</Text> : null}
      {!state.call || terminal ? <LabButton disabled={state.busy || !state.hydrated} label={state.selectedMediaType === "video" ? text("startVideo") : text("start")} onPress={() => void state.start()} /> : null}
      {state.call?.status === "ringing" && state.incoming ? <>
        <LabButton disabled={state.busy} label={text("accept")} onPress={() => void state.accept()} />
        <LabButton disabled={state.busy} label={text("decline")} onPress={() => void state.decline()} variant="secondary" />
      </> : null}
      {state.call?.status === "ringing" && !state.incoming ? <LabButton disabled={state.busy} label={text("cancel")} onPress={() => void state.end()} variant="secondary" /> : null}
      {state.call?.status === "active" ? <>
        <LabButton disabled={state.busy || state.mediaState === "unavailable"} label={text(state.muted ? "unmute" : "mute")} onPress={state.toggleMute} variant="secondary" />
        {state.call.type === "video" ? <View style={styles.videoActions}><LabButton disabled={state.busy || state.mediaState === "unavailable"} label={state.cameraEnabled ? text("cameraOff") : text("cameraOn")} onPress={state.toggleCamera} variant="secondary" /><LabButton disabled={state.busy || !state.cameraEnabled} label={text("switchCamera")} onPress={state.switchCamera} variant="secondary" /></View> : null}
        {state.mediaState === "failed" ? <LabButton disabled={state.busy} label={text("reconnect")} onPress={state.retryMedia} variant="secondary" /> : null}
        <LabButton disabled={state.busy} label={text("end")} onPress={() => void state.end()} />
      </> : null}
      <LabButton disabled={state.busy} label={state.busy ? text("busy") : text("refresh")} onPress={() => void state.refresh()} variant="secondary" />
      {state.error ? <Text accessibilityRole="alert" style={styles.error}>{state.error || text("error")}</Text> : null}
    </View>
  </View>;
}

export function VideoStage({ cameraEnabled, localStreamUrl, remoteStreamUrl }: { cameraEnabled: boolean; localStreamUrl: string | null; remoteStreamUrl: string | null }) {
  const { RTCView } = require("react-native-webrtc") as { RTCView: React.ComponentType<{ mirror?: boolean; objectFit?: "cover" | "contain"; streamURL: string; style: object; zOrder?: number }> };
  const { locale } = useOptionalLocalization();
  const text = (key: Parameters<typeof callText>[1]) => callText(locale, key);
  return <View accessibilityLabel="Private video call" style={styles.videoStage}>
    {remoteStreamUrl ? <RTCView objectFit="cover" streamURL={remoteStreamUrl} style={styles.remoteVideo} /> : <View style={styles.videoWaiting}><Text style={styles.videoWaitingText}>{text("waitingVideo")}</Text></View>}
    {cameraEnabled && localStreamUrl ? <RTCView mirror objectFit="cover" streamURL={localStreamUrl} style={styles.localVideo} zOrder={1} /> : <View style={styles.cameraOff}><Text style={styles.cameraOffText}>{text("cameraOff")}</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  page: { gap: spacing.md },
  heading: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  callCard: { backgroundColor: colors.successSurface, borderColor: colors.successBorder, borderRadius: 24, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  duration: { ...typography.title, color: colors.accent, fontVariant: ["tabular-nums"], textAlign: "center" },
  mediaChoices: { backgroundColor: colors.cream, borderRadius: 18, flexDirection: "row", padding: spacing.xs },
  mediaChoice: { alignItems: "center", borderRadius: 14, flex: 1, minHeight: 46, padding: spacing.md },
  mediaChoiceActive: { backgroundColor: colors.brand },
  mediaChoiceText: { ...typography.caption, color: colors.text, fontWeight: "800" },
  mediaChoiceTextActive: { color: colors.onBrand },
  videoStage: { aspectRatio: 3 / 4, backgroundColor: colors.text, borderRadius: 24, overflow: "hidden", position: "relative" },
  remoteVideo: { height: "100%", width: "100%" },
  localVideo: { borderColor: colors.surface, borderRadius: 16, borderWidth: 2, bottom: spacing.md, height: 140, position: "absolute", right: spacing.md, width: 104 },
  videoWaiting: { alignItems: "center", flex: 1, justifyContent: "center" },
  videoWaitingText: { ...typography.body, color: colors.onBrand },
  cameraOff: { alignItems: "center", backgroundColor: colors.brandSoft, borderRadius: 16, bottom: spacing.md, height: 140, justifyContent: "center", position: "absolute", right: spacing.md, width: 104 },
  cameraOffText: { ...typography.caption, color: colors.brand, fontWeight: "800" },
  videoActions: { gap: spacing.sm },
  error: { ...typography.body, color: colors.dangerText }
});
