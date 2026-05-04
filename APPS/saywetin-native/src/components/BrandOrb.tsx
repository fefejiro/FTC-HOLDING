import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

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
        duration: phase === 'matching' ? 2200 : phase === 'listening' ? 3200 : 12000,
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

  const ringOpacity = useMemo(() => {
    if (variant === 'compact') return [0.18, 0.08];
    if (variant === 'appIcon') return [0.24, 0.12];
    return [0.32, 0.18];
  }, [variant]);

  const outer = size;
  const inner = Math.round(size * 0.86);
  const iconSize = Math.round(size * 0.66);
  const glowSize = Math.round(size * 1.22);
  const spinRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.root, style, { width: outer, height: outer, transform: [{ scale }] }]}> 
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
              opacity: variant === 'compact' ? 0.1 : 0.2,
            },
          ]}
        />
      ) : null}

      {/* Orbiting accent dot — spins around the orb to show animation */}
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

      <View style={[styles.shell, { borderRadius: outer / 2 }]}> 
        <View
          style={[
            styles.ring,
            {
              width: outer,
              height: outer,
              borderRadius: outer / 2,
              borderColor: `rgba(213,182,255,${ringOpacity[0]})`,
            },
          ]}
        />
        <View
          style={[
            styles.ring,
            {
              width: Math.round(outer * 0.9),
              height: Math.round(outer * 0.9),
              borderRadius: Math.round(outer * 0.9) / 2,
              borderColor: `rgba(173,133,245,${ringOpacity[1]})`,
            },
          ]}
        />

        <View
          style={[
            styles.core,
            {
              width: inner,
              height: inner,
              borderRadius: inner / 2,
            },
          ]}
        >
          <View style={[styles.highlight, { width: Math.round(inner * 0.58), left: Math.round(inner * 0.08) }]} />
          <View style={[styles.edgeBloom, { width: Math.round(inner * 0.5), right: Math.round(inner * 0.1) }]} />

          {/* SW monogram — S in front, W anchoring, legible at all sizes */}
          <View style={styles.glyphWrap}>
            <View style={[styles.swMark, { width: iconSize, height: iconSize }]}>
              {/* W — wide base anchor, rendered first (behind) */}
              <Text
                style={[
                  styles.swLetter,
                  styles.swW,
                  { fontSize: Math.round(iconSize * 0.52), lineHeight: Math.round(iconSize * 0.58) },
                ]}
                allowFontScaling={false}
              >
                W
              </Text>
              {/* S — sits centered, slightly elevated, rendered on top */}
              <Text
                style={[
                  styles.swLetter,
                  styles.swS,
                  { fontSize: Math.round(iconSize * 0.62), lineHeight: Math.round(iconSize * 0.68) },
                ]}
                allowFontScaling={false}
              >
                S
              </Text>
            </View>
          </View>
        </View>
      </View>
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
  shell: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E0720',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(225,204,255,0.32)',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#1C0D3A',
    borderWidth: 1,
    borderColor: 'rgba(231,209,255,0.34)',
  },
  highlight: {
    position: 'absolute',
    top: 10,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.24)',
    transform: [{ rotate: '-24deg' }],
  },
  edgeBloom: {
    position: 'absolute',
    bottom: 20,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(162,102,255,0.33)',
    transform: [{ rotate: '18deg' }],
  },
  glyphWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '72%',
    height: '72%',
  },
  swMark: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  swLetter: {
    position: 'absolute',
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
  },
  // W rendered behind: slightly lower, wider visual weight, dimmer
  swW: {
    color: 'rgba(207,186,255,0.55)',
    top: '38%',
  },
  // S rendered in front: centered, bright, dominant
  swS: {
    color: '#F0E8FF',
    top: '10%',
    textShadowColor: 'rgba(180,140,255,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
