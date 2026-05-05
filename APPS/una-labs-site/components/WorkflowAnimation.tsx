'use client';

import { useEffect, useRef, useState } from 'react';

interface Step {
  label: string;
  screen: React.ReactNode;
}

interface WorkflowAnimationProps {
  steps: Step[];
  intervalMs?: number;
}

export function WorkflowAnimation({ steps, intervalMs = 2800 }: WorkflowAnimationProps) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = (next: number) => {
    setVisible(false);
    setTimeout(() => {
      setCurrent(next);
      setVisible(true);
    }, 220);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % steps.length;
        advance(next);
        return prev;
      });
    }, intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length, intervalMs]);

  const goTo = (i: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    advance(i);
    setCurrent(i);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % steps.length;
        advance(next);
        return prev;
      });
    }, intervalMs);
  };

  const step = steps[current];

  return (
    <div className="mt-8 rounded-[24px] bg-[#0f1117] overflow-hidden select-none">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
        <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
        <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
        <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
        <span className="ml-auto text-[11px] text-white/30 font-mono tracking-wide">{step.label}</span>
      </div>

      {/* Screen */}
      <div
        className="min-h-[200px] px-6 py-7 transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {step.screen}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 pb-5">
        {steps.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={[
              'rounded-full transition-all duration-300',
              i === current ? 'w-5 h-1.5 bg-[#4DB8A8]' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

// ── Reusable mini UI primitives ───────────────────────────────────────────────

export function ScreenRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/8 last:border-0">
      <span className="text-[12px] text-white/40">{label}</span>
      <span className={['text-[12px] font-medium', accent ? 'text-[#4DB8A8]' : 'text-white/80'].join(' ')}>
        {value}
      </span>
    </div>
  );
}

export function ScreenBadge({ children, variant = 'default' }: { children: string; variant?: 'default' | 'green' | 'teal' | 'yellow' }) {
  const colors: Record<string, string> = {
    default: 'bg-white/10 text-white/60',
    green: 'bg-emerald-500/20 text-emerald-400',
    teal: 'bg-[#4DB8A8]/20 text-[#4DB8A8]',
    yellow: 'bg-amber-500/20 text-amber-400',
  };
  return (
    <span className={['inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', colors[variant]].join(' ')}>
      {children}
    </span>
  );
}

export function ScreenBar({ pct, color = '#4DB8A8' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function ScreenTitle({ children }: { children: string }) {
  return <p className="text-[13px] font-semibold text-white mb-3">{children}</p>;
}

export function ScreenSub({ children }: { children: string }) {
  return <p className="text-[11px] text-white/40 mt-1">{children}</p>;
}

export function ScreenPulse({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4DB8A8] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4DB8A8]" />
      </span>
      <span className="text-[11px] text-[#4DB8A8]">{label}</span>
    </div>
  );
}
