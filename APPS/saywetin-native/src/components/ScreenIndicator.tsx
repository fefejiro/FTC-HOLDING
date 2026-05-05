import { StyleSheet, View } from 'react-native';
import type { RitualScreen } from '../state/ritual-state';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;

export function ScreenIndicator({ screen }: { screen: RitualScreen }) {
  const steps: RitualScreen[] = ['home', 'listen', 'result'];

  return (
    <View style={styles.stepRow}>
      {steps.map((step) => {
        const active = step === screen;
        return <View key={step} style={[styles.stepDot, active ? styles.stepDotActive : null]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.violet,
    borderColor: colors.violetSoft,
  },
});