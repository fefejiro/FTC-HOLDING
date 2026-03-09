import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BottomNav } from "@/components/bottom-nav";
import Home from "@/pages/home";
import SongDetail from "@/pages/song-detail";
import RecognizedTrack from "@/pages/recognized-track";
import Explore from "@/pages/explore";
import Contribute from "@/pages/contribute";
import Admin from "@/pages/admin";
import Profile from "@/pages/profile";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import PrivacyPolicy from "@/pages/privacy-policy";
import DeleteData from "@/pages/delete-data";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/explore" component={Explore} />
      <Route path="/song/:id" component={RecognizedTrack} />
      <Route path="/recognized-track/:id" component={RecognizedTrack} />
      <Route path="/traditional/:id" component={SongDetail} />
      <Route path="/contribute" component={Contribute} />
      <Route path="/admin" component={Admin} />
      <Route path="/profile" component={Profile} />
      <Route path="/login" component={Login} />
      <Route path="/signin" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/sign-up" component={Signup} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/delete-data" component={DeleteData} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const hideBottomNav = location.startsWith('/song/') || 
                        location.startsWith('/recognized-track/') ||
                        location.startsWith('/traditional/') ||
                        location === '/admin';

  return (
    <div className="min-h-screen bg-background pt-[env(safe-area-inset-top)]">
      <div className={hideBottomNav ? '' : 'pb-20'}>
        <Router />
      </div>
      {!hideBottomNav && <BottomNav />}
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
