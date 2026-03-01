type SoundType = 'message' | 'messageSent' | 'task' | 'partnership' | 'reminder' | 'success';

// Singleton AudioContext shared across all sounds
let sharedAudioContext: AudioContext | null = null;
let contextInitialized = false;

/**
 * Get or create the shared AudioContext (lazy initialization)
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null;

  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      contextInitialized = true;
    }
    return sharedAudioContext;
  } catch (e) {
    console.log('[Notification Sound] Failed to create AudioContext:', e);
    return null;
  }
}

/**
 * Generate a pleasant notification sound using Web Audio API
 * Copyright-free, procedurally generated
 */
function generateNotificationSound(type: SoundType): AudioBuffer | null {
  const audioContext = getAudioContext();
  if (!audioContext) return null;

  try {
    const sampleRate = audioContext.sampleRate;
    
    let duration = 0.15;
    let frequencies: number[] = [];
    
    switch (type) {
      case 'message':
        duration = 0.2;
        frequencies = [800, 1000];
        break;
      case 'messageSent':
        duration = 0.15;
        frequencies = [600, 750];
        break;
      case 'success':
        duration = 0.25;
        frequencies = [600, 800, 1000];
        break;
      case 'task':
        duration = 0.2;
        frequencies = [700, 900];
        break;
      case 'partnership':
        duration = 0.3;
        frequencies = [500, 700, 900];
        break;
      case 'reminder':
        duration = 0.2;
        frequencies = [650];
        break;
    }

    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    frequencies.forEach((freq, index) => {
      const segmentStart = Math.floor((index / frequencies.length) * data.length);
      const segmentEnd = Math.floor(((index + 1) / frequencies.length) * data.length);
      
      for (let i = segmentStart; i < segmentEnd; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-3 * t / duration);
        data[i] += Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
      }
    });

    return buffer;
  } catch (e) {
    console.log('[Notification Sound] Could not generate sound:', e);
    return null;
  }
}

const soundCache = new Map<SoundType, AudioBuffer | null>();

/**
 * Play a notification sound for a major action
 * @param type - Type of action
 * @param enabled - Whether to play sound (optional, reads from settings if not provided)
 */
export function playNotificationSound(type: SoundType, enabled?: boolean): void {
  const shouldPlay = enabled !== undefined ? enabled : areNotificationSoundsEnabled();
  if (!shouldPlay) return;

  try {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    // Resume context if suspended (handles autoplay restrictions)
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(e => {
        console.log('[Notification Sound] Could not resume context:', e);
      });
    }

    // Generate and cache sound buffer
    if (!soundCache.has(type)) {
      soundCache.set(type, generateNotificationSound(type));
    }

    const buffer = soundCache.get(type);
    if (!buffer) return;

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = buffer;
    
    const volumes: Record<SoundType, number> = {
      message: 0.3,
      messageSent: 0.25,
      success: 0.3,
      task: 0.25,
      partnership: 0.35,
      reminder: 0.2,
    };
    
    gainNode.gain.value = volumes[type];
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    source.start(0);
  } catch (e) {
    console.log('[Notification Sound] Error:', e);
  }
}

/**
 * Initialize audio context on first user interaction (to avoid autoplay restrictions)
 * Call this on app startup or first user click
 * This MUST be called from a user gesture handler to satisfy browser autoplay policies
 */
export async function initializeAudioContext(): Promise<void> {
  const context = getAudioContext();
  if (!context) return;

  // Always attempt to resume if suspended, even if already initialized
  // (context may have been created in suspended state before user gesture)
  if (context.state === 'suspended') {
    try {
      await context.resume();
      console.log('[Notification Sound] Audio context resumed successfully');
    } catch (e) {
      console.log('[Notification Sound] Could not resume audio context:', e);
    }
  }
}

/**
 * Check if notification sounds are enabled in user preferences
 */
export function areNotificationSoundsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const setting = localStorage.getItem('notification_sounds_enabled');
  return setting !== 'false';
}

/**
 * Toggle notification sounds setting
 */
export function setNotificationSoundsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('notification_sounds_enabled', String(enabled));
}
