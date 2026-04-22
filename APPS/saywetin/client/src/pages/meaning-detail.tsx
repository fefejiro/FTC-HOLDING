import { ArrowLeft } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLiveModeStore } from '@/lib/live-mode-store';

export default function MeaningDetailPage() {
  const [, navigate] = useLocation();
  const { id, lineId } = useParams<{ id: string; lineId: string }>();

  const { trackTitle, trackArtist, lastExplanation } = useLiveModeStore((value) => ({
    trackTitle: value.trackTitle,
    trackArtist: value.trackArtist,
    lastExplanation: value.lastExplanation,
  }));

  const isExpectedLine = lastExplanation?.lineId === lineId;

  if (!lastExplanation || !isExpectedLine) {
    return (
      <div className="min-h-screen bg-live-obsidian px-4 py-6 text-white">
        <Button variant="ghost" className="mb-6 text-white hover:bg-white/10" onClick={() => navigate(`/song/${id}/live`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to live lyrics
        </Button>
        <Card className="border-white/10 bg-white/5 text-white">
          <CardContent className="space-y-2 p-5">
            <p className="text-lg font-semibold">Meaning details are not ready yet.</p>
            <p className="text-sm text-white/70">Tap a lyric line again to load fresh context.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-live-obsidian text-white">
      <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-4">
        <div className="mb-5 flex items-center justify-between">
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => navigate(`/song/${id}/live`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <p className="text-xs uppercase tracking-[0.16em] text-white/70">
            {trackTitle ? `${trackTitle} · ${trackArtist || 'Artist'}` : 'Song meaning'}
          </p>
        </div>

        <div className="mb-4 rounded-2xl border border-[oklch(0.72_0.18_272_/_0.35)] bg-[oklch(0.72_0.18_272_/_0.12)] p-5">
          <p className="font-serif text-[32px] italic leading-tight text-white">{lastExplanation.lyric}</p>
        </div>

        <Card className="mb-4 border-[oklch(0.72_0.18_272_/_0.35)] bg-[oklch(0.72_0.18_272_/_0.14)] text-white">
          <CardContent className="space-y-2 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">Why it hits</p>
            <p className="text-sm text-white/90">{lastExplanation.cultural}</p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-white/10 bg-white/5 text-white">
            <CardContent className="space-y-2 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Plain meaning</p>
              <p>{lastExplanation.literal}</p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardContent className="space-y-2 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Cultural meaning</p>
              <p>{lastExplanation.cultural}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4 border-white/10 bg-white/5 text-white">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">Slang map</p>
            {lastExplanation.slangMap.length > 0 ? (
              <div className="space-y-2">
                {lastExplanation.slangMap.map((item) => (
                  <div key={`${item.word}-${item.region}`} className="rounded-lg border border-white/10 px-3 py-2">
                    <p className="font-semibold">{item.word}</p>
                    <p className="text-sm text-white/85">{item.meaning}</p>
                    <span className="mt-1 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/70">
                      {item.region}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/70">No explicit slang terms for this line.</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4 border-white/10 bg-white/5 text-white">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">Nigerian phrases that rhyme</p>
            <div className="flex flex-wrap gap-2">
              {lastExplanation.relatedPhrases.length > 0 ? (
                lastExplanation.relatedPhrases.map((phrase) => (
                  <span key={phrase} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs">
                    {phrase}
                  </span>
                ))
              ) : (
                <span className="text-sm text-white/70">No close phrase matches yet.</span>
              )}
            </div>
          </CardContent>
        </Card>

        {lastExplanation.artistNote ? (
          <Card className="mt-4 border-white/10 bg-white/5 text-white">
            <CardContent className="space-y-2 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Artist note</p>
              <p>{lastExplanation.artistNote}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
