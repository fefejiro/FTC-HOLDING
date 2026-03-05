import { useState, useCallback, lazy, Suspense, useEffect, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { MessageCircle } from "lucide-react";
import { unlockAudio } from "@/utils/ringManager";
import { initializeRemoteAudioManager } from "./call/remoteAudioManager";
import { PageSkeleton, AuthLoadingSkeleton } from "@/components/PageSkeleton";
import { GuestExpiryBanner } from "@/components/GuestExpiryBanner";
import { VersionGuard } from "@/components/VersionGuard";

// Lazy load non-critical UI components for better initial load performance
const WhatsNewModal = lazy(() => import("@/components/WhatsNewModal").then(m => ({ default: m.WhatsNewModal })));
import { FeedbackWidget } from "@/components/FeedbackWidget";
const MoodCheckIn = lazy(() => import("@/components/MoodCheckIn"));
const TransitionPrompt = lazy(() => import("@/components/TransitionPrompt"));
const UpdateNotification = lazy(() => import("@/components/UpdateNotification").then(m => ({ default: m.UpdateNotification })));
const InstallPWA = lazy(() => import("@/components/InstallPWA").then(m => ({ default: m.InstallPWA })));
const ForceRefreshButton = lazy(() => import("@/components/ForceRefreshButton").then(m => ({ default: m.ForceRefreshButton })));
const TermsAcceptanceDialog = lazy(() => import("@/components/TermsAcceptanceDialog").then(m => ({ default: m.TermsAcceptanceDialog })));
const NotificationPermission = lazy(() => import("@/components/NotificationPermission").then(m => ({ default: m.NotificationPermission })));
const VideoCallDialog = lazy(() => import("@/components/VideoCallDialog"));
const AccessibilityAnnouncer = lazy(() => import("@/components/AccessibilityAnnouncer").then(m => ({ default: m.AccessibilityAnnouncer })));
const AppRatingPrompt = lazy(() => import("@/components/AppRatingPrompt").then(m => ({ default: m.AppRatingPrompt })));
const RateLimitNotifier = lazy(() => import("@/components/RateLimitNotifier").then(m => ({ default: m.RateLimitNotifier })));

// Import frequently used pages immediately (critical path)
import LandingPage from "@/pages/landing";
import OnboardingPage from "@/pages/onboarding";
import AuthCallbackPage, { MobileAuthCallbackPage } from "@/pages/auth-callback";
import ChatPage from "@/pages/chat";
import SettingsPage from "@/pages/settings";
import HealthPanelPage from "@/pages/health-panel";
import NotFound from "@/pages/not-found";
import PrepChatPage from "@/pages/prep-chat";
import DashboardPage from "@/pages/dashboard";

// Lazy load heavy/infrequently used pages for better performance
const SchedulingPage = lazy(() => import("@/pages/scheduling"));
const TasksPage = lazy(() => import("@/pages/tasks"));
const ExpensesPage = lazy(() => import("@/pages/expenses"));
const ExpenseDetailPage = lazy(() => import("@/pages/expense-detail"));
const NotesPage = lazy(() => import("@/pages/notes"));
const ChildUpdatesPage = lazy(() => import("@/pages/child-updates"));
const PetsPage = lazy(() => import("@/pages/pets"));
const ProgressPage = lazy(() => import("@/pages/progress"));
const AgentSettingsPage = lazy(() => import("@/pages/agent-settings"));
const ParentingTipsPage = lazy(() => import("@/pages/parenting-tips"));
const WeatherActivitiesPage = lazy(() => import("@/pages/weather-activities"));
const StorybookCreatorPage = lazy(() => import("@/pages/storybook-creator"));
const ShoppingListPage = lazy(() => import("@/pages/shopping-list"));
const TherapistLocatorPage = lazy(() => import("@/pages/therapist-locator"));
const TherapistDirectoryPage = lazy(() => import("@/pages/therapist-directory"));
const SafetyPlanPage = lazy(() => import("@/pages/support/safety-plan"));
const AuditTrailPage = lazy(() => import("@/pages/audit-trail"));
const JoinCallPage = lazy(() => import("@/pages/join-call"));
const CallsPage = lazy(() => import("@/pages/calls"));
const CallPreferencesPage = lazy(() => import("@/pages/call-preferences"));
const ConchModePage = lazy(() => import("@/pages/conch-mode"));
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
const MessagingFeaturePage = lazy(() => import("@/pages/features/messaging"));
const CalendarFeaturePage = lazy(() => import("@/pages/features/calendar"));
const ExpensesFeaturePage = lazy(() => import("@/pages/features/expenses"));
const SupportFeaturePage = lazy(() => import("@/pages/features/support"));
const BetaWelcome = lazy(() => import("@/pages/beta/Welcome"));
const BetaGettingStarted = lazy(() => import("@/pages/beta/GettingStarted"));
const BetaFeatures = lazy(() => import("@/pages/beta/Features"));
const BetaFeedbackGuide = lazy(() => import("@/pages/beta/FeedbackGuide"));
const BetaFAQ = lazy(() => import("@/pages/beta/FAQ"));
const JoinPartnershipPage = lazy(() => import("@/pages/join-partnership"));

// Loading fallback component - uses skeleton for native feel
function PageLoader() {
  return <PageSkeleton variant="default" />;
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
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

    const needsOnboarding = !user.displayName;
    const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`);
    const isOnOnboardingPage = location === "/onboarding";
    const isOnJoinPage = location.startsWith("/join/");

    if (needsOnboarding && !hasCompletedOnboarding && !isOnOnboardingPage && !isOnJoinPage) {
      setLocation("/onboarding");
      return null;
    }

    const needsTermsAcceptance = !user.termsAcceptedAt && !localStorage.getItem("hasAcceptedConsent");

    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={PrepChatPage} />
            <Route path="/chat" component={ChatPage} />
            <Route path="/calls" component={CallsPage} />
            <Route path="/call-preferences" component={CallPreferencesPage} />
            <Route path="/conch-mode" component={ConchModePage} />
            <Route path="/onboarding" component={OnboardingPage} />
            <Route path="/auth/callback" component={AuthCallbackPage} />
            <Route path="/auth/mobile-callback" component={MobileAuthCallbackPage} />
            <Route path="/health-panel" component={HealthPanelPage} />
            <Route path="/scheduling" component={SchedulingPage} />
            <Route path="/tasks" component={TasksPage} />
            <Route path="/expenses" component={ExpensesPage} />
            <Route path="/expense/:id" component={ExpenseDetailPage} />
            <Route path="/notes" component={NotesPage} />
            <Route path="/child-updates" component={ChildUpdatesPage} />
            <Route path="/pets" component={PetsPage} />
            <Route path="/progress" component={ProgressPage} />
            <Route path="/prep-chat" component={PrepChatPage} />
            <Route path="/agent-settings" component={AgentSettingsPage} />
            <Route path="/parenting-tips" component={ParentingTipsPage} />
            <Route path="/weather-activities" component={WeatherActivitiesPage} />
            <Route path="/storybook-creator" component={StorybookCreatorPage} />
            <Route path="/shopping-list" component={ShoppingListPage} />
            <Route path="/therapist-locator" component={TherapistLocatorPage} />
            <Route path="/therapist-directory" component={TherapistDirectoryPage} />
            <Route path="/support/safety-plan" component={SafetyPlanPage} />
            <Route path="/audit-trail" component={AuditTrailPage} />
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
            <Route path="/features/messaging" component={MessagingFeaturePage} />
            <Route path="/features/calendar" component={CalendarFeaturePage} />
            <Route path="/features/expenses" component={ExpensesFeaturePage} />
            <Route path="/features/support" component={SupportFeaturePage} />
            <Route path="/beta/welcome" component={BetaWelcome} />
            <Route path="/beta/getting-started" component={BetaGettingStarted} />
            <Route path="/beta/features" component={BetaFeatures} />
            <Route path="/beta/feedback-guide" component={BetaFeedbackGuide} />
            <Route path="/beta/faq" component={BetaFAQ} />
            <Route path="/join/:code" component={JoinPartnershipPage} />
            <Route path="/call/:code" component={JoinCallPage} />
            <Route path="/call" component={JoinCallPage} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
        <Suspense fallback={null}>
          {needsTermsAcceptance && (
            <TermsAcceptanceDialog open={true} userId={user.id} />
          )}
          <NotificationPermission />
        </Suspense>
      </>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/auth/callback" component={AuthCallbackPage} />
        <Route path="/auth/mobile-callback" component={MobileAuthCallbackPage} />
        <Route path="/health-panel" component={HealthPanelPage} />
        <Route path="/join/:code" component={JoinPartnershipPage} />
        <Route path="/call/:code" component={JoinCallPage} />
        <Route path="/call" component={JoinCallPage} />
        <Route path="/resources" component={ResourcesPage} />
        <Route path="/features/messaging" component={MessagingFeaturePage} />
        <Route path="/features/calendar" component={CalendarFeaturePage} />
        <Route path="/features/expenses" component={ExpensesFeaturePage} />
        <Route path="/features/support" component={SupportFeaturePage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/support" component={SupportPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/delete-account" component={DeleteAccountPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[App] App returned to foreground - refetching data');
        // Refetch critical data to catch up on any changes made while backgrounded
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      } else {
        console.log('[App] App going to background');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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
                            <GuestExpiryBanner />
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
                <FeedbackWidget open={feedbackOpen} onOpenChange={setFeedbackOpen} />
                <Suspense fallback={null}>
                  <AuthenticatedWhatsNew />
                  <UpdateNotification />
                  <InstallPWA />
                  <ForceRefreshButton />
                  <AppRatingPrompt trigger="general-usage" />
                  <RateLimitNotifier />
                  <AccessibilityAnnouncer />
                </Suspense>
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
  const sessionId = typeof window !== 'undefined' ? (localStorage.getItem("peacepad_session_id") || user?.id || '') : '';
  const wsUrl = user && typeof window !== 'undefined'
    ? (() => {
        const createdUrl = createWebSocketUrl({
          path: '/ws/signaling',
          params: {
            sessionId: sessionId || '',
            userId: user.id
          }
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
      })()
    : '';

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
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
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

function AuthenticatedWhatsNew() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return <WhatsNewModal />;
}
