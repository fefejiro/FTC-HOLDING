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