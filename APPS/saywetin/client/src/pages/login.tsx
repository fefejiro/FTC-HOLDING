import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api-config";

export default function Login() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const beginLogin = async () => {
      const loginUrl = getApiUrl("/api/login");
      try {
        const response = await fetch(loginUrl, {
          credentials: "include",
          redirect: "manual",
        });

        if (response.status === 503) {
          const payload = await response.json().catch(() => null);
          const message =
            typeof payload?.message === "string" && payload.message.trim().length > 0
              ? payload.message
              : "Sign in is currently unavailable.";
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

    beginLogin();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center space-y-4 max-w-sm">
        {errorMessage ? (
          <>
            <p className="text-muted-foreground" data-testid="text-login-disabled">{errorMessage}</p>
            <p className="text-xs text-muted-foreground">
              Configure OIDC on the server, then try again.
            </p>
            <Link href="/">
              <Button variant="outline" data-testid="button-login-back-home">
                Back home
              </Button>
            </Link>
          </>
        ) : (
          <p className="text-muted-foreground" data-testid="text-login-redirect">Dey take you go login...</p>
        )}
      </div>
    </div>
  );
}
