"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import getSupabase from "@/lib/supabase";
import { getAdminDashboardUrl, getPostLoginDestination } from "@/lib/authDestinations";
import { getGardenCleanersPortalUrl } from "@/lib/gardenCleaners";

type CallbackState = "loading" | "error";

function readAuthError(searchParams: URLSearchParams): string {
  const description = searchParams.get("error_description") || searchParams.get("error");
  return String(description || "").trim();
}

export default function AuthCallbackPage() {
  const [state, setState] = useState<CallbackState>("loading");
  const [message, setMessage] = useState("Finalizing your sign-in...");
  const searchParams = useSearchParams();

  useEffect(() => {
    const authError = readAuthError(new URLSearchParams(searchParams.toString()));
    if (authError) {
      setState("error");
      setMessage(authError);
      return;
    }

    let active = true;
    const supabase = getSupabase();

    const routeAuthenticatedUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      const email = data.user?.email || null;
      if (!email) {
        return false;
      }

      const destination = getPostLoginDestination(email, window.location.origin);
      window.location.replace(destination);
      return true;
    };

    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      setState("error");
      setMessage("We could not finish sign-in automatically. Use one of the links below to continue.");
    }, 8000);

    const bootstrap = async () => {
      try {
        const routed = await routeAuthenticatedUser();
        if (routed || !active) return;

        const {
          data: { subscription }
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!active || !session?.user?.email) {
            return;
          }

          const destination = getPostLoginDestination(session.user.email, window.location.origin);
          subscription.unsubscribe();
          window.clearTimeout(timeoutId);
          window.location.replace(destination);
        });
      } catch (err) {
        if (!active) return;
        setState("error");
        setMessage(err instanceof Error ? err.message : "Unable to finish sign-in.");
      }
    };

    void bootstrap();

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchParams]);

  return (
    <section className="section sunrise-section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="sunrise-section-heading">
          <p className="sunrise-kicker">Account access</p>
          <h1>{state === "loading" ? "Signing you in" : "Sign-in needs attention"}</h1>
          <p>{message}</p>
        </div>

        {state === "error" ? (
          <article className="card" style={{ padding: 24 }}>
            <div className="hero-actions">
              <Link href={getAdminDashboardUrl()} className="btn btn-primary">
                Open admin dashboard
              </Link>
              <Link href={getGardenCleanersPortalUrl()} className="btn btn-secondary">
                Open portal
              </Link>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}