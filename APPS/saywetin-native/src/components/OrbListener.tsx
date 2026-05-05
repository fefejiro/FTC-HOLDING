import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandOrb } from './BrandOrb';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;

type ListenPhase = 'idle' | 'listening' | 'matching';

type OrbListenerProps = {
  phase: ListenPhase;
  onPress?: () => void;
};

const ORB_SIZE = 200;
// Shazam-style outward pulse rings — staggered so a new ring launches every ~700ms.
const PULSE_DELAYS_MS = [0, 700, 1400, 2100, 2800];
const PULSE_DURATION_MS = 3500;

export function OrbListener({ phase, onPress }: OrbListenerProps) {
  const isIdle = phase === 'idle';
  const isListening = phase === 'listening';
  const isMatching = phase === 'matching';
  const isActive = !isIdle;

  const breathe = useRef(new Animated.Value(0)).current;
  const tighten = useRef(new Animated.Value(1)).current;
  const pulses = useRef(PULSE_DELAYS_MS.map(() => new Animated.Value(0))).current;
  const activation = useRef(new Animated.Value(0)).current;
  const barValues = useRef(Array.from({ length: 7 }).map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    Animated.timing(activation, {
      toValue: isActive ? 1 : 0.6, // keep some glow even at idle for hero presence
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isActive, activation]);

  // Gentle breathing of the orb itself.
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: isMatching ? 800 : isListening ? 1100 : 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: isMatching ? 800 : isListening ? 1100 : 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [breathe, isMatching, isListening]);

  // Slight scale-down when matching (focus moment).
  useEffect(() => {
    Animated.timing(tighten, {
      toValue: isMatching ? 0.85 : 1,
      duration: 420,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [isMatching, tighten]);

  // Shazam-style outward expanding pulse rings.
  useEffect(() => {
    const animations = pulses.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(PULSE_DELAYS_MS[index]),
          Animated.timing(value, {
            toValue: 1,
            duration: PULSE_DURATION_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(value, { toValue: 0, duration: 1, useNativeDriver: true }),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [pulses]);

  // Bottom wave bar dance.
  useEffect(() => {
    if (isIdle) {
      barValues.forEach((v) => v.stopAnimation(() => v.setValue(0.3)));
      return;
    }
    const speeds = [560, 680, 520, 740, 610, 790, 650];
    const animations = barValues.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: speeds[index],
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.25,
            duration: speeds[index],
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [barValues, isIdle]);

  const orbScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isIdle ? 1.02 : 1.06],
  });

  const statusLabel = isMatching ? 'IDENTIFYING' : isListening ? 'LISTENING' : 'TAP TO LISTEN';
  const ringTint = isMatching ? colors.mint : isListening ? colors.amber : colors.violetSoft;
  const barColor = isMatching ? colors.mint : isListening ? colors.amber : colors.violetSoft;

  return (
    <View style={styles.wrap}>
      <View style={styles.stage} pointerEvents="box-none">
        {pulses.map((value, index) => {
          const ringScale = value.interpolate({
            inputRange: [0, 1],
            outputRange: [0.55, 2.4],
          });
          const ringOpacity = Animated.multiply(
            activation,
            value.interpolate({
              inputRange: [0, 0.15, 1],
              outputRange: [0, 0.45, 0],
            }),
          );

          return (
            <Animated.View
              key={`pulse-${index}`}
              pointerEvents="none"
              style={[
                styles.pulseRing,
                {
                  borderColor: ringTint,
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }, { scale: tighten }],
                },
              ]}
            />
          );
        })}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.haloOuter,
            {
              opacity: activation,
              transform: [{ scale: tighten }],
              shadowColor: ringTint,
            },
          ]}
        />

        <Pressable onPress={onPress} disabled={!onPress} hitSlop={20}>
          <Animated.View
            style={[
              styles.orbHit,
              {
                transform: [{ scale: orbScale }, { scale: tighten }],
                shadowColor: ringTint,
                shadowOpacity: isActive ? 0.85 : 0.55,
              },
            ]}
          >
            <BrandOrb
              size={ORB_SIZE}
              variant="listen"
              animated
              showGlow
              phase={isMatching ? 'matching' : isListening ? 'listening' : 'idle'}
            />
          </Animated.View>
        </Pressable>
      </View>

      <Text style={[styles.statusLabel, { color: ringTint }]}>{statusLabel}</Text>

      <Animated.View style={[styles.waveStrip, { opacity: activation }]} pointerEvents="none">
        {barValues.map((value, index) => {
          const scaleY = value.interpolate({
            inputRange: [0, 1],
            outputRange: [isIdle ? 0.3 : 0.4, isIdle ? 0.5 : 1],
          });
          return (
            <Animated.View
              key={`wave-${index}`}
              style={[
                styles.waveBar,
                {
                  transform: [{ scaleY }],
                  backgroundColor: barColor,
                },
              ]}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 420,
    marginTop: 4,
  },
  stage: {
    width: ORB_SIZE * 2.5,
    height: ORB_SIZE * 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  haloOuter: {
    position: 'absolute',
    width: ORB_SIZE * 1.35,
    height: ORB_SIZE * 1.35,
    borderRadius: (ORB_SIZE * 1.35) / 2,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
    elevation: 20,
  },
  orbHit: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    elevation: 24,
  },
  statusLabel: {
    marginTop: 18,
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '700',
  },
  waveStrip: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 28,
  },
  waveBar: {
    width: 3,
    height: 24,
    borderRadius: 2,
  },
});
