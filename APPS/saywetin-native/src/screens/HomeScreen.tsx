import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FadeInView } from '../components/FadeInView';
import { ritualTokens } from '../theme/tokens';
import { explainSlang, type SlangExplanation } from '../api/slang';

const { colors } = ritualTokens;

export function HomeScreen({ onNext }: { onNext: () => void }) {
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SlangExplanation | null>(null);

  const decode = async () => {
    const trimmed = phrase.trim();
    if (trimmed.length < 2) {
      setError('Type at least 2 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const explanation = await explainSlang(trimmed);
      setResult(explanation);
    } catch (err: any) {
      setError(err?.message || 'Could not decode that phrase.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FadeInView>
      <View style={styles.screen}>
        <Text style={styles.greeting}>What&apos;s playing, wetin dem dey talk?</Text>

        <Pressable style={styles.orbTap} onPress={onNext}>
          <View style={styles.orbGlow} />
          <View style={styles.orbCore}>
            <Text style={styles.orbLabel}>Tap To Listen Live</Text>
          </View>
        </Pressable>

        <View style={styles.slangCard}>
          <Text style={styles.slangTitle}>Wetin be this?</Text>
          <Text style={styles.slangHint}>Decode any pidgin, slang, or lyric line.</Text>
          <TextInput
            value={phrase}
            onChangeText={setPhrase}
            placeholder="e.g. shey you dey whine me?"
            placeholderTextColor={colors.textMuted}
            style={styles.slangInput}
            multiline
            editable={!busy}
          />
          <Pressable
            onPress={decode}
            style={[styles.slangButton, busy && styles.slangButtonDisabled]}
            disabled={busy}
          >
            <Text style={styles.slangButtonText}>{busy ? 'Decoding...' : 'Decode'}</Text>
          </Pressable>
          {error ? <Text style={styles.slangError}>{error}</Text> : null}
          {result ? (
            <View style={styles.slangResult}>
              <Text style={styles.slangResultLabel}>Literal</Text>
              <Text style={styles.slangResultText}>{result.literal}</Text>
              <Text style={styles.slangResultLabel}>Cultural</Text>
              <Text style={styles.slangResultText}>{result.cultural}</Text>
              <View style={styles.slangChipsRow}>
                <View style={styles.slangChip}>
                  <Text style={styles.slangChipText}>{result.region}</Text>
                </View>
                {result.related.slice(0, 3).map((rel) => (
                  <View key={rel} style={styles.slangChip}>
                    <Text style={styles.slangChipText}>{rel}</Text>
                  </View>
                ))}
              </View>
              {result.examples.length > 0 ? (
                <>
                  <Text style={styles.slangResultLabel}>Examples</Text>
                  {result.examples.map((ex, idx) => (
                    <Text key={idx} style={styles.slangResultExample}>
                      &quot;{ex}&quot;
                    </Text>
                  ))}
                </>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.recentWrap}>
          <Text style={styles.recentTitle}>Now live</Text>
          <View style={styles.recentItem}>
            <View style={styles.recentDot} />
            <Text style={styles.recentText}>Real-time song recognition is active</Text>
          </View>
          <View style={styles.recentItem}>
            <View style={styles.recentDot} />
            <Text style={styles.recentText}>Cultural meaning loads after match</Text>
          </View>
        </View>
      </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 18,
    paddingTop: 8,
  },
  greeting: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
  },
  orbTap: {
    alignSelf: 'center',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 999,
    backgroundColor: colors.violetWash,
  },
  orbCore: {
    width: 168,
    height: 168,
    borderRadius: 999,
    backgroundColor: colors.violet,
    borderWidth: 1,
    borderColor: colors.violetSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  searchRow: {
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  searchLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  slangCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  slangTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  slangHint: {
    color: colors.textMuted,
    fontSize: 13,
  },
  slangInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 14,
    minHeight: 56,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  slangButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.violet,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  slangButtonDisabled: {
    opacity: 0.6,
  },
  slangButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  slangError: {
    color: colors.amber,
    fontSize: 13,
  },
  slangResult: {
    gap: 6,
    marginTop: 4,
  },
  slangResultLabel: {
    color: colors.violetSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  slangResultText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  slangResultExample: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  slangChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  slangChip: {
    backgroundColor: colors.violetWash,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,198,255,0.35)',
  },
  slangChipText: {
    color: colors.violetSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  recentWrap: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  recentTitle: {
    color: colors.violetSoft,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '700',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recentDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.mint,
  },
  recentText: {
    color: colors.text,
    fontSize: 15,
  },
});