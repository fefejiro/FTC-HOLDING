import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { ritualTokens } from '../theme/tokens';
import { DrumPulseRings } from './DrumPulseRings';

const talkingDrumIcon = require('../../assets/talking-drum-icon-runtime.png');

const { colors } = ritualTokens;

type ListenPhase = 'idle' | 'listening' | 'matching' | 'failed';

type DrumListenButtonProps = {
  phase: ListenPhase;
  onPress?: () => void;
};

const PULSE_DELAYS_MS = [0, 680, 1360, 2040];
const MATCHING_PULSE_DELAYS_MS = [0, 420, 840, 1260];

export function DrumListenButton({ phase, onPress }: DrumListenButtonProps) {
  const isFailed = phase === 'failed';
  const isActive = phase !== 'idle' && !isFailed;
  const isMatching = phase === 'matching';
  const shouldSpin = phase === 'listening' || phase === 'matching';

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
    if (!shouldSpin) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }

    spin.setValue(0);

    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: isMatching ? 1800 : 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [spin, isMatching, shouldSpin]);

  useEffect(() => {
    const loops = pulses.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(isMatching ? MATCHING_PULSE_DELAYS_MS[index] : PULSE_DELAYS_MS[index]),
          Animated.timing(value, {
            toValue: 1,
            duration: isMatching ? 2100 : 3200,
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
  }, [isActive, isMatching, pulses]);

  const accent = isMatching ? '#91E5C2' : phase === 'listening' ? '#F4CC8E' : isFailed ? '#F4CC8E' : colors.violetSoft;
  const orbLabel =
    phase === 'listening'
      ? 'LISTENING...'
      : phase === 'matching'
        ? 'FINDING THE SONG...'
        : isFailed
          ? 'TRY AGAIN'
          : 'TAP TO LISTEN';
  const orbSubLabel =
    phase === 'listening'
      ? 'Hold steady'
      : phase === 'matching'
        ? 'Reading the rhythm'
        : isFailed
          ? 'I could not hear enough music.'
          : '';

  const scale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isActive ? 1.06 : 1.02],
  });

  const glowOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, isActive ? 0.34 : 0.22],
  });

  const sheenRotate = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '8deg'],
  });

  const drumRotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const drumScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isActive ? 1.06 : 1.015],
  });

  const drumOpacity = isFailed ? 0.72 : 1;
  const motionOpacity = isActive ? 0.95 : 0;

  return (
    <View style={styles.wrap}>
      <DrumPulseRings pulses={pulses} active={isActive} color={accent} />

      <Pressable onPress={onPress} style={styles.hitArea}>
        <Animated.View style={[styles.glow, { backgroundColor: accent, opacity: glowOpacity }]} />

        <Animated.View style={[styles.orb, { transform: [{ scale }] }]}>
          <Animated.View style={[styles.glassSheen, { transform: [{ rotate: sheenRotate }] }]} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.motionOrbit,
              {
                borderTopColor: accent,
                borderRightColor: accent,
                opacity: motionOpacity,
                transform: [{ rotate: drumRotation }],
              },
            ]}
          />
          <Animated.View style={[styles.drumSpinner, { transform: [{ rotate: drumRotation }] }]}>
            <Animated.Image
              source={talkingDrumIcon}
              style={[
                styles.talkingDrumImage,
                {
                  opacity: drumOpacity,
                  transform: [{ scale: drumScale }],
                },
              ]}
              resizeMode="contain"
              accessibilityLabel="SayWetin talking drum"
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.motionBead, { backgroundColor: accent, opacity: motionOpacity }]}
            />
          </Animated.View>
          <Text style={[styles.orbLabel, isMatching && styles.orbLabelTight]} numberOfLines={1} adjustsFontSizeToFit>
            {orbLabel}
          </Text>
          <View style={[styles.innerGlow, { borderColor: accent }]} />
        </Animated.View>
        {orbSubLabel ? (
          <Text style={styles.orbSubLabel} numberOfLines={1}>
            {orbSubLabel}
          </Text>
        ) : null}
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
    height: 250,
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
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  talkingDrumImage: {
    width: 104,
    height: 119,
    zIndex: 1,
  },
  drumSpinner: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  motionOrbit: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    borderWidth: 3,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    zIndex: 1,
  },
  motionBead: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 11,
    height: 11,
    borderRadius: 999,
    shadowColor: '#F4CC8E',
    shadowOpacity: 0.55,
    shadowRadius: 8,
  },
  orbLabel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 20,
    zIndex: 2,
    color: '#F7F2FF',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 4,
    opacity: 0.92,
    textAlign: 'center',
  },
  orbLabelTight: {
    letterSpacing: 2.8,
    fontSize: 9,
  },
  orbSubLabel: {
    position: 'absolute',
    left: -12,
    right: -12,
    bottom: 2,
    color: '#B8AEE6',
    fontSize: 11,
    lineHeight: 15,
    opacity: 0.78,
    textAlign: 'center',
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
