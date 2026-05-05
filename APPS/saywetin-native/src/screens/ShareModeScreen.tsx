import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { FadeInView } from '../components/FadeInView';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;

type ShareModeScreenProps = {
  onClose: () => void;
};

export function ShareModeScreen({ onClose }: ShareModeScreenProps) {
  const [linkInput, setLinkInput] = useState('');

  return (
    <FadeInView>
      <View style={styles.screen}>
        <Text style={styles.title}>Share Mode</Text>
        <Text style={styles.subtitle}>Paste a link from Spotify, Apple Music, YouTube, TikTok, or your browser.</Text>

        <TextInput
          value={linkInput}
          onChangeText={setLinkInput}
          placeholder="Paste song link"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Pressable style={styles.primaryButton} onPress={onClose}>
          <Text style={styles.primaryText}>Continue</Text>
        </Pressable>

        <Text style={styles.notice}>Link parsing is being prepared in this phase.</Text>

        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 40,
    gap: 14,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  primaryButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.violetSoft,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  primaryText: {
    color: colors.bg,
    fontWeight: '700',
  },
  notice: {
    color: colors.amber,
    fontSize: 13,
  },
  closeButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  closeText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
});
