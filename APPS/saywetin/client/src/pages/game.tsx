import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SlangMatchGame } from '@/components/slang-match-game';
import { Gamepad2, ArrowLeft, Music, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { getApiUrl } from '@/lib/api-config';

interface SlangTerm {
  term: string;
  meaning: string;
  language: string;
}

interface AiTranslation {
  id: string;
  originalText: string;
  slangTerms?: string | null;
}

function parseSlangTerms(value?: string | SlangTerm[] | null): SlangTerm[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function GamePage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const trackId = params.get('trackId');

  const [gameKey, setGameKey] = useState(0);

  const { data, isLoading } = useQuery<{
    track: { title: string; artist: string };
    culturalAnalysis?: AiTranslation[];
  }>({
    queryKey: ['/api/recognized-tracks', trackId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/recognized-tracks/${trackId}`), {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!trackId,
    staleTime: 1000 * 60 * 5,
  });

  const allSlangTerms: SlangTerm[] = [];
  (data?.culturalAnalysis || []).forEach((a) => {
    parseSlangTerms(a.slangTerms).forEach((term) => {
      if (term.term && term.meaning) {
        allSlangTerms.push(term);
      }
    });
  });

  const isNativeAndroid =
    typeof document !== 'undefined' && document.body.classList.contains('capacitor-android');

  return (
    <div className="min-h-screen bg-background">
      <header
        className={`sticky top-0 z-50 border-b ${
          isNativeAndroid
            ? 'bg-background/98'
            : 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'
        }`}
      >
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (trackId ? navigate(`/song/${trackId}`) : navigate('/'))}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            <span className="font-semibold">Slang Match</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading game...</p>
          </div>
        ) : allSlangTerms.length < 2 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Music className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold text-lg">
                  {trackId ? 'Not enough slang yet' : 'No track selected'}
                </p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {trackId
                    ? 'Open a few lyric lines to unlock more slang terms, then come back to play.'
                    : 'Recognize a song first, then open this page from the result screen.'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => (trackId ? navigate(`/song/${trackId}`) : navigate('/'))}
                className="mt-2"
              >
                {trackId ? 'Back to lyrics' : 'Go home'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data?.track && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-4 px-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Playing slang from
                  </p>
                  <p className="mt-1 font-semibold text-foreground">{data.track.title}</p>
                  <p className="text-sm text-muted-foreground">{data.track.artist}</p>
                </CardContent>
              </Card>
            )}
            <SlangMatchGame
              key={gameKey}
              slangTerms={allSlangTerms}
              onClose={() => (trackId ? navigate(`/song/${trackId}`) : navigate('/'))}
              onRestart={() => setGameKey((k) => k + 1)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
