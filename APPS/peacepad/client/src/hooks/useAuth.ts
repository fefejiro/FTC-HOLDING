import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { getApiUrl, queryClient } from "@/lib/queryClient";
import {
  clearSupabaseSession,
  hasSupabaseAuthConfig,
  rememberAuthRedirectState,
  startGoogleOAuthSignIn,
} from "@/lib/supabaseAuth";
import type { User } from "@shared/schema";

export function useAuth() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const { data: user, isLoading, isFetching, status } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      console.log('[Auth] Fetching user session...');
      const res = await fetch(getApiUrl("/api/auth/user"), {
        credentials: "include",
      });
      
      if (res.status === 401) {
        console.log('[Auth] No active session (401)');
        return null;
      }
      
      if (!res.ok) {
        console.log('[Auth] Session fetch failed:', res.status);
        return null;
      }

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        // Prevent hard failures/loops when a misrouted API call returns HTML.
        console.error("[Auth] Unexpected non-JSON session response", {
          status: res.status,
          contentType,
          url: res.url,
        });
        return null;
      }
      
      const userData = await res.json();
      console.log('[Auth] Session restored for user:', userData.id);
      return userData;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !isLoggingOut, // Don't refetch during logout
  });

  const login = () => {
    const isNative = Capacitor.isNativePlatform();
    console.log('[Auth] Login initiated - isNative:', isNative);
    
    rememberAuthRedirectState(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );

    if (hasSupabaseAuthConfig()) {
      startGoogleOAuthSignIn().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[Auth] Supabase OAuth start failed, falling back:", message);
        window.location.href = isNative ? getApiUrl("/api/login/mobile") : getApiUrl("/api/login");
      });
      return;
    }

    // Fallback to existing server login endpoints if Supabase env is missing.
    window.location.href = isNative ? getApiUrl("/api/login/mobile") : getApiUrl("/api/login");
  };

  const logout = async () => {
    // Immediately set logging out state to stop all queries
    setIsLoggingOut(true);
    
    // Cancel any in-flight queries immediately
    queryClient.cancelQueries();
    
    // Clear all query data to prevent any refetches
    queryClient.clear();
    
    // Clear all local storage for a completely fresh start
    const keysToRemove = [
      "hasSeenIntro",
      "hasAcceptedConsent",
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
    
    // Redirect to onboarding for a fresh start
    window.location.href = '/onboarding';
  };

  // Keep loading state true until query status is settled (success or error)
  // This prevents the flash by ensuring we don't render unauthenticated routes
  // during the brief moment between isLoading=false and isAuthenticated being set
  const isAuthSettled = status === 'success' || status === 'error';

  return {
    user: user ?? undefined,
    isLoading: !isAuthSettled || isLoggingOut,
    isAuthenticated: !!user && !isLoggingOut,
    isLoggingOut,
    login,
    logout,
  };
}
