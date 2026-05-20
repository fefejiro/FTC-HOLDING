import type { Metadata } from "next";
import { Suspense } from "react";
import AuthCallbackClient from "./AuthCallbackClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Completing sign-in",
  description: "Please wait while we finish your secure session.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Completing sign-in",
    description: "Please wait while we finish your secure session.",
    siteName: "Account access",
  },
  twitter: {
    title: "Completing sign-in",
    description: "Please wait while we finish your secure session.",
  },
};

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
          <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8">
            <h1 className="mt-4 text-3xl font-semibold">
              Completing sign-in
            </h1>
            <p className="mt-3 text-white/70">
              Please wait while we finish your secure session.
            </p>
          </section>
        </main>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}