import { useCallback, lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useAuth } from "@/hooks/useAuth";
import { useReconnectingWebSocket } from "@/hooks/useReconnectingWebSocket";
import { createWebSocketUrl } from "@/lib/ws";
import { ActivityProvider } from "@/components/ActivityProvider";
import { CallProvider, useCallContext } from "@/contexts/CallContext";
import { WebRTCProvider } from "@/contexts/WebRTCContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MessageCircle } from "lucide-react";
import { unlockAudio } from "@/utils/ringManager";
import { initializeRemoteAudioManager } from "./call/remoteAudioManager";
import { PageSkeleton, AuthLoadingSkeleton } from "@/components/PageSkeleton";
import { VersionGuard } from "@/components/VersionGuard";
import { identifyAnalyticsUser, trackSessionStarted } from "@/lib/analytics";

// Lazy load non-critical UI components for better initial load performance
const WhatsNewModal = lazy(() => import("@/components/WhatsNewModal").then(m => ({ default: m.WhatsNewModal })));
const MoodCheckIn = lazy(() => import("@/components/MoodCheckIn"));
const TransitionPrompt = lazy(() => import("@/components/TransitionPrompt"));
const UpdateNotification = lazy(() => import("@/components/UpdateNotification").then(m => ({ default: m.UpdateNotification })));
const InstallPWA = lazy(() => import("@/components/InstallPWA").then(m => ({ default: m.InstallPWA })));
const TermsAcceptanceDialog = lazy(() => import("@/components/TermsAcceptanceDialog").then(m => ({ default: m.TermsAcceptanceDialog })));
const NotificationPermission = lazy(() => import("@/components/NotificationPermission").then(m => ({ default: m.NotificationPermission })));
const VideoCallDialog = lazy(() => import("@/components/VideoCallDialog"));
const AccessibilityAnnouncer = lazy(() => import("@/components/AccessibilityAnnouncer").then(m => ({ default: m.AccessibilityAnnouncer })));
const AppRatingPrompt = lazy(() => import("@/components/AppRatingPrompt").then(m => ({ default: m.AppRatingPrompt })));
const RateLimitNotifier = lazy(() => import("@/components/RateLimitNotifier").then(m => ({ default: m.RateLimitNotifier })));

// Import frequently used pages immediately (critical path)
import OnboardingPage from "@/pages/onboarding";
import AuthCallbackPage, { MobileAuthCallbackPage } from "@/pages/auth-callback";
import ChatPage from "@/pages/chat";
import SettingsPage from "@/pages/settings";
import HealthPanelPage from "@/pages/health-panel";
import NotFound from "@/pages/not-found";
import PrepChatPage from "@/pages/prep-chat";
import ComposePage from "@/pages/compose";

// Lazy load heavy/infrequently used pages for better performance
const SchedulingPage = lazy(() => import("@/pages/scheduling"));
const TermsPage = lazy(() => import("@/pages/terms"));
const SupportPage = lazy(() => import("@/pages/support"));
const PrivacyPage = lazy(() => import("@/pages/privacy"));
const DeleteAccountPage = lazy(() => import("@/pages/delete-account"));
const ResourcesPage = lazy(() => import("@/pages/resources"));
const AdminDashboard = lazy(() => import("@/pages/admin"));
const AdminErrorsPage = lazy(() => import("@/pages/admin-errors"));
const AdminFeedbackPage = lazy(() => import("@/pages/admin-feedback"));
const AdminUsersPage = lazy(() => import("@/pages/admin-users"));
const AdminPartnershipsPage = lazy(() => import("@/pages/admin-partnerships"));
const AdminMessagesPage = lazy(() => import("@/pages/admin-messages"));
const HelpPage = lazy(() => import("@/pages/help"));
const JoinPartnershipPage = lazy(() => import("@/pages/join-partnership"));

// Loading fallback component - uses skeleton for native feel
function PageLoader() {
  return <PageSkeleton variant="default" />;
}

function hasMeaningfulDisplayName(value?: string | null): boolean {
  const name = (value || "").trim();
  if (!name || name === "PeacePad User") {
    return false;
  }
  return !/^guest[a-z0-9]+$/i.test(name);
}

function HomeResolverPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: partnerships = [] } = useQuery<any[]>({
    queryKey: ["/api/partnerships"],
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.isGuest) {
      setLocation("/compose");
      return;
    }

    if (user.activePartnershipId || partnerships.length > 0) {
      setLocation("/chat");
      return;
    }

    setLocation("/compose");
  }, [partnerships.length, setLocation, user]);

  return <PageLoader />;
}

