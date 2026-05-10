'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

function normalizeRedirectPath(value: string | null): string {
  if (!value) return '/dashboard';
  if (!value.startsWith('/')) return '/dashboard';
  if (value.startsWith('//')) return '/dashboard';
  return value;
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = normalizeRedirectPath(searchParams.get('redirect') ?? searchParams.get('next'));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const { getSession } = await import('@ftc/auth');
        const session = await getSession();
        if (!cancelled && session?.user) {
          router.replace(redirectTo);
        }
      } catch {
        // If env is missing we keep the page usable and show the error only when auth is attempted.
      }
    }

    void checkSession();
    return () => {
      cancelled = true;
    };
  }, [redirectTo, router]);

  async function handleGoogleSignIn() {
    setLoading(true);
    setStatus('');
    setError('');

    try {
      const { signInWithGoogle } = await import('@ftc/auth');
      const callbackRedirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
      const { data, error: authError } = await signInWithGoogle(callbackRedirect);
      if (authError) {
        throw authError;
      }

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      setStatus('Redirecting to Google sign-in...');
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Unable to start Google sign-in.';
      setError(rawMessage);
      setLoading(false);
    }
  }

  return (
    <section className="bg-white min-h-[70vh] flex items-center">
      <div className="max-w-tight mx-auto px-6 py-20 w-full">
        <div className="mb-6 flex justify-center">
          <Badge variant="teal">Welcome back</Badge>
        </div>
        <h1 className="text-h2 text-tx-heading text-center mb-2">Log in to Una Labs</h1>
        <p className="text-body text-tx-secondary text-center mb-10">
          Access your Una Labs workspace with Google sign-in.
        </p>

        <div className="mb-5">
          <Button type="button" variant="primary" size="lg" className="w-full justify-center" onClick={() => void handleGoogleSignIn()} disabled={loading}>
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </Button>
        </div>

        {(error || status) && (
          <div className="mt-5">
            {error && (
              <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-body-sm text-red-700">
                {error}
              </p>
            )}
            {status && (
              <p className="rounded-lg border border-brand-teal/20 bg-brand-teal-light px-4 py-3 text-body-sm text-brand-teal">
                {status}
              </p>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-body-sm text-tx-secondary">
          New here? <a href="/start" className="text-brand-teal hover:underline">Start with the intake form</a>.
        </p>
      </div>
    </section>
  );
}
