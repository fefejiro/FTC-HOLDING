import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, RadioTower } from 'lucide-react';
import { cn } from '../lib/cn';

export interface SourceMonitorItem {
  key: string;
  label: string;
  fetched: number;
  eligible?: number;
  inserted?: number;
  updated?: number;
}

export default function SourceMonitorSummary({
  sourceCount,
  items,
  compact = false,
  className,
}: {
  sourceCount: number;
  items: SourceMonitorItem[];
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const summaryText = useMemo(() => {
    if (items.length === 0) return `${sourceCount} live sources`;
    const activeSources = items.filter((item) => item.fetched > 0).length;
    return `${sourceCount} live sources${activeSources > 0 ? `, ${activeSources} reporting now` : ''}`;
  }, [items, sourceCount]);

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'w-full rounded-xl border text-left transition-all',
          compact
            ? 'border-orange-500/20 bg-orange-500/10 px-3 py-2 text-orange-200'
            : 'border-dispatch-border bg-dispatch-surface px-3 py-2.5 text-slate-200 hover:border-slate-600',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <RadioTower className={cn('h-4 w-4 flex-shrink-0', compact ? 'text-orange-300' : 'text-cyan-300')} />
            <div className="min-w-0">
              <div className={cn('truncate text-sm font-semibold', compact ? 'text-orange-100' : 'text-white')}>
                {summaryText}
              </div>
              <div className={cn('text-xs', compact ? 'text-orange-200/80' : 'text-slate-500')}>
                Tap to see each source count
              </div>
            </div>
          </div>
          <div className={cn('flex items-center gap-2 text-xs font-semibold', compact ? 'text-orange-200' : 'text-slate-400')}>
            <span>{open ? 'Hide' : 'View'}</span>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {open ? (
        <div
          className={cn(
            'rounded-2xl border',
            compact ? 'border-orange-500/15 bg-dispatch-surface/80 p-3' : 'border-dispatch-border bg-dispatch-surface p-3',
          )}
        >
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.key}
                className="flex items-start justify-between gap-3 rounded-xl border border-dispatch-border bg-dispatch-bg px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{item.label}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Eligible {item.eligible ?? 0} • New {item.inserted ?? 0} • Updated {item.updated ?? 0}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums text-cyan-300">{item.fetched}</div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Current count</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
