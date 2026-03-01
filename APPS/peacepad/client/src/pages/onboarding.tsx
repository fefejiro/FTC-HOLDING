import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import SingleSlideWelcome from "@/components/SingleSlideWelcome";
import ConsentAgreement from "@/components/ConsentAgreement";
import GuestEntry from "@/components/GuestEntry";
import { SEOHead } from "@/components/SEOHead";

export default function OnboardingPage() {
  const [showWelcome, setShowWelcome] = useState(() => {
    const hasSeenIntro = localStorage.getItem("hasSeenIntro");
    const hasAcceptedConsent = localStorage.getItem("hasAcceptedConsent");
    return !hasSeenIntro || !hasAcceptedConsent;
  });
  const [showConsent, setShowConsent] = useState(false);
  const [showGuestEntry, setShowGuestEntry] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const pendingCode = localStorage.getItem("pending_join_code");
    const hasSeenIntro = localStorage.getItem("hasSeenIntro");
    const hasAcceptedConsent = localStorage.getItem("hasAcceptedConsent");
    const userCompletedOnboardingKey = user?.id ? `onboarding_completed_${user.id}` : null;
    const hasCompletedOnboarding = userCompletedOnboardingKey ? localStorage.getItem(userCompletedOnboardingKey) : null;
    
    console.log("[Onboarding] Auth loaded - User:", user?.id, "Pending code:", pendingCode, "Completed:", hasCompletedOnboarding);
    
    if (user && pendingCode && hasSeenIntro && hasAcceptedConsent) {
      console.log("[Onboarding] User with pending join code, redirecting to /join/" + pendingCode);
      setLocation(`/join/${pendingCode}`);
      return;
    }
    
    if (hasCompletedOnboarding && user?.displayName) {
      console.log("[Onboarding] User already completed onboarding, redirecting to /prep-chat");
      setLocation("/prep-chat");
      return;
    }
  }, [user, isLoading, setLocation]);

  const handleGetStarted = () => {
    console.log("[Onboarding] User clicked Start Your First Conversation");
    localStorage.setItem("hasSeenIntro", "true");
    setShowWelcome(false);
    setShowConsent(true);
  };

  const handleConsentAccept = async (consents: {
    privacyAccepted: boolean;
    aiMessageConsent: boolean;
    ndaAccepted: boolean;
  }) => {
    console.log("[Onboarding] Consent accepted with values:", consents);
    localStorage.setItem("hasAcceptedConsent", "true");
    
    // Also store individual consent values for later sync if needed
    if (consents.aiMessageConsent) localStorage.setItem("aiMessageConsent", "true");
    
    // Save consent preferences to database if user is authenticated
    // This also sets termsAcceptedAt so the Terms modal won't appear post-onboarding
    if (user) {
      try {
        await apiRequest("PATCH", "/api/user/consent", consents);
        console.log("[Onboarding] Consent preferences saved to database (termsAcceptedAt set)");
        // Refresh user data to get updated termsAcceptedAt
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } catch (error) {
        console.error("[Onboarding] Failed to save consent preferences:", error);
        // Continue anyway - App.tsx will sync consent later
      }
    }
    
    setShowConsent(false);
    
    // Scroll to top when transitioning from consent to onboarding
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Check if user is authenticated - if not, show guest entry
    const pendingCode = localStorage.getItem("pending_join_code");
    if (!user && pendingCode) {
      console.log("[Onboarding] User not authenticated with pending join code - showing guest entry");
      setShowGuestEntry(true);
    }
    // Otherwise, the component will show welcome screen (after re-render with updated user state)
  };

  const handleGuestAuthenticated = async () => {
    console.log("[Onboarding] Guest authenticated, redirecting to Practice Chat");
    setShowGuestEntry(false);
    
    // Refresh user data and redirect directly to Practice Chat
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    
    // Mark onboarding complete and go directly to Practice Chat
    const userData = queryClient.getQueryData<{ id?: string; displayName?: string }>(["/api/auth/user"]);
    if (userData?.id) {
      localStorage.setItem(`onboarding_completed_${userData.id}`, "true");
    }
    
    setLocation("/prep-chat");
  };

  const completeOnboarding = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    
    // Check if there's a pending join code - redirect to join partnership
    const pendingCode = localStorage.getItem("pending_join_code");
    console.log("[Onboarding] Complete. Pending code:", pendingCode);
    
    if (pendingCode) {
      console.log("[Onboarding] Redirecting to join partnership:", pendingCode);
      // Don't clear pending_join_code - let join-partnership page handle cleanup
      setLocation(`/join/${pendingCode}`);
    } else {
      // Mark onboarding as complete ONLY after confirming displayName exists
      if (user?.id && user?.displayName) {
        localStorage.setItem(`onboarding_completed_${user.id}`, "true");
      } else {
        console.error("[Onboarding] Cannot complete - missing user ID or displayName");
        toast({
          title: "Error",
          description: "Please complete your profile first",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }
      
      toast({
        title: "Welcome to PeacePad!",
        description: "Let's get started with clear, organized communication",
        duration: 4000,
      });
      
      setLocation("/chat");
    }
  };

  if (showWelcome) {
    return (
      <>
        <SEOHead title="Welcome" description="Parent together with clarity, calm, and confidence" noindex />
        <SingleSlideWelcome onGetStarted={handleGetStarted} />
      </>
    );
  }

  if (showConsent) {
    return <ConsentAgreement onAccept={handleConsentAccept} />;
  }

  // After consent, if no user yet, show guest entry
  if (!user) {
    console.log("[Onboarding] No user, showing GuestEntry");
    return <GuestEntry onAuthenticated={handleGuestAuthenticated} />;
  }

  // User exists but missing displayName - need to complete profile
  if (!user.displayName) {
    console.log("[Onboarding] User missing displayName, showing GuestEntry");
    return <GuestEntry onAuthenticated={handleGuestAuthenticated} />;
  }

  // User is fully set up - mark complete and redirect
  // This handles edge case where user returns to /onboarding after completing
  if (user.id && user.displayName) {
    localStorage.setItem(`onboarding_completed_${user.id}`, "true");
    setLocation("/prep-chat");
    return null;
  }

  return null;
}
