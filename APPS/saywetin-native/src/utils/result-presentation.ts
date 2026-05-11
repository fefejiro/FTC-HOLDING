/**
 * Result presentation utilities for premium card layout and animations
 */

import { Animated, Easing } from 'react-native';

/**
 * Create a staggered animation sequence for progressive result reveal
 * Each element fades in and scales slightly with staggered timing
 */
export function createResultRevealAnimation(delayMs: number = 0) {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.95);

  const start = () => {
    Animated.sequence([
      Animated.delay(delayMs),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  return {
    fadeAnim,
    scaleAnim,
    start,
    animatedStyle: {
      opacity: fadeAnim,
      transform: [{ scale: scaleAnim }],
    },
  };
}

/**
 * Create slide-up animation for lyric card
 */
export function createSlideUpAnimation(delayMs: number = 0) {
  const translateAnim = new Animated.Value(30);
  const opacityAnim = new Animated.Value(0);

  const start = () => {
    Animated.sequence([
      Animated.delay(delayMs),
      Animated.parallel([
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  return {
    opacityAnim,
    translateAnim,
    start,
    animatedStyle: {
      opacity: opacityAnim,
      transform: [{ translateY: translateAnim }],
    },
  };
}

/**
 * Create breathing/pulse animation for skeleton loaders
 */
export function createSkeletonAnimation() {
  const opacityAnim = new Animated.Value(0.6);

  Animated.loop(
    Animated.sequence([
      Animated.timing(opacityAnim, {
        toValue: 0.3,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.6,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]),
  ).start();

  return {
    opacityAnim,
    animatedStyle: {
      opacity: opacityAnim,
    },
  };
}

/**
 * Format timing display for recognition performance
 */
export function formatRecognitionTiming(durationMs: number): string {
  if (durationMs < 1000) {
    return 'instant';
  }
  if (durationMs < 2000) {
    return 'very fast';
  }
  if (durationMs < 4000) {
    return 'fast';
  }
  if (durationMs < 7000) {
    return 'normal';
  }
  if (durationMs < 15000) {
    return 'slow';
  }
  return 'very slow';
}

/**
 * Determine if network was likely slow based on timing
 */
export function wasNetworkSlow(uploadDurationMs: number, matchingDurationMs: number): boolean {
  return uploadDurationMs > 4500 || matchingDurationMs > 7000;
}

/**
 * Get appropriate status message based on phase and elapsed time
 */
export function getPhaseMessage(
  phase: 'uploading' | 'matching' | 'context',
  elapsedMs: number,
): string {
  if (phase === 'uploading') {
    if (elapsedMs > 4500) {
      return 'Taking longer than expected...';
    }
    return 'Finding the song...';
  }

  if (phase === 'matching') {
    if (elapsedMs > 7000) {
      return 'Taking longer than expected...';
    }
    return 'Finding the song...';
  }

  if (phase === 'context') {
    if (elapsedMs > 3000) {
      return 'Taking longer than expected...';
    }
    return 'Finding the meaning...';
  }

  return '';
}

/**
 * Truncate long lyrics for preview without word breaks
 */
export function truncateLyricPreview(lyric: string, maxLength: number = 200): string {
  if (lyric.length <= maxLength) {
    return lyric;
  }

  // Find the last space before maxLength
  const truncated = lyric.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Extract first meaningful line from multi-line lyrics
 */
export function extractFirstLyricLine(lyrics: string): string {
  const lines = lyrics.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  return lines[0] || '';
}
