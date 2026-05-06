import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

const orbImage = require('../../assets/orb.png') as number;
const BASE_GLYPHS = ['YOR', 'IGB', 'HAU', 'PID', '9JA', 'A', 'E', 'I', 'N', 'O', 'U', '1', '2', '7', '#', '♪', '♫'];
const BURST_COUNT = 12;

type BrandOrbVariant = 'hero' | 'listen' | 'compact' | 'appIcon';
type BrandOrbPhase = 'idle' | 'listening' | 'matching';

type BrandOrbProps = {
  size?: number;
  variant?: BrandOrbVariant;
  animated?: boolean;
  showGlow?: boolean;
  phase?: BrandOrbPhase;
  semanticHint?: string;
  confidence?: number;
  style?: StyleProp<ViewStyle>;
};

const phaseAccent: Record<BrandOrbPhase, string> = {
  idle: 'rgba(194,153,255,0.80)',
  listening: 'rgba(255,212,140,0.92)',
  matching: 'rgba(125,240,197,0.92)',
};

function buildSemanticGlyphs(hint?: string) {
  const source = (hint || '').toLowerCase();
  const semantic = [...BASE_GLYPHS];

  const add = (tokens: string[]) => tokens.forEach((t) => semantic.push(t));

  if (/love|heart|romance|baby|darling|sweet/.test(source)) add(['HEART', 'XO', '<3', '∞']);
  if (/dance|party|club|groove|shake|turn up|vibe|rhythm|beat/.test(source)) add(['BPM', 'STEP', '♪', '♫', 'MOVE', 'CALL', 'RESP']);
  if (/street|hustle|cash|money|grind|lagos|naija/.test(source)) add(['₦', '419', 'EKO', '9JA']);
  if (/god|spirit|prayer|hallelujah|church|grace/.test(source)) add(['AMEN', '✦', 'LIGHT']);
  if (/pain|sorry|cry|tears|broken|lonely/.test(source)) add(['...', 'ECHO', 'VOID']);
  if (/fire|hot|heat|energy|power/.test(source)) add(['⚡', 'FIRE', '100']);
  if (/afro|afrobeats|fuji|highlife|apala|juju/.test(source)) add(['DUN', 'TALK', 'RHYM', 'SYNC']);

  return semantic;
}

function inferBeatMs(hint?: string) {
  const source = (hint || '').toLowerCase();

  // Approximate rhythmic feel by semantic cues when true BPM is unavailable.
  if (/amapiano|house|club|fast|dance|turn up|party|drill/.test(source)) return 430;
  if (/afrobeats|groove|bounce|step|vibe|rhythm|beat/.test(source)) return 520;
  if (/highlife|fuji|juju|apala|soul|love/.test(source)) return 620;
  if (/worship|prayer|spirit|slow|sad|ballad/.test(source)) return 720;

  return 560;
}

