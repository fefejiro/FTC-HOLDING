import { useEffect, useState } from 'react';
import { FadeInView } from '../components/FadeInView';
import { ShellCard } from '../components/ShellCard';
import { useAudioSession } from '../audio/useAudioSession';

// How long the matching phase is visible before auto-advancing to Result.
// Gives the API time to respond while maintaining a sense of deliberate ritual.
const MATCHING_AUTO_ADVANCE_MS = 1800;

type ListenPhase = 'listening' | 'matching';

export function ListenScreen({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<ListenPhase>('listening');

  // Configure AVAudioSession so music apps keep playing while we record
  useAudioSession();

  // Once matching starts, auto-advance to Result after the timeout so the
  // result arrives as one confident reveal — no extra tap required.
  useEffect(() => {
    if (phase !== 'matching') return;
    const timer = setTimeout(onNext, MATCHING_AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [phase, onNext]);

  if (phase === 'matching') {
    return (
      <FadeInView duration={180}>
        <ShellCard
          eyebrow="Matching"
          title="Tightening the field."
          body="Hold still — locking the match."
          ctaLabel="Reveal result"
          onPress={onNext}
        />
      </FadeInView>
    );
  }

  return (
    <FadeInView>
      <ShellCard
        eyebrow="Listen"
        title="Listening is alive, not decorative."
        body="This placeholder will become the native capture ritual with one motion system and one state owner."
        ctaLabel="Lock the match"
        onPress={() => setPhase('matching')}
      />
    </FadeInView>
  );
}