'use client';

import { useEffect, useState } from 'react';
import { hasAdminAccess } from '@/lib/auth-guards';

export default function StatusPage() {
  const [message, setMessage] = useState('Verifying session...');

  useEffect(() => {
    let cancelled = false;

    async function gateStatusRoute() {
      try {
        const { getSession } = await import('@ftc/auth');
        const session = await getSession();

        if (!session?.user) {
          window.location.href = '/login?redirect=/admin/status';
          return;
        }

        if (!hasAdminAccess(session)) {
          if (!cancelled) {
            setMessage('Access denied. This status board is admin-only.');
          }
          return;
        }

        window.location.href = '/admin/status';
      } catch {
        if (!cancelled) {
          setMessage('Could not verify session. Please sign in again.');
        }
      }
    }

    void gateStatusRoute();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <p className="text-sm text-slate-600 text-center">{message}</p>
    </section>
  );
}