export function BrandOrb({
  size = 180,
  variant = 'hero',
  animated = true,
  showGlow = true,
  phase = 'idle',
  semanticHint,
  confidence = 0,
  style,
}: BrandOrbProps) {
  const breathe = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const bursts = useRef(Array.from({ length: BURST_COUNT }, () => new Animated.Value(0))).current;
  const semanticGlyphs = useMemo(() => buildSemanticGlyphs(semanticHint), [semanticHint]);
  const beatMs = useMemo(() => inferBeatMs(semanticHint), [semanticHint]);
  const confidenceNorm = Math.max(0, Math.min(1, confidence / 100));
  const phaseEnergy = phase === 'matching' ? 1 : phase === 'listening' ? 0.88 : 0.55;
  const rhythmIntensity = (0.55 + confidenceNorm * 0.45) * phaseEnergy;

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
        duration: phase === 'matching' ? 2200 : phase === 'listening' ? 3600 : 5200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, phase, spin]);

  useEffect(() => {
    if (!animated || phase === 'idle') {
      bursts.forEach((b) => b.setValue(0));
      return;
    }

    const loops = bursts.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          // Two-symbol call/response lanes that pulse in beat groups.
          Animated.delay(
            Math.floor(index / 2) * Math.round(beatMs * 0.72) +
              (index % 2 === 0 ? 0 : Math.round(beatMs * (0.42 + (1 - confidenceNorm) * 0.06))),
          ),
          Animated.timing(value, {
            toValue: 1,
            duration: phase === 'matching' ? Math.round(beatMs * (2.35 - confidenceNorm * 0.45)) : Math.round(beatMs * (2.95 - confidenceNorm * 0.5)),
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(value, { toValue: 0, duration: 20, useNativeDriver: true }),
        ]),
      ),
    );

    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [animated, beatMs, bursts, phase]);

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
      <Animated.View
        style={{
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          overflow: 'hidden',
          transform: [{ rotate: spinRotate }],
        }}
      >
        <Animated.Image source={orbImage} style={{ width: outer, height: outer }} resizeMode="cover" />
      </Animated.View>

      {/* Song-aware glyph particles that burst toward screen edges and fade out */}
      {phase !== 'idle'
        ? bursts.map((progress, index) => {
            const angle = (index / bursts.length) * Math.PI * 2;
            const launchRadius = outer * 0.52;
            const edgeRadius = outer * (variant === 'hero' ? 3.2 + confidenceNorm * 0.9 : 2.5 + confidenceNorm * 0.6);
            const ghostEdgeRadius = edgeRadius * 0.84;
            const x0 = Math.cos(angle) * launchRadius;
            const y0 = Math.sin(angle) * launchRadius;
            const x1 = Math.cos(angle) * edgeRadius;
            const y1 = Math.sin(angle) * edgeRadius;
            const isCall = index % 2 === 0;
            const symbol = semanticGlyphs[index % semanticGlyphs.length];

            return (
              <Animated.Text
                key={`glyph-${index}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  fontSize: Math.max(11, Math.round(outer * (isCall ? 0.079 : 0.07))),
                  fontWeight: isCall ? '800' : '700',
                  color: phaseAccent[phase],
                  textShadowColor: 'rgba(241, 217, 170, 0.28)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 8,
                  opacity: progress.interpolate({
                    inputRange: [0, 0.14, 0.76, 1],
                    outputRange: [
                      0,
                      (isCall ? 0.72 : 0.5) + 0.26 * rhythmIntensity,
                      (isCall ? 0.38 : 0.24) + 0.14 * rhythmIntensity,
                      0,
                    ],
                  }),
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [x0, x1],
                      }),
                    },
                    {
                      translateY: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [y0, y1],
                      }),
                    },
                    {
                      scale: progress.interpolate({
                        inputRange: [0, 0.42, 1],
                        outputRange: isCall ? [0.86, 1.08, 0.9] : [0.78, 0.98, 0.82],
                      }),
                    },
                    { rotate: spinRotate },
                  ],
                }}
              >
                {symbol}
              </Animated.Text>
            );
          })
        : null}

      {/* Soft off-beat ghost trail to create a layered musical rhythm */}
      {phase !== 'idle'
        ? bursts.map((progress, index) => {
            const angle = (index / bursts.length) * Math.PI * 2;
            const launchRadius = outer * 0.47;
            const edgeRadius = outer * (variant === 'hero' ? 2.8 + confidenceNorm * 0.75 : 2.2 + confidenceNorm * 0.5);
            const x0 = Math.cos(angle) * launchRadius;
            const y0 = Math.sin(angle) * launchRadius;
            const x1 = Math.cos(angle + 0.16) * edgeRadius;
            const y1 = Math.sin(angle + 0.16) * edgeRadius;
            const isOffBeat = index % 2 === 1;
            const symbol = semanticGlyphs[(index + 3) % semanticGlyphs.length];

            return (
              <Animated.Text
                key={`ghost-${index}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  fontSize: Math.max(9, Math.round(outer * (isOffBeat ? 0.06 : 0.052))),
                  fontWeight: isOffBeat ? '700' : '600',
                  color: phaseAccent[phase],
                  textShadowColor: 'rgba(164, 132, 255, 0.22)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 6,
                  opacity: progress.interpolate({
                    inputRange: [0, 0.26, 0.92, 1],
                    outputRange: [0, 0, (isOffBeat ? 0.24 : 0.12) + 0.13 * rhythmIntensity, 0],
                  }),
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 0.28, 1],
                        outputRange: [x0, x0, x1],
                      }),
                    },
                    {
                      translateY: progress.interpolate({
                        inputRange: [0, 0.28, 1],
                        outputRange: [y0, y0, y1],
                      }),
                    },
                    {
                      scale: progress.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.72, 0.92, 0.78],
                      }),
                    },
                    { rotate: spinRotate },
                  ],
                }}
              >
                {symbol}
              </Animated.Text>
            );
          })
        : null}

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
