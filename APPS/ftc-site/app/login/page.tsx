"use client";

import Link from "next/link";
import { useState } from "react";
import getSupabase from "../../lib/supabase";
import { isGardenPortalAuthConfigured } from "../../lib/gardenPortalAuth";

export default function LoginPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>("");
  const isAuthConfigured = isGardenPortalAuthConfigured();

  async function handleGoogleSignIn() {
    if (!isAuthConfigured || pending) return;

    setPending(true);
    setError("");

    try {
      const supabase = getSupabase();
      const redirectTo = `${window.location.origin}/garden-cleaners/portal`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Unable to start Google sign-in.");
    }
  }

  return (
    <section className="section sunrise-section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="sunrise-section-heading">
          <p className="sunrise-kicker">Account access</p>
          <h1>Login</h1>
          <p>
            Sign in with Google to access your portal workspace. If your account has
            already been invited, you will land in the portal after authentication.
          </p>
        </div>

        <article className="card" style={{ padding: 24 }}>
          {isAuthConfigured ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGoogleSignIn}
                disabled={pending}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {pending ? "Redirecting to Google..." : "Continue with Google"}
              </button>
              <p className="muted" style={{ marginTop: 12 }}>
                You will be redirected to Google and returned to your portal session.
              </p>
            </>
          ) : (
            <>
              <p className="muted" style={{ marginTop: 0 }}>
                Login is temporarily unavailable because authentication is not configured
                in this environment.
              </p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <Link href="/connect" className="btn btn-primary">
                  Contact support
                </Link>
                <Link href="/garden-cleaners/portal" className="btn btn-secondary">
                  Open portal page
                </Link>
              </div>
            </>
          )}

          {error ? (
            <p role="alert" style={{ marginTop: 12, color: "#b42318" }}>
              {error}
            </p>
          ) : null}
        </article>
      </div>
    </section>
  );
}
