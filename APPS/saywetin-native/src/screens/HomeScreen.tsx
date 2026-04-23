import { FadeInView } from '../components/FadeInView';
import { ShellCard } from '../components/ShellCard';

export function HomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <FadeInView>
      <ShellCard
        eyebrow="Home"
        title="Hear the song. Catch the meaning."
        body="This native shell replaces the wrapper-era ritual flow with one controlled path."
        ctaLabel="Start listening"
        onPress={onNext}
      />
    </FadeInView>
  );
}