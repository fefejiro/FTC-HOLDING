import { FormEvent, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Music, Clock, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { getApiUrl } from '@/lib/api-config';
import { mergeRecentRecognitions, readRecentRecognitions, type RecentRecognitionSession } from '@/lib/recent-recognitions';

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  createdAt: string;
}

function formatRelativeTime(input: string) {
  const createdAt = new Date(input).getTime();
  if (Number.isNaN(createdAt)) {
    return 'Recently';
  }

  const diffMs = Date.now() - createdAt;
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export default function Explore() {
  const [, navigate] = useLocation();
  const [draftQuery, setDraftQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  const trimmedActiveQuery = activeQuery.trim();
  const queryString = useMemo(() => {
    if (!trimmedActiveQuery) {
      return '';
    }

    const params = new URLSearchParams({ q: trimmedActiveQuery });
    return params.toString();
  }, [trimmedActiveQuery]);

  const { data: searchResults = [], isFetching } = useQuery<SearchResult[]>({
    queryKey: ['explore-search', queryString],
    enabled: trimmedActiveQuery.length > 0,
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/search?${queryString}`), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to search songs');
      }

      return response.json();
    },
  });

  const { data: recentTracks = [] } = useQuery<RecentRecognitionSession[]>({
    queryKey: ['/api/listening-history'],
  });
  const mergedRecentTracks = useMemo(
    () => mergeRecentRecognitions(recentTracks, readRecentRecognitions()),
    [recentTracks],
  );

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveQuery(draftQuery);
  };

  const showSearchResults = trimmedActiveQuery.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              data-testid="button-explore-back"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Link href="/">
              <button className="flex items-center gap-2" data-testid="button-home">
                <Music className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Saywetin</span>
              </button>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
        <section className="space-y-2">
          <h1 className="text-2xl font-bold" data-testid="heading-explore">
            Search songs
          </h1>
          <p className="text-sm text-muted-foreground">
            Search by lyric, title, or artist. We hid the broken filters for now so this page stays reliable.
          </p>
        </section>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Try a lyric like “vibe killer” or a song title"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              className="h-12 pl-10 text-base"
              data-testid="input-search-explore"
            />
          </div>
          <Button
            type="submit"
            className="h-11 px-5"
            disabled={draftQuery.trim().length === 0}
            data-testid="button-search-explore"
          >
            Search
          </Button>
        </form>

        {showSearchResults ? (
          <section className="space-y-4" data-testid="section-search-results">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Results for “{trimmedActiveQuery}”
              </h2>
              {!isFetching && (
                <p className="text-sm text-muted-foreground">
                  {searchResults.length} match{searchResults.length === 1 ? '' : 'es'}
                </p>
              )}
            </div>

            {isFetching ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <Card key={index}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <Skeleton className="h-14 w-14 rounded-2xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((track) => (
                  <Card
                    key={track.id}
                    className="cursor-pointer transition-shadow hover:shadow-lg"
                    onClick={() => navigate(`/song/${track.id}`)}
                    data-testid={`search-result-${track.id}`}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                        <Music className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{track.title}</h3>
                        <p className="truncate text-sm text-muted-foreground">{track.artist}</p>
                        {track.album ? (
                          <p className="truncate text-xs text-muted-foreground/80">{track.album}</p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                  <h3 className="font-semibold">No songs found yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try a different lyric line, artist name, or song title.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        ) : (
          <section className="space-y-4" data-testid="section-recent-search">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Recent recognitions</h2>
            </div>

            {mergedRecentTracks.length > 0 ? (
              <div className="space-y-3">
                {mergedRecentTracks
                  .filter((session) => session.recognizedTrack)
                  .slice(0, 8)
                  .map((session) => {
                    const track = session.recognizedTrack!;
                    return (
                      <Card
                        key={session.id}
                        className="cursor-pointer transition-shadow hover:shadow-lg"
                        onClick={() => navigate(`/song/${track.id}`)}
                        data-testid={`recent-track-${track.id}`}
                      >
                        <CardContent className="flex items-center gap-4 p-4">
                          {track.coverArtUrl ? (
                            <img
                              src={track.coverArtUrl}
                              alt={`${track.title} cover art`}
                              className="h-14 w-14 rounded-2xl object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                              <Music className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-semibold">{track.title}</h3>
                            <p className="truncate text-sm text-muted-foreground">{track.artist}</p>
                          </div>
                          <p className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatRelativeTime(session.createdAt)}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Music className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Recognize a song first, then it will show up here.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
