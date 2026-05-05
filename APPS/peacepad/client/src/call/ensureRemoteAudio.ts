export function ensureRemoteAudio(pc: RTCPeerConnection) {
  const remote = document.getElementById("webrtc-remote-audio") as HTMLAudioElement;
  if (!remote) {
    console.error('[ensureRemoteAudio] ❌ CRITICAL: Remote audio element not found! Audio will not work.');
    return;
  }
  console.log('[ensureRemoteAudio] ✅ Remote audio element found, binding tracks');

  // Create AudioContext for reliable playback
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  let audioContext: AudioContext | null = null;
  
  if (AudioCtx) {
    const createdAudioContext = new AudioCtx();
    audioContext = createdAudioContext;
    console.log('[ensureRemoteAudio] AudioContext created, state:', createdAudioContext.state);
  }

  pc.addEventListener("track", (ev) => {
    console.log('[ensureRemoteAudio] 🎵 Track received:', {
      kind: ev.track.kind,
      hasStreams: !!ev.streams?.length,
      streamId: ev.streams?.[0]?.id,
      trackId: ev.track.id,
      enabled: ev.track.enabled,
      readyState: ev.track.readyState,
      muted: ev.track.muted
    });

    // Only handle audio tracks
    if (ev.track && ev.track.kind === "audio" && ev.streams?.[0]) {
      console.log('[ensureRemoteAudio] 🔗 Setting audio element srcObject to remote stream:', ev.streams[0].id);

      // Use the SAME stream object from the event (don't create a new one)
      remote!.srcObject = ev.streams[0];
      remote!.volume = 1.0;
      remote!.muted = false;

      console.log('[ensureRemoteAudio] 🔊 Audio element state:', {
        hasSource: !!remote!.srcObject,
        volume: remote!.volume,
        muted: remote!.muted,
        paused: remote!.paused
      });

      // Force play with aggressive retry
      const tryPlay = async () => {
        try {
          // Resume AudioContext if suspended
          if (audioContext?.state === 'suspended') {
            await audioContext.resume();
            console.log('[ensureRemoteAudio] AudioContext resumed, state:', audioContext.state);
          }
          
          await remote!.play();
          console.log('[ensureRemoteAudio] ✅ Audio playback started successfully');
        } catch (err) {
          console.warn('[ensureRemoteAudio] ⚠️ Play attempt failed:', err);
          
          // Retry on next user gesture
          const playOnGesture = async () => {
            try {
              if (audioContext?.state === 'suspended') {
                await audioContext.resume();
              }
              await remote!.play();
              console.log('[ensureRemoteAudio] ✅ Audio started after user gesture');
              // Remove listeners after success
              window.removeEventListener('click', playOnGesture);
              window.removeEventListener('touchstart', playOnGesture);
            } catch (e) {
              console.error('[ensureRemoteAudio] Failed to play on gesture:', e);
            }
          };
          
          window.addEventListener('click', playOnGesture, { once: true });
          window.addEventListener('touchstart', playOnGesture, { once: true });
        }
      };

      // Try to play immediately
      tryPlay();
    }
  });
}