function Router() {
  const { isAuthenticated, isLoading, user, authBootstrapIssue, retryAuth } = useAuth();
  const [location, setLocation] = useLocation();
  const consentSyncedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user || consentSyncedRef.current) return;
    
    const hasAcceptedConsent = localStorage.getItem("hasAcceptedConsent") === "true";
    const needsSync = hasAcceptedConsent && !user.termsAcceptedAt;
    
    if (needsSync) {
      consentSyncedRef.current = true;
      fetch("/api/user/consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          privacyAccepted: true,
          ndaAccepted: true,
          aiMessageConsent: localStorage.getItem("aiMessageConsent") === "true",
          aiCallConsent: false,
        }),
      })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        })
        .catch((err) => {
          console.error("[Router] Failed to sync consent:", err);
          consentSyncedRef.current = false;
        });
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return <AuthLoadingSkeleton />;
  }

  if (isAuthenticated && user) {
    const pendingCode = localStorage.getItem("pending_join_code");
    const hasSeenIntro = localStorage.getItem("hasSeenIntro");
    const hasAcceptedConsent = localStorage.getItem("hasAcceptedConsent");

    if (pendingCode && hasSeenIntro && hasAcceptedConsent && location !== `/join/${pendingCode}`) {
      setLocation(`/join/${pendingCode}`);
      return null;
    }

    const hasCompletedOnboarding = Boolean(localStorage.getItem(`onboarding_completed_${user.id}`));
    const needsOnboarding =
      !hasCompletedOnboarding &&
      !Boolean(user.isGuest) &&
      !hasMeaningfulDisplayName(user.displayName);
    const isOnOnboardingPage = location === "/onboarding";
    const isOnJoinPage = location.startsWith("/join/");

    if (needsOnboarding && !isOnOnboardingPage && !isOnJoinPage) {
      setLocation("/onboarding");
      return null;
    }

    const needsTermsAcceptance = !user.termsAcceptedAt && !localStorage.getItem("hasAcceptedConsent");

    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={HomeResolverPage} />
            <Route path="/compose" component={ComposePage} />
            <Route path="/chat" component={ChatPage} />
            <Route path="/onboarding" component={OnboardingPage} />
            <Route path="/auth/callback" component={AuthCallbackPage} />
            <Route path="/auth/mobile-callback" component={MobileAuthCallbackPage} />
            <Route path="/health-panel" component={HealthPanelPage} />
            <Route path="/scheduling" component={SchedulingPage} />
            <Route path="/prep-chat" component={PrepChatPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/admin/users" component={AdminUsersPage} />
            <Route path="/admin/partnerships" component={AdminPartnershipsPage} />
            <Route path="/admin/messages" component={AdminMessagesPage} />
            <Route path="/admin/errors" component={AdminErrorsPage} />
            <Route path="/admin/feedback" component={AdminFeedbackPage} />
            <Route path="/help" component={HelpPage} />
            <Route path="/support" component={SupportPage} />
            <Route path="/terms" component={TermsPage} />
            <Route path="/privacy" component={PrivacyPage} />
            <Route path="/delete-account" component={DeleteAccountPage} />
            <Route path="/resources" component={ResourcesPage} />
            <Route path="/join/:code" component={JoinPartnershipPage} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
        <Suspense fallback={null}>
          {needsTermsAcceptance && (
            <TermsAcceptanceDialog open={true} userId={user.id} />
          )}
          <NotificationPermission user={user} />
        </Suspense>
      </>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <>
        {authBootstrapIssue && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Session restore needs attention</p>
                <p className="text-sm text-amber-900/90">{authBootstrapIssue.message}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  retryAuth().catch((error) => {
                    console.error("[AuthBootstrap] manual-retry-failed", error);
                  });
                }}
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-100"
              >
                Retry session check
              </button>
            </div>
          </div>
        )}
        <Switch>
          <Route path="/" component={ComposePage} />
          <Route path="/compose" component={ComposePage} />
          <Route path="/prep-chat" component={PrepChatPage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/auth/callback" component={AuthCallbackPage} />
          <Route path="/auth/mobile-callback" component={MobileAuthCallbackPage} />
          <Route path="/health-panel" component={HealthPanelPage} />
          <Route path="/join/:code" component={JoinPartnershipPage} />
          <Route path="/resources" component={ResourcesPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/support" component={SupportPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/delete-account" component={DeleteAccountPage} />
          <Route component={NotFound} />
        </Switch>
      </>
    </Suspense>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const moodCheckInsEnabled = localStorage.getItem("mood_checkins_enabled") === "true";

  // Detect Android Capacitor and add class to body for safe-area CSS
  useEffect(() => {
    const detectPlatform = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        const platform = Capacitor.getPlatform();
        
        if (platform === 'android') {
          document.body.classList.add('capacitor-android');
          console.log('[App] Android platform detected - safe-area CSS enabled');
        } else if (platform === 'ios') {
          document.body.classList.add('capacitor-ios');
          console.log('[App] iOS platform detected');
        }
        
        if (Capacitor.isNativePlatform()) {
          document.body.classList.add('capacitor-native');
          
          try {
            const { StatusBar, Style } = await import('@capacitor/status-bar');
            await StatusBar.setOverlaysWebView({ overlay: true });
            await StatusBar.setBackgroundColor({ color: '#00000000' });
            await StatusBar.setStyle({ style: Style.Light });
          } catch (sbErr) {
            console.warn('[App] StatusBar plugin not available:', sbErr);
          }
        }
      } catch (e) {
        // Not running in Capacitor
      }
    };
    detectPlatform();
  }, []);
  
  useEffect(() => {
    initializeRemoteAudioManager();
  }, []);

  useEffect(() => {
    const initDeepLinks = async () => {
      try {
        const { setupDeepLinkHandler } = await import('@/utils/deep-links');
        setupDeepLinkHandler();
      } catch (error) {
        console.log('[App] Deep link initialization error:', error);
      }
    };
    initDeepLinks();
  }, []);

  useEffect(() => {
    const initPushNotifications = async () => {
      try {
        const { isNativeApp } = await import('@/utils/capacitor-notifications');
        if (isNativeApp()) return;
        const { initializeNotifications } = await import('@/utils/capacitor-notifications');
        await initializeNotifications();
      } catch (error) {
        console.log('[App] Push notification initialization error:', error);
      }
    };
    initPushNotifications();
  }, []);

  // Background/foreground resilience: refetch data when app returns to foreground
  useEffect(() => {
    let isMounted = true;
    let appStateListener: { remove: () => Promise<void> } | null = null;

    const handleAppResume = () => {
      console.log('[App] App returned to foreground - refetching data');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      window.dispatchEvent(new Event('peacepad:app-resume'));
    };

    const handleAppBackground = () => {
      console.log('[App] App going to background');
      window.dispatchEvent(new Event('peacepad:app-background'));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleAppResume();
      } else {
        handleAppBackground();
      }
    };

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!isMounted || !Capacitor.isNativePlatform()) {
          return;
        }

        const { App: CapacitorApp } = await import('@capacitor/app');
        if (!isMounted) {
          return;
        }

        appStateListener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            handleAppResume();
          } else {
            handleAppBackground();
          }
        });
      } catch (error) {
        console.warn('[App] Failed to register native appStateChange listener:', error);
      }
    })();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (appStateListener) {
        appStateListener.remove().catch(() => {
          // no-op cleanup fallback
        });
      }
    };
  }, []);

  return (
    <VersionGuard>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TooltipProvider>
              <LocationProvider>
                <ActivityProvider>
                  <ErrorBoundary>
                <CallProvider>
                  <WebRTCContextWrapper>
                    <AuthWrapper>
                      <SessionTracker />
                      <SidebarProvider style={style as React.CSSProperties}>
                        <div 
                          className="flex w-full"
                          style={{ 
                            height: '100dvh',
                            minHeight: '-webkit-fill-available',
                            overflow: 'hidden'
                          }}
                        >
                          <ConditionalSidebar />
                          <div 
                            className="flex flex-col flex-1 min-w-0 max-w-full"
                            style={{ 
                              height: '100%',
                              overflow: 'hidden',
                              contain: 'layout style'
                            }}
                          >
                            <ConditionalHeader />
                            <main 
                              id="main-content" 
                              className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden pb-24 lg:pb-0 min-h-0"
                              style={{ 
                                contain: 'strict',
                                overscrollBehavior: 'contain',
                                WebkitOverflowScrolling: 'touch'
                              }}
                            >
                              <Router />
                            </main>
                            <ConditionalBottomNav />
                          </div>
                        </div>
                      </SidebarProvider>
                    </AuthWrapper>
                  </WebRTCContextWrapper>
                </CallProvider>
                <Suspense fallback={null}>
                  {moodCheckInsEnabled && <TransitionPrompt />}
                  {moodCheckInsEnabled && <MoodCheckIn />}
                </Suspense>
                <Toaster />
                <OfflineIndicator />
                <PromptSurfaceLayer />
                </ErrorBoundary>
              </ActivityProvider>
            </LocationProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </VersionGuard>
  );
}

function WebRTCContextWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const needsRealtime = !!user;

  // Stabilise the WS URL so it only changes when the user ID changes.
  // Without useMemo the IIFE runs on every render (auth bootstrap fires
  // several times), causing multiple simultaneous connections that Railway
  // rejects with code 1008 "Too many connections", which then triggers an
  // infinite reconnect loop that freezes the renderer.
  const wsUrl = useMemo(() => {
    if (!user || typeof window === 'undefined') return '';
    const sessionId = localStorage.getItem("peacepad_session_id") || user.id;
    const createdUrl = createWebSocketUrl({
      path: '/ws/signaling',
      params: { sessionId, userId: user.id },
    });

    // Last-resort guard: never let production web connect signaling via the Pages host.
    if (
      createdUrl.includes("://peacepad.ca/") ||
      createdUrl.includes("://www.peacepad.ca/") ||
      createdUrl.includes("://ftc-holding.pages.dev/")
    ) {
      const forcedUrl = createdUrl.replace(
        /^wss?:\/\/(peacepad\.ca|www\.peacepad\.ca|ftc-holding\.pages\.dev)/i,
        "wss://api.peacepad.ca",
      );
      console.warn("[WebSocket] Forced signaling host rewrite at App layer", {
        createdUrl,
        forcedUrl,
      });
      return forcedUrl;
    }

    return createdUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only re-derive when the authenticated user changes

  const handleWebSocketMessage = useCallback(async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "partnership-joined") {
          console.log('[App] Partnership joined notification received, forcing data refresh');
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/partnerships"] });
          await queryClient.refetchQueries({ queryKey: ["/api/partnerships"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/conch-sessions/active"] });
        }
        
        // Handle real-time tone analysis updates
        if (data.type === "message-tone-updated") {
          console.log('[App] Message tone updated:', data.messageId, data.conversationId, data.tone);
          // Invalidate specific conversation messages if conversationId provided
          if (data.conversationId) {
            queryClient.invalidateQueries({ 
              queryKey: ["/api/conversations", data.conversationId, "messages"],
              refetchType: 'active'
            });
          }
          // Also invalidate conversation list
          queryClient.invalidateQueries({ 
            queryKey: ["/api/conversations"],
            refetchType: 'active'
          });
        }
        
        // Handle new message notifications
        if (data.type === "new-message") {
          console.log('[App] New message received:', data.messageId, data.conversationId);
          // Invalidate specific conversation messages if conversationId provided
          if (data.conversationId) {
            queryClient.invalidateQueries({ 
              queryKey: ["/api/conversations", data.conversationId, "messages"],
              refetchType: 'active'
            });
          }
          // Also invalidate conversation list for unread count updates
          queryClient.invalidateQueries({ 
            queryKey: ["/api/conversations"],
            refetchType: 'active'
          });
        }
      } catch (err) {
        console.error('[App] WebSocket parse error:', err);
      }
  }, []);

  const { sendMessage, websocket } = useReconnectingWebSocket({
    url: wsUrl,
    enabled: needsRealtime && wsUrl !== '',
    onMessage: handleWebSocketMessage,
  });

  return (
    <WebRTCProvider websocket={websocket} sendMessage={sendMessage}>
      {children}
    </WebRTCProvider>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const callContext = useCallContext();

  const activeCallPhases = ['ringing', 'dialing', 'connecting', 'active'];
  const isCallDialogOpen = callContext.call !== null && activeCallPhases.includes(callContext.phase);

  const callDialogData = isCallDialogOpen && callContext.call ? {
    callId: callContext.call.callId,
    callerId: callContext.call.callerId || '',
    calleeId: callContext.call.calleeId || '',
    callerName: callContext.call.callerName,
    callType: callContext.call.callType,
    autoAccepted: callContext.call.autoAccepted,
    sessionCode: callContext.call.sessionCode,
    isIncoming: callContext.call.callRole === 'callee',
  } : null;

  useEffect(() => {
    const handleFirstInteraction = () => {
      try {
        unlockAudio();
      } catch (e) {
        console.error('Audio unlock error:', e);
      }
      document.removeEventListener('click', handleFirstInteraction, { capture: true } as any);
      document.removeEventListener('touchstart', handleFirstInteraction, { capture: true } as any);
    };
    document.addEventListener('click', handleFirstInteraction, { capture: true } as any);
    document.addEventListener('touchstart', handleFirstInteraction, { capture: true } as any);
    return () => {
      document.removeEventListener('click', handleFirstInteraction, { capture: true } as any);
      document.removeEventListener('touchstart', handleFirstInteraction, { capture: true } as any);
    };
  }, []);

  return (
    <>
      {children}
      <Suspense fallback={null}>
        {callDialogData && (
          <VideoCallDialog
            isOpen={isCallDialogOpen}
            onClose={() => callContext.resetCall()}
            {...callDialogData}
          />
        )}
      </Suspense>
    </>
  );
}

function ConditionalHeader() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated || !user) return null;
  const isJoinPage = location.startsWith("/join/");
  if (isJoinPage) return null;
  return (
    <header 
      className="relative flex items-center justify-center p-3 sm:p-2 border-b z-50 bg-background shrink-0 min-w-0 safe-area-top"
      style={{ contain: 'layout style' }}
    >
      <div className="absolute left-3 sm:left-2 flex items-center gap-2">
        <ConditionalSidebarTrigger />
      </div>
      <ConditionalLogo />
    </header>
  );
}

