import { useEffect, useRef } from 'react';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

/**
 * Configures the iOS AVAudioSession so SayWetin can record via the
 * microphone while another app (Amazon Music, Spotify, etc.) keeps
 * playing in the background.
 *
 * Key iOS setting: InterruptionModeIOS.MixWithOthers maps to
 * AVAudioSession.mixWithOthers — allows concurrent recording without
 * ducking or stopping the active audio session of the other app.
 *
 * Call this hook in any screen that needs to capture audio.
 * It activates the session on mount and deactivates on unmount.
 */
export function useAudioSession() {
  const ready = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function activate() {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        // MixWithOthers: do not interrupt the music app's playback session
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        playsInSilentModeIOS: true,
        // Android: duck (lower) other audio rather than stopping it
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: false,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      });
      if (mounted) {
        ready.current = true;
      }
    }

    activate();

    return () => {
      mounted = false;
      // Restore default session so other apps resume normal volume
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        playsInSilentModeIOS: false,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: false,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      }).catch(() => {
        // best-effort cleanup
      });
    };
  }, []);

  return { ready };
}
