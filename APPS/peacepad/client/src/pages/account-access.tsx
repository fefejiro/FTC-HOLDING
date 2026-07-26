import { useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, LockKeyhole, Shell } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiUrl, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

type ReviewerSessionResponse = {
  success?: boolean;
  message?: string;
  user?: User;
  sessionId?: string;
};

export default function AccountAccessPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(getApiUrl("/api/auth/reviewer-session"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => null)) as ReviewerSessionResponse | null;

      if (!response.ok || !data?.user) {
        throw new Error(data?.message || "Account access is temporarily unavailable.");
      }

      if (data.sessionId) {
        localStorage.setItem("peacepad_session_id", data.sessionId);
      }
      localStorage.setItem("hasSeenIntro", "true");
      queryClient.setQueryData(["/api/auth/user"], data.user);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Account access is temporarily unavailable.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#120b26] px-5 py-[max(1.25rem,env(safe-area-inset-top))] text-white">
      <div
        aria-hidden="true"
        className="absolute -left-20 top-16 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 bottom-12 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur"
          data-testid="link-account-access-back"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>

        <section className="my-auto rounded-[2rem] border border-white/15 bg-white/[0.09] p-6 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-8">
          <div className="mb-7">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-400 to-violet-600 shadow-lg shadow-violet-950/40">
              <Shell className="h-7 w-7 text-white" aria-hidden="true" />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-200">
              Existing account
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-3 text-sm leading-6 text-violet-100/75">
              Enter the account credentials supplied to you. New public account registration is not
              available during this release.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="account-email" className="text-violet-50">
                Email
              </Label>
              <Input
                id="account-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                inputMode="email"
                required
                className="h-12 border-white/15 bg-black/20 text-white placeholder:text-violet-200/40"
                data-testid="input-account-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-password" className="text-violet-50">
                Password
              </Label>
              <Input
                id="account-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="h-12 border-white/15 bg-black/20 text-white"
                data-testid="input-account-password"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
                data-testid="account-access-error"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl bg-white font-semibold text-violet-800 hover:bg-violet-50"
              data-testid="button-account-access-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                <>
                  <LockKeyhole className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign in
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-violet-100/60">
            Need help accessing the supplied account?{" "}
            <Link href="/support" className="font-medium text-fuchsia-200 underline">
              Contact support
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
