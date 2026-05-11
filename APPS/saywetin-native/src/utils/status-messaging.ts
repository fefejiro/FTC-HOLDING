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
  const { phase, elapsedMs } = context;

  switch (phase) {
    case 'requesting-permission':
      return 'Ready to listen';

    case 'capturing':
      return 'Listening...';

    case 'uploading':
      return elapsedMs > 4500 ? 'Taking longer than expected...' : 'Finding the song...';

    case 'matching':
      return elapsedMs > 7000 ? 'Taking longer than expected...' : 'Finding the song...';

    case 'context-loading':
      return elapsedMs > 3000 ? 'Taking longer than expected...' : 'Finding the lyrics...';

    case 'result-ready':
      return 'Found it.';

    case 'offline':
      return 'I could not hear enough music.';

    case 'failed':
      return 'I could not hear enough music.';

    case 'cancelled':
      return 'Ready to listen';

    default:
      return 'Ready to listen';
  }
}

/**
 * Get detailed subtitle text for current phase
 * More explanatory than chip, changes with elapsed time
 */
export function getStatusSubtitle(context: StatusMessageContext): string {
  const { phase, elapsedMs } = context;

  switch (phase) {
    case 'requesting-permission':
      return 'Ready to listen';

    case 'capturing':
      return 'Listening...';

    case 'uploading':
      return elapsedMs > 4500 ? 'Taking longer than expected...' : 'Finding the song...';

    case 'matching':
      return elapsedMs > 7000 ? 'Taking longer than expected...' : 'Finding the song...';

    case 'context-loading':
      return elapsedMs > 3000 ? 'Taking longer than expected...' : 'Finding the meaning...';

    case 'result-ready':
      return 'Found it.';

    case 'offline':
      return 'I could not hear enough music.';

    case 'failed':
      return 'I could not hear enough music.';

    case 'cancelled':
      return 'Ready to listen';

    default:
      return 'Ready to listen';
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
    return 'Taking longer than expected...';
  }
  if (phase === 'matching' && elapsedMs > 7000) {
    return 'Taking longer than expected...';
  }
  if (phase === 'context-loading' && elapsedMs > 2000) {
    return 'Taking longer than expected...';
  }
  return null;
}
