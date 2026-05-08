'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function normalizeRedirectPath(value: string | null): string {
  if (!value) return '/dashboard';
  if (!value.startsWith('/')) return '/dashboard';
  if (value.startsWith('//')) return '/dashboard';
  return value;
}

function buildLoginHref(nextPath: string): string {
  return `/login?redirect=${encodeURIComponent(nextPath)}`;
}

function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => normalizeRedirectPath(searchParams.get('next')), [searchParams]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function completeSignIn() {
      try {
        const { createBrowserClient } = await import('@ftc/supabase');
        const client = createBrowserClient();

        const code = searchParams.get('code');
        if (!code) {
          throw new Error('Google sign-in could not be verified. Please start again from the login page.');
        }

        const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;

        const { data } = await client.auth.getSession();
        if (!data.session?.user) {
          throw new Error('No active session after sign-in verification.');
        }

        if (!cancelled) {
          router.replace(nextPath);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Could not complete sign-in.';
          setError(message);
        }
      }
    }

    void completeSignIn();

    return () => {
      cancelled = true;
    };
  }, [nextPath, router, searchParams]);

  if (error) {
    return (
      <section className="bg-white min-h-[70vh] flex items-center">
        <div className="max-w-tight mx-auto px-6 py-20 w-full text-center">
          <h1 className="text-h2 text-tx-heading mb-3">Could not complete login</h1>
          <p className="text-body text-tx-secondary mb-6">{error}</p>
          <a
            href={buildLoginHref(nextPath)}
            className="inline-block rounded-lg px-6 py-3 bg-brand-teal text-white font-semibold hover:bg-brand-teal/90"
          >
            Back to login
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white min-h-[70vh] flex items-center">
      <div className="max-w-tight mx-auto px-6 py-20 w-full text-center">
        <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h1 className="text-h2 text-tx-heading mb-2">Completing sign-in</h1>
        <p className="text-body text-tx-secondary">Please wait while we verify your sign-in.</p>
      </div>
    </section>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<section className="bg-white min-h-[70vh]" />}>
      <AuthCallbackClient />
    </Suspense>
  );
}