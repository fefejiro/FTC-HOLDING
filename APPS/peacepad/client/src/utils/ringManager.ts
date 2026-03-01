// Ring manager for incoming calls with silent mode respect and multi-tab coordination

let audioUnlocked = false;
let audioUnlocking = false; // Prevent race conditions during unlock
let ringAudio: HTMLAudioElement | null = null;
let respectSilentMode = false; // DEFAULT: Allow ringing (user can opt-in to silent mode)
let isRinging = false;
let activeTabId: string | null = null;

// BroadcastChannel for multi-tab coordination
let broadcastChannel: BroadcastChannel | null = null;

// Fallback for browsers without BroadcastChannel (older Safari/iOS PWA)
const STORAGE_KEY_ACTIVE_TAB = 'peacepad-active-ring-tab';
const STORAGE_KEY_TIMESTAMP = 'peacepad-ring-timestamp';

// Initialize BroadcastChannel if supported
if (typeof BroadcastChannel !== 'undefined') {
  broadcastChannel = new BroadcastChannel('peacepad-call-ring');
  
  broadcastChannel.onmessage = (event) => {
    const { type, tabId } = event.data;
    
    if (type === 'claim-ring') {
      // Another tab claimed the ring
      if (activeTabId !== tabId) {
        stopRing();
        activeTabId = tabId;
      }
    } else if (type === 'release-ring') {
      // Active tab released the ring
      if (activeTabId === tabId) {
        activeTabId = null;
      }
    }
  };
} else {
  // Fallback: Use localStorage events for older browsers
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY_ACTIVE_TAB && event.newValue !== currentTabId) {
      stopRing();
      activeTabId = event.newValue;
    }
  });
}

// Generate unique tab ID
const currentTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function unlockAudio() {
  // Prevent duplicate unlock attempts
  if (audioUnlocked || audioUnlocking) return;
  
  audioUnlocking = true;
  
  try {
    // Use existing ringtone file
    ringAudio = new Audio('/audio/djembe-ringtone.mp3');
    
    // Safari/iOS compatibility attributes (set before loading)
    ringAudio.setAttribute('playsinline', 'true');
    ringAudio.setAttribute('webkit-playsinline', 'true');
    ringAudio.setAttribute('type', 'audio/mpeg');
    
    // Important: Do NOT set loop=true until we actually want to ring
    // Setting loop=true here could cause issues if unmuting happens unexpectedly
    ringAudio.loop = false;
    
    // Preload the audio without playing it - satisfies Safari policy without producing sound
    ringAudio.preload = 'auto';
    ringAudio.muted = true;
    
    // Just setting up the audio element is enough for Safari's autoplay policy
    // No need to actually play it
    audioUnlocked = true;
    audioUnlocking = false;
    
    console.log('[ringManager] Audio unlocked successfully (preload-only, no playback)');
    
    // Dispatch event to notify components that audio is ready
    window.dispatchEvent(new CustomEvent('audio-unlocked'));
  } catch (e) {
    console.warn('[ringManager] Audio unlock exception:', e);
    audioUnlocking = false;
    
    // Clean up failed audio element
    if (ringAudio) {
      ringAudio.pause();
      ringAudio.src = '';
      ringAudio = null;
    }
  }
}

export function setRespectSilentMode(value: boolean) {
  respectSilentMode = value;
  console.log('[ringManager] Respect silent mode:', value);
}

export function claimActiveTab(): boolean {
  if (activeTabId && activeTabId !== currentTabId) {
    console.log('[ringManager] Another tab is already ringing');
    return false;
  }
  
  activeTabId = currentTabId;
  
  // Broadcast claim to other tabs
  if (broadcastChannel) {
    broadcastChannel.postMessage({
      type: 'claim-ring',
      tabId: currentTabId
    });
  } else {
    // Fallback: use localStorage
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, currentTabId);
      localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
    } catch (e) {
      // Ignore localStorage errors (private browsing, etc.)
    }
  }
  
  return true;
}

export function releaseActiveTab() {
  if (activeTabId === currentTabId) {
    activeTabId = null;
    
    // Broadcast release to other tabs
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'release-ring',
        tabId: currentTabId
      });
    } else {
      // Fallback: clear localStorage
      try {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_TAB);
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }
}

export function startRing(volume = 1.0) {
  if (!ringAudio) {
    ringAudio = new Audio('/audio/djembe-ringtone.mp3');
    
    // Safari/iOS compatibility attributes
    ringAudio.setAttribute('playsinline', 'true');
    ringAudio.setAttribute('webkit-playsinline', 'true');
    ringAudio.setAttribute('type', 'audio/mpeg');
  }
  
  if (!audioUnlocked) {
    console.warn('[ringManager] Cannot start ring - audio not unlocked');
    return;
  }
  
  if (respectSilentMode) {
    console.log('[ringManager] Silent mode respected - not ringing');
    return;
  }
  
  // Check if this tab can ring (multi-tab coordination)
  if (!claimActiveTab()) {
    console.log('[ringManager] Not starting ring - another tab is active');
    return;
  }
  
  try {
    ringAudio.volume = Math.max(0, Math.min(1, volume));
    ringAudio.loop = true;
    ringAudio.play().catch((err) => {
      console.warn('[ringManager] Ring play failed:', err);
    });
    isRinging = true;
    console.log('[ringManager] Ring started');
  } catch (e) {
    console.warn('[ringManager] Ring exception:', e);
  }
}

export function stopRing() {
  try {
    if (ringAudio) {
      ringAudio.pause();
      ringAudio.currentTime = 0;
    }
    isRinging = false;
    console.log('[ringManager] Ring stopped');
  } catch (e) {
    console.warn('[ringManager] Stop ring exception:', e);
  }
  
  // Stop vibration
  if (navigator.vibrate) {
    navigator.vibrate(0);
  }
  
  // Release active tab claim
  releaseActiveTab();
}

export function vibratePattern() {
  // Vibrate respects device settings automatically
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([180, 120, 180, 120, 180]);
      console.log('[ringManager] Vibration pattern triggered');
    } catch (e) {
      console.warn('[ringManager] Vibration failed:', e);
    }
  }
}

export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

export function isCurrentlyRinging(): boolean {
  return isRinging;
}

export function isActiveRingingTab(): boolean {
  return activeTabId === currentTabId;
}