function ConditionalSidebar() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const isExcludedPage = location === "/onboarding" || location.startsWith("/join/") || location === "/";
  if (!isAuthenticated || !user || isExcludedPage) return null;
  return <AppSidebar />;
}

function ConditionalSidebarTrigger() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const isExcludedPage = location === "/onboarding" || location.startsWith("/join/") || location === "/";
  if (!isAuthenticated || !user || isExcludedPage) return null;
  return <SidebarTrigger className="hidden lg:flex" data-testid="button-sidebar-toggle" />;
}

function ConditionalBottomNav() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const isExcludedPage = location === "/onboarding" || location.startsWith("/join/");
  if (!isAuthenticated || !user || isExcludedPage) return null;
  return <BottomNav />;
}

function ConditionalLogo() {
  const [location] = useLocation();
  if (location === "/") return null;
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <MessageCircle className="w-5 h-5 text-primary" />
      </div>
      <span className="font-bold text-lg tracking-tight">PeacePad</span>
    </div>
  );
}

function SessionTracker() {
  const { user, isAuthenticated } = useAuth();
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      trackedRef.current = null;
      return;
    }

    identifyAnalyticsUser(user);
    if (trackedRef.current === user.id) {
      return;
    }

    trackedRef.current = user.id;
    trackSessionStarted({
      is_guest: Boolean(user.isGuest),
    });
  }, [isAuthenticated, user]);

  return null;
}

