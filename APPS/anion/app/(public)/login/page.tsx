'use client';

import Link from 'next/link';
import { useState } from 'react';
import { sendMagicLink } from '../../../src/lib/auth';

type State = 'idle' | 'loading' | 'sent' | 'error';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setState('loading');
    setErrorMessage('');

    const result = await sendMagicLink(email.trim().toLowerCase());

    if (result?.error) {
      setState('error');
      setErrorMessage(result.error.message ?? 'Something went wrong. Please try again.');
    } else {
      setState('sent');
    }
  }

  if (state === 'sent') {
    return (
      <section className="surface card" style={{ maxWidth: 400, margin: '4rem auto', textAlign: 'center' }}>
        <h1>Check your inbox</h1>
        <p>We sent a magic link to <strong>{email}</strong>.</p>
        <p className="muted">Click the link in the email to sign in. You can close this tab.</p>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => { setState('idle'); setEmail(''); }}
          style={{ marginTop: '1rem' }}
        >
          Use a different email
        </button>
      </section>
    );
  }

  return (
    <section className="surface card" style={{ maxWidth: 400, margin: '4rem auto' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Sign in</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Enter your email and we&apos;ll send a magic link — no password needed.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label htmlFor="email" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={state === 'loading'}
          autoComplete="email"
          style={{ padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '1rem' }}
        />

        {state === 'error' && (
          <p role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={state === 'loading' || !email.trim()}
          style={{ marginTop: '0.25rem' }}
        >
          {state === 'loading' ? 'Sending…' : 'Send magic link'}
        </button>
      </form>

      <p className="muted" style={{ marginTop: '1.25rem', fontSize: '0.875rem', textAlign: 'center' }}>
        <Link href="/">Back to home</Link>
      </p>
    </section>
  );
}
