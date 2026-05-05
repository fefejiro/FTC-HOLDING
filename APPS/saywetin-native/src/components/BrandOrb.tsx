import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

const orbImage = require('../../assets/orb.png') as number;

type BrandOrbVariant = 'hero' | 'listen' | 'compact' | 'appIcon';
type BrandOrbPhase = 'idle' | 'listening' | 'matching';

type BrandOrbProps = {
  size?: number;
  variant?: BrandOrbVariant;
  animated?: boolean;
  showGlow?: boolean;
  phase?: BrandOrbPhase;
  style?: StyleProp<ViewStyle>;
};

const phaseAccent: Record<BrandOrbPhase, string> = {
  idle: 'rgba(194,153,255,0.80)',
  listening: 'rgba(255,212,140,0.92)',
  matching: 'rgba(125,240,197,0.92)',
};

export function BrandOrb({
  size = 180,
  variant = 'hero',
  animated = true,
  showGlow = true,
  phase = 'idle',
  style,
}: BrandOrbProps) {
  const breathe = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      breathe.setValue(0);
      return;
    }
    const duration = phase === 'matching' ? 900 : phase === 'listening' ? 1200 : 2200;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, breathe, phase]);

  useEffect(() => {
    if (!animated) {
      spin.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: phase === 'matching' ? 1600 : phase === 'listening' ? 2600 : 4800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, phase, spin]);

  const scale = animated
    ? breathe.interpolate({ inputRange: [0, 1], outputRange: [1, phase === 'idle' ? 1.02 : 1.06] })
    : 1;

  const outer = size;
  const glowSize = Math.round(size * 1.3);
  const spinRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.root, style, { width: outer, height: outer, transform: [{ scale }] }]}>
      {/* Phase-coloured outer glow */}
      {showGlow ? (
        <View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
              backgroundColor: phaseAccent[phase],
              opacity: variant === 'compact' ? 0.12 : 0.28,
            },
          ]}
        />
      ) : null}

      {/* Orbiting accent dot */}
      {animated ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: outer,
            height: outer,
            alignItems: 'center',
            justifyContent: 'flex-start',
            transform: [{ rotate: spinRotate }],
          }}
        >
          <View
            style={{
              width: Math.round(outer * 0.065),
              height: Math.round(outer * 0.065),
              borderRadius: Math.round(outer * 0.065) / 2,
              backgroundColor: phaseAccent[phase],
              marginTop: -Math.round(outer * 0.032),
              shadowColor: phaseAccent[phase],
              shadowOpacity: 0.95,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
              elevation: 8,
            }}
          />
        </Animated.View>
      ) : null}

      {/* Orb image — circular PNG with transparent background */}
      <Animated.Image
        source={orbImage}
        style={{ width: outer, height: outer, transform: [{ rotate: spinRotate }] }}
        resizeMode="contain"
      />

      {/* Phase colour overlay — tints the orb amber (listening) or green (matching) */}
      {phase !== 'idle' ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: outer,
            height: outer,
            borderRadius: outer / 2,
            backgroundColor: phaseAccent[phase],
            opacity: 0.22,
          }}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    shadowColor: '#A26FFF',
    shadowOpacity: 0.8,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },
});
