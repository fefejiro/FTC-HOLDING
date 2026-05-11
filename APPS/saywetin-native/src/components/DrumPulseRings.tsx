import { Animated, StyleSheet, View } from 'react-native';

type DrumPulseRingsProps = {
  pulses: Animated.Value[];
  active: boolean;
  color: string;
};

export function DrumPulseRings({ pulses, active, color }: DrumPulseRingsProps) {
  if (!active) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.layer}>
      {pulses.map((value, index) => {
        const scale = value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.72, 2.5],
        });

        const opacity = value.interpolate({
          inputRange: [0, 0.18, 1],
          outputRange: [0, 0.36 - index * 0.03, 0],
        });

        return (
          <Animated.View
            key={`drum-ring-${index}`}
            style={[
              styles.ring,
              {
                borderColor: color,
                opacity,
                transform: [{ scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 999,
    borderWidth: 1.4,
    backgroundColor: 'transparent',
  },
});
