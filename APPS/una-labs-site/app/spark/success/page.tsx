'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getStripeApiUrl } from '@/lib/stripe-config';

const SPARK_STORAGE_KEY = 'una_spark_pass_session_id';
const SPARK_TURN_KEY = 'una_spark_turn_number';

function savePass(sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SPARK_STORAGE_KEY, sessionId);
    window.localStorage.setItem(SPARK_TURN_KEY, '1');
  } catch {
    // ignore
  }
}

type VerifyState = 'loading' | 'success' | 'error';

function SparkSuccessInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') ?? '';
  const [state, setState] = useState<VerifyState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [maxTurns, setMaxTurns] = useState(20);

  useEffect(() => {
    if (!sessionId) {
      setState('error');
      setErrorMsg('No session ID found. If you completed a payment, please contact support.');
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch(
          getStripeApiUrl(`/api/spark/verify-pass?session_id=${encodeURIComponent(sessionId)}`),
        );
        const data = await res.json() as {
          ok?: boolean;
          error?: string;
          max_turns?: number;
        };

        if (cancelled) return;

        if (res.ok && data.ok) {
          savePass(sessionId);
          if (typeof data.max_turns === 'number') setMaxTurns(data.max_turns);
          setState('success');
        } else {
          setState('error');
          setErrorMsg(data.error ?? 'Could not verify your Spark pass. If you paid, contact support.');
        }
      } catch {
        if (!cancelled) {
          setState('error');
          setErrorMsg('Network error while verifying your pass. Please try refreshing.');
        }
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (state === 'loading') {
    return (
      <div className="text-center">
        <p className="text-[13px] text-tx-secondary animate-pulse">Verifying your Spark pass…</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="text-center max-w-sm mx-auto">
        <p className="text-xl mb-4">⚠️</p>
        <h1 className="text-display-sm text-tx-heading font-bold mb-3">Verification issue</h1>
        <p className="text-body-sm text-tx-secondary mb-6">{errorMsg}</p>
        <Link
          href="/contact"
          className="inline-block rounded-lg bg-brand-teal text-white px-5 py-2.5 text-[13px] font-semibold hover:opacity-90 transition-opacity"
        >
          Contact support
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center max-w-sm mx-auto">
      <p className="text-4xl mb-4">⚡</p>
      <h1 className="text-display-sm text-tx-heading font-bold mb-3">Spark pass activated</h1>
      <p className="text-body-sm text-tx-secondary leading-relaxed mb-6">
        Your pass is saved in this browser. You now have up to{' '}
        <span className="font-semibold text-tx-heading">{maxTurns} turns per session</span>. Start a
        new conversation with Spark.
      </p>
      <Link
        href="/spark"
        className="inline-block rounded-lg bg-orange-500 text-white px-5 py-2.5 text-[13px] font-semibold hover:opacity-90 transition-opacity"
      >
        Open Spark →
      </Link>
    </div>
  );
}

export default function SparkSuccessPage() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6 py-20">
      <Suspense fallback={<p className="text-[13px] text-tx-secondary animate-pulse">Loading…</p>}>
        <SparkSuccessInner />
      </Suspense>
    </main>
  );
}

