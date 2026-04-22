import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { User, LogOut, UserCircle, Mic, PenLine, X, Clock, Search, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { AudioRecorder } from '@/components/audio-recorder';
import { getApiUrl } from '@/lib/api-config';
import { isListenModeLocation, LISTEN_MODE_PATH } from '@/lib/navigation';
import { hapticTap, hapticSuccess } from '@/lib/haptics';
import { isNativeAndroidApp } from '@/lib/native-audio';
import { queryClient } from '@/lib/queryClient';
import { LIVE_COLORS } from '@/lib/live-tokens';
import { mergeRecentRecognitions, readRecentRecognitions, saveRecentRecognition, type RecentRecognitionSession } from '@/lib/recent-recognitions';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';

function detectMobileListenRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || (window.matchMedia?.('(pointer: coarse)')?.matches ?? false);
}

function detectNativeAndroidRuntime(): boolean {
  return isNativeAndroidApp();
}

function formatRelativeTime(input: string): string {
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

export default function Home() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();
  const [isMobileListenRuntime, setIsMobileListenRuntime] = useState(() => detectMobileListenRuntime());
  const [isNativeAndroidRuntime, setIsNativeAndroidRuntime] = useState(() => detectNativeAndroidRuntime());
  const { data: recentTracks = [] } = useQuery<RecentRecognitionSession[]>({
    queryKey: ['/api/listening-history'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/listening-history'), {
        credentials: 'include',
      });

      if (!response.ok) {
        return [];
      }

      return response.json();
    },
    retry: false,
  });

  const listenLocation = search ? `${location}?${search}` : location;
  const isListeningMode = isListenModeLocation(listenLocation);
  const mergedRecentTracks = useMemo(
    () => mergeRecentRecognitions(recentTracks, readRecentRecognitions()).slice(0, 3),
    [recentTracks],
  );

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
    ? 'sticky top-0 z-50 border-b border-white/5 bg-[#0A0A0F]/98'
    : 'sticky top-0 z-50 border-b border-white/5 bg-[#0A0A0F]/88 backdrop-blur-xl';

  const idleExperience = (
    <div className="relative flex flex-1 flex-col overflow-hidden px-4 pb-10 pt-8 sm:px-6 sm:pt-10">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(90% 60% at 50% 0%, oklch(0.3 0.18 272 / 0.35) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute left-1/2 top-52 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${LIVE_COLORS.violet} 0%, transparent 68%)`,
            opacity: 0.22,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="pt-4">
          <p className="mb-3 text-[11px] uppercase tracking-[0.28em] text-white/45">Now listening from here</p>
          <h2
            className="font-serif text-4xl leading-[0.95] tracking-tight text-white sm:text-5xl"
            data-testid="heading-app-title"
          >
            What's playing,
            <br />
            <span style={{ color: '#B5A8FF', fontStyle: 'italic' }}>wetin dem dey talk?</span>
          </h2>
          <p
            className="mt-4 max-w-sm text-base leading-7 text-white/68 sm:text-lg"
            data-testid="text-app-description"
          >
            Hear the song. Follow the lyrics live. Understand the meaning without leaving the moment.
          </p>
        </div>

        <div className="relative flex justify-center pb-4 pt-10">
          <motion.div
            className="absolute inset-x-0 top-3 mx-auto h-64 w-64 rounded-full blur-3xl"
            animate={{ opacity: [0.18, 0.32, 0.2], scale: [0.96, 1.06, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: `radial-gradient(circle, ${LIVE_COLORS.violet} 0%, transparent 68%)`,
            }}
          />

          <button
            type="button"
            onClick={openListenMode}
            className="relative flex h-44 w-44 touch-manipulation flex-col items-center justify-center rounded-full transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] sm:h-48 sm:w-48"
            data-testid="button-listen-main"
            aria-label="Listen"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, #A89AFF 0%, oklch(0.72 0.18 272) 48%, #3f2466 100%)',
              boxShadow:
                '0 24px 60px -10px rgba(142, 96, 255, 0.45), inset 0 -12px 24px rgba(0,0,0,.35), inset 0 2px 4px rgba(255,255,255,.35)',
            }}
          >
            <Mic className="mb-2 h-14 w-14 text-[#0A0A0F] sm:h-16 sm:w-16" strokeWidth={1.7} />
            <span className="font-serif text-2xl italic text-[#0A0A0F]">Listen</span>
          </button>
        </div>

        <p className="mt-2 text-center text-sm text-white/58">Tap to identify what's playing around you</p>

        <button
          type="button"
          onClick={() => navigate('/explore')}
          className="mt-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left backdrop-blur-sm transition hover:border-white/15 hover:bg-white/[0.06]"
          data-testid="button-type-lyrics-instead"
        >
          <div className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/70">
            <Search className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">Search a lyric, slang, or artist</p>
            <p className="mt-1 text-xs text-white/45">Type instead when the song has already left the room.</p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/40" />
        </button>

        <div className="mt-8 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Recent listens</p>
            <p className="mt-2 text-sm text-white/60">Jump back into the last songs you matched.</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate('/history')}
            className="h-auto px-0 text-xs uppercase tracking-[0.2em] text-[oklch(0.72_0.18_272)] hover:bg-transparent hover:text-white"
            data-testid="button-recent"
          >
            See all
          </Button>
        </div>

        <div className="mt-4 space-y-3 pb-4">
          {mergedRecentTracks.length > 0 ? (
            mergedRecentTracks.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => navigate(`/song/${session.recognizedTrack?.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:border-white/15 hover:bg-white/[0.05]"
                data-testid={`recent-track-${session.recognizedTrack?.id}`}
              >
                <div className="h-12 w-12 overflow-hidden rounded-xl bg-white/[0.08]">
                  {session.recognizedTrack?.coverArtUrl ? (
                    <img
                      src={session.recognizedTrack.coverArtUrl}
                      alt={`${session.recognizedTrack.title} cover`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[oklch(0.72_0.18_272_/_0.16)] text-white/80">
                      <Mic className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {session.recognizedTrack?.title || 'Recognized song'}
                  </p>
                  <p className="truncate text-xs text-white/52">
                    {session.recognizedTrack?.artist || 'Unknown artist'} · {formatRelativeTime(session.createdAt)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-white/35" />
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5">
              <p className="text-sm font-medium text-white">Nothing recent yet.</p>
              <p className="mt-1 text-xs leading-6 text-white/50">
                Your last matched songs will land here so you can jump straight back into meaning and live lyrics.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const listeningExperience = (
    <div className="relative flex flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6">
      <div className="relative z-10 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#B5A8FF]">
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
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#8E60FF]/22 via-[#B5A8FF]/16 to-[#7AD6A5]/10 blur-3xl" />
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
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#8E60FF]/22 via-[#B5A8FF]/18 to-[#7AD6A5]/12 opacity-75 blur-2xl" />
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background" style={{ backgroundColor: LIVE_COLORS.obsidian }}>
      {isNativeAndroidRuntime ? (
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(79,51,134,0.18) 0%, rgba(10,10,15,0.96) 38%, rgba(10,10,15,1) 100%)',
            }}
          />
          <div
            className="absolute left-1/2 top-[28%] h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${LIVE_COLORS.violet} 0%, transparent 70%)`, opacity: 0.2 }}
          />
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
              className="absolute inset-0"
              animate={{
                opacity: isListeningMode ? 1 : 0.8,
                scale: isListeningMode ? 1.05 : 1,
              }}
              transition={{ duration: 0.36, ease: 'easeOut' }}
              style={{
                background:
                  'linear-gradient(180deg, rgba(79,51,134,0.22) 0%, rgba(32,24,44,0.55) 24%, rgba(10,10,15,1) 100%)',
              }}
            />
            <motion.div
              className="absolute left-8 top-12 h-28 w-28 rounded-full blur-2xl"
              animate={{
                x: isListeningMode ? (isMobileListenRuntime ? -3 : -8) : 0,
                y: isListeningMode ? (isMobileListenRuntime ? -4 : -10) : 0,
                scale: isListeningMode ? (isMobileListenRuntime ? 1.34 : 1.55) : 1,
                opacity: isListeningMode ? (isMobileListenRuntime ? 0.3 : 0.3) : 0.16,
              }}
              transition={{ duration: 0.38, ease: 'easeOut' }}
              style={{ background: `radial-gradient(circle, ${LIVE_COLORS.violet} 0%, transparent 70%)` }}
            />
            <motion.div
              className="absolute bottom-16 right-8 h-36 w-36 rounded-full blur-3xl"
              animate={{
                x: isListeningMode ? (isMobileListenRuntime ? 4 : 10) : 0,
                y: isListeningMode ? (isMobileListenRuntime ? 4 : 8) : 0,
                scale: isListeningMode ? (isMobileListenRuntime ? 1.38 : 1.65) : 1,
                opacity: isListeningMode ? (isMobileListenRuntime ? 0.28 : 0.28) : 0.14,
              }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ background: 'radial-gradient(circle, rgba(122,214,165,0.22) 0%, transparent 70%)' }}
            />
            <motion.div
              className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
              animate={{
                opacity: isListeningMode ? (isMobileListenRuntime ? 0.7 : 0.78) : 0.18,
                scale: isListeningMode ? (isMobileListenRuntime ? 1.06 : 1.08) : 0.84,
              }}
              transition={{ duration: 0.34, ease: 'easeOut' }}
              style={{
                background: `radial-gradient(circle at 35% 35%, rgba(168,154,255,0.42) 0%, ${LIVE_COLORS.violet} 38%, transparent 72%)`,
              }}
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
            <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-6 sm:gap-4">
              <div className="flex items-center gap-2 min-w-0" data-testid="text-logo">
                <img src="/app-icon.jpg" alt="Saywetin" className="h-9 w-9 rounded-xl border border-white/10" />
                <h1 className="truncate text-xl font-semibold text-white sm:text-2xl">
                  Saywetin
                </h1>
              </div>

              <nav className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
                <ThemeToggle className="h-9 w-9 border border-white/8 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white" />

                {isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid="button-user-menu"
                        aria-label="User menu"
                        className="h-9 w-9 border border-white/8 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
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
