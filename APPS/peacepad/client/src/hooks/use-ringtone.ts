import { useRef, useCallback } from 'react';

export function useRingtone() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const patternIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const play = useCallback(() => {
    if (isPlayingRef.current) return;

    // Create Web Audio API context for classic phone ring (double ring pattern)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    // Create oscillator for ring tone (classic phone uses ~440Hz and ~480Hz)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 440; // Start with A4 note
    gainNode.gain.value = 0; // Start silent

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;
    isPlayingRef.current = true;

    // Classic phone ring pattern: ring-ring (2x 400ms rings, 200ms gap), pause 2s, repeat
    const playRingPattern = () => {
      if (!gainNodeRef.current || !oscillatorRef.current) return;
      
      // First ring (400ms)
      oscillatorRef.current.frequency.value = 440;
      gainNodeRef.current.gain.setValueAtTime(0.2, audioContext.currentTime);
      
      setTimeout(() => {
        if (gainNodeRef.current) gainNodeRef.current.gain.setValueAtTime(0, audioContext.currentTime);
      }, 400);
      
      // Second ring (400ms) after 200ms gap
      setTimeout(() => {
        if (!oscillatorRef.current || !gainNodeRef.current) return;
        oscillatorRef.current.frequency.value = 480;
        gainNodeRef.current.gain.setValueAtTime(0.2, audioContext.currentTime);
        
        setTimeout(() => {
          if (gainNodeRef.current) gainNodeRef.current.gain.setValueAtTime(0, audioContext.currentTime);
        }, 400);
      }, 600);
      
      // Total pattern time: 400ms + 200ms + 400ms + 2000ms pause = 3000ms
    };

    // Start first ring immediately
    playRingPattern();
    
    // Repeat ring pattern every 3 seconds
    patternIntervalRef.current = setInterval(playRingPattern, 3000);

    // Start vibration pattern (similar to Snapchat: vibrate, pause, repeat)
    if ('vibrate' in navigator) {
      // Vibration pattern: [vibrate 400ms, pause 200ms, vibrate 400ms, pause 2000ms]
      // Matches the ring pattern
      const vibratePattern = () => {
        navigator.vibrate([400, 200, 400, 2000]);
      };
      
      // Initial vibration
      vibratePattern();
      
      // Repeat vibration every 3 seconds (matches the ring pattern duration)
      vibrationIntervalRef.current = setInterval(vibratePattern, 3000);
    }
  }, []);

  const stop = useCallback(() => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (patternIntervalRef.current) {
      clearInterval(patternIntervalRef.current);
      patternIntervalRef.current = null;
    }
    gainNodeRef.current = null;
    isPlayingRef.current = false;

    // Stop vibration
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0); // Stop any ongoing vibration
    }
  }, []);

  const cleanup = useCallback(() => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (patternIntervalRef.current) {
      clearInterval(patternIntervalRef.current);
      patternIntervalRef.current = null;
    }
    gainNodeRef.current = null;
    isPlayingRef.current = false;

    // Stop vibration
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  return { play, stop, cleanup };
}

// Hook for outgoing call dial tone (for the caller to hear)
export function useOutgoingRingTone() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillator1Ref = useRef<OscillatorNode | null>(null);
  const oscillator2Ref = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);

  const play = useCallback(() => {
    console.log('[DIAL TONE] 🎵 play() called. isPlaying:', isPlayingRef.current);
    
    if (isPlayingRef.current) {
      console.log('[DIAL TONE] ⚠️ Already playing, skipping');
      return;
    }

    try {
      console.log('[DIAL TONE] 🔧 Creating AudioContext...');
      // Create Web Audio API context for dial tone
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      console.log('[DIAL TONE] ✅ AudioContext created, state:', audioContext.state);

      // Create dual-tone for North American dial tone
      // Dial tone uses continuous 350Hz and 440Hz tones mixed together
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Set frequencies for standard dial tone
      oscillator1.type = 'sine';
      oscillator1.frequency.value = 350; // Lower tone
      oscillator2.type = 'sine';
      oscillator2.frequency.value = 440; // Higher tone
      
      // Set volume to be gentle and not annoying
      gainNode.gain.value = 0.1; // Continuous gentle volume

      // Connect both oscillators through the gain node
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Start both oscillators for continuous tone
      console.log('[DIAL TONE] ▶️ Starting oscillators (350Hz + 440Hz)...');
      oscillator1.start();
      oscillator2.start();
      
      oscillator1Ref.current = oscillator1;
      oscillator2Ref.current = oscillator2;
      gainNodeRef.current = gainNode;
      isPlayingRef.current = true;
      
      console.log('[DIAL TONE] ✅ Dial tone playing!');
    } catch (error) {
      console.error('[DIAL TONE] ❌ Error playing dial tone:', error);
    }
  }, []);

  const stop = useCallback(() => {
    // Stop both oscillators
    if (oscillator1Ref.current) {
      oscillator1Ref.current.stop();
      oscillator1Ref.current = null;
    }
    if (oscillator2Ref.current) {
      oscillator2Ref.current.stop();
      oscillator2Ref.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    gainNodeRef.current = null;
    isPlayingRef.current = false;
  }, []);

  return { play, stop };
}
