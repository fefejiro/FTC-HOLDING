'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type Mode = 'magic-link' | 'password';

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [mode, setMode] = useState<Mode>('magic-link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus('');
    setError('');

    try {
      if (mode === 'magic-link') {
        const { signInWithOtpEmail } = await import('@ftc/auth');
        const { error: authError } = await signInWithOtpEmail(email);
        if (authError) {
          throw authError;
        }
        setStatus(`Magic link sent to ${email}. Open it from the same browser session when possible.`);
      } else {
        const { signInWithPassword } = await import('@ftc/auth');
        const { error: authError } = await signInWithPassword(email, password);
        if (authError) {
          throw authError;
        }
        router.replace(redirectTo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start sign-in.');
    } finally {
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
          This route is now wired for client-side Supabase auth. If you do not have an account yet,
          start with the live intake flow first.
        </p>

        <div className="mb-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => setMode('magic-link')}
            className={[
              'rounded-full px-4 py-2 text-body-sm font-semibold transition-colors',
              mode === 'magic-link'
                ? 'bg-brand-teal text-white'
                : 'bg-bg-offwhite text-tx-secondary hover:text-tx-heading',
            ].join(' ')}
          >
            Magic link
          </button>
          <button
            type="button"
            onClick={() => setMode('password')}
            className={[
              'rounded-full px-4 py-2 text-body-sm font-semibold transition-colors',
              mode === 'password'
                ? 'bg-brand-teal text-white'
                : 'bg-bg-offwhite text-tx-secondary hover:text-tx-heading',
            ].join(' ')}
          >
            Password
          </button>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email" className="block text-body font-medium text-tx-heading mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus"
            />
          </div>

          {mode === 'password' && (
            <div>
              <label htmlFor="login-password" className="block text-body font-medium text-tx-heading mb-1">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus"
              />
            </div>
          )}

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

          <Button type="submit" variant="primary" size="lg" className="w-full justify-center" disabled={loading}>
            {loading ? 'Working…' : mode === 'magic-link' ? 'Send magic link' : 'Log in'}
          </Button>

          <p className="text-center text-body-sm text-tx-secondary">
            Need an account? <a href="/start" className="text-brand-teal hover:underline">Start with the live intake flow</a>.
          </p>
        </form>
      </div>
    </section>
  );
}
