import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl, queryClient } from "@/lib/queryClient";
import { purgePeacePadBrowserCaches } from "@/lib/privacyCache";
import {
  AUTH_BOOTSTRAP_LOADER_GRACE_MS,
  clearLastAuthBootstrapIssue,
  fetchCurrentUserSnapshot,
  getLastAuthBootstrapIssue,
  type AuthBootstrapIssue,
} from "@/lib/authBootstrap";
import {
  clearSupabaseSession,
} from "@/lib/supabaseAuth";
import type { User } from "@shared/schema";

const AUTH_FETCH_THROTTLE_MS = 1500;
let inFlightSessionFetch: Promise<User | null> | null = null;
let lastSessionFetchAt = 0;
let lastSessionSnapshot: User | null = null;

export function useAuth() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [allowGuestFallback, setAllowGuestFallback] = useState(false);
  
  const { data: user, status } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const now = Date.now();

      if (inFlightSessionFetch) {
        return inFlightSessionFetch;
      }

      // Defensive dedupe: avoid storming /api/auth/user when multiple components
      // invalidate/remount in quick succession.
      if (now - lastSessionFetchAt < AUTH_FETCH_THROTTLE_MS) {
        return lastSessionSnapshot;
      }

      inFlightSessionFetch = fetchCurrentUserSnapshot("app-bootstrap")
        .then((snapshot) => {
          lastSessionSnapshot = snapshot;
          lastSessionFetchAt = Date.now();
          return snapshot;
        })
        .finally(() => {
          inFlightSessionFetch = null;
        });

      return inFlightSessionFetch;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !isLoggingOut, // Don't refetch during logout
  });

  useEffect(() => {
    if (status === "success" || status === "error" || isLoggingOut) {
      setAllowGuestFallback(false);
      return;
    }

    const timer = window.setTimeout(() => {
      console.warn("[AuthBootstrap] loader-grace-exceeded", {
        issue: getLastAuthBootstrapIssue(),
        maxLoaderMs: AUTH_BOOTSTRAP_LOADER_GRACE_MS,
      });
      setAllowGuestFallback(true);
    }, AUTH_BOOTSTRAP_LOADER_GRACE_MS);

    return () => window.clearTimeout(timer);
  }, [isLoggingOut, status]);

  const login = () => {
    // Public social sign-in is intentionally hidden for this review-recovery
    // release. The isolated account-access route is the only advertised
    // account entry until a Guideline 4.8-compliant option is ready.
    window.location.href = "/account-access";
  };

  const logout = async () => {
    // Immediately set logging out state to stop all queries
    setIsLoggingOut(true);
    
    // Cancel any in-flight queries immediately
    queryClient.cancelQueries();
    
    // Clear all query data to prevent any refetches
    queryClient.clear();
    await purgePeacePadBrowserCaches().catch(() => undefined);
    
    // Clear session-specific state. Keep the first-run welcome preference so
    // signing out does not replay an installation-level introduction.
    const keysToRemove = [
      "hasAcceptedConsent",
      "peacepad_required_consent_v2",
      "aiMessageConsent",
      "aiCallConsent",
      "peacepad_session_id",
      "pending_join_code",
      "selected_avatar_color",
      "mood_checkins_enabled",
      "theme",
      "onboarding-checklist-dismissed",
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Also remove user-specific onboarding completion flags
    if (user?.id) {
      localStorage.removeItem(`onboarding_completed_${user.id}`);
    }
    
    // Hit the server logout endpoint
    try {
      await clearSupabaseSession();
      await fetch(getApiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.log('[Logout] Server logout request failed:', e);
    }
    
    // Small delay for smoother visual transition
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Return to the public home. Returning installations skip the intro.
    window.location.href = '/';
  };

  // Keep loading state true until query status is settled (success or error)
  // This prevents the flash by ensuring we don't render unauthenticated routes
  // during the brief moment between isLoading=false and isAuthenticated being set
  const isAuthSettled = status === 'success' || status === 'error';
  const authBootstrapIssue: AuthBootstrapIssue | null =
    !isAuthSettled && allowGuestFallback
      ? {
          kind: "slow",
          message: "PeacePad is taking longer than expected to restore your session. You can keep going and retry below.",
        }
      : getLastAuthBootstrapIssue();

  const retryAuth = async () => {
    clearLastAuthBootstrapIssue();
    setAllowGuestFallback(false);
    lastSessionFetchAt = 0;
    lastSessionSnapshot = null;
    inFlightSessionFetch = null;
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    await queryClient.refetchQueries({ queryKey: ["/api/auth/user"], type: "active" });
  };

  return {
    user: user ?? undefined,
    isLoading: (!isAuthSettled && !allowGuestFallback) || isLoggingOut,
    isAuthenticated: !!user && !isLoggingOut,
    isLoggingOut,
    authBootstrapIssue,
    login,
    logout,
    retryAuth,
  };
}
