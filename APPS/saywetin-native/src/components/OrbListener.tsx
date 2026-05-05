import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const refractionSpin = useRef(new Animated.Value(0)).current;
  const iconSpin = useRef(new Animated.Value(0)).current;
  // 0 = idle (violet), 1 = listening (amber), 2 = matching (mint)
  const colorPhase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(activation, {
      toValue: isActive ? 1 : 0.6, // keep some glow even at idle for hero presence
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isActive, activation]);

  // Animate phase color transitions smoothly
  useEffect(() => {
    const target = isMatching ? 2 : isListening ? 1 : 0;
    Animated.timing(colorPhase, {
      toValue: target,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // color interpolation requires JS driver
    }).start();
  }, [isMatching, isListening, colorPhase]);

  useEffect(() => {
    refractionSpin.setValue(0);
    const anim = Animated.loop(
      Animated.timing(refractionSpin, {
        toValue: 1,
        duration: isMatching ? 2400 : isListening ? 3200 : 5600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [isListening, isMatching, refractionSpin]);

  useEffect(() => {
    iconSpin.setValue(0);
    const anim = Animated.loop(
      Animated.timing(iconSpin, {
        toValue: 1,
        duration: isMatching ? 2200 : isListening ? 3200 : 6400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [iconSpin, isListening, isMatching]);

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

  // Interpolated colors — violet(0) → amber(1) → mint(2)
  const ringTint = colorPhase.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [colors.violetSoft, colors.amber, colors.mint],
  });
  const barColor = ringTint; // same tint for wave bars
  const orbBodyColor = colorPhase.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['rgba(24,18,54,0.86)', 'rgba(39,21,88,0.9)', 'rgba(16,68,49,0.86)'],
  });
  const refractionColor = colorPhase.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['rgba(255,255,255,0.14)', 'rgba(255,210,100,0.14)', 'rgba(122,214,165,0.14)'],
  });
  const lowerGlowColor = colorPhase.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['rgba(201,112,255,0.26)', 'rgba(255,180,60,0.22)', 'rgba(122,214,165,0.22)'],
  });
  const letterGlowColor = colorPhase.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['rgba(180,160,255,0.5)', 'rgba(255,225,170,0.52)', 'rgba(122,214,165,0.5)'],
  });

  const refractionRotate = refractionSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const iconRotate = iconSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const orbFloatY = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1.5, -3.5],
  });
  const glossDriftX = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [-2, 3],
  });
  const glossDriftY = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, -2],
  });
  const lensScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1.018],
  });
  const letterFloatY = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, -2.5],
  });
  const letterScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.992, 1.016],
  });

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
                  borderColor: ringTint as unknown as string,
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
              shadowColor: ringTint as unknown as string,
            },
          ]}
        />

        <Pressable onPress={onPress} disabled={!onPress} hitSlop={20}>
          <Animated.View
            style={[
              styles.orbHit,
              {
                transform: [{ scale: orbScale }, { scale: tighten }],
                shadowColor: ringTint as unknown as string,
                shadowOpacity: isActive ? 0.85 : 0.55,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.glassOrb,
                {
                  backgroundColor: orbBodyColor,
                  transform: [{ translateY: orbFloatY }],
                },
              ]}
            >
              <View style={styles.edgeRing} />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.refractionSweep,
                  {
                    opacity: isActive ? 0.9 : 0.62,
                    backgroundColor: refractionColor,
                    transform: [{ rotate: refractionRotate }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.glossArc,
                  { transform: [{ translateX: glossDriftX }, { translateY: glossDriftY }, { rotate: '-24deg' }] },
                ]}
                pointerEvents="none"
              />
              <Animated.View
                style={[
                  styles.glossDot,
                  { transform: [{ translateX: glossDriftX }, { translateY: glossDriftY }] },
                ]}
                pointerEvents="none"
              />
              <Animated.View
                style={[
                  styles.lowerGlow,
                  { backgroundColor: lowerGlowColor },
                ]}
                pointerEvents="none"
              />
              <Animated.View
                style={[
                  styles.innerLens,
                  {
                    backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
                    borderColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)',
                    transform: [{ scale: lensScale }, { translateY: orbFloatY }],
                  },
                ]}
                pointerEvents="none"
              />
              <Animated.Image
                source={require('../../assets/icon.png')}
                resizeMode="contain"
                style={[
                  styles.orbIcon,
                  {
                    tintColor: undefined,
                    transform: [{ translateY: letterFloatY }, { scale: letterScale }, { rotate: iconRotate }],
                  },
                ]}
              />
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>

      <Animated.Text style={[styles.statusLabel, { color: ringTint as unknown as string }]}>{statusLabel}</Animated.Text>

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
                  backgroundColor: barColor as unknown as string,
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
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    elevation: 24,
  },
  glassOrb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  edgeRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  refractionSweep: {
    position: 'absolute',
    width: ORB_SIZE * 0.7,
    height: ORB_SIZE * 1.32,
    borderRadius: 999,
    top: -24,
    left: ORB_SIZE * 0.12,
  },
  glossArc: {
    position: 'absolute',
    width: ORB_SIZE * 0.62,
    height: ORB_SIZE * 0.42,
    top: 18,
    left: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  glossDot: {
    position: 'absolute',
    width: 38,
    height: 38,
    top: 26,
    left: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(255,250,242,0.72)',
  },
  lowerGlow: {
    position: 'absolute',
    width: ORB_SIZE * 0.72,
    height: ORB_SIZE * 0.26,
    bottom: 10,
    borderRadius: 999,
  },
  innerLens: {
    position: 'absolute',
    width: ORB_SIZE * 0.78,
    height: ORB_SIZE * 0.78,
    borderRadius: 999,
    borderWidth: 1,
  },
  orbIcon: {
    width: ORB_SIZE * 0.56,
    height: ORB_SIZE * 0.56,
    opacity: 0.98,
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
