import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, UserCircle, Mic, PenLine, Music, Headphones, Radio } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { AudioRecorder } from '@/components/audio-recorder';
import { isListenModeLocation, LISTEN_MODE_PATH } from '@/lib/navigation';

type ListenState = 'idle' | 'listening';

export default function Home() {
  const [location, navigate] = useLocation();
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();
  
  const [listenState, setListenState] = useState<ListenState>(() =>
    isListenModeLocation() ? 'listening' : 'idle'
  );

  useEffect(() => {
    setListenState(isListenModeLocation(location) ? 'listening' : 'idle');
  }, [location]);

  const openListenMode = () => {
    navigate(LISTEN_MODE_PATH);
  };

  const closeListenMode = () => {
    navigate('/');
  };

  const handleRecognitionSuccess = (result: any) => {
    if (result.recognizedTrack?.id) {
      navigate(`/song/${result.recognizedTrack.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

      <main id="main-content" className="flex-1 flex flex-col">
        {listenState === 'idle' ? (
          <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-4 py-8">
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-amber-500/3 to-background dark:from-orange-500/10 dark:via-amber-900/5 dark:to-background" />
            
            <div className="absolute top-12 left-8 w-20 h-20 rounded-full bg-orange-500/5 dark:bg-orange-500/10 blur-xl" />
            <div className="absolute top-32 right-12 w-16 h-16 rounded-full bg-amber-500/5 dark:bg-amber-500/10 blur-xl" />
            <div className="absolute bottom-24 left-16 w-24 h-24 rounded-full bg-green-500/5 dark:bg-green-500/10 blur-xl" />
            
            <div className="relative z-10 flex flex-col items-center gap-8 max-w-lg mx-auto text-center">
              <div className="space-y-3">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight" data-testid="heading-app-title">
                  <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-green-500 bg-clip-text text-transparent">
                    Every Beat,
                  </span>
                  <br />
                  <span>the Root of the Story.</span>
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground max-w-sm mx-auto" data-testid="text-app-description">
                  You dey sing am. You dey vibe to am. Now you go sabi wetin e mean.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-green-500/20 blur-xl animate-pulse-slow" />
                <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-green-500/10 blur-2xl animate-pulse-slower" />
                
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openListenMode}
                  onKeyDown={(e) => e.key === 'Enter' && openListenMode()}
                  className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-orange-500 via-amber-500 to-green-500 flex items-center justify-center shadow-2xl shadow-orange-500/25 cursor-pointer transition-shadow duration-300 hover-elevate active-elevate-2"
                  data-testid="button-listen-main"
                >
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-orange-500 via-amber-500 to-green-600 opacity-80" />
                  <Mic className="relative z-10 h-14 w-14 sm:h-16 sm:w-16 text-white drop-shadow-lg" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
                  Tap to Listen
                </p>
                <p className="text-sm text-muted-foreground">
                  Play am, hum am, or sing am
                </p>
              </div>

              <div className="flex items-center justify-center gap-6 pt-4">
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground/70">
                  <div className="w-10 h-10 rounded-full bg-muted/50 dark:bg-muted flex items-center justify-center">
                    <Radio className="h-5 w-5" />
                  </div>
                  <span className="text-xs">Play am</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground/70">
                  <div className="w-10 h-10 rounded-full bg-muted/50 dark:bg-muted flex items-center justify-center">
                    <Music className="h-5 w-5" />
                  </div>
                  <span className="text-xs">Hum am</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground/70">
                  <div className="w-10 h-10 rounded-full bg-muted/50 dark:bg-muted flex items-center justify-center">
                    <Headphones className="h-5 w-5" />
                  </div>
                  <span className="text-xs">Sing am</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-background to-background dark:from-orange-500/10" />
            <div className="relative z-10 w-full max-w-md mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  Dey hear am...
                </h3>
                <Button variant="ghost" size="sm" onClick={closeListenMode} data-testid="button-back">
                  Back
                </Button>
              </div>
              <AudioRecorder onSuccess={handleRecognitionSuccess} />
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
