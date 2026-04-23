import { FadeInView } from '../components/FadeInView';
import { ShellCard } from '../components/ShellCard';
import { useAudioSession } from '../audio/useAudioSession';

export function ListenScreen({ onNext }: { onNext: () => void }) {
  // Configure AVAudioSession so music apps keep playing while we record
  useAudioSession();

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