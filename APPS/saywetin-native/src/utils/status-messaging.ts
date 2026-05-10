/**
 * Enhanced status messaging system for recognition lifecycle
 * Provides user-friendly, contextual messages at each phase
 */

export type ListenPhase =
  | 'idle'
  | 'requesting-permission'
  | 'capturing'
  | 'uploading'
  | 'matching'
  | 'context-loading'
  | 'result-ready'
  | 'failed'
  | 'offline'
  | 'cancelled';

export type StatusMessageContext = {
  phase: ListenPhase;
  elapsedMs: number;
  secondsLeft?: number;
  isSlowNetwork?: boolean;
  isOffline?: boolean;
  errorMessage?: string | null;
};

/**
 * Get user-friendly status chip text for current phase
 * Updates frequently to give sense of progress on slow networks
 */
export function getStatusChip(context: StatusMessageContext): string {
  const { phase, elapsedMs, secondsLeft, isSlowNetwork } = context;

  switch (phase) {
    case 'requesting-permission':
      return 'Preparing mic';

    case 'capturing':
      return secondsLeft ? `Listening (${secondsLeft}s)` : 'Listening';

    case 'uploading':
      if (elapsedMs > 4500) {
        return 'Uploading (slow)';
      }
      if (elapsedMs > 2000) {
        return 'Uploading sample';
      }
      return 'Uploading';

    case 'matching':
      if (elapsedMs > 7000) {
        return 'Still matching...';
      }
      if (elapsedMs > 4000) {
        return 'Finding match';
      }
      if (elapsedMs > 2000) {
        return 'Matching track';
      }
      return 'Fingerprinting';

    case 'context-loading':
      if (elapsedMs > 2000) {
        return 'Preparing context';
      }
      return 'Enriching result';

    case 'result-ready':
      return 'Match found';

    case 'offline':
      return 'Offline fallback';

    case 'failed':
      return 'Match failed';

    case 'cancelled':
      return 'Capture stopped';

    default:
      return 'Ready';
  }
}

/**
 * Get detailed subtitle text for current phase
 * More explanatory than chip, changes with elapsed time
 */
export function getStatusSubtitle(context: StatusMessageContext): string {
  const { phase, elapsedMs, secondsLeft, isSlowNetwork, isOffline, errorMessage } = context;

  switch (phase) {
    case 'requesting-permission':
      return 'Checking microphone permissions.';

    case 'capturing':
      return `Capturing audio - ${secondsLeft}s left. Tap orb to stop early.`;

    case 'uploading':
      if (elapsedMs > 4500) {
        return `Connection is slower than usual. Upload in progress... ${(elapsedMs / 1000).toFixed(1)}s elapsed.`;
      }
      if (elapsedMs > 2000) {
        return `Sending sample to recognition service... ${(elapsedMs / 1000).toFixed(1)}s elapsed.`;
      }
      return 'Preparing audio sample for upload.';

    case 'matching':
      if (elapsedMs > 7000) {
        return `Still fingerprinting. ${(elapsedMs / 1000).toFixed(1)}s elapsed. We will use lyric fallback if needed.`;
      }
      if (elapsedMs > 4000) {
        return `Searching music database... ${(elapsedMs / 1000).toFixed(1)}s elapsed.`;
      }
      if (elapsedMs > 2000) {
        return `Fingerprint lock in progress... ${(elapsedMs / 1000).toFixed(1)}s elapsed.`;
      }
      return 'Analyzing audio fingerprint...';

    case 'context-loading':
      if (elapsedMs > 2000) {
        return `Loading cultural context... ${(elapsedMs / 1000).toFixed(1)}s elapsed.`;
      }
      return 'Preparing meaning and cultural context...';

    case 'result-ready':
      return 'Song identified! Tap to explore.';

    case 'offline':
      return 'Network unstable. You can still match by lyric below.';

    case 'failed':
      return errorMessage || 'No confident match yet. Try again or switch to lyric input.';

    case 'cancelled':
      return 'Capture cancelled. Tap again when ready.';

    default:
      return 'Ready to listen.';
  }
}

/**
 * Determine if we should show a slow-network warning
 */
export function shouldShowSlowNetworkWarning(
  phase: ListenPhase,
  elapsedMs: number,
  isSlowNetwork?: boolean,
): boolean {
  if (phase === 'uploading' && elapsedMs > 4500) {
    return true;
  }
  if (phase === 'matching' && elapsedMs > 7000) {
    return true;
  }
  if (isSlowNetwork && phase === 'context-loading' && elapsedMs > 2000) {
    return true;
  }
  return false;
}

/**
 * Format a user-visible message about network condition
 */
export function getSlowNetworkMessage(phase: ListenPhase, elapsedMs: number): string | null {
  if (phase === 'uploading' && elapsedMs > 4500) {
    return '📡 Connection is slow. Keep the app open.';
  }
  if (phase === 'matching' && elapsedMs > 7000) {
    return '🔍 Still searching. Checking backup systems...';
  }
  if (phase === 'context-loading' && elapsedMs > 2000) {
    return '📚 Context loading. Please wait...';
  }
  return null;
}
