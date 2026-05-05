import { useEffect, useState } from 'react';
import { FadeInView } from '../components/FadeInView';
import { OrbListener } from '../components/OrbListener';
import { HeadphonesDetectedBanner } from '../components/HeadphonesDetectedBanner';
import { useAudioSession } from '../audio/useAudioSession';
import { useAudioRoute } from '../audio/useAudioRoute';
import { identifyByText, uploadListenSample } from '../api/listen';
import { logRecognitionAttempt } from '../api/recognition-logger';
import type { FailureReason, RitualTrack } from '../state/ritual-state';
import type { InputRoute } from '../audio/useAudioRoute';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;
const MATCHING_AUTO_ADVANCE_MS = 250;
type ListenPhase = 'idle' | 'listening' | 'matching';
const CAPTURE_DURATION_MS = 5000;
const LISTEN_MICROCOPY = [
  'Tap to listen again.',
  'Listen again.',
  'Catch am quick. Match am clean.',
  'Live audio in, fingerprint out.',
  'One tap starts. Second tap cuts early.',
  'Play am loud. We go find am fast.',
];

function inferInputRoute(nameOrType: string): InputRoute {
  const sample = nameOrType.toLowerCase();
  if (
    sample.includes('bluetooth') ||
    sample.includes('bt') ||
    sample.includes('sco') ||
    sample.includes('ble') ||
    sample.includes('airpods')
  ) {
    return 'bluetooth_mic';
  }
  if (
    sample.includes('wired') ||
    sample.includes('headset') ||
    sample.includes('headphone') ||
    sample.includes('usb')
  ) {
    return 'wired_mic';
  }
  if (sample.includes('built-in') || sample.includes('builtin') || sample.includes('internal') || sample.includes('mic')) {
    return 'built_in_mic';
  }
  return 'unknown';
}

function scoreRecorderInput(name: string, type: string) {
  const sample = `${name} ${type}`.toLowerCase();
  // Built-in mic scores highest for ambient capture — it hears room audio.
  // BT headset mic is near the mouth, worst for recognizing music playing around you.
  if (sample.includes('built-in') || sample.includes('builtin') || sample.includes('internal') || sample.includes('mic')) {
    return 3;
  }
  if (
    sample.includes('wired') ||
    sample.includes('headset') ||
    sample.includes('headphone') ||
    sample.includes('usb')
  ) {
    return 2;
  }
  if (
    sample.includes('bluetooth') ||
    sample.includes('bt') ||
    sample.includes('sco') ||
    sample.includes('ble') ||
    sample.includes('airpods')
  ) {
    return 1;
  }
  return 0;
}

type ListenScreenProps = {
  onRecognized: (track: RitualTrack) => void;
  onOpenShareMode: () => void;
  onOpenVibeSearch: () => void;
};

export function ListenScreen({ onRecognized, onOpenShareMode, onOpenVibeSearch }: ListenScreenProps) {
  const [phase, setPhase] = useState<ListenPhase>('idle');
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailureReason, setLastFailureReason] = useState<FailureReason | null>(null);
  const [showLyricInput, setShowLyricInput] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  const [lyricQuery, setLyricQuery] = useState('');
  const [lyricBusy, setLyricBusy] = useState(false);
  const [searchMode, setSearchMode] = useState<'lyrics' | 'song' | 'artist' | 'slang' | 'vibe'>('lyrics');
  const [bypassPrivateGuard, setBypassPrivateGuard] = useState(false);
  const [microcopy] = useState(
    () => LISTEN_MICROCOPY[Math.floor(Math.random() * LISTEN_MICROCOPY.length)],
  );
  const onRecognizedRef = useRef(onRecognized);
  const stopCaptureRef = useRef<(() => void) | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioRoute = useAudioRoute();

  useEffect(() => {
    onRecognizedRef.current = onRecognized;
  }, [onRecognized]);

  useEffect(() => {
    if (phase !== 'matching') {
      return;
    }

    const timer = setTimeout(() => {
      // Recognition callback is triggered after successful upload.
    }, MATCHING_AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [phase]);

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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
    gap: 10,
  },
  ambientTop: {
    position: 'absolute',
    top: -120,
    width: 340,
    height: 340,
    borderRadius: 999,
    backgroundColor: colors.violetWash,
  },
  eyebrow: {
    color: colors.textMuted,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '700',
  },
  eyebrowLive: {
    color: colors.violetSoft,
  },
  eyebrowMatch: {
    color: colors.mint,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 320,
  },
  orbHint: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    color: colors.amber,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 320,
  },
  quietCard: {
    marginTop: 10,
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    gap: 10,
  },
  quietTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  quietBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  quietActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quietAction: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    backgroundColor: colors.violetWash,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  quietActionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  lyricBox: {
    marginTop: 14,
    width: '100%',
    maxWidth: 340,
    gap: 8,
  },
  diagCard: {
    marginTop: 8,
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,184,76,0.28)',
    backgroundColor: 'rgba(232,184,76,0.07)',
    padding: 14,
    gap: 6,
  },
  diagTitle: {
    color: colors.amber,
    fontSize: 14,
    fontWeight: '700',
  },
  diagBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  diagAction: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    backgroundColor: colors.violetWash,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  diagActionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  wetinSheet: {
    marginTop: 14,
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    gap: 10,
  },
  wetinTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  wetinSub: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipActive: {
    backgroundColor: colors.violet,
    borderColor: colors.violet,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  wetinActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  wetinBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    backgroundColor: colors.violetWash,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  wetinBtnPrimary: {
    backgroundColor: colors.violet,
    borderColor: colors.violet,
  },
  wetinBtnPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  wetinBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  lyricHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  lyricInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  lyricButton: {
    alignSelf: 'center',
    backgroundColor: colors.violetSoft,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  lyricButtonDisabled: {
    opacity: 0.6,
  },
  lyricButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
});