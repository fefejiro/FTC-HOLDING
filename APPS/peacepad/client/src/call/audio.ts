/**
 * Deterministic Ringtone Lifecycle System
 * 
 * Simple, state-machine-controlled audio for incoming calls.
 * Ringtone is controlled ONLY by the call FSM, not UI timers or WebSocket messages.
 */

let ringAudio: HTMLAudioElement | null = null;
let outgoingRingAudio: HTMLAudioElement | null = null;

/**
 * Start incoming call ringtone
 * iOS requires user gesture before audio - we gate play() in the dialog button too.
 */
export function startRingtone(): void {
  if (!ringAudio) {
    ringAudio = new Audio('/audio/djembe-ringtone.mp3');
    ringAudio.loop = true;
    ringAudio.preload = 'auto';
    ringAudio.volume = 0.3; // Reduce volume to 30% (less jarring)
    
    // Safari/iOS compatibility attributes
    ringAudio.setAttribute('playsinline', 'true');
    ringAudio.setAttribute('webkit-playsinline', 'true');
    ringAudio.setAttribute('type', 'audio/mpeg');
    
    ringAudio.muted = false; // Respect system silent/vibrate mode
    console.log('[audio] Created ringtone element (volume=0.3, Safari-optimized)');
  }
  
  if (ringAudio.paused) {
    ringAudio.play().catch((err) => {
      console.warn('[audio] Ringtone play blocked (needs user gesture):', err);
    });
    console.log('[audio] ✅ Ringtone started');
  }
}

/**
 * Stop incoming call ringtone
 */
export function stopRingtone(): void {
  if (ringAudio) {
    ringAudio.pause();
    ringAudio.currentTime = 0;
    console.log('[audio] ✅ Ringtone stopped');
  }
  
  // Stop vibration
  if ('vibrate' in navigator) {
    navigator.vibrate(0);
  }
}

/**
 * Start outgoing call dial tone
 */
export function startDialTone(): void {
  if (!outgoingRingAudio) {
    outgoingRingAudio = new Audio('/audio/outgoing-call.mp3');
    outgoingRingAudio.loop = true;
    outgoingRingAudio.preload = 'auto';
    outgoingRingAudio.volume = 0.3; // Reduce caller tone volume to 30%
    
    // Safari/iOS compatibility attributes
    outgoingRingAudio.setAttribute('playsinline', 'true');
    outgoingRingAudio.setAttribute('webkit-playsinline', 'true');
    outgoingRingAudio.setAttribute('type', 'audio/mpeg');
    
    console.log('[audio] Created dial tone element (volume=0.3, Safari-optimized)');
  }
  
  if (outgoingRingAudio.paused) {
    outgoingRingAudio.play().catch((err) => {
      console.warn('[audio] Dial tone play blocked:', err);
    });
    console.log('[audio] ✅ Dial tone started');
  }
}

/**
 * Stop outgoing call dial tone
 */
export function stopDialTone(): void {
  if (outgoingRingAudio) {
    outgoingRingAudio.pause();
    outgoingRingAudio.currentTime = 0;
    console.log('[audio] ✅ Dial tone stopped');
  }
}

/**
 * Stop all audio (ringtone + dial tone)
 */
export function stopAllAudio(): void {
  stopRingtone();
  stopDialTone();
  console.log('[audio] ✅ All audio stopped');
}

/**
 * Cleanup audio resources (call on unmount)
 */
export function cleanupAudio(): void {
  stopAllAudio();
  
  if (ringAudio) {
    ringAudio.src = '';
    ringAudio = null;
  }
  
  if (outgoingRingAudio) {
    outgoingRingAudio.src = '';
    outgoingRingAudio = null;
  }
  
  console.log('[audio] Audio resources cleaned up');
}

/**
 * Vibrate device for incoming call
 */
export function vibrateIncomingCall(): void {
  if ('vibrate' in navigator) {
    try {
      // Pattern: vibrate for 180ms, pause 120ms, repeat
      navigator.vibrate([180, 120, 180, 120, 180, 120, 180]);
      console.log('[audio] Vibration pattern triggered');
    } catch (err) {
      console.warn('[audio] Vibration failed:', err);
    }
  }
}

/**
 * Prime audio context for iOS (requires user gesture)
 * Call this on first user interaction (button click, tap)
 */
export function primeAudioContext(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctx.resume().catch(() => {
      console.warn('[audio] AudioContext resume failed');
    });
    
    // Also try to load ringtone
    if (!ringAudio) {
      ringAudio = new Audio('/audio/djembe-ringtone.mp3');
      ringAudio.loop = true;
      ringAudio.preload = 'auto';
      
      // Safari/iOS compatibility attributes
      ringAudio.setAttribute('playsinline', 'true');
      ringAudio.setAttribute('webkit-playsinline', 'true');
      ringAudio.setAttribute('type', 'audio/mpeg');
      
      // Muted play/pause to satisfy autoplay policy
      ringAudio.muted = true;
      ringAudio.play().then(() => {
        if (ringAudio) {
          ringAudio.pause();
          ringAudio.currentTime = 0;
          ringAudio.muted = false;
          console.log('[audio] ✅ Audio primed successfully (Safari-optimized)');
        }
      }).catch(() => {
        console.warn('[audio] Audio priming failed');
      });
    }
  } catch (err) {
    console.warn('[audio] AudioContext creation failed:', err);
  }
}
