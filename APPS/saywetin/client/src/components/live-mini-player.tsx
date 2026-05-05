import { Sparkles } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLiveModeStore } from '@/lib/live-mode-store';

export function LiveMiniPlayer() {
  const [, navigate] = useLocation();
  const { isLiveActive, currentTrackId, currentLineText, trackTitle, coverArtUrl } = useLiveModeStore((value) => ({
    isLiveActive: value.isLiveActive,
    currentTrackId: value.currentTrackId,
    currentLineText: value.currentLineText,
    trackTitle: value.trackTitle,
    coverArtUrl: value.coverArtUrl,
  }));

  if (!isLiveActive || !currentTrackId) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => navigate(`/song/${currentTrackId}/live`)}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 rounded-2xl border border-[oklch(0.72_0.18_272_/_0.35)] bg-live-obsidian2/95 px-3 py-2 text-left shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur"
      data-testid="mini-player-live"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-lg bg-white/10">
          {coverArtUrl ? <img src={coverArtUrl} alt="cover" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs uppercase tracking-[0.14em] text-live-mint">Live · {trackTitle || 'Now playing'}</p>
          <p className="truncate font-serif text-sm italic text-white/90">{currentLineText || 'Tap to continue live lyrics'}</p>
        </div>
        <div className="rounded-full bg-[oklch(0.72_0.18_272_/_0.16)] p-2 text-[oklch(0.72_0.18_272)]">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}
