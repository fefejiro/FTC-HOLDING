import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginClient } from '@/app/login/LoginClient';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Log in to Una Labs using Supabase-backed client authentication.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-white" />}>
      <LoginClient />
    </Suspense>
  );
}
