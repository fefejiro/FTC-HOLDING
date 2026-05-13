"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import getSupabase from "../../lib/supabase";
import { getAdminDashboardUrl } from "../../lib/authDestinations";
import { buildProductCallbackUrl, resolveProductContext } from "../../lib/productAuth";
import { isGardenPortalAuthConfigured } from "../../lib/gardenPortalAuth";

export default function LoginPage() {
  const pathname = usePathname();
  const [runtimeHost, setRuntimeHost] = useState("");
  const [runtimeSearch, setRuntimeSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>("");
  const isAuthConfigured = isGardenPortalAuthConfigured();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setRuntimeHost(window.location.host);
    setRuntimeSearch(window.location.search);
  }, []);

  async function handleGoogleSignIn() {
    if (!isAuthConfigured || pending) return;

    setPending(true);
    setError("");

    try {
      const supabase = getSupabase();
      const product = resolveProductContext({
        host: window.location.host,
        pathname: pathname || window.location.pathname,
        search: window.location.search
      });
      const returnTo = product === "garden" ? "/garden-cleaners/portal" : "/products";
      const redirectTo = buildProductCallbackUrl({
        origin: window.location.origin,
        product,
        returnTo
      });
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

  const productContext = resolveProductContext({
    host: runtimeHost,
    pathname: pathname || "/login",
    search: runtimeSearch
  });
  const isGardenContext = productContext === "garden";
  const brandName = isGardenContext ? "Garden Cleaners" : "Una Labs";

  return (
    <section className="section sunrise-section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="sunrise-section-heading">
          <p className="sunrise-kicker">Account access</p>
          <h1>{brandName} login</h1>
          <p>
            Sign in with Google to access your workspace. Access routing is product-scoped,
            so users land in the correct {isGardenContext ? "Garden portal" : "Una dashboard"}
            based on product context and role.
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
                You will be redirected to Google and then sent to the correct workspace
                for your account.
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
                <Link href={getAdminDashboardUrl(productContext, typeof window !== "undefined" ? window.location.origin : undefined)} className="btn btn-secondary">
                  Open admin dashboard
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
