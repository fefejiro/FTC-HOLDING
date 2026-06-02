import { useEffect, useRef } from 'react';
import { setAudioModeAsync } from 'expo-audio';

/**
 * Configures audio mode so SayWetin can record via microphone.
 *
 * Call this hook in any screen that needs to capture audio.
 * It activates the session on mount and deactivates on unmount.
 */
export function useAudioSession() {
  const ready = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function activate() {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
      });
      if (mounted) {
        ready.current = true;
      }
    }

    activate();

    return () => {
      mounted = false;
      // Restore default session so other apps resume normal volume
      setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
        shouldRouteThroughEarpiece: false,
      }).catch(() => {
        // best-effort cleanup
      });
    };
  }, []);

  return { ready };
}
