import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;

type ListenPhase = 'listening' | 'matching';

type OrbListenerProps = {
  phase: ListenPhase;
};

const RING_DELAYS_MS = [0, 600, 1200, 1800];
const RING_OPACITY = [0.28, 0.21, 0.14, 0.07];
const BAR_SPEED_MS = [560, 680, 520, 740, 610, 790, 650];

export function OrbListener({ phase }: OrbListenerProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const tighten = useRef(new Animated.Value(1)).current;
  const ringProgress = useRef(RING_DELAYS_MS.map(() => new Animated.Value(0))).current;
  const barValues = useRef(BAR_SPEED_MS.map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: phase === 'matching' ? 900 : 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: phase === 'matching' ? 900 : 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnim.start();
    return () => pulseAnim.stop();
  }, [phase, pulse]);

  useEffect(() => {
    Animated.timing(tighten, {
      toValue: phase === 'matching' ? 0.7 : 1,
      duration: 420,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [phase, tighten]);

  useEffect(() => {
    const animations = ringProgress.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(RING_DELAYS_MS[index]),
          Animated.timing(value, {
            toValue: 1,
            duration: 3000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 1,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [ringProgress]);

  useEffect(() => {
    const animations = barValues.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: BAR_SPEED_MS[index],
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.25,
            duration: BAR_SPEED_MS[index],
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [barValues]);

  const orbScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <View style={styles.wrap}>
      {ringProgress.map((value, index) => {
        const ringScale = value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 1.85],
        });
        const ringOpacity = value.interpolate({
          inputRange: [0, 1],
          outputRange: [RING_OPACITY[index], 0],
        });

        return (
          <Animated.View
            key={`ring-${index}`}
            style={[
              styles.ring,
              {
                opacity: ringOpacity,
                transform: [{ scale: ringScale }, { scale: tighten }],
              },
            ]}
          />
        );
      })}

      <Animated.View
        style={[
          styles.orb,
          {
            transform: [{ scale: orbScale }, { scale: tighten }],
            borderColor: phase === 'matching' ? colors.mint : colors.violetSoft,
          },
        ]}
      >
        <View style={styles.orbInner}>
          <Text style={styles.micGlyph}>{phase === 'matching' ? 'ID' : 'MIC'}</Text>
          <View style={styles.eqRow}>
            {barValues.map((value, index) => {
              const scaleY = value.interpolate({
                inputRange: [0, 1],
                outputRange: [0.35, 1],
              });

              return (
                <Animated.View
                  key={`bar-${index}`}
                  style={[
                    styles.eqBar,
                    {
                      transform: [{ scaleY }],
                      backgroundColor: phase === 'matching' ? colors.mint : colors.text,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      </Animated.View>

      <View style={styles.waveStrip}>
        {Array.from({ length: 48 }).map((_, index) => (
          <View
            key={`wave-${index}`}
            style={[
              styles.waveBar,
              {
                height: 6 + ((index * 7) % 20),
                opacity: 0.2 + ((index * 3) % 10) / 20,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    marginTop: 4,
  },
  ring: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    backgroundColor: colors.violetWash,
  },
  orb: {
    width: 160,
    height: 160,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbInner: {
    width: 136,
    height: 136,
    borderRadius: 999,
    backgroundColor: colors.violetDim,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  micGlyph: {
    color: colors.text,
    fontSize: 16,
    letterSpacing: 1,
    fontWeight: '700',
  },
  eqRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 24,
  },
  eqBar: {
    width: 5,
    height: 20,
    borderRadius: 3,
  },
  waveStrip: {
    marginTop: 42,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  waveBar: {
    width: 2,
    borderRadius: 2,
    backgroundColor: colors.violetSoft,
  },
});
