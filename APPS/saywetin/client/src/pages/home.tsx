import { useLocation, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, UserCircle, Mic, PenLine, X } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { AudioRecorder } from '@/components/audio-recorder';
import { isListenModeLocation, LISTEN_MODE_PATH } from '@/lib/navigation';
import { queryClient } from '@/lib/queryClient';

export default function Home() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();

  const listenLocation = search ? `${location}?${search}` : location;
  const listenState = isListenModeLocation(listenLocation) ? 'listening' : 'idle';

  const openListenMode = () => {
    navigate(LISTEN_MODE_PATH);
  };

  const closeListenMode = () => {
    navigate('/');
  };

  const handleRecognitionSuccess = (result: any) => {
    if (result.recognizedTrack?.id) {
      queryClient.setQueryData(['/api/recognized-tracks', result.recognizedTrack.id], {
        track: {
          ...result.recognizedTrack,
          lyricsStatus: 'pending',
          analysisStatus: 'failed',
        },
        lyrics: undefined,
        culturalAnalysis: [],
        status: {
          lyrics: 'pending',
          analysis: 'failed',
          aiConfigured: true,
          aiProvider: 'openai',
          analysisMessage: 'Quick meaning is ready now. Deeper line-by-line context can still catch up.',
        },
      });
      navigate(`/song/${result.recognizedTrack.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {listenState === 'idle' ? (
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 min-w-0" data-testid="text-logo">
              <img src="/app-icon.jpg" alt="Saywetin" className="h-9 w-9 rounded-lg" />
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-500 to-green-500 bg-clip-text text-transparent truncate">
                Saywetin
              </h1>
            </div>

            <nav className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
              <ThemeToggle className="h-9 w-9" />

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid="button-user-menu"
                      aria-label="User menu"
                      className="h-9 w-9"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{user?.firstName || user?.email || 'Menu'}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate('/profile')}
                      data-testid="button-profile"
                    >
                      <UserCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate('/contribute')}
                      data-testid="button-contribute"
                    >
                      <PenLine className="mr-2 h-4 w-4" aria-hidden="true" />
                      Contribute Lyrics
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={logout}
                      disabled={isLoggingOut}
                      data-testid="button-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                      {isLoggingOut ? "Logging out..." : "Log out"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </nav>
          </div>
        </header>
      ) : null}

      <main id="main-content" className="flex-1 flex flex-col">
        {listenState === 'idle' ? (
          <div className="flex-1 flex items-center justify-center relative overflow-hidden px-4 py-10 sm:py-14">
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/8 via-amber-500/5 to-background dark:from-orange-500/12 dark:via-amber-900/8 dark:to-background" />
            <div className="absolute top-12 left-8 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />
            <div className="absolute bottom-20 right-10 h-28 w-28 rounded-full bg-green-500/10 blur-3xl" />

            <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/80">
                  Saywetin
                </p>
                <h2 className="text-4xl font-bold tracking-tight sm:text-5xl" data-testid="heading-app-title">
                  Listen
                </h2>
                <p className="mx-auto max-w-xs text-base text-muted-foreground sm:text-lg" data-testid="text-app-description">
                  Hear the song. Understand the meaning.
                </p>
              </div>

              <div className="relative mt-10">
                <div className="absolute -inset-5 rounded-full bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-green-500/20 blur-2xl animate-pulse-slow" />
                <div className="absolute -inset-10 rounded-full bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-green-500/10 blur-3xl animate-pulse-slower" />

                <button
                  type="button"
                  onClick={openListenMode}
                  className="relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 via-amber-500 to-green-500 shadow-2xl shadow-orange-500/30 transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] touch-manipulation sm:h-52 sm:w-52"
                  data-testid="button-listen-main"
                  aria-label="Listen"
                >
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-orange-500/95 via-amber-500/95 to-green-500/95" />
                  <Mic className="relative z-10 h-16 w-16 text-white drop-shadow-lg sm:h-20 sm:w-20" />
                </button>
              </div>

              <Button
                variant="ghost"
                onClick={() => navigate('/explore')}
                className="mt-8 text-sm text-muted-foreground hover:text-foreground"
                data-testid="button-type-lyrics-instead"
              >
                Type lyrics instead
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-1 flex-col overflow-hidden bg-background px-4 py-6 sm:px-6">
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-background to-background dark:from-orange-500/15" />
            <div className="absolute top-12 left-8 h-32 w-32 rounded-full bg-orange-500/12 blur-3xl" />
            <div className="absolute bottom-12 right-6 h-36 w-36 rounded-full bg-green-500/10 blur-3xl" />

            <div className="relative z-10 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                Saywetin
              </p>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeListenMode}
                data-testid="button-back"
                aria-label="Close listening mode"
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="relative z-10 flex flex-1 items-center justify-center">
              <AudioRecorder
                onSuccess={handleRecognitionSuccess}
                analyticsSource="home_cta"
                autoStart
                immersive
              />
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.08); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-pulse-slower {
          animation: pulse-slower 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
