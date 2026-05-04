import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;

type HeadphonesDetectedBannerProps = {
  visible: boolean;
  onTryAnyway?: () => void;
};

export function HeadphonesDetectedBanner({ visible, onTryAnyway }: HeadphonesDetectedBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Headphones detected</Text>
      <Text style={styles.copy}>Audio is routing to your headphones — the phone mic may not hear it. Try switching to phone speaker, or tap below to attempt with phone mic.</Text>
      {onTryAnyway ? (
        <Pressable style={styles.tryBtn} onPress={onTryAnyway}>
          <Text style={styles.tryBtnText}>Try with phone mic</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    backgroundColor: colors.violetWash,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  title: {
    color: colors.violetSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  copy: {
    color: colors.text,
    fontSize: 13,
  },
  tryBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tryBtnText: {
    color: colors.violetSoft,
    fontSize: 12,
    fontWeight: '600',
  },
});
