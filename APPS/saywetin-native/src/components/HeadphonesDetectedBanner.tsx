import { StyleSheet, Text, View } from 'react-native';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;

type HeadphonesDetectedBannerProps = {
  visible: boolean;
};

export function HeadphonesDetectedBanner({ visible }: HeadphonesDetectedBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Headphones detected</Text>
      <Text style={styles.copy}>Microphone matching usually cannot hear private Bluetooth or wired playback from the same phone. Use lyrics or share the song link instead.</Text>
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
    gap: 2,
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
});
