import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiUrl, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import SingleSlideWelcome from "@/components/SingleSlideWelcome";
import ConsentAgreement from "@/components/ConsentAgreement";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";

interface GuestAuthResponse {
  user?: unknown;
  sessionId?: string;
}

export default function OnboardingPage() {
  const [showWelcome, setShowWelcome] = useState(() => {
    const hasSeenIntro = localStorage.getItem("hasSeenIntro");
    const hasAcceptedConsent = localStorage.getItem("hasAcceptedConsent");
    return !hasSeenIntro || !hasAcceptedConsent;
  });
  const [showConsent, setShowConsent] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  const routePostOnboarding = useCallback((resolvedUserId?: string | null) => {
    if (resolvedUserId) {
      localStorage.setItem(`onboarding_completed_${resolvedUserId}`, "true");
    }
    const pendingCode = localStorage.getItem("pending_join_code");
    if (pendingCode) {
      setLocation(`/join/${pendingCode}`);
      return;
    }
    setLocation("/prep-chat");
  }, [setLocation]);

  const bootstrapPublicSession = useCallback(async () => {
    setBootstrapError(null);
    setIsBootstrapping(true);
    try {
      const existingSessionId = localStorage.getItem("peacepad_session_id");
      const hasAcceptedConsent = localStorage.getItem("hasAcceptedConsent") === "true";

      const response = await fetch(getApiUrl("/api/auth/guest"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          displayName: "PeacePad User",
          sessionId: existingSessionId || undefined,
          hasAcceptedConsent,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not initialize session");
      }

      const data = (await response.json()) as GuestAuthResponse;
      if (typeof data.sessionId === "string" && data.sessionId.length > 0) {
        localStorage.setItem("peacepad_session_id", data.sessionId);
      }
      if (data.user) {
        queryClient.setQueryData(["/api/auth/user"], data.user);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      const userData = queryClient.getQueryData<{ id?: string }>(["/api/auth/user"]);
      routePostOnboarding(userData?.id ?? null);
    } catch (error) {
      console.error("[Onboarding] Session bootstrap failed:", error);
      setBootstrapError("We couldn't start your session. Please try again.");
      toast({
        title: "Could not continue",
        description: "Please retry to continue to PeacePad.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsBootstrapping(false);
    }
  }, [routePostOnboarding, toast]);

  useEffect(() => {
    if (isLoading) return;

    const hasSeenIntro = localStorage.getItem("hasSeenIntro") === "true";
    const hasAcceptedConsent = localStorage.getItem("hasAcceptedConsent") === "true";
    const onboardingCompleteKey = user?.id ? `onboarding_completed_${user.id}` : null;
    const hasCompletedOnboarding = onboardingCompleteKey
      ? localStorage.getItem(onboardingCompleteKey) === "true"
      : false;

    if (user?.id && user?.displayName && hasSeenIntro && hasAcceptedConsent) {
      routePostOnboarding(user.id);
      return;
    }

    if (hasSeenIntro && hasAcceptedConsent && !user && !isBootstrapping && !bootstrapError) {
      void bootstrapPublicSession();
      return;
    }

    if (hasCompletedOnboarding && user?.id) {
      routePostOnboarding(user.id);
    }
  }, [
    bootstrapError,
    bootstrapPublicSession,
    isBootstrapping,
    isLoading,
    routePostOnboarding,
    user,
  ]);

  const handleGetStarted = () => {
    localStorage.setItem("hasSeenIntro", "true");
    setShowWelcome(false);
    setShowConsent(true);
  };

  const handleConsentAccept = async (consents: {
    privacyAccepted: boolean;
    aiMessageConsent: boolean;
    ndaAccepted: boolean;
  }) => {
    localStorage.setItem("hasAcceptedConsent", "true");
    if (consents.aiMessageConsent) {
      localStorage.setItem("aiMessageConsent", "true");
    }

    if (user) {
      try {
        await apiRequest("PATCH", "/api/user/consent", consents);
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } catch (error) {
        console.error("[Onboarding] Failed to save consent preferences:", error);
      }
      routePostOnboarding(user.id);
      return;
    }

    setShowConsent(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    void bootstrapPublicSession();
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

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6 py-10 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 space-y-4 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Preparing your PeacePad workspace</h1>
        <p className="text-sm text-muted-foreground">
          {bootstrapError ?? "Please wait while we finish setup."}
        </p>
        {bootstrapError ? (
          <Button onClick={() => void bootstrapPublicSession()} className="w-full" data-testid="button-onboarding-retry">
            Try again
          </Button>
        ) : (
          <div className="h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
            <div className="h-full w-1/2 bg-primary animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

