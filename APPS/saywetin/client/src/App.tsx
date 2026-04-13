import { useEffect } from "react";
import { Switch, Route, useLocation, useSearch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BottomNav } from "@/components/bottom-nav";
import { UpdateNotification } from "@/components/update-notification";
import { VersionGuard } from "@/components/version-guard";
import { isListenModeLocation } from "@/lib/navigation";
import Home from "@/pages/home";
import SongDetail from "@/pages/song-detail";
import RecognizedTrack from "@/pages/recognized-track";
import Explore from "@/pages/explore";
import History from "@/pages/history";
import Contribute from "@/pages/contribute";
import Admin from "@/pages/admin";
import Profile from "@/pages/profile";
import Login from "@/pages/login";
import PrivacyPolicy from "@/pages/privacy-policy";
import DeleteData from "@/pages/delete-data";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/explore" component={Explore} />
      <Route path="/history" component={History} />
      <Route path="/song/:id" component={RecognizedTrack} />
      <Route path="/recognized-track/:id" component={RecognizedTrack} />
      <Route path="/traditional/:id" component={SongDetail} />
      <Route path="/contribute" component={Contribute} />
      <Route path="/admin" component={Admin} />
      <Route path="/profile" component={Profile} />
      <Route path="/login" component={Login} />
      <Route path="/login/" component={Login} />
      <Route path="/signin" component={Login} />
      <Route path="/signin/" component={Login} />
      <Route path="/sign-in" component={Login} />
      <Route path="/sign_in" component={Login} />
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/signin" component={Login} />
      <Route path="/signup" component={Login} />
      <Route path="/signup/" component={Login} />
      <Route path="/sign-up" component={Login} />
      <Route path="/sign-up/" component={Login} />
      <Route path="/sign_up" component={Login} />
      <Route path="/register" component={Login} />
      <Route path="/register/" component={Login} />
      <Route path="/create-account" component={Login} />
      <Route path="/create-account/" component={Login} />
      <Route path="/auth/signup" component={Login} />
      <Route path="/auth/sign-up" component={Login} />
      <Route path="/auth/register" component={Login} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/delete-data" component={DeleteData} />
      <Route path="/delete-account" component={DeleteData} />
      <Route path="/account-deletion" component={DeleteData} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const search = useSearch();
  const currentLocation = search ? `${location}?${search}` : location;
  const hideBottomNav = location.startsWith('/song/') || 
                        location.startsWith('/recognized-track/') ||
                        location.startsWith('/traditional/') ||
                        location === '/admin' ||
                        isListenModeLocation(currentLocation);

  useEffect(() => {
    const handleResume = () => {
      window.dispatchEvent(new Event("saywetin:app-resume"));
    };

    const handleFocus = () => {
      handleResume();
    };

    const handleBackground = () => {
      window.dispatchEvent(new Event("saywetin:app-background"));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleResume();
      } else {
        handleBackground();
      }
    };

    let isMounted = true;
    let appStateListener: { remove: () => Promise<void> } | null = null;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!isMounted || !Capacitor.isNativePlatform()) {
          return;
        }

        const { App: CapacitorApp } = await import("@capacitor/app");
        if (!isMounted) {
          return;
        }

        appStateListener = await CapacitorApp.addListener("appStateChange", ({ isActive }: { isActive: boolean }) => {
          if (isActive) {
            handleResume();
          } else {
            handleBackground();
          }
        });
      } catch (error) {
        console.warn("[Saywetin App] Failed to register native app lifecycle listener:", error);
      }
    })();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    handleResume();

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      if (appStateListener) {
        appStateListener.remove().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pt-[env(safe-area-inset-top)]">
      <div className={hideBottomNav ? '' : 'pb-20'}>
        <Router />
      </div>
      {!hideBottomNav && <UpdateNotification />}
      {!hideBottomNav && <BottomNav />}
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <VersionGuard>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </ThemeProvider>
      </VersionGuard>
    </QueryClientProvider>
  );
}
