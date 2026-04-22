import { useEffect, useState } from 'react';
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
import { User, LogOut, UserCircle, Mic, PenLine, X, Clock } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { AudioRecorder } from '@/components/audio-recorder';
import { isListenModeLocation, LISTEN_MODE_PATH } from '@/lib/navigation';
import { hapticTap, hapticSuccess } from '@/lib/haptics';
import { isNativeAndroidApp } from '@/lib/native-audio';
import { queryClient } from '@/lib/queryClient';
import { mergeRecentRecognitions, saveRecentRecognition, type RecentRecognitionSession } from '@/lib/recent-recognitions';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';

function detectMobileListenRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || (window.matchMedia?.('(pointer: coarse)')?.matches ?? false);
}

function detectNativeAndroidRuntime(): boolean {
  return isNativeAndroidApp();
}

export default function Home() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();
  const [isMobileListenRuntime, setIsMobileListenRuntime] = useState(() => detectMobileListenRuntime());
  const [isNativeAndroidRuntime, setIsNativeAndroidRuntime] = useState(() => detectNativeAndroidRuntime());

  const listenLocation = search ? `${location}?${search}` : location;
  const isListeningMode = isListenModeLocation(listenLocation);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const updateRuntime = () => {
      setIsMobileListenRuntime(detectMobileListenRuntime());
      setIsNativeAndroidRuntime(detectNativeAndroidRuntime());
    };

    updateRuntime();
    window.addEventListener('resize', updateRuntime);
    mediaQuery.addEventListener?.('change', updateRuntime);

    return () => {
      window.removeEventListener('resize', updateRuntime);
      mediaQuery.removeEventListener?.('change', updateRuntime);
    };
  }, []);

  const openListenMode = () => {
    hapticTap();
    navigate(LISTEN_MODE_PATH);
  };

  const closeListenMode = () => {
    navigate('/', { replace: true });
  };

  const handleRecognitionSuccess = (result: any) => {
    if (result.recognizedTrack?.id) {
      const mergedRecentRecognitions = saveRecentRecognition({
        id: result.recognizedTrack.id,
        title: result.recognizedTrack.title,
        artist: result.recognizedTrack.artist,
        coverArtUrl: result.recognizedTrack.coverArtUrl || null,
      });

      queryClient.setQueryData(['/api/recognized-tracks', result.recognizedTrack.id], {
        track: {
          ...result.recognizedTrack,
          lyricsStatus: 'pending',
          analysisStatus: 'pending',
        },
        lyrics: undefined,
        culturalAnalysis: [],
        status: {
          lyrics: 'pending',
          analysis: 'pending',
          aiConfigured: true,
          aiProvider: 'openai',
          analysisMessage: 'We matched the song. Lyric timing and deeper line-by-line context are still settling in.',
        },
      });
      queryClient.setQueryData<RecentRecognitionSession[]>(
        ['/api/listening-history'],
        (current) => mergeRecentRecognitions(current, mergedRecentRecognitions),
      );
      // Brief pause so the success orb state is visible before navigating
      hapticSuccess();
      setTimeout(() => {
        navigate(`/song/${result.recognizedTrack.id}`, { replace: true });
      }, 700);
    }
  };

  const headerSurfaceClass = isNativeAndroidRuntime
    ? 'sticky top-0 z-50 border-b bg-background/98'
    : 'sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60';

  const idleExperience = (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:py-14">
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

        <div className="relative mt-10 flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60">
          {isNativeAndroidRuntime ? (
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/20 via-amber-500/16 to-green-500/14 blur-2xl" />
          ) : (
            <>
              <motion.div
                className="absolute -inset-4 rounded-full bg-gradient-to-br from-orange-500/24 via-amber-500/22 to-green-500/20 blur-2xl"
                animate={{ scale: [0.98, 1.08, 1], opacity: [0.3, 0.56, 0.34] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute -inset-10 rounded-full bg-gradient-to-br from-orange-500/12 via-amber-500/12 to-green-500/10 blur-3xl"
                animate={{ scale: [0.96, 1.12, 1], opacity: [0.18, 0.34, 0.2] }}
                transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut' }}
              />
            </>
          )}

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

        <div className="mt-8 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/explore')}
            className="text-sm text-muted-foreground hover:text-foreground"
            data-testid="button-type-lyrics-instead"
          >
            Type lyrics instead
          </Button>
          <span className="text-muted-foreground/40 text-xs">|</span>
          <Button
            variant="ghost"
            onClick={() => navigate('/history')}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            data-testid="button-recent"
          >
            <Clock className="h-3.5 w-3.5" />
            Recent
          </Button>
        </div>
      </div>
    </div>
  );

  const listeningExperience = (
    <div className="relative flex flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6">
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
        {isNativeAndroidRuntime ? (
          <>
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-orange-500/18 via-amber-400/14 to-green-400/12 blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.03] blur-2xl" />
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.2, delay: 0.04 } }}
            className={`pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center ${
              isMobileListenRuntime ? 'h-64 w-64' : 'h-72 w-72 sm:h-80 sm:w-80'
            }`}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/20 via-amber-400/18 to-green-400/16 opacity-75 blur-2xl" />
            <div className="absolute inset-[18%] rounded-full bg-white/[0.04] blur-xl" />
          </motion.div>
        )}

        <div className="relative z-10">
          <AudioRecorder
            onSuccess={handleRecognitionSuccess}
            analyticsSource="home_cta"
            autoStart
            immersive
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex flex-col">
      {isNativeAndroidRuntime ? (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-background to-background dark:from-orange-500/14 dark:via-background dark:to-background" />
          <div className="absolute left-1/2 top-[28%] h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-br from-orange-500/18 via-amber-400/14 to-green-400/12 blur-3xl" />
        </div>
      ) : (
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={false}
          animate={{
            opacity: isListeningMode ? 1 : 0.92,
            scale: isListeningMode ? 1.02 : 1,
          }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-orange-500/12 via-amber-500/8 to-background dark:from-orange-500/18 dark:via-amber-900/12 dark:to-background"
              animate={{
                opacity: isListeningMode ? 1 : 0.8,
                scale: isListeningMode ? 1.05 : 1,
              }}
              transition={{ duration: 0.36, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute top-12 left-8 h-28 w-28 rounded-full bg-orange-500/16 blur-2xl"
              animate={{
                x: isListeningMode ? (isMobileListenRuntime ? -3 : -8) : 0,
                y: isListeningMode ? (isMobileListenRuntime ? -4 : -10) : 0,
                scale: isListeningMode ? (isMobileListenRuntime ? 1.34 : 1.55) : 1,
                opacity: isListeningMode ? (isMobileListenRuntime ? 0.3 : 0.3) : 0.16,
              }}
              transition={{ duration: 0.38, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute bottom-16 right-8 h-36 w-36 rounded-full bg-green-500/14 blur-3xl"
              animate={{
                x: isListeningMode ? (isMobileListenRuntime ? 4 : 10) : 0,
                y: isListeningMode ? (isMobileListenRuntime ? 4 : 8) : 0,
                scale: isListeningMode ? (isMobileListenRuntime ? 1.38 : 1.65) : 1,
                opacity: isListeningMode ? (isMobileListenRuntime ? 0.28 : 0.28) : 0.14,
              }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-orange-500/24 via-amber-400/20 to-green-400/18 blur-3xl"
              animate={{
                opacity: isListeningMode ? (isMobileListenRuntime ? 0.7 : 0.78) : 0.18,
                scale: isListeningMode ? (isMobileListenRuntime ? 1.06 : 1.08) : 0.84,
              }}
              transition={{ duration: 0.34, ease: 'easeOut' }}
            />
        </motion.div>
      )}

      <AnimatePresence initial={false}>
        {!isListeningMode ? (
          <motion.header
            key="home-header"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18, transition: { duration: 0.18, ease: 'easeInOut' } }}
            className={headerSurfaceClass}
          >
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
                        {isLoggingOut ? 'Logging out...' : 'Log out'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </nav>
            </div>
          </motion.header>
        ) : null}
      </AnimatePresence>

      <main id="main-content" className="relative flex-1 flex flex-col">
        {isNativeAndroidRuntime ? (
          isListeningMode ? listeningExperience : idleExperience
        ) : (
          <LayoutGroup id="saywetin-home-listen-transition">
            <AnimatePresence mode="wait" initial={false}>
              {!isListeningMode ? (
                <motion.div
                  key="home-idle"
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    y: -26,
                    scale: 0.985,
                    transition: { duration: 0.2, ease: 'easeInOut' },
                  }}
                >
                  {idleExperience}
                </motion.div>
              ) : (
                <motion.div
                  key="home-listening"
                  initial={{ opacity: 0, y: 18, scale: 1.015 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: 'easeOut' } }}
                  exit={{ opacity: 0, y: -16, scale: 0.99, transition: { duration: 0.18, ease: 'easeInOut' } }}
                >
                  {listeningExperience}
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>
        )}
      </main>
    </div>
  );
}
