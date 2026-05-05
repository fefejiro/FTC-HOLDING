import { useEffect, useState } from 'react';
import { NativeModules, Platform } from 'react-native';

export type OutputRoute = 'speaker' | 'bluetooth' | 'wired_headphones' | 'earpiece' | 'unknown';
export type InputRoute = 'built_in_mic' | 'bluetooth_mic' | 'wired_mic' | 'unknown';

export type AudioRouteState = {
  outputRoute: OutputRoute;
  inputRoute: InputRoute;
  isPrivateListening: boolean;
  canAttemptInternalCapture: boolean;
  platform: 'ios' | 'android';
};

type NativeAudioRouteState = Partial<AudioRouteState>;

type AudioRouteNativeModule = {
  getCurrentRoute: () => Promise<NativeAudioRouteState>;
};

const defaultState: AudioRouteState = {
  outputRoute: 'unknown',
  inputRoute: 'built_in_mic',
  isPrivateListening: false,
  canAttemptInternalCapture: false,
  platform: Platform.OS === 'ios' ? 'ios' : 'android',
};

const audioRouteModule = NativeModules.AudioRouteModule as AudioRouteNativeModule | undefined;

function normalizeRouteState(next?: NativeAudioRouteState): AudioRouteState {
  const inferredPrivateListening =
    next?.outputRoute === 'bluetooth' || next?.outputRoute === 'wired_headphones';

  return {
    outputRoute: next?.outputRoute ?? defaultState.outputRoute,
    inputRoute: next?.inputRoute ?? defaultState.inputRoute,
    isPrivateListening: next?.isPrivateListening ?? inferredPrivateListening,
    canAttemptInternalCapture: next?.canAttemptInternalCapture ?? false,
    platform: next?.platform === 'ios' ? 'ios' : defaultState.platform,
  };
}

export function useAudioRoute(): AudioRouteState {
  const [route, setRoute] = useState<AudioRouteState>(defaultState);

  useEffect(() => {
    if (Platform.OS !== 'android' || !audioRouteModule?.getCurrentRoute) {
      setRoute(defaultState);
      return;
    }

    let active = true;

    const refreshRoute = async () => {
      try {
        const next = await audioRouteModule.getCurrentRoute();
        if (active) {
          setRoute(normalizeRouteState(next));
        }
      } catch {
        if (active) {
          setRoute(defaultState);
        }
      }
    };

    refreshRoute();
    const intervalId = setInterval(refreshRoute, 1500);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  return route;
}
