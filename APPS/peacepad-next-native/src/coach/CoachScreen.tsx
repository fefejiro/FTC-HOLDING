import React, { useState } from "react";
import { Share, StyleSheet, Text, TextInput, View } from "react-native";
import { LabButton } from "../components/LabButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { useCoordinationState } from "../coordination/CoordinationState";
import { colors, spacing, typography } from "../theme";
import { CoachConversation } from "./CoachConversation";

/**
 * A first-class private Coach destination for both solo and connected parents.
 * Coach prepares wording only; sharing always requires a separate user action.
 */
export function CoachScreen({ onOpenMessages }: { onOpenMessages?: () => void }) {
  const {
    coachConversationTurn,
    connected,
    setMessageDraft,
    transcribeCoachAudio
  } = useCoordinationState();
  const [draft, setDraft] = useState("");
  const [shareError, setShareError] = useState("");

  const useDraft = (value: string) => {
    setDraft(value);
    setMessageDraft(value);
    setShareError("");
  };

  const shareDraft = async () => {
    const body = draft.trim();
    if (!body) return;
    setShareError("");
    try {
      await Share.share({
        message: body,
        title: "PeacePad Coach draft"
      });
    } catch {
      setShareError("PeacePad could not open sharing. Your draft is still here.");
    }
  };

  return (
    <View style={styles.stack}>
      <ScreenHeader
        accent={colors.coral}
        icon="heart-circle-outline"
        kicker="Private preparation"
        softBackground={colors.cream}
        subtitle="Speak or type privately, then decide what—if anything—you want to share."
        title="PeaceBot Coach"
      />
      <CoachConversation
        initiallyOpen
        onConversationTurn={coachConversationTurn}
        onTranscribe={transcribeCoachAudio}
        onUseDraft={useDraft}
      />
      {draft ? (
        <View style={styles.draftCard}>
          <Text accessibilityRole="header" style={styles.heading}>Your private working draft</Text>
          <TextInput
            accessibilityLabel="Private Coach draft"
            multiline
            onChangeText={useDraft}
            style={styles.input}
            textAlignVertical="top"
            value={draft}
          />
          <Text style={styles.body}>Nothing is sent automatically. Review the wording and choose the next step yourself.</Text>
          {connected && onOpenMessages ? <LabButton label="Continue in Messages" onPress={onOpenMessages} /> : null}
          <LabButton label="Share using another app" onPress={() => void shareDraft()} variant="secondary" />
          {shareError ? <Text accessibilityRole="alert" style={styles.error}>{shareError}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  draftCard: { backgroundColor: colors.successSurface, borderColor: colors.successBorder, borderRadius: 24, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  heading: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.text },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, color: colors.text, minHeight: 140, padding: spacing.md },
  error: { ...typography.body, color: colors.dangerText }
});
