import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api-config";

export default function Signup() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const beginSignup = async () => {
      const loginUrl = getApiUrl("/api/login");
      try {
        const statusResponse = await fetch(getApiUrl("/api/auth/status"), {
          credentials: "include",
          cache: "no-store",
        });

        if (statusResponse.ok) {
          const statusPayload = await statusResponse.json().catch(() => null);
          if (statusPayload?.loginEnabled !== true) {
            const message =
              typeof statusPayload?.message === "string" && statusPayload.message.trim().length > 0
                ? statusPayload.message
                : "Sign up is currently unavailable.";
            if (active) {
              setErrorMessage(message);
            }
            return;
          }
        } else if (statusResponse.status === 503) {
          const payload = await statusResponse.json().catch(() => null);
          const message =
            typeof payload?.message === "string" && payload.message.trim().length > 0
              ? payload.message
              : "Sign up is currently unavailable.";
          if (active) {
            setErrorMessage(message);
          }
          return;
        }
      } catch {
        // Continue with normal browser redirect.
      }

      window.location.href = loginUrl;
    };

    beginSignup();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center space-y-4 max-w-sm">
        {errorMessage ? (
          <>
            <p className="text-muted-foreground" data-testid="text-signup-disabled">{errorMessage}</p>
            <p className="text-xs text-muted-foreground">
              Configure OIDC on the server, then try again.
            </p>
            <Link href="/">
              <Button variant="outline" data-testid="button-signup-back-home">
                Back home
              </Button>
            </Link>
          </>
        ) : (
          <p className="text-muted-foreground" data-testid="text-signup-redirect">Dey take you go sign up...</p>
        )}
      </div>
    </div>
  );
}
