import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import {
  consumeAuthRedirectPath,
  exchangeSupabaseTokenForApiSession,
  finalizeSupabaseCallback,
} from "@/lib/supabaseAuth";

type CallbackMode = "web" | "mobile";

function AuthCallbackView({ mode }: { mode: CallbackMode }) {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const completeAuth = async () => {
      try {
        const session = await finalizeSupabaseCallback();
        await exchangeSupabaseTokenForApiSession(session.access_token);
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });

        if (!cancelled) {
          const destination = consumeAuthRedirectPath("/");
          setLocation(destination);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Authentication failed.";
        console.error(`[Auth] ${mode} callback failed:`, message);
        if (!cancelled) {
          setError("Sign-in could not be completed. Please try again.");
        }
      }
    };

    completeAuth();

    return () => {
      cancelled = true;
    };
  }, [mode, setLocation]);

  if (!error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-base font-medium">Completing sign-in...</p>
          <p className="text-sm text-muted-foreground">Please wait while we finalize your session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-base font-medium">Authentication issue</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => setLocation("/")} data-testid={`button-auth-retry-${mode}`}>
          Return Home
        </Button>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return <AuthCallbackView mode="web" />;
}

export function MobileAuthCallbackPage() {
  return <AuthCallbackView mode="mobile" />;
}
