import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, RadioTower } from 'lucide-react';
import { cn } from '../lib/cn';

export interface SourceMonitorItem {
  key: string;
  label: string;
  rawCount: number;
  actionableCount: number;
  tierLabel?: string;
  statusLabel?: string;
  pollState?: string;
  lastError?: string | null;
}

export default function SourceMonitorSummary({
  sourceCount,
  dayLabel,
  items,
  selectedKey = null,
  onSelect,
  compact = false,
  className,
}: {
  sourceCount: number;
  dayLabel: string;
  items: SourceMonitorItem[];
  selectedKey?: string | null;
  onSelect?: (key: string | null) => void;
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const summaryText = useMemo(() => {
    const totalRawSignals = items.reduce((sum, item) => sum + item.rawCount, 0);
    const totalActionableSignals = items.reduce((sum, item) => sum + item.actionableCount, 0);
    return `${sourceCount} sources, ${totalActionableSignals} actionable / ${totalRawSignals} raw on ${dayLabel}`;
  }, [dayLabel, items, sourceCount]);

  const totalSignals = useMemo(
    () => items.reduce((sum, item) => sum + item.rawCount, 0),
    [items],
  );
  const totalActionableSignals = useMemo(
    () => items.reduce((sum, item) => sum + item.actionableCount, 0),
    [items],
  );

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
                Tap to see source trust, health, and daily signal counts
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
            <button
              type="button"
              onClick={() => onSelect?.(null)}
              className={cn(
                'flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                selectedKey === null
                  ? 'border-orange-500/40 bg-orange-500/10'
                  : 'border-dispatch-border bg-dispatch-bg hover:border-slate-600',
              )}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">All sources</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Combined daily actionable and raw signals on {dayLabel}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums text-cyan-300">{totalActionableSignals}</div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Actionable</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-400">{totalSignals} raw</div>
              </div>
            </button>
            {items.map((item) => (
              <button
                type="button"
                onClick={() => onSelect?.(item.key)}
                key={item.key}
                className={cn(
                  'flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                  selectedKey === item.key
                    ? 'border-orange-500/40 bg-orange-500/10'
                    : 'border-dispatch-border bg-dispatch-bg hover:border-slate-600',
                )}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{item.label}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {item.tierLabel || 'Source'} • {item.statusLabel || 'Live ingest source'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    {item.lastError
                      ? `Health: ${item.pollState || 'degraded'} • ${item.lastError}`
                      : `Health: ${item.pollState || 'healthy'} • ${item.actionableCount} actionable on ${dayLabel}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums text-cyan-300">{item.actionableCount}</div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Actionable</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-400">{item.rawCount} raw</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
