import { Suspense } from "react";
import AuthCallbackClient from "./AuthCallbackClient";

export const dynamic = "force-static";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
          <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">
              Garden Cleaners
            </p>
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