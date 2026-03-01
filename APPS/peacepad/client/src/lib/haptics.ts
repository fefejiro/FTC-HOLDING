type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Triggers haptic feedback on supported mobile devices
 * Gracefully degrades on unsupported devices
 */
export function triggerHaptic(style: HapticStyle = 'light') {
  // Check if device supports haptics
  if (!window.navigator.vibrate) return;

  // Map haptic styles to vibration patterns (in milliseconds)
  const patterns: Record<HapticStyle, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    warning: [20, 100, 20],
    error: [30, 100, 30, 100, 30],
  };

  const pattern = patterns[style];
  window.navigator.vibrate(pattern);
}

/**
 * Haptic feedback for button taps
 */
export function hapticTap() {
  triggerHaptic('light');
}

/**
 * Haptic feedback for successful actions
 */
export function hapticSuccess() {
  triggerHaptic('success');
}

/**
 * Haptic feedback for errors
 */
export function hapticError() {
  triggerHaptic('error');
}

/**
 * Haptic feedback for warnings
 */
export function hapticWarning() {
  triggerHaptic('warning');
}

/**
 * Haptic feedback for swipe actions
 */
export function hapticSwipe() {
  triggerHaptic('medium');
}
