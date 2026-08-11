import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { AccessibleHeading } from "../components/AccessibleHeading";
import type {
  ConsentPreferences,
  MessagePreviewResponse
} from "../api/contracts";
import {
  PeacePadApiClient,
  PeacePadApiError,
  type PeacePadFoundationApi
} from "../api/PeacePadApiClient";
import { environmentConfig } from "../config/environment";
import {
  createStoredGuestSession,
  secureGuestSessionStore,
  type GuestSessionStore
} from "../session/secureGuestSession";
import { colors, spacing, typography } from "../theme";
import { useOptionalLocalization } from "../localization/LocalizationProvider";

type FoundationPhase = "welcome" | "account" | "consent" | "compose";
type AsyncState = "idle" | "loading" | "ready";

type Props = {
  api?: PeacePadFoundationApi;
  sessionStore?: GuestSessionStore;
  onOpenLab?: () => void;
  onPhaseChange?: () => void;
};

const initialConsent: ConsentPreferences = {
  termsAccepted: false,
  privacyAcknowledged: false,
  aiMessageConsent: false
};

const defaultApi = new PeacePadApiClient(environmentConfig);

function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof PeacePadApiError) return error.message;
  return fallback;
}

export function FoundationScreen({
  api = defaultApi,
  sessionStore = secureGuestSessionStore,
  onOpenLab,
  onPhaseChange
}: Props) {
  const { t } = useOptionalLocalization();
  const [phase, setPhase] = useState<FoundationPhase>("welcome");
  const [consent, setConsent] = useState<ConsentPreferences>(initialConsent);
  const [sessionState, setSessionState] = useState<AsyncState>("idle");
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState(
    "Can you confirm the pickup time for Saturday?"
  );
  const [preview, setPreview] = useState<MessagePreviewResponse | null>(null);
  const [previewState, setPreviewState] = useState<AsyncState>("idle");
  const [previewError, setPreviewError] = useState<string | null>(null);

  const requiredConsentAccepted =
    consent.termsAccepted && consent.privacyAcknowledged;

  const transitionTo = useCallback((nextPhase: FoundationPhase) => {
    onPhaseChange?.();
    setPhase(nextPhase);
  }, [onPhaseChange]);

  useEffect(() => {
    let active = true;
    setSessionState("loading");

    sessionStore
      .read()
      .then(async (stored) => {
        if (!active) return;
        if (!stored) {
          setSessionState("idle");
          return;
        }

        setConsent(stored.consent);
        const restored = await api.startGuest({
          existingSessionId: stored.sessionId,
          requiredConsentAccepted: true,
          aiMessageConsent: stored.consent.aiMessageConsent
        });
        if (!active) return;
        await sessionStore.save(
          createStoredGuestSession(restored, stored.consent)
        );
        if (!active) return;
        transitionTo("compose");
        setSessionMessage(t("foundation.restored"));
        setSessionState("ready");
      })
      .catch(async (error) => {
        await sessionStore.clear().catch(() => undefined);
        if (!active) return;
        setSessionMessage(friendlyError(error, t("foundation.requestError")));
        setSessionState("idle");
        transitionTo("welcome");
      });

    return () => {
      active = false;
    };
  }, [api, sessionStore, transitionTo]);

  const statusLabel = useMemo(
    () =>
      environmentConfig.environment === "staging"
        ? t("foundation.secure")
        : "PeacePad",
    [t]
  );

  async function startGuestSession() {
    if (!requiredConsentAccepted) {
      setSessionMessage(
        t("foundation.requiredConsent")
      );
      return;
    }

    setSessionState("loading");
    setSessionMessage(null);
    try {
      const response = await api.startGuest({
        requiredConsentAccepted: true,
        aiMessageConsent: consent.aiMessageConsent
      });
      await sessionStore.save(createStoredGuestSession(response, consent));
      transitionTo("compose");
      setSessionState("ready");
      setSessionMessage(t("foundation.guestReady"));
    } catch (error) {
      setSessionState("idle");
      setSessionMessage(friendlyError(error, t("foundation.requestError")));
    }
  }

  async function checkMessage() {
    setPreviewState("loading");
    setPreviewError(null);
    setPreview(null);
    try {
      const result = await api.previewMessage(draft);
      setPreview(result);
      setPreviewState("ready");
    } catch (error) {
      setPreviewState("idle");
      setPreviewError(friendlyError(error, t("foundation.requestError")));
    }
  }

  async function resetDeviceSession() {
    await sessionStore.clear();
    setConsent(initialConsent);
    setPreview(null);
    setPreviewError(null);
    setSessionMessage(t("foundation.sessionCleared"));
    setSessionState("idle");
    transitionTo("welcome");
  }

  if (sessionState === "loading" && phase === "welcome") {
    return (
      <View style={styles.centered} accessibilityLabel={t("foundation.restoring")}>
        <ActivityIndicator color={colors.brand} />
        <Text style={styles.muted}>{t("foundation.checkingDevice")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.brandRow}>
        <Image
          accessibilityLabel={t("foundation.logo")}
          source={require("./peacepad-conch.png")}
          style={styles.conchMark}
        />
        <View style={styles.brandCopy}>
          <Text style={styles.eyebrow}>{statusLabel}</Text>
          <Text style={styles.brandName}>PeacePad</Text>
        </View>
      </View>

      {phase === "welcome" ? (
        <View style={styles.card}>
          <AccessibleHeading style={styles.title}>
            {t("foundation.welcomeTitle")}
          </AccessibleHeading>
          <Text style={styles.body}>
            {t("foundation.welcomeBody")}
          </Text>
          <PrimaryButton label={t("foundation.try")} onPress={() => transitionTo("consent")} />
          <SecondaryButton
            label={t("foundation.existing")}
            onPress={() => transitionTo("account")}
          />
          <SecondaryButton
            label={t("foundation.continue")}
            onPress={onOpenLab ?? (() => undefined)}
          />
          <LegalLinks />
        </View>
      ) : null}

      {phase === "account" ? (
        <View style={styles.card}>
          <Text style={styles.heading}>{t("foundation.existing")}</Text>
          <Text style={styles.body}>{t("foundation.accountUnavailable")}</Text>
          <SecondaryButton label={t("foundation.backWelcome")} onPress={() => transitionTo("welcome")} />
          <LegalLinks />
        </View>
      ) : null}

      {phase === "consent" ? (
        <View style={styles.card}>
          <Text style={styles.heading}>{t("foundation.consentTitle")}</Text>
          <Text style={styles.body}>{t("foundation.consentBody")}</Text>
          <ConsentToggle
            label={t("foundation.termsConsent")}
            checked={consent.termsAccepted}
            onPress={() =>
              setConsent((current) => ({
                ...current,
                termsAccepted: !current.termsAccepted
              }))
            }
          />
          <ConsentToggle
            label={t("foundation.privacyConsent")}
            checked={consent.privacyAcknowledged}
            onPress={() =>
              setConsent((current) => ({
                ...current,
                privacyAcknowledged: !current.privacyAcknowledged
              }))
            }
          />
          <ConsentToggle
            label={t("foundation.aiConsent")}
            description={t("foundation.aiConsentBody")}
            checked={consent.aiMessageConsent}
            onPress={() =>
              setConsent((current) => ({
                ...current,
                aiMessageConsent: !current.aiMessageConsent
              }))
            }
          />
          <PrimaryButton
            label={sessionState === "loading" ? t("foundation.starting") : t("foundation.continueGuest")}
            onPress={startGuestSession}
            disabled={!requiredConsentAccepted || sessionState === "loading"}
          />
          <SecondaryButton label={t("foundation.back")} onPress={() => transitionTo("welcome")} />
          <LegalLinks />
        </View>
      ) : null}

      {phase === "compose" ? (
        <View style={styles.card}>
          <AccessibleHeading style={styles.heading}>{t("foundation.composeTitle")}</AccessibleHeading>
          <Text style={styles.body}>{t("foundation.composeBody")}</Text>
          <TextInput
            accessibilityLabel={t("foundation.draftLabel")}
            multiline
            onChangeText={setDraft}
            placeholder={t("foundation.draftPlaceholder")}
            style={styles.input}
            value={draft}
          />
          <PrimaryButton
            label={previewState === "loading" ? t("foundation.checking") : t("foundation.checkMessage")}
            onPress={checkMessage}
            disabled={previewState === "loading"}
          />

          {preview ? (
            <View style={styles.result} accessibilityLabel={t("foundation.previewResult")}>
              <Text style={styles.resultTone}>
                {preview.emoji ? `${preview.emoji} ` : ""}
                {preview.tone}
              </Text>
              <Text style={styles.body}>{preview.summary}</Text>
              {preview.rewordingSuggestion ? (
                <Text style={styles.suggestion}>
                  {t("foundation.suggested", { suggestion: preview.rewordingSuggestion })}
                </Text>
              ) : null}
            </View>
          ) : null}

          {previewError ? (
            <View style={styles.errorCard} accessibilityRole="alert">
              <Text style={styles.errorText}>{previewError}</Text>
              <SecondaryButton label={t("foundation.retryCheck")} onPress={checkMessage} />
            </View>
          ) : null}

          <SecondaryButton
            label={t("foundation.resetSession")}
            onPress={resetDeviceSession}
          />
        </View>
      ) : null}

      {sessionMessage ? (
        <Text
          accessibilityRole={sessionMessage.includes("could not") ? "alert" : "text"}
          style={styles.sessionMessage}
        >
          {sessionMessage}
        </Text>
      ) : null}
    </View>
  );
}

function ConsentToggle({
  checked,
  description,
  label,
  onPress
}: {
  checked: boolean;
  description?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, pressed ? styles.pressed : null]}
    >
      <View style={[styles.checkbox, checked ? styles.checkboxChecked : null]}>
        <Text style={styles.checkmark}>{checked ? "✓" : ""}</Text>
      </View>
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceLabel}>{label}</Text>
        {description ? <Text style={styles.choiceDescription}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

function PrimaryButton({
  disabled = false,
  label,
  onPress
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed ? styles.pressed : null
      ]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function LegalLinks() {
  const { t } = useOptionalLocalization();
  return (
    <View style={styles.legalRow}>
      <Text style={styles.link} onPress={() => Linking.openURL("https://peacepad.ca/privacy")}>
        {t("foundation.privacy")}
      </Text>
      <Text style={styles.link} onPress={() => Linking.openURL("https://peacepad.ca/terms")}>
        {t("foundation.terms")}
      </Text>
      <Text style={styles.link} onPress={() => Linking.openURL("https://peacepad.ca/support")}>
        {t("foundation.support")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.lg
  },
  centered: {
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  conchMark: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.brandSoft
  },
  brandCopy: {
    flex: 1
  },
  brandName: {
    ...typography.heading,
    color: colors.text
  },
  eyebrow: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  title: {
    ...typography.title,
    color: colors.text
  },
  heading: {
    ...typography.heading,
    color: colors.text
  },
  body: {
    ...typography.body,
    color: colors.muted
  },
  muted: {
    ...typography.body,
    color: colors.muted
  },
  choice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background
  },
  choiceCopy: {
    flex: 1,
    gap: spacing.xs
  },
  choiceLabel: {
    ...typography.subheading,
    color: colors.text
  },
  choiceDescription: {
    ...typography.caption,
    color: colors.muted
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.brand
  },
  checkboxChecked: {
    backgroundColor: colors.brand
  },
  checkmark: {
    color: colors.onBrand,
    fontWeight: "900"
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.brand
  },
  primaryButtonText: {
    ...typography.subheading,
    color: colors.onBrand
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.brandSoft
  },
  secondaryButtonText: {
    ...typography.subheading,
    color: colors.brand
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    opacity: 0.78
  },
  input: {
    minHeight: 130,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    textAlignVertical: "top",
    ...typography.body
  },
  result: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "#ECFBF7"
  },
  resultTone: {
    ...typography.subheading,
    color: colors.text,
    textTransform: "capitalize"
  },
  suggestion: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700"
  },
  errorCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7A9A9",
    backgroundColor: "#FFF3F3"
  },
  errorText: {
    ...typography.body,
    color: "#8B2323"
  },
  safetyNote: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "#ECFBF7"
  },
  safetyNoteTitle: {
    ...typography.subheading,
    color: colors.text
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    paddingTop: spacing.sm
  },
  link: {
    ...typography.caption,
    color: colors.brand,
    fontWeight: "800"
  },
  sessionMessage: {
    ...typography.caption,
    color: colors.muted,
    textAlign: "center"
  }
});
