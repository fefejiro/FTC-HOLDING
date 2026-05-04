import type { Metadata } from 'next';
import { SparkWidget } from '@/components/SparkWidget';

export const metadata: Metadata = {
  title: 'Spark — Una Labs AI Chat',
  description:
    'Ask Spark anything about Una Labs, our delivery model, pricing, and how to get started. Free preview. Spark pass required for full sessions.',
};

export default function SparkPage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-narrow mx-auto text-center">
        <p className="text-[13px] font-semibold text-orange-500 tracking-wide uppercase mb-4">Spark AI</p>
        <h1 className="text-display-sm text-tx-heading font-bold">
          Ask us anything
        </h1>
        <p className="mt-4 text-body-lg text-tx-secondary leading-relaxed max-w-md mx-auto">
          Spark is the Una Labs AI assistant. Ask about how we deliver, how pricing works, or how to start your project. The first{' '}
          <span className="font-semibold text-tx-heading">3 turns are free</span>. Get a Spark pass to continue.
        </p>
        <div className="mt-10 inline-flex flex-col items-center gap-2">
          <p className="text-[12px] text-tx-muted">
            Click the{' '}
            <span className="inline-flex items-center gap-1">
              <span className="text-orange-500 font-bold">⚡</span>
              <span className="font-semibold text-tx-heading">orange button</span>
            </span>{' '}
            in the bottom-right corner to open Spark.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            { icon: '🎯', title: '3 free preview turns', body: 'Try Spark before you commit. No account or credit card required for the preview.' },
            { icon: '⚡', title: 'Spark pass unlocks more', body: 'A small one-time Spark pass gives you a full session with up to 20 turns.' },
            { icon: '🔒', title: 'Guardrails built in', body: 'IP rate limits, token caps, and a kill switch protect against abuse at every layer.' },
          ].map(({ icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-white p-5">
              <p className="text-xl mb-3">{icon}</p>
              <p className="text-body-sm font-semibold text-tx-heading mb-1">{title}</p>
              <p className="text-[12px] text-tx-secondary leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
      <SparkWidget />
    </main>
  );
}
