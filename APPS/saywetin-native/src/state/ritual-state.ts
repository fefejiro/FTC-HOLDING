import { useMemo, useState } from 'react';

export type RitualScreen = 'home' | 'listen' | 'matching' | 'result';

export type RitualTrack = {
  title: string;
  artist: string;
  lyric: string;
  meaning: string;
};

export type RitualController = {
  screen: RitualScreen;
  track: RitualTrack;
  startListening: () => void;
  moveToMatching: () => void;
  revealResult: () => void;
  reset: () => void;
};

const demoTrack: RitualTrack = {
  title: 'City Boy',
  artist: 'Burna Boy',
  lyric: 'Baby, I no dey for too much whining',
  meaning: 'Confidence first. The line says he is not built for hesitation or timid energy.',
};

export function useRitualState() {
  const [screen, setScreen] = useState<RitualScreen>('home');

  const actions = useMemo(
    () => ({
      startListening: () => setScreen('listen'),
      moveToMatching: () => setScreen('matching'),
      revealResult: () => setScreen('result'),
      reset: () => setScreen('home'),
    }),
    [],
  );

  return {
    screen,
    track: demoTrack,
    ...actions,
  } as RitualController;
}