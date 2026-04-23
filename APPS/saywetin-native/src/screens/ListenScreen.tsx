import { useEffect, useRef, useState } from 'react';
import { FadeInView } from '../components/FadeInView';
import { ShellCard } from '../components/ShellCard';
import { useAudioSession } from '../audio/useAudioSession';

// Deliberate pause that keeps matching inside Listen while first-paint result data settles.
// This is intentionally longer than the Result route fade (220ms) to avoid a stitched reveal.
const MATCHING_AUTO_ADVANCE_MS = 1800;
type ListenPhase = 'listening' | 'matching';

export function ListenScreen({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<ListenPhase>('listening');
  const onNextRef = useRef(onNext);

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    if (phase !== 'matching') {
      return;
    }

    const timer = setTimeout(() => {
      onNextRef.current();
    }, MATCHING_AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [phase]);

  // Configure AVAudioSession so music apps keep playing while we record
  useAudioSession();

  const inMatching = phase === 'matching';

  return (
    <FadeInView duration={inMatching ? 220 : 180}>
      <ShellCard
        eyebrow={inMatching ? 'Matching' : 'Listen'}
        title={inMatching ? 'Locking your match.' : 'Listening is alive, not decorative.'}
        body={
          inMatching
            ? 'Hold steady. We are finalizing first-paint result data before reveal.'
            : 'Tap once, then we keep one stable ritual owner all the way to result.'
        }
        ctaLabel={inMatching ? 'Matching...' : 'Lock the match'}
        onPress={() => {
          if (!inMatching) {
            setPhase('matching');
          }
        }}
      />
    </FadeInView>
  );
}