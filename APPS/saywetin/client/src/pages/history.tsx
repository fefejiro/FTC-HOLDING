import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, Clock } from 'lucide-react';
import { mergeRecentRecognitions, readRecentRecognitions, type RecentRecognitionSession } from '@/lib/recent-recognitions';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatRecognitionTimestamp(dateString?: string): string | null {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function History() {
  const [, navigate] = useLocation();

  const { data: sessions, isLoading } = useQuery<RecentRecognitionSession[]>({
    queryKey: ['/api/listening-history'],
  });

  const recognized = useMemo(
    () => mergeRecentRecognitions(sessions, readRecentRecognitions()),
    [sessions],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold" data-testid="heading-history">
            Recent
          </h1>
          <p className="text-sm text-muted-foreground">
            Reopen songs you already recognized.
          </p>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4 items-center">
                    <Skeleton className="h-14 w-14 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recognized.length > 0 ? (
          <div className="space-y-3">
            {recognized.map((session) => {
              const track = session.recognizedTrack!;
              const recognizedAt = formatRecognitionTimestamp(session.createdAt);
              return (
                <Card
                  key={session.id}
                  className="cursor-pointer transition-all hover:bg-muted/50 active:scale-[0.99]"
                  onClick={() => navigate(`/song/${track.id}`)}
                  data-testid={`history-item-${track.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4 items-center">
                      <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-orange-500 via-amber-500 to-green-500 shrink-0 flex items-center justify-center overflow-hidden">
                        {track.coverArtUrl ? (
                          <img
                            src={track.coverArtUrl}
                            alt={track.title}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Music className="h-6 w-6 text-white/90" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium truncate"
                          data-testid={`history-title-${track.id}`}
                        >
                          {track.title}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {track.artist}
                        </p>
                        {recognizedAt ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Recognized {recognizedAt}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>{formatRelativeTime(session.createdAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Music className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">No songs yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Songs you recognize will appear here
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
