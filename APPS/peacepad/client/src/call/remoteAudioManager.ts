
/**
 * Unified Remote Audio Manager
 * Single source of truth for remote audio element creation and track binding
 * Prevents race conditions by ensuring element exists before tracks arrive
 */

let remoteAudioElement: HTMLAudioElement | null = null;
let remoteVideoElement: HTMLVideoElement | null = null;

/**
 * Get or create the remote audio element
 * This is called ONCE during app initialization to ensure element is ready
 */
export function ensureRemoteAudioElement(): HTMLAudioElement {
  if (remoteAudioElement) {
    console.log('[RemoteAudioManager] Using existing audio element');
    return remoteAudioElement;
  }

  console.log('[RemoteAudioManager] Creating remote audio element');
  
  // Check if element already exists in DOM (safety check)
  const existing = document.getElementById('webrtc-remote-audio') as HTMLAudioElement;
  if (existing) {
    console.log('[RemoteAudioManager] Found existing element in DOM, reusing it');
    remoteAudioElement = existing;
    return existing;
  }
  
  const audio = document.createElement('audio');
  audio.id = 'webrtc-remote-audio';
  audio.autoplay = true;
  audio.setAttribute('playsinline', 'true');
  audio.muted = false;
  audio.volume = 1.0;
  audio.style.display = 'none';
  document.body.appendChild(audio);
  
  remoteAudioElement = audio;
  console.log('[RemoteAudioManager] ✅ Remote audio element ready');
  
  return audio;
}

/**
 * Bind remote stream to audio element when track arrives
 * Handles both audio and video tracks
 */
// Track which streams we've already bound to prevent duplicates
const boundStreams = new Set<string>();

export function bindRemoteTrack(
  track: MediaStreamTrack,
  stream: MediaStream,
  callType: 'audio' | 'video'
): void {
  console.log('[RemoteAudioManager] 🎵 Binding track:', {
    kind: track.kind,
    streamId: stream.id,
    trackId: track.id,
    enabled: track.enabled,
    callType
  });

  if (track.kind === 'audio') {
    const audioEl = ensureRemoteAudioElement();
    
    // CRITICAL FIX: Always update srcObject if the stream is different
    // Even if we've seen this stream ID before, the tracks might have changed
    // (e.g., after renegotiation or peer rejoin)
    if (audioEl.srcObject !== stream) {
      console.log('[RemoteAudioManager] 🔄 Updating audio element with new stream:', stream.id);
      audioEl.srcObject = stream;
      audioEl.volume = 1.0;
      audioEl.muted = false;
      
      // CRITICAL FIX: Force audio to speaker on Samsung/mobile devices
      // Some mobile browsers route audio to earpiece by default
      if ('setSinkId' in audioEl && typeof (audioEl as any).setSinkId === 'function') {
        (audioEl as any).setSinkId('').catch((err: Error) => {
          console.warn('[RemoteAudioManager] Could not set audio sink:', err);
        });
      }
      
      boundStreams.add(stream.id);
      
      console.log('[RemoteAudioManager] 🔊 Audio element configured');
      
      // Attempt playback with aggressive retry
      const attemptPlay = async () => {
        try {
          await audioEl.play();
          console.log('[RemoteAudioManager] ✅ Audio playback started');
          
          // Verify playback state
          setTimeout(() => {
            console.log('[RemoteAudioManager] Playback state check:', {
              paused: audioEl.paused,
              volume: audioEl.volume,
              muted: audioEl.muted,
              srcObjectExists: !!audioEl.srcObject,
              readyState: audioEl.readyState
            });
            
            // Force unmute if needed
            if (audioEl.muted) {
              console.warn('[RemoteAudioManager] Audio was muted, forcing unmute');
              audioEl.muted = false;
            }
          }, 500);
        } catch (err) {
          console.warn('[RemoteAudioManager] ⚠️ Playback failed:', err, 'Error name:', (err as Error).name);
          
          // Retry on next user gesture
          const retryPlay = async () => {
            try {
              await audioEl.play();
              console.log('[RemoteAudioManager] ✅ Audio started after user gesture');
              audioEl.muted = false; // Ensure unmuted
            } catch (e) {
              console.error('[RemoteAudioManager] Retry failed:', e);
            }
            window.removeEventListener('click', retryPlay);
            window.removeEventListener('touchstart', retryPlay);
          };
          
          window.addEventListener('click', retryPlay, { once: true });
          window.addEventListener('touchstart', retryPlay, { once: true });
          console.log('[RemoteAudioManager] Waiting for user gesture to play audio...');
        }
      };
      
      attemptPlay();
    }
  }
  
  // Video tracks are handled by video elements in components (not globally)
}

/**
 * Cleanup remote audio element
 */
export function cleanupRemoteAudio(): void {
  if (remoteAudioElement) {
    console.log('[RemoteAudioManager] 🧹 Cleaning up remote audio');
    remoteAudioElement.pause();
    remoteAudioElement.srcObject = null;
    if (remoteAudioElement.parentNode) {
      document.body.removeChild(remoteAudioElement);
    }
    remoteAudioElement = null;
  }
  // Clear bound streams tracking
  boundStreams.clear();
}

/**
 * Initialize manager on app startup
 * Call this once in App.tsx
 */
export function initializeRemoteAudioManager(): void {
  console.log('[RemoteAudioManager] Initializing...');
  ensureRemoteAudioElement();
}
