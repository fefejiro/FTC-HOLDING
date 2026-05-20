'use client';

import Link from 'next/link';
import { useState } from 'react';



export default function LoginPage() {
  const [state, setState] = useState<State>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleGoogleSignIn() {
    setState('loading');
    setErrorMessage('');
    try {
      await import('../../../src/lib/auth').then(mod => mod.signInWithGoogle());
    } catch (err: any) {
      setState('error');
      setErrorMessage(err?.message || 'Google sign-in failed.');
    }
  }
    type State = 'idle' | 'loading' | 'error';

  return (
    <div style={{ maxWidth: '400px', margin: '64px auto' }}>
      <div className="surface card" style={{ padding: 'var(--spacing-8)' }}>
        <h1 className="h2" style={{ marginBottom: 'var(--spacing-2)' }}>Sign in to Anion</h1>
        <p className="body-sm secondary" style={{ marginBottom: 'var(--spacing-6)' }}>
          Sign in with your Google account to access Anion. Only Anion accounts are supported.
        </p>

        {state === 'error' && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: '14px', margin: '0 0 var(--spacing-4) 0' }}>
            ✕ {errorMessage}
          </p>
        )}

        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%', marginBottom: 'var(--spacing-4)' }}
          onClick={handleGoogleSignIn}
          disabled={state === 'loading'}
        >
          {state === 'loading' ? 'Redirecting…' : 'Sign in with Google'}
        </button>

        <p className="body-sm secondary" style={{ marginTop: 'var(--spacing-6)', textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--brand-teal)', fontWeight: '500' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
