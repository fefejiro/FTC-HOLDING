import { FadeInView } from '../components/FadeInView';
import { ShellCard } from '../components/ShellCard';

export function ListenScreen({ onNext }: { onNext: () => void }) {
  return (
    <FadeInView>
      <ShellCard
        eyebrow="Listen"
        title="Listening is alive, not decorative."
        body="This placeholder will become the native capture ritual with one motion system and one state owner."
        ctaLabel="Lock the match"
        onPress={onNext}
      />
    </FadeInView>
  );
}