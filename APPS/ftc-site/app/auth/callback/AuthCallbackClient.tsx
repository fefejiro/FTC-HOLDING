"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import getSupabase from "@/lib/supabase";
import { getAdminDashboardUrl, getPostLoginDestination } from "@/lib/authDestinations";
import { resolveProductContext } from "@/lib/productAuth";

type CallbackState = "loading" | "error";

function readAuthError(searchParams: URLSearchParams): string {
  const description = searchParams.get("error_description") || searchParams.get("error");
  return String(description || "").trim();
}

export default function AuthCallbackClient() {
  const [state, setState] = useState<CallbackState>("loading");
  const [message, setMessage] = useState("Finalizing your sign-in...");
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) {
      return;
    }
    hasProcessedRef.current = true;

    const query = new URLSearchParams(queryString);
    const productHint = query.get("product");
    const returnTo = query.get("returnTo");
    const activeProduct = resolveProductContext({
      host: window.location.host,
      pathname: window.location.pathname,
      search: window.location.search,
      productHint,
      returnTo
    });
    const authError = readAuthError(query);
    if (authError) {
      setState("error");
      setMessage(authError);
      return;
    }

    let active = true;

    const finalizeSession = async (authClient: any) => {
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const typeParam = query.get("type") ?? "magiclink";

      if (code) {
        const { error: exchangeError } = await authClient.exchangeCodeForSession(code);
        if (exchangeError) {
          throw exchangeError;
        }
        return;
      }

      if (tokenHash) {
        const { error: verifyError } = await authClient.verifyOtp({
          token_hash: tokenHash,
          type: typeParam
        });
        if (verifyError) {
          throw verifyError;
        }
        return;
      }

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: setSessionError } = await authClient.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (setSessionError) {
          throw setSessionError;
        }
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    };

    const routeAuthenticatedUser = async (authClient: any) => {
      const { data, error } = await authClient.getUser();

      if (error) {
        throw error;
      }

      const email = data.user?.email || null;
      if (!email) {
        return false;
      }

      const destination = getPostLoginDestination(email, window.location.origin, {
        pathname: window.location.pathname,
        search: window.location.search,
        productHint: activeProduct,
        returnTo
      });
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
        const supabase = getSupabase();
        const authClient = supabase.auth as any;

        await finalizeSession(authClient);
        const routed = await routeAuthenticatedUser(authClient);
        if (routed || !active) return;

        const {
          data: { subscription }
        } = authClient.onAuthStateChange(async (_event: string, session: { user?: { email?: string } } | null) => {
          if (!active || !session?.user?.email) {
            return;
          }

          const destination = getPostLoginDestination(session.user.email, window.location.origin, {
            pathname: window.location.pathname,
            search: window.location.search,
            productHint: activeProduct,
            returnTo
          });
          subscription.unsubscribe();
          window.clearTimeout(timeoutId);
          window.location.replace(destination);
        });
      } catch (err) {
        if (!active) return;
        setState("error");
        const baseMessage = err instanceof Error ? err.message : "Unable to finish sign-in.";
        if (/Public Supabase (URL|anon key) is required/i.test(baseMessage)) {
          setMessage("Portal sign-in is not configured for this deployment yet. Please contact support or return to the portal.");
          return;
        }
        setMessage(baseMessage);
      }
    };

    void bootstrap();

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [queryString]);

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
              <Link
                href={getAdminDashboardUrl(
                  resolveProductContext({
                    host: typeof window !== "undefined" ? window.location.host : "",
                    pathname: "/auth/callback",
                    search: typeof window !== "undefined" ? window.location.search : "",
                    productHint: searchParams.get("product"),
                    returnTo: searchParams.get("returnTo")
                  }),
                  typeof window !== "undefined" ? window.location.origin : undefined
                )}
                className="btn btn-primary"
              >
                Open admin dashboard
              </Link>
              <Link
                href={getPostLoginDestination(null, typeof window !== "undefined" ? window.location.origin : "", {
                  pathname: "/auth/callback",
                  search: typeof window !== "undefined" ? window.location.search : "",
                  productHint: searchParams.get("product"),
                  returnTo: searchParams.get("returnTo")
                })}
                className="btn btn-secondary"
              >
                Open workspace
              </Link>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}