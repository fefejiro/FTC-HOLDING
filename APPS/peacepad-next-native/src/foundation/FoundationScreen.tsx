import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import type { ConsentPreferences } from "../api/contracts";
import {
  PeacePadApiError,
  type PeacePadFoundationApi
} from "../api/PeacePadApiClient";
import { createFoundationApi } from "../api/SyntheticLabFoundationApi";
import { environmentConfig } from "../config/environment";
import {
  createStoredGuestSession,
  secureGuestSessionStore,
  type GuestSessionStore
} from "../session/secureGuestSession";
import { colors, spacing, typography } from "../theme";

type FoundationPhase = "welcome" | "account" | "consent" | "compose";
type AsyncState = "idle" | "loading" | "ready";

type Props = {
  api?: PeacePadFoundationApi;
  sessionStore?: GuestSessionStore;
  onOpenLab?: () => void;
};

const initialConsent: ConsentPreferences = {
  termsAccepted: false,
  privacyAcknowledged: false,
  aiMessageConsent: false
};

const defaultApi = createFoundationApi(environmentConfig);

function friendlyError(error: unknown): string {
  if (error instanceof PeacePadApiError) return error.message;
  return "PeacePad could not complete that request. Try again.";
}

export function FoundationScreen({
  api = defaultApi,
  sessionStore = secureGuestSessionStore,
  onOpenLab
}: Props) {
  const [phase, setPhase] = useState<FoundationPhase>("welcome");
  const [consent, setConsent] = useState<ConsentPreferences>(initialConsent);
  const [sessionState, setSessionState] = useState<AsyncState>("idle");
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const requiredConsentAccepted =
    consent.termsAccepted && consent.privacyAcknowledged;

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
        setPhase("compose");
        setSessionMessage("Welcome back.");
        setSessionState("ready");
      })
      .catch(async (error) => {
        await sessionStore.clear().catch(() => undefined);
        if (!active) return;
        setSessionMessage(friendlyError(error));
        setSessionState("idle");
        setPhase("welcome");
      });

    return () => {
      active = false;
    };
  }, [api, sessionStore]);

  async function startGuestSession() {
    if (!requiredConsentAccepted) {
      setSessionMessage(
        "Accept the Terms and acknowledge the Privacy Policy first."
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
      setPhase("compose");
      setSessionState("ready");
      setSessionMessage("Your choices are saved on this device.");
    } catch (error) {
      setSessionState("idle");
      setSessionMessage(friendlyError(error));
    }
  }

  async function resetDeviceSession() {
    await sessionStore.clear();
    setConsent(initialConsent);
    setSessionMessage("This device session was cleared.");
    setSessionState("idle");
    setPhase("welcome");
  }

  if (sessionState === "loading" && phase === "welcome") {
    return (
      <View style={styles.centered} accessibilityLabel="Restoring PeacePad session">
        <ActivityIndicator color={colors.brand} />
        <Text style={styles.muted}>Checking this device for a saved session…</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.brandRow}>
        <Image
          accessibilityLabel="PeacePad conch logo"
          source={require("./peacepad-conch.png")}
          style={styles.conchMark}
        />
        <View style={styles.brandCopy}>
          <Text style={styles.brandName}>PeacePad</Text>
        </View>
      </View>

      {phase === "welcome" ? (
        <View style={styles.card}>
          <Text style={styles.title}>
            A calmer way through hard co-parenting moments.
          </Text>
          <Text style={styles.body}>
            Pause before you send, check how a message may land, and choose a
            clearer next step.
          </Text>
          <PrimaryButton label="Try PeacePad" onPress={() => setPhase("consent")} />
          <SecondaryButton
            label="Existing account"
            onPress={() => setPhase("account")}
          />
          <LegalLinks />
        </View>
      ) : null}

      {phase === "account" ? (
        <View style={styles.card}>
          <Text style={styles.heading}>Existing account</Text>
          <Text style={styles.body}>
            Sign-in is temporarily unavailable. You can continue as a guest.
          </Text>
          <PrimaryButton label="Continue as guest" onPress={() => setPhase("consent")} />
          <SecondaryButton label="Back to welcome" onPress={() => setPhase("welcome")} />
          <LegalLinks />
        </View>
      ) : null}

      {phase === "consent" ? (
        <View style={styles.card}>
          <Text style={styles.heading}>Your choices come first</Text>
          <Text style={styles.body}>
            Review the required terms. Optional message assistance remains off unless you choose it.
          </Text>
          <ConsentToggle
            label="I agree to the Terms"
            checked={consent.termsAccepted}
            onPress={() =>
              setConsent((current) => ({
                ...current,
                termsAccepted: !current.termsAccepted
              }))
            }
          />
          <ConsentToggle
            label="I acknowledge the Privacy Policy"
            checked={consent.privacyAcknowledged}
            onPress={() =>
              setConsent((current) => ({
                ...current,
                privacyAcknowledged: !current.privacyAcknowledged
              }))
            }
          />
          <ConsentToggle
            label="Optional AI-assisted rewrites"
            description="Off by default. Rule-based tone preview works without it."
            checked={consent.aiMessageConsent}
            onPress={() =>
              setConsent((current) => ({
                ...current,
                aiMessageConsent: !current.aiMessageConsent
              }))
            }
          />
          <PrimaryButton
            label={sessionState === "loading" ? "Starting…" : "Continue as guest"}
            onPress={startGuestSession}
            disabled={!requiredConsentAccepted || sessionState === "loading"}
          />
          <SecondaryButton label="Back" onPress={() => setPhase("welcome")} />
          <LegalLinks />
        </View>
      ) : null}

      {phase === "compose" ? (
        <View style={styles.card}>
          <Text style={styles.heading}>You’re ready</Text>
          <Text style={styles.body}>Start with a message, plan an event, or organize a record.</Text>
          <PrimaryButton label="Continue to PeacePad" onPress={onOpenLab ?? (() => undefined)} />

          <SecondaryButton
            label="Reset this device session"
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
  return (
    <View style={styles.legalRow}>
      <Text style={styles.link} onPress={() => Linking.openURL("https://peacepad.ca/privacy")}>
        Privacy
      </Text>
      <Text style={styles.link} onPress={() => Linking.openURL("https://peacepad.ca/terms")}>
        Terms
      </Text>
      <Text style={styles.link} onPress={() => Linking.openURL("https://peacepad.ca/support")}>
        Support
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
    backgroundColor: colors.successSurface
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
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSurface
  },
  errorText: {
    ...typography.body,
    color: colors.dangerText
  },
  safetyNote: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.successSurface
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
