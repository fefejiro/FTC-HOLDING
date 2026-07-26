import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, CheckCircle } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { trackEvent } from "@/lib/analytics";

export default function JoinPartnershipPage() {
  const { code } = useParams<{ code: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const joinPartnershipMutation = useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await apiRequest("POST", "/api/partnerships/join", {
        inviteCode: inviteCode.toUpperCase(),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to join partnership");
      }

      return await res.json();
    },
    onSuccess: () => {
      trackEvent("invite_accepted", {
        time_to_accept: null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/partnerships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Clean up localStorage after successful join
      localStorage.removeItem("pending_join_code");
      localStorage.removeItem("onboarding_current_step");
      localStorage.removeItem("onboarding_completed_step2");
      // Mark onboarding as completed for this user
      if (user?.id) {
        localStorage.setItem(`onboarding_completed_${user.id}`, "true");
      }
      
      // Mark chat tutorial as seen - no friction welcome flow
      localStorage.setItem("peacepad_chat_tutorial_seen", "true");
      
      toast({
        title: "Partnership created!",
        description: "You're now connected with your co-parent",
        duration: 3000,
      });
      // Redirect to chat after successful join
      window.location.href = "/chat";
    },
    onError: (error: any) => {
      // CRITICAL: Clear pending_join_code on error to prevent infinite redirect loop
      localStorage.removeItem("pending_join_code");
      
      // Check if this is the "already partnered" case
      const isAlreadyPartnered = error.message?.includes("Partnership already exists") || 
                                 error.message?.includes("already partnered");
      
      // Check if this is an expired code case
      const isExpired = error.message?.includes("expired") || 
                       error.message?.includes("Please ask for a new one");
      
      if (isExpired) {
        // Friendly message for expired invite code
        toast({
          title: "Invite code expired",
          description: "This link has expired (14 days old). Please ask for a new invite link.",
          variant: "destructive",
          duration: 6000,
        });
      } else if (isAlreadyPartnered) {
        // Friendly message for existing partnership
        toast({
          title: "You're already connected!",
          description: "This partnership already exists. Redirecting to chat...",
          duration: 3000,
        });
        
        // Invalidate user query to refresh activePartnershipId
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/partnerships"] });
        
        // Clean up localStorage like successful join
        localStorage.removeItem("onboarding_current_step");
        localStorage.removeItem("onboarding_completed_step2");
        if (user?.id) {
          localStorage.setItem(`onboarding_completed_${user.id}`, "true");
        }
        
        // Redirect to chat
        setTimeout(() => {
          setLocation("/chat");
        }, 1500);
      } else {
        // Generic error for other cases
        const message = error.message || "Failed to join partnership. The code may be invalid or expired.";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
          duration: 5000,
        });
      }
    },
  });

  useEffect(() => {
    // If not authenticated, store the code and redirect to onboarding
    if (!authLoading && !isAuthenticated && code) {
      localStorage.setItem("pending_join_code", code);
      console.log("[JoinPartnership] 🔄 Redirecting to /onboarding for OAuth...");
      setLocation("/onboarding");
      return;
    }

    // If authenticated and have a code, auto-join
    if (isAuthenticated && code && !joinPartnershipMutation.isPending && !joinPartnershipMutation.isSuccess) {
      console.log("[JoinPartnership] ✅ User is authenticated!");
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        joinPartnershipMutation.mutate(code);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, authLoading, code]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!code) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h2 className="text-2xl font-bold">Invalid Link</h2>
            <CardDescription>No invite code found in the link</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead title="Join Partnership" description="Join your co-parenting partnership" noindex />
      <div className="flex items-center justify-center min-h-[100dvh] p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {joinPartnershipMutation.isSuccess ? (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">Partnership Created!</h2>
              <CardDescription>Redirecting you to PeacePad...</CardDescription>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                {joinPartnershipMutation.isPending ? (
                  <Loader2 className="h-16 w-16 animate-spin text-primary" />
                ) : (
                  <UserPlus className="h-16 w-16 text-primary" />
                )}
              </div>
              <h2 className="text-2xl font-bold">
                {joinPartnershipMutation.isPending ? "Connecting..." : "Join Co-Parent"}
              </h2>
              <CardDescription>
                {joinPartnershipMutation.isPending 
                  ? "Creating your partnership..." 
                  : `Using invite code: ${code}`}
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        {!joinPartnershipMutation.isPending && !joinPartnershipMutation.isSuccess && (
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">Invite Code</p>
              <p className="text-2xl font-mono font-bold tracking-widest">{code}</p>
            </div>
            
            {joinPartnershipMutation.isError && (
              <div className="space-y-3">
                <Button 
                  onClick={() => joinPartnershipMutation.mutate(code)} 
                  className="w-full"
                  disabled={joinPartnershipMutation.isPending}
                >
                  Try Again
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/")} 
                  className="w-full"
                >
                  Go to Home
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
    </>
  );
}
