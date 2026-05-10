/**
 * Haptic feedback utilities for enhanced tactile feedback
 * Optional - gracefully degrades on devices without haptic support
 */

import { useCallback } from 'react';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const HAPTIC_PATTERNS: Record<HapticType, { duration?: number; intensity?: number }> = {
  light: { duration: 50, intensity: 0.2 },
  medium: { duration: 100, intensity: 0.5 },
  heavy: { duration: 150, intensity: 0.8 },
  success: { duration: 200, intensity: 0.7 },
  warning: { duration: 100, intensity: 0.4 },
  error: { duration: 300, intensity: 0.9 },
};

/**
 * Hook for triggering haptic feedback throughout the app
 * Gracefully handles devices without haptic support
 */
export function useHaptics() {
  const trigger = useCallback((type: HapticType = 'light') => {
    try {
      // Try to import Haptics dynamically to avoid issues if not available
      const tryHaptics = async () => {
        try {
          const { Vibration } = await import('react-native');
          const pattern = HAPTIC_PATTERNS[type];
          
          if (pattern.duration) {
            Vibration.vibrate(pattern.duration);
          } else {
            Vibration.vibrate(100);
          }
        } catch {
          // Haptics not available, silently fail
          console.debug('[haptics] not available on this platform');
        }
      };

      void tryHaptics();
    } catch (error) {
      // Silently fail - haptics are optional enhancement
      console.debug('[haptics] error', error instanceof Error ? error.message : String(error));
    }
  }, []);

  return { trigger };
}

/**
 * Individual haptic feedback functions for common scenarios
 */
export const hapticFeedback = {
  tapButton: () => triggerHaptic('light'),
  matchFound: () => triggerHaptic('success'),
  retryTap: () => triggerHaptic('medium'),
  errorOccurred: () => triggerHaptic('warning'),
  sessionEnded: () => triggerHaptic('heavy'),
};

function triggerHaptic(type: HapticType) {
  try {
    const pattern = HAPTIC_PATTERNS[type];
    if (pattern.duration && typeof pattern.duration === 'number') {
      // React Native Vibration API
      try {
        const { Vibration } = require('react-native');
        Vibration.vibrate(pattern.duration);
      } catch {
        // Haptics unavailable
      }
    }
  } catch {
    // Silently fail
  }
}
