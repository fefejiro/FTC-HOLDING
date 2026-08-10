import React from "react";
import { Text, View } from "react-native";
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
      : state.call.status === "active" ? text("active") : text("ended");

  return <View style={{ gap: spacing.lg }}>
    <AccessibleHeading style={{ ...typography.title, color: colors.text }}>{text("title")}</AccessibleHeading>
    <Text style={{ ...typography.body, color: colors.muted }}>{text("body")}</Text>
    <View accessibilityLiveRegion="polite" style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: spacing.md, padding: spacing.lg }}>
      <Text accessibilityRole="header" style={{ ...typography.subheading, color: colors.text }}>{title}</Text>
      <Text style={{ ...typography.body, color: colors.muted }}>{!state.call || terminal ? text("noCallBody") : text("unavailable")}</Text>
      {!state.call || terminal ? <LabButton disabled={state.busy || !state.hydrated} label={text("start")} onPress={() => void state.start()} /> : null}
      {state.call?.status === "ringing" && state.incoming ? <>
        <LabButton disabled={state.busy} label={text("accept")} onPress={() => void state.accept()} />
        <LabButton disabled={state.busy} label={text("decline")} onPress={() => void state.decline()} variant="secondary" />
      </> : null}
      {state.call?.status === "ringing" && !state.incoming ? <LabButton disabled={state.busy} label={text("cancel")} onPress={() => void state.end()} variant="secondary" /> : null}
      {state.call?.status === "active" ? <LabButton disabled={state.busy} label={text("end")} onPress={() => void state.end()} /> : null}
      <LabButton disabled={state.busy} label={state.busy ? text("busy") : text("refresh")} onPress={() => void state.refresh()} variant="secondary" />
      {state.error ? <Text accessibilityRole="alert" style={{ ...typography.body, color: colors.dangerText }}>{state.error || text("error")}</Text> : null}
    </View>
  </View>;
}
