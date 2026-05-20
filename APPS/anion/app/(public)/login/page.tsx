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
      <div style={{ maxWidth: '400px', margin: '64px auto' }}>
        <div className="surface card" style={{ padding: 'var(--spacing-8)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-6)' }}>✓</div>
          <h1 className="h2" style={{ marginBottom: 'var(--spacing-2)' }}>Check your inbox</h1>
          <p className="body secondary" style={{ marginBottom: 'var(--spacing-6)' }}>We sent a magic link to <strong style={{ color: 'var(--text-heading)' }}>{email}</strong>.</p>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => { setState('idle'); setEmail(''); }}
            style={{ marginTop: 'var(--spacing-4)', width: '100%' }}
          >
            Try another email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '64px auto' }}>
      <div className="surface card" style={{ padding: 'var(--spacing-8)' }}>
        <h1 className="h2" style={{ marginBottom: 'var(--spacing-2)' }}>Sign in to Anion</h1>
        <p className="body-sm secondary" style={{ marginBottom: 'var(--spacing-6)' }}>
          Enter your email and we&apos;ll send a magic link—no password needed.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <label htmlFor="email" style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-heading)' }}>
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
          />

          {state === 'error' && (
            <p role="alert" style={{ color: 'var(--danger)', fontSize: '14px', margin: '0' }}>
              ✕ {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={state === 'loading' || !email.trim()}
            className="btn-primary"
            style={{ width: '100%', marginTop: 'var(--spacing-2)' }}
          >
            {state === 'loading' ? 'Sending…' : 'Send magic link'}
          </button>
        </form>

        <p className="body-sm secondary" style={{ marginTop: 'var(--spacing-6)', textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--brand-teal)', fontWeight: '500' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
