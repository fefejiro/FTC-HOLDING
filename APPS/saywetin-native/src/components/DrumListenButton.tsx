import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { ritualTokens } from '../theme/tokens';
import { TalkingDrumMark } from './TalkingDrumMark';
import { DrumPulseRings } from './DrumPulseRings';

const { colors } = ritualTokens;

type ListenPhase = 'idle' | 'listening' | 'matching';

type DrumListenButtonProps = {
  phase: ListenPhase;
  onPress?: () => void;
};

const PULSE_DELAYS_MS = [0, 680, 1360, 2040];

export function DrumListenButton({ phase, onPress }: DrumListenButtonProps) {
  const isActive = phase !== 'idle';
  const isMatching = phase === 'matching';

  const breathe = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const pulses = useRef(PULSE_DELAYS_MS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: isMatching ? 720 : 1080,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: isMatching ? 720 : 1080,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [breathe, isMatching]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: isMatching ? 2200 : 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [spin, isMatching]);

  useEffect(() => {
    const loops = pulses.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(PULSE_DELAYS_MS[index]),
          Animated.timing(value, {
            toValue: 1,
            duration: 3200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 16,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    if (isActive) {
      loops.forEach((loop) => loop.start());
    } else {
      pulses.forEach((value) => value.setValue(0));
    }

    return () => loops.forEach((loop) => loop.stop());
  }, [isActive, pulses]);

  const accent = isMatching ? '#91E5C2' : phase === 'listening' ? '#F4CC8E' : colors.violetSoft;

  const scale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isActive ? 1.06 : 1.02],
  });

  const glowOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, isActive ? 0.34 : 0.22],
  });

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.wrap}>
      <DrumPulseRings pulses={pulses} active={isActive} color={accent} />

      <Pressable onPress={onPress} style={styles.hitArea}>
        <Animated.View style={[styles.glow, { backgroundColor: accent, opacity: glowOpacity }]} />

        <Animated.View style={[styles.orb, { transform: [{ scale }] }]}>
          <Animated.View style={[styles.glassSheen, { transform: [{ rotate }] }]} />
          <TalkingDrumMark color="#F5EEFD" accentColor="#D9BE86" />
          <View style={[styles.innerGlow, { borderColor: accent }]} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitArea: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
  },
  orb: {
    width: 196,
    height: 196,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(32,20,67,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glassSheen: {
    position: 'absolute',
    top: -32,
    width: 120,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  innerGlow: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 999,
    borderWidth: 1,
    opacity: 0.45,
  },
});
