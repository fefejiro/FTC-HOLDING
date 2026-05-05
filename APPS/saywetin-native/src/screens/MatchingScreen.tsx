/**
 * DEPRECATED — no longer registered in RitualNavigator.
 *
 * Matching is now an internal sub-state of ListenScreen, not a separate
 * navigation route. This file is kept for reference only and will be removed
 * in the next cleanup pass.
 *
 * See: ListenScreen.tsx → ListenPhase = 'listening' | 'matching'
 */
import { FadeInView } from '../components/FadeInView';
import { ShellCard } from '../components/ShellCard';

export function MatchingScreen({ onNext }: { onNext: () => void }) {
  return (
    <FadeInView>
      <ShellCard
        eyebrow="Matching"
        title="Tightening the field around the hit."
        body="Matching is treated as a stronger phase of listening, not a disconnected interstitial."
        ctaLabel="Reveal result"
        onPress={onNext}
      />
    </FadeInView>
  );
}