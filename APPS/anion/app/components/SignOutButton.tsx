'use client';

import { useState } from 'react';
import { logout } from '@/src/lib/auth';

export default function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await logout();
    window.location.href = '/login';
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleSignOut();
      }}
      disabled={isSigningOut}
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        background: 'white',
        color: 'var(--text-secondary)',
        cursor: isSigningOut ? 'default' : 'pointer',
        fontSize: '14px',
        fontWeight: 600,
        padding: '8px 12px',
      }}
    >
      {isSigningOut ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
