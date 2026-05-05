'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    // Only redirect from non-dashboard pages — dashboard handles the token itself
    if (hash.includes('access_token=') && !window.location.pathname.startsWith('/dashboard')) {
      router.replace('/dashboard');
    }
  }, [router]);

  return null;
}
