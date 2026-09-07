import React, { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { useLocalization } from "../localization/LocalizationProvider";
import { colors, spacing, typography } from "../theme";
import { createSupportEmailUrl, getOrCreateSupportDiagnosticId } from "./SupportDiagnostics";

const HELP_URL = "https://peacepad.ca/support";
const PRIVACY_URL = "https://peacepad.ca/privacy";
const SAFETY_URL = "https://peacepad.ca/safety";

export function SupportPanel({ openUrl = Linking.openURL }: { openUrl?: (url: string) => Promise<unknown> }) {
  const { t } = useLocalization();
  const [diagnosticId, setDiagnosticId] = useState<string>();
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getOrCreateSupportDiagnosticId()
      .then((value) => { if (active) setDiagnosticId(value); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  const open = (url: string) => {
    setError(false);
    void openUrl(url).catch(() => setError(true));
  };

  return <View accessibilityLabel={t("support.title")} style={{ gap: spacing.sm }}>
    <Text accessibilityRole="header" style={{ ...typography.subheading, color: colors.text }}>{t("support.title")}</Text>
    <Text style={{ ...typography.body, color: colors.muted }}>{t("support.quickHelp")}</Text>
    <SupportAction label={t("support.helpCenter")} onPress={() => open(HELP_URL)} />
    <SupportAction disabled={!diagnosticId} label={t("support.contact")} onPress={() => diagnosticId && open(createSupportEmailUrl(diagnosticId))} />
    <SupportAction label={t("support.privacy")} onPress={() => open(PRIVACY_URL)} />
    <SupportAction label={t("support.safety")} onPress={() => open(SAFETY_URL)} />
    <Text accessibilityLiveRegion="polite" selectable style={{ ...typography.caption, color: colors.muted }}>
      {diagnosticId ? t("support.diagnostic", { id: diagnosticId }) : t("support.diagnosticLoading")}
    </Text>
    {error ? <Text accessibilityRole="alert" style={{ ...typography.caption, color: colors.dangerText }}>{t("support.openError")}</Text> : null}
  </View>;
}

function SupportAction({ disabled = false, label, onPress }: { disabled?: boolean; label: string; onPress(): void }) {
  return <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    style={{ borderColor: colors.border, borderRadius: 14, borderWidth: 1, minHeight: 48, padding: spacing.md }}
  >
    <Text style={{ ...typography.body, color: disabled ? colors.muted : colors.text, fontWeight: "700" }}>{label}</Text>
  </Pressable>;
}