function AuthenticatedWhatsNew() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return <WhatsNewModal />;
}

function PromptSurfaceLayer() {
  const [location] = useLocation();

  const path = useMemo(() => {
    if (typeof window === "undefined") {
      return location;
    }

    return window.location.pathname || location;
  }, [location]);

  const blocksPromptSurfaces =
    path.startsWith("/onboarding") ||
    path.startsWith("/auth/") ||
    path.startsWith("/join/");

  const shouldLoadBrowserPromptSurfaces = useMemo(() => {
    if (typeof window === "undefined" || blocksPromptSurfaces) {
      return false;
    }

    const isStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
    const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    const narrowViewport = window.matchMedia?.("(max-width: 768px)")?.matches ?? false;
    const isMobileUserAgent =
      /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent);

    return isStandalone || isMobileUserAgent || (coarsePointer && narrowViewport);
  }, [blocksPromptSurfaces]);

  return (
    <Suspense fallback={null}>
      {!blocksPromptSurfaces && <AuthenticatedWhatsNew />}
      {shouldLoadBrowserPromptSurfaces && <UpdateNotification />}
      {shouldLoadBrowserPromptSurfaces && <InstallPWA />}
      {!blocksPromptSurfaces && <AppRatingPrompt trigger="general-usage" />}
      <RateLimitNotifier />
      <AccessibilityAnnouncer />
    </Suspense>
  );
}
