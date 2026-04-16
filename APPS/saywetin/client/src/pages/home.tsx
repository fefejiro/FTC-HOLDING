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
import { queryClient } from '@/lib/queryClient';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';

function detectMobileListenRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || (window.matchMedia?.('(pointer: coarse)')?.matches ?? false);
}

function detectNativeAndroidRuntime(): boolean {
  if (typeof document === 'undefined') return false;
  return document.body.classList.contains('capacitor-android');
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
    navigate(LISTEN_MODE_PATH);
  };

  const closeListenMode = () => {
    navigate('/', { replace: true });
  };

  const handleRecognitionSuccess = (result: any) => {
    if (result.recognizedTrack?.id) {
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
      navigate(`/song/${result.recognizedTrack.id}`, { replace: true });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex flex-col">
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={false}
        animate={{
          opacity: isListeningMode ? 1 : 0.92,
          scale: isListeningMode ? (isNativeAndroidRuntime ? 1.005 : 1.02) : 1,
        }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-orange-500/8 via-amber-500/5 to-background dark:from-orange-500/12 dark:via-amber-900/8 dark:to-background"
          animate={{
            opacity: isListeningMode ? 1 : 0.8,
            scale: isListeningMode ? (isNativeAndroidRuntime ? 1.01 : 1.05) : 1,
          }}
          transition={{ duration: 0.36, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute top-12 left-8 h-24 w-24 rounded-full bg-orange-500/12 blur-2xl"
          animate={{
            x: isListeningMode ? (isNativeAndroidRuntime ? 0 : isMobileListenRuntime ? -3 : -8) : 0,
            y: isListeningMode ? (isNativeAndroidRuntime ? 0 : isMobileListenRuntime ? -4 : -10) : 0,
            scale: isListeningMode ? (isNativeAndroidRuntime ? 1.08 : isMobileListenRuntime ? 1.22 : 1.55) : 1,
            opacity: isListeningMode ? (isNativeAndroidRuntime ? 0.14 : isMobileListenRuntime ? 0.22 : 0.3) : 0.16,
          }}
          transition={{ duration: 0.38, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute bottom-16 right-8 h-32 w-32 rounded-full bg-green-500/10 blur-3xl"
          animate={{
            x: isListeningMode ? (isNativeAndroidRuntime ? 0 : isMobileListenRuntime ? 4 : 10) : 0,
            y: isListeningMode ? (isNativeAndroidRuntime ? 0 : isMobileListenRuntime ? 4 : 8) : 0,
            scale: isListeningMode ? (isNativeAndroidRuntime ? 1.1 : isMobileListenRuntime ? 1.28 : 1.65) : 1,
            opacity: isListeningMode ? (isNativeAndroidRuntime ? 0.12 : isMobileListenRuntime ? 0.2 : 0.28) : 0.14,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-orange-500/18 via-amber-400/16 to-green-400/14 blur-3xl"
          animate={{
            opacity: isListeningMode ? (isNativeAndroidRuntime ? 0.32 : isMobileListenRuntime ? 0.5 : 0.78) : 0.18,
            scale: isListeningMode ? (isNativeAndroidRuntime ? 0.92 : isMobileListenRuntime ? 0.98 : 1.08) : 0.84,
          }}
          transition={{ duration: 0.34, ease: 'easeOut' }}
        />
      </motion.div>

      <AnimatePresence initial={false}>
        {!isListeningMode ? (
          <motion.header
            key="home-header"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18, transition: { duration: 0.18, ease: 'easeInOut' } }}
            className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
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
                className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:py-14"
              >
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

                  <motion.div
                    layoutId={isMobileListenRuntime || isNativeAndroidRuntime ? undefined : 'listen-entry-shell'}
                    transition={{ type: 'spring', stiffness: 260, damping: 26, mass: 0.95 }}
                    className="relative mt-10 flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60"
                  >
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
                  </motion.div>

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
              </motion.div>
            ) : (
              <motion.div
                key="home-listening"
                initial={{ opacity: 0, y: 18, scale: 1.015 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: 'easeOut' } }}
                exit={{ opacity: 0, y: -16, scale: 0.99, transition: { duration: 0.18, ease: 'easeInOut' } }}
                className="relative flex flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: -14 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.2, delay: 0.04 } }}
                  className="relative z-10 flex items-center justify-between"
                >
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
                </motion.div>

                <div className="relative z-10 flex flex-1 items-center justify-center">
                  <motion.div
                    layoutId={isMobileListenRuntime || isNativeAndroidRuntime ? undefined : 'listen-entry-shell'}
                    transition={{ type: 'spring', stiffness: 260, damping: 26, mass: 0.95 }}
                    className={`pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center ${
                      isNativeAndroidRuntime ? 'h-60 w-60' : isMobileListenRuntime ? 'h-64 w-64' : 'h-72 w-72 sm:h-80 sm:w-80'
                    }`}
                  >
                    <div
                      className={`absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/20 via-amber-400/18 to-green-400/16 ${
                        isNativeAndroidRuntime ? 'opacity-55 blur-xl' : isMobileListenRuntime ? 'opacity-75 blur-2xl' : 'blur-3xl'
                      }`}
                    />
                    <div
                      className={`absolute rounded-full bg-white/[0.04] ${
                        isNativeAndroidRuntime ? 'inset-[20%] blur-md' : isMobileListenRuntime ? 'inset-[18%] blur-xl' : 'inset-[14%] blur-2xl'
                      }`}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1, transition: { duration: 0.22, delay: 0.06 } }}
                    className="relative z-10"
                  >
                    <AudioRecorder
                      onSuccess={handleRecognitionSuccess}
                      analyticsSource="home_cta"
                      autoStart
                      immersive
                    />
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </main>
    </div>
  );
}
