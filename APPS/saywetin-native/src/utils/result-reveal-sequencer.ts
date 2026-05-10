/**
 * Result Screen Progressive Reveal Animation Coordinator
 * Manages staggered animations for artwork, title, sections, buttons
 */

import { Animated } from 'react-native';

export type RevealSequenceConfig = {
  staggerDelayMs?: number;
  baseAnimationDurationMs?: number;
  useNativeDriver?: boolean;
};

const DEFAULT_CONFIG: RevealSequenceConfig = {
  staggerDelayMs: 100,
  baseAnimationDurationMs: 400,
  useNativeDriver: true,
};

/**
 * Animation phases in order of appearance
 */
export const REVEAL_SEQUENCE = [
  'artwork',
  'title',
  'artist',
  'confidence',
  'lyrics-section',
  'meaning-section',
  'buttons',
] as const;

export type RevealPhase = (typeof REVEAL_SEQUENCE)[number];

export type AnimatedValues = {
  [K in RevealPhase]: Animated.Value;
};

/**
 * Create animated values for each reveal phase
 */
export function createAnimatedValues(): AnimatedValues {
  return REVEAL_SEQUENCE.reduce(
    (acc, phase) => ({
      ...acc,
      [phase]: new Animated.Value(0),
    }),
    {} as AnimatedValues,
  );
}

/**
 * Create staggered reveal animation sequence
 * Each phase fades in and slightly scales
 */
export function createRevealSequence(
  animatedValues: AnimatedValues,
  config: RevealSequenceConfig = {},
): Animated.CompositeAnimation {
  const { staggerDelayMs = 100, baseAnimationDurationMs = 400, useNativeDriver = true } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const animations = REVEAL_SEQUENCE.map((phase, index) => {
    const value = animatedValues[phase];
    const delay = index * staggerDelayMs;

    return Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, {
        toValue: 1,
        duration: baseAnimationDurationMs,
        useNativeDriver,
      }),
    ]);
  });

  return Animated.parallel(animations);
}

/**
 * Create interpolated opacity from animated value
 */
export function createOpacityInterpolation(animatedValue: Animated.Value): Animated.AnimatedInterpolation<number> {
  return animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
}

/**
 * Create interpolated scale from animated value
 * Scales from 0.85 to 1.0
 */
export function createScaleInterpolation(animatedValue: Animated.Value): Animated.AnimatedInterpolation<number> {
  return animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });
}

/**
 * Create interpolated translateY from animated value
 * Slides up from 20 to 0
 */
export function createTranslateYInterpolation(animatedValue: Animated.Value): Animated.AnimatedInterpolation<number> {
  return animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });
}

/**
 * Get combined style with opacity and transform
 */
export function getRevealStyle(animatedValue: Animated.Value) {
  const opacity = createOpacityInterpolation(animatedValue);
  const scale = createScaleInterpolation(animatedValue);
  const translateY = createTranslateYInterpolation(animatedValue);

  return {
    opacity,
    transform: [
      { scale },
      { translateY },
    ],
  };
}

/**
 * Reverse reveal sequence (for dismissal or back navigation)
 * Quickly fade and scale out
 */
export function createReverseRevealSequence(
  animatedValues: AnimatedValues,
  durationMs: number = 200,
  useNativeDriver: boolean = true,
): Animated.CompositeAnimation {
  const animations = REVEAL_SEQUENCE.map((phase) => {
    const value = animatedValues[phase];
    return Animated.timing(value, {
      toValue: 0,
      duration: durationMs,
      useNativeDriver,
    });
  });

  return Animated.parallel(animations);
}

/**
 * Bounce animation for match found moment
 * Small scale pulse for tactile feedback
 */
export function createMatchFoundBounce(
  animatedValue: Animated.Value,
  duration: number = 500,
  useNativeDriver: boolean = true,
): Animated.CompositeAnimation {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: 1.1,
      duration: duration * 0.3,
      useNativeDriver,
    }),
    Animated.timing(animatedValue, {
      toValue: 0.95,
      duration: duration * 0.2,
      useNativeDriver,
    }),
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: duration * 0.5,
      useNativeDriver,
    }),
  ]);
}

/**
 * Shake animation for retry or error
 * Small horizontal oscillation
 */
export function createRetryShakeAnimation(
  animatedValue: Animated.Value,
  duration: number = 400,
  useNativeDriver: boolean = true,
): Animated.CompositeAnimation {
  const shakes = 4;
  const shakeDuration = duration / shakes;

  const sequence: Animated.CompositeAnimation[] = [];
  for (let i = 0; i < shakes; i++) {
    sequence.push(
      Animated.timing(animatedValue, {
        toValue: i % 2 === 0 ? -1 : 1,
        duration: shakeDuration,
        useNativeDriver,
      }),
    );
  }
  sequence.push(
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: shakeDuration,
      useNativeDriver,
    }),
  );

  return Animated.sequence(sequence);
}

/**
 * Fade in animation for section (used by per-section reveals)
 */
export function createSectionFadeInAnimation(
  animatedValue: Animated.Value,
  delayMs: number = 0,
  durationMs: number = 300,
  useNativeDriver: boolean = true,
): Animated.CompositeAnimation {
  return Animated.sequence([
    Animated.delay(delayMs),
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: durationMs,
      useNativeDriver,
    }),
  ]);
}

/**
 * Pulse animation for "still loading" state
 */
export function createPulseAnimation(
  animatedValue: Animated.Value,
  minOpacity: number = 0.5,
  maxOpacity: number = 1,
  durationMs: number = 1000,
  useNativeDriver: boolean = true,
): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: maxOpacity,
        duration: durationMs / 2,
        useNativeDriver,
      }),
      Animated.timing(animatedValue, {
        toValue: minOpacity,
        duration: durationMs / 2,
        useNativeDriver,
      }),
    ]),
  );
}

/**
 * Combined reveal + pulse for result screen appearing while sections still load
 */
export function createProgressiveRevealWithPulsing(
  animatedValues: AnimatedValues,
  pulseSectionPhases: RevealPhase[] = ['lyrics-section', 'meaning-section'],
  config: RevealSequenceConfig = {},
): Animated.CompositeAnimation {
  const { staggerDelayMs = 100, baseAnimationDurationMs = 400, useNativeDriver = true } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const animations = REVEAL_SEQUENCE.map((phase, index) => {
    const value = animatedValues[phase];
    const delay = index * staggerDelayMs;

    if (pulseSectionPhases.includes(phase)) {
      // Sections fade in and then pulse
      return Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 0.6,
          duration: baseAnimationDurationMs,
          useNativeDriver,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(value, {
              toValue: 0.8,
              duration: 1000,
              useNativeDriver,
            }),
            Animated.timing(value, {
              toValue: 0.6,
              duration: 1000,
              useNativeDriver,
            }),
          ]),
        ),
      ]);
    }

    return Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, {
        toValue: 1,
        duration: baseAnimationDurationMs,
        useNativeDriver,
      }),
    ]);
  });

  return Animated.parallel(animations);
}
