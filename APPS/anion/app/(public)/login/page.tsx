'use client';

import Link from 'next/link';
import { useState } from 'react';
type State = 'idle' | 'loading' | 'sent' | 'error';

export default function LoginPage() {
  const [state, setState] = useState<State>('idle');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleMagicLinkSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('loading');
    setErrorMessage('');

    try {
      await import('../../../src/lib/auth').then((mod) => mod.sendMagicLink(email.trim()));
      setState('sent');
    } catch (err: any) {
      setState('error');
      setErrorMessage(err?.message || 'Could not send magic link.');
    }
  }

  async function handleGoogleSignIn() {
    setState('loading');
    setErrorMessage('');

    try {
      await import('../../../src/lib/auth').then((mod) => mod.signInWithGoogle());
    } catch (err: any) {
      setState('error');
      setErrorMessage(err?.message || 'Google sign-in failed.');
    }
  }

  return (
    <section
      style={{
        maxWidth: '980px',
        margin: '48px auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        alignItems: 'stretch',
      }}
    >
      <article
        className="surface"
        style={{
          padding: 'var(--spacing-8)',
          background:
            'radial-gradient(120% 140% at 12% 8%, #d9f5f3 0%, #ffffff 55%, #f2f7fb 100%)',
        }}
      >
        <p className="kicker" style={{ marginBottom: 'var(--spacing-3)' }}>
          Production Ready Learning Stack
        </p>
        <h1 className="display" style={{ fontSize: '42px', marginBottom: 'var(--spacing-4)' }}>
          Sign in and pick up your classroom in seconds.
        </h1>
        <p className="body" style={{ marginBottom: 'var(--spacing-6)', maxWidth: '56ch' }}>
          Anion gives families, tutors, and operators one reliable place for scheduling, session
          access, and lesson continuity. Your sign-in route is now locked to the callback surface
          used in production.
        </p>
        <div className="grid" style={{ gap: 'var(--spacing-3)' }}>
          <div className="badge badge-teal" style={{ width: 'fit-content' }}>
            Auth callback hardened
          </div>
          <div className="badge badge-success" style={{ width: 'fit-content' }}>
            Daily lesson access workflow
          </div>
          <div className="badge badge-warning" style={{ width: 'fit-content' }}>
            Legal review pending
          </div>
        </div>
      </article>

      <article className="surface card" style={{ padding: 'var(--spacing-8)' }}>
        <h2 className="h2" style={{ marginBottom: 'var(--spacing-2)' }}>
          Sign in to Anion
        </h2>
        <p className="body-sm secondary" style={{ marginBottom: 'var(--spacing-6)' }}>
          Use magic link or Google. Both routes return through the secure callback endpoint.
        </p>

        {state === 'sent' && (
          <p
            role="status"
            style={{
              color: 'var(--success)',
              fontSize: '14px',
              margin: '0 0 var(--spacing-4) 0',
              background: 'rgba(22, 163, 74, 0.1)',
              borderRadius: '8px',
              padding: '10px 12px',
            }}
          >
            Magic link sent. Check your inbox for {email}.
          </p>
        )}

        {state === 'error' && (
          <p
            role="alert"
            style={{
              color: 'var(--danger)',
              fontSize: '14px',
              margin: '0 0 var(--spacing-4) 0',
              background: 'rgba(185, 28, 28, 0.08)',
              borderRadius: '8px',
              padding: '10px 12px',
            }}
          >
            {errorMessage}
          </p>
        )}

        <form onSubmit={handleMagicLinkSubmit} style={{ marginBottom: 'var(--spacing-4)' }}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@school.com"
            required
            disabled={state === 'loading'}
            style={{ marginBottom: 'var(--spacing-3)' }}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%' }}
            disabled={state === 'loading'}
          >
            {state === 'loading' ? 'Sending...' : 'Send magic link'}
          </button>
        </form>

        <button
          type="button"
          className="btn-secondary"
          style={{ width: '100%', marginBottom: 'var(--spacing-5)' }}
          onClick={handleGoogleSignIn}
          disabled={state === 'loading'}
        >
          Continue with Google
        </button>

        <p className="body-sm secondary" style={{ textAlign: 'center', margin: 0 }}>
          <Link href="/" style={{ color: 'var(--brand-teal)', fontWeight: '600' }}>
            Back to home
          </Link>
        </p>
      </article>
    </section>
  );
}
