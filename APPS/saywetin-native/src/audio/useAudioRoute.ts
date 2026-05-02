import { useMemo } from 'react';
import { Platform } from 'react-native';

export type OutputRoute = 'speaker' | 'bluetooth' | 'wired_headphones' | 'earpiece' | 'unknown';
export type InputRoute = 'built_in_mic' | 'bluetooth_mic' | 'wired_mic' | 'unknown';

export type AudioRouteState = {
  outputRoute: OutputRoute;
  inputRoute: InputRoute;
  isPrivateListening: boolean;
  canAttemptInternalCapture: boolean;
  platform: 'ios' | 'android';
};

export function useAudioRoute(): AudioRouteState {
  return useMemo(() => {
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    return {
      outputRoute: 'unknown',
      inputRoute: 'built_in_mic',
      isPrivateListening: false,
      canAttemptInternalCapture: false,
      platform,
    };
  }, []);
}
